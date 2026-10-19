import Complaint from "../../Complaint/models/complaint.model.js";
import Dealer from "../../dealers/models/dealer.model.js";
import DealerLedger from "../../dealerLedger/model/dealerLedger.model.js";
import { sendWhatsAppMessage } from "../../../services/whatsappService.js";
import AllocationSettings from "../model/allocationSettings.model.js";
import { complaintLink } from "../../../services/appLinks.js";
import { getAllocationSettings } from "./allocationSettings.service.js";

/*
|--------------------------------------------------------------------------
| NO-ACTION REMINDER + AUTOMATIC PENALTY
|--------------------------------------------------------------------------
|
| A complaint that is still REGISTERED / ALLOCATED (the dealer has not
| scheduled, cancelled or marked it pending) after
|   - noActionReminderMinutes            -> WhatsApp reminder to the dealer
|   - + noActionPenaltyAfterMinutes      -> penalty bill (DEBIT) on the dealer
|
| Both steps are claimed atomically on the complaint, once per allocation
| (the timestamps are compared with allocatedAt, so a re-allocation restarts
| the clock for the new dealer).
|
*/

const CHECK_EVERY_MS = 60 * 1000;
const WAITING_STATUSES = ["REGISTERED", "ALLOCATED"];
const minutes = (n) => n * 60 * 1000;

const notDoneForThisAllocation = (field) => ({
  $or: [
    { [field]: null },
    { [field]: { $exists: false } },
    { $expr: { $lt: [`$${field}`, "$allocatedAt"] } },
  ],
});

const dealerLabel = (dealer) =>
  dealer.technicianName || dealer.technicianFirmName || "Dealer";

const claim = (complaint, field, now) =>
  Complaint.updateOne(
    {
      _id: complaint._id,
      status: { $in: WAITING_STATUSES },
      allocatedAt: complaint.allocatedAt,
      ...notDoneForThisAllocation(field),
    },
    { $set: { [field]: now } },
  ).then((r) => r.modifiedCount === 1);

const release = (complaint, field) =>
  Complaint.updateOne({ _id: complaint._id }, { $set: { [field]: null } });

const sendReminder = async (complaint, dealer, settings) => {
  const link = complaintLink(complaint._id);
  const penaltyNote = settings.noActionPenaltyEnabled
    ? `\n\n⚠️ If no action is taken within *${settings.noActionPenaltyAfterMinutes} minutes*, a penalty will be billed automatically.`
    : "";

  await sendWhatsAppMessage({
    mobile: dealer.mobileNumber,
    message: `
Dear ${dealerLabel(dealer)},

*Reminder:* complaint *${complaint.complaintNumber}* assigned to you has had no action yet.

Please *schedule, cancel or mark it pending* now.${penaltyNote}

🔗 *View Complaint:* ${link}
`.trim(),
  });
};

const applyPenalty = async (complaint, dealer, settings) => {
  const amount =
    Number(settings.noActionPenaltyAmount) > 0
      ? Number(settings.noActionPenaltyAmount)
      : Number(dealer.cancellationCharge || 0);

  if (amount <= 0) {
    console.warn(
      `No-action penalty skipped for ${complaint.complaintNumber}: penalty amount is 0`,
    );
    return null;
  }

  const existing = await DealerLedger.findOne({
    complaintId: complaint._id,
    transactionType: "PENALTY",
    reversed: false,
    status: { $in: ["PENDING", "APPROVED", "BILLED"] },
  });

  if (existing) return existing;

  const now = new Date();

  return DealerLedger.create({
    dealerId: dealer._id,
    dealerCode: dealer.dealerCode || dealer.technicianCode || dealer.headCode,
    dealerName: dealer.technicianFirmName || dealer.technicianName,
    complaintId: complaint._id,
    complaintNumber: complaint.complaintNumber,
    transactionType: "PENALTY",
    billingType: "PENALTY",
    productId: complaint.productId,
    productName: complaint.productName,
    categoryId: complaint.categoryId || null,
    category: complaint.category,
    baseAmount: amount,
    percentage: 0,
    serviceRate: 0,
    amount,
    entryType: "DEBIT",
    calculation: { fixedRate: 0, customerAmount: 0, profitAmount: 0, percentage: 0 },
    description: `No-action penalty for complaint ${complaint.complaintNumber}`,
    remarks: "Dealer took no action within the allowed time after allocation",
    status: "APPROVED",
    billingDate: now,
    approvedAt: now,
  });
};

export const runNoActionChecks = async (now = new Date()) => {
  const settings = await getAllocationSettings();

  if (!settings.noActionReminderEnabled && !settings.noActionPenaltyEnabled) return;

  // Only complaints allocated after the feature first ran are considered,
  // so old untouched complaints are never penalised retroactively.
  let startedAt = settings.noActionStartedAt;

  if (!startedAt) {
    startedAt = now;
    await AllocationSettings.updateOne(
      { key: "DEFAULT" },
      { $set: { noActionStartedAt: now } },
      { upsert: true },
    );
  }

  const reminderMs = minutes(settings.noActionReminderMinutes);
  const penaltyMs = reminderMs + minutes(settings.noActionPenaltyAfterMinutes);

  const complaints = await Complaint.find({
    status: { $in: WAITING_STATUSES },
    allocatedAt: { $gte: new Date(startedAt), $lte: new Date(now - reminderMs) },
  }).select(
    "complaintNumber status allocatedAt allocatedDealerId dealerId noActionReminderSentAt noActionPenaltyAppliedAt productId productName categoryId category",
  );

  for (const complaint of complaints) {
    try {
      const dealerId = complaint.allocatedDealerId || complaint.dealerId;
      if (!dealerId) continue;

      const dealer = await Dealer.findById(dealerId);
      if (!dealer) continue;

      const age = now - complaint.allocatedAt;
      const done = (f) => complaint[f] && complaint[f] >= complaint.allocatedAt;

      // 1. Reminder
      if (settings.noActionReminderEnabled && !done("noActionReminderSentAt")) {
        if (await claim(complaint, "noActionReminderSentAt", now)) {
          try {
            await sendReminder(complaint, dealer, settings);
          } catch (error) {
            console.error(
              `No-action reminder failed (${complaint.complaintNumber}):`,
              error.message,
            );
            // Do not retry forever on bad numbers; keep the claim so the
            // penalty timeline still runs from the allocation time.
          }
        }
      }

      // 2. Penalty
      if (
        settings.noActionPenaltyEnabled &&
        age >= penaltyMs &&
        !done("noActionPenaltyAppliedAt")
      ) {
        if (await claim(complaint, "noActionPenaltyAppliedAt", now)) {
          try {
            const ledger = await applyPenalty(complaint, dealer, settings);
            if (!ledger) await release(complaint, "noActionPenaltyAppliedAt");
          } catch (error) {
            console.error(
              `No-action penalty failed (${complaint.complaintNumber}):`,
              error.message,
            );
            await release(complaint, "noActionPenaltyAppliedAt");
          }
        }
      }
    } catch (error) {
      console.error("No-action check error:", error.message);
    }
  }
};

let timer = null;
let running = false;

export const startNoActionScheduler = () => {
  if (timer) return;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runNoActionChecks();
    } catch (error) {
      console.error("No-action scheduler error:", error.message);
    } finally {
      running = false;
    }
  };

  timer = setInterval(tick, CHECK_EVERY_MS);
  timer.unref?.();
  tick();
};
