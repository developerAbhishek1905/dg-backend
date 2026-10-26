import Complaint from "../../Complaint/models/complaint.model.js";
import Dealer from "../../dealers/models/dealer.model.js";
import DealerLedger from "../../dealerLedger/model/dealerLedger.model.js";
import {
  billingCategoryOf,
  findServiceRate,
} from "../../dealerLedger/services/dealerBilling.service.js";
import AllocationSettings from "../model/allocationSettings.model.js";
import { getAllocationSettings } from "./allocationSettings.service.js";

/*
|--------------------------------------------------------------------------
| DAILY AUTO-BILLING (11 PM IST)
|--------------------------------------------------------------------------
|
| Timeline of a complaint nobody acts on:
|
|   allocation
|   + noActionReminderMinutes (30)        -> WhatsApp reminder to the dealer
|   + autoBillingAfterReminderMinutes (5) -> still no action? it is now
|                                            due for auto-billing
|   11 PM (India time) daily run          -> the due complaints are billed
|
| "No action" = still REGISTERED / ALLOCATED (not scheduled, cancelled or
| marked pending).
|
|  - The amount is the rate in the dealer's Product & Service Information
|    (the city's services of the complaint, product + category) x units.
|  - Only the bill is created. The complaint status is NOT changed, so the
|    dealer can still act on it later.
|  - The bill is a normal FIXED closure bill marked entrySource AUTO_BILL
|    (shown as "Auto Bill" in Billing).
|  - Once per allocation (autoBilledAt is compared with allocatedAt), and
|    never when the complaint already has a bill.
|  - Complaints allocated before the feature first ran are never billed.
|
*/

const RUN_HOUR = 23; // 11 PM
const TIME_ZONE = "Asia/Kolkata";
const CHECK_EVERY_MS = 60 * 1000;
const WAITING_STATUSES = ["REGISTERED", "ALLOCATED"];

const indiaNow = (now) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const get = (type) => parts.find((part) => part.type === type)?.value;

  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
  };
};

const notBilledForThisAllocation = {
  $or: [
    { autoBilledAt: null },
    { autoBilledAt: { $exists: false } },
    { $expr: { $lt: ["$autoBilledAt", "$allocatedAt"] } },
  ],
};

const claim = (complaint, now) =>
  Complaint.updateOne(
    {
      _id: complaint._id,
      status: { $in: WAITING_STATUSES },
      allocatedAt: complaint.allocatedAt,
      ...notBilledForThisAllocation,
    },
    { $set: { autoBilledAt: now } },
  ).then((result) => result.modifiedCount === 1);

const release = (complaint) =>
  Complaint.updateOne({ _id: complaint._id }, { $set: { autoBilledAt: null } });

const createAutoBill = async (complaint, dealer, timeline) => {
  // Never double bill a complaint that already has a bill
  const existing = await DealerLedger.findOne({
    complaintId: complaint._id,
    transactionType: "CLOSURE",
    reversed: false,
    status: { $in: ["PENDING", "APPROVED", "BILLED"] },
  });

  if (existing) return { skipped: "ALREADY_BILLED" };

  // Rate from the dealer's Product & Service Information
  // (throws RATE_NOT_CONFIGURED when the dealer has no such rate)
  const { rate, category } = findServiceRate(dealer, complaint);

  if (!(rate > 0)) {
    return { skipped: "RATE_NOT_CONFIGURED" };
  }

  const units = Math.max(Number(complaint.units) || 1, 1);
  const totalAmount = Number((rate * units).toFixed(2));
  const billingCategory = billingCategoryOf(complaint);
  const now = new Date();

  const ledger = await DealerLedger.create({
    dealerId: dealer._id,
    dealerCode: dealer.dealerCode || dealer.technicianCode || dealer.headCode,
    dealerName: dealer.technicianFirmName || dealer.technicianName,

    complaintId: complaint._id,
    complaintNumber: complaint.complaintNumber,

    transactionType: "CLOSURE",
    billingType: "FIXED",
    entrySource: "AUTO_BILL",

    productId: complaint.productId,
    productName: complaint.productName,
    categoryId: billingCategory.id,
    category: billingCategory.name,
    serviceDescription: category?.description || "",

    serviceRate: rate,
    units,
    baseAmount: totalAmount,
    percentage: 0,
    amount: totalAmount,
    entryType: "DEBIT",

    calculation: {
      fixedRate: rate,
      customerAmount: 0,
      profitAmount: 0,
      percentage: 0,
    },

    description: `Auto bill for complaint ${complaint.complaintNumber} (${units} x ${rate})`,
    remarks: `Reminder sent ${timeline.reminder} minutes after allocation; still no action ${timeline.afterReminder} minutes later; billed automatically at 11 PM`,

    status: "APPROVED",
    billingDate: now,
    approvedAt: now,
  });

  return { ledger };
};

export const runAutoBilling = async (now = new Date()) => {
  const settings = await getAllocationSettings();

  if (!settings.autoBillingEnabled) {
    return { billed: 0, skipped: 0, failed: 0 };
  }

  // Only complaints allocated after the feature first ran are considered,
  // so old untouched complaints are never billed retroactively.
  let startedAt = settings.autoBillingStartedAt;

  if (!startedAt) {
    startedAt = now;

    await AllocationSettings.updateOne(
      { key: "DEFAULT" },
      { $set: { autoBillingStartedAt: now } },
      { upsert: true },
    );
  }

  const reminder = Math.max(Number(settings.noActionReminderMinutes) || 30, 1);

  const afterReminder = Math.max(
    Number(settings.autoBillingAfterReminderMinutes ?? 5) || 0,
    0,
  );

  const timeline = { reminder, afterReminder };

  // Due once it is this old (30 + 5 = 35 minutes by default)
  const cutoff = new Date(now.getTime() - (reminder + afterReminder) * 60 * 1000);

  const complaints = await Complaint.find({
    status: { $in: WAITING_STATUSES },
    allocatedDealerId: { $ne: null },
    allocatedAt: { $gte: new Date(startedAt), $lte: cutoff },
    ...notBilledForThisAllocation,
  });

  const summary = { billed: 0, skipped: 0, failed: 0 };

  for (const complaint of complaints) {
    try {
      const dealer = await Dealer.findById(complaint.allocatedDealerId);

      if (!dealer) {
        summary.skipped += 1;
        continue;
      }

      if (!(await claim(complaint, now))) continue;

      try {
        const result = await createAutoBill(complaint, dealer, timeline);

        if (result.ledger) {
          summary.billed += 1;
        } else {
          // No bill was made: leave it unclaimed so tomorrow's run looks again
          summary.skipped += 1;
          await release(complaint);

          console.warn(
            `[auto-bill] ${complaint.complaintNumber} skipped: ${result.skipped}`,
          );
        }
      } catch (error) {
        summary.skipped += 1;
        await release(complaint);

        console.warn(
          `[auto-bill] ${complaint.complaintNumber} skipped: ${error.message}`,
        );
      }
    } catch (error) {
      summary.failed += 1;
      console.error(
        `[auto-bill] ${complaint.complaintNumber} failed:`,
        error.message,
      );
    }
  }

  return summary;
};

/*
| Runs the billing once per day, in the 11 PM (IST) hour.
| The day is claimed atomically (lastAutoBillRunKey) so it never runs twice,
| even with several servers or a restart during that hour.
*/
export const runAutoBillingIfDue = async (now = new Date()) => {
  const { dateKey, hour } = indiaNow(now);

  if (hour !== RUN_HOUR) return null;

  const settings = await getAllocationSettings();

  if (!settings.autoBillingEnabled) return null;

  const claimed = await AllocationSettings.findOneAndUpdate(
    { key: "DEFAULT", lastAutoBillRunKey: { $ne: dateKey } },
    { $set: { lastAutoBillRunKey: dateKey, lastAutoBillRunStatus: "RUNNING" } },
    { new: true },
  ).lean();

  if (!claimed) return null;

  try {
    const summary = await runAutoBilling(now);

    await AllocationSettings.updateOne(
      { key: "DEFAULT" },
      {
        $set: {
          lastAutoBillRunAt: new Date(),
          lastAutoBillRunStatus: `SUCCESS: ${summary.billed} billed, ${summary.skipped} skipped, ${summary.failed} failed`,
        },
      },
    );

    console.log(
      `[auto-bill] ${dateKey}: ${summary.billed} billed, ${summary.skipped} skipped, ${summary.failed} failed`,
    );

    return summary;
  } catch (error) {
    console.error("[auto-bill] run failed:", error);

    // Release the claim so the next check (same hour) retries
    await AllocationSettings.updateOne(
      { key: "DEFAULT" },
      {
        $set: {
          lastAutoBillRunKey: "",
          lastAutoBillRunStatus: `FAILED: ${error.message}`,
        },
      },
    );

    return null;
  }
};

let timer = null;
let running = false;

export const startAutoBillingScheduler = () => {
  if (timer) return;

  const tick = async () => {
    if (running) return;
    running = true;

    try {
      await runAutoBillingIfDue();
    } catch (error) {
      console.error("[auto-bill] scheduler error:", error.message);
    } finally {
      running = false;
    }
  };

  // Record the start date right away so old complaints are never billed
  getAllocationSettings()
    .then(async (settings) => {
      if (!settings.autoBillingStartedAt) {
        await AllocationSettings.updateOne(
          { key: "DEFAULT" },
          { $set: { autoBillingStartedAt: new Date() } },
          { upsert: true },
        );
      }
    })
    .catch((error) =>
      console.error("[auto-bill] could not record start date:", error.message),
    );

  timer = setInterval(tick, CHECK_EVERY_MS);
  timer.unref?.();

  console.log("[auto-bill] daily 11 PM auto-billing scheduler started");
};
