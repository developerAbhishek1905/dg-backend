import express from "express";
import mongoose from "mongoose";
import Complaint from "../Complaint/models/complaint.model.js";
import Dealer from "../dealers/models/dealer.model.js";
import { protect } from "../auth/middleware/auth.middleware.js";
import { calculateCharge, canVerify, percentageMethods } from "./rules.js";

export const verificationRouter = express.Router();
export const ledgerRouter = express.Router();
verificationRouter.use(protect);
ledgerRouter.use(protect);
const wrap = (fn) => async (req, res) => {
  try { await fn(req, res); }
  catch (error) { res.status(error.name === "CastError" ? 400 : 500).json({ message: error.name === "CastError" ? "Invalid record ID" : "Unable to complete this request" }); }
};
const requirePermission = (permission) => (req, res, next) => canVerify(req.user, permission) ? next() : res.status(403).json({ message: "DG team permission is required" });
function record(c) {
  const b = c.billingReview;
  return {
    id: String(c._id), complaintId: String(c._id), complaintNumber: c.complaintNumber,
    customer: { id: String(c.customerId), name: c.customerName, phone: c.phone, city: c.address?.city || "" },
    dealer: { id: String(b.dealerId), name: c.dealerName || "Dealer", dealerCode: String(b.dealerId) },
    productName: c.productName, priority: c.priority || "MEDIUM", status: b.status,
    closure: { closureId: String(c._id), closureType: "SERVICE", submittedAt: b.submittedAt, submittedBy: b.submittedBy, workSummary: b.workSummary, amount: b.baseAmount, proofs: [] },
    billingMethod: b.method, billingPercentage: b.percentage, billingCharge: b.charge, revision: b.revision,
    submittedAt: b.submittedAt, verificationDeadline: new Date(new Date(b.submittedAt).getTime() + 24 * 3600000),
    slaStatus: ["VERIFIED", "REJECTED"].includes(b.status) ? "COMPLETED" : Date.now() - new Date(b.submittedAt).getTime() > 24 * 3600000 ? "BREACHED" : "SAFE",
    verifiedBy: b.reviewedBy, verifiedAt: b.reviewedAt, verificationRemarks: b.remarks,
    rejectionReason: b.reason, correctionReason: b.reason, correctionCount: b.correctionCount,
    createdAt: b.submittedAt, updatedAt: c.updatedAt,
  };
}
async function ownedComplaint(req, res) {
  const filter = { _id: req.params.id };
  if (req.user.role.code === "DEALER") filter.allocatedDealerId = req.user.dealerId;
  else if (!canVerify(req.user, "verification.review") && !canVerify(req.user, "verification.verify")) {
    res.status(403).json({ message: "Complaint access denied" }); return;
  }
  const c = await Complaint.findOne(filter);
  if (!c) res.status(404).json({ message: "Complaint not found" });
  return c;
}
verificationRouter.get("/:id/terms", wrap(async (req, res) => {
  const c = await ownedComplaint(req, res); if (!c) return;
  const d = await Dealer.findById(c.allocatedDealerId || c.dealerId);
  res.json({ data: { method: d?.billingType || "FIXED", percentage: d?.billingPercentage || 0, review: c.billingReview } });
}));
verificationRouter.post("/:id/submit", wrap(async (req, res) => {
  const c = await ownedComplaint(req, res); if (!c) return;
  if (!["VISITED", "PENDING_ON_VISIT", "CLOSE_ON_VERIFICATION"].includes(c.status) || (c.billingReview && !["REJECTED", "CORRECTION_REQUIRED"].includes(c.billingReview.status))) {
    return res.status(409).json({ message: "Only visited complaints or returned closures can be submitted" });
  }
  const d = await Dealer.findById(c.allocatedDealerId || c.dealerId);
  if (!d || !percentageMethods.includes(d.billingType)) return res.status(400).json({ message: "This dealer does not use percentage billing" });
  let amounts;
  try { amounts = calculateCharge(d.billingType, d.billingPercentage, req.body.amount); }
  catch (error) { return res.status(400).json({ message: error.message }); }
  if (typeof req.body.workSummary !== "string" || !req.body.workSummary.trim()) return res.status(400).json({ message: "Enter the completed work details" });
  const billingReview = { dealerId: d._id, method: d.billingType, percentage: d.billingPercentage, ...amounts, status: "PENDING", workSummary: req.body.workSummary.trim(), submittedAt: new Date(), submittedBy: req.user.name, correctionCount: c.billingReview?.correctionCount || 0, revision: (c.billingReview?.revision || 0) + 1 };
  const updated = await Complaint.findOneAndUpdate({ _id: c._id, updatedAt: c.updatedAt }, { $set: { billingReview, status: "CLOSE_ON_VERIFICATION", closedAt: null }, $inc: { __v: 1 } }, { new: true, runValidators: true });
  if (!updated) return res.status(409).json({ message: "Complaint changed. Reload and try again" });
  res.json({ data: updated });
}));
verificationRouter.get("/", requirePermission("verification.view"), wrap(async (req, res) => {
  const rows = await Complaint.find({ "billingReview.status": { $exists: true } }).sort({ "billingReview.submittedAt": -1 });
  res.json({ data: rows.map(record) });
}));
verificationRouter.get("/:id", requirePermission("verification.view"), wrap(async (req, res) => {
  const c = await Complaint.findById(req.params.id);
  if (!c?.billingReview) return res.status(404).json({ message: "Verification not found" });
  res.json({ data: record(c) });
}));
for (const [action, permission, status] of [["start", "review", "IN_REVIEW"], ["verify", "verify", "VERIFIED"], ["reject", "reject", "REJECTED"], ["correction", "correction", "CORRECTION_REQUIRED"]]) {
  verificationRouter.post(`/:id/${action}`, requirePermission(`verification.${permission}`), wrap(async (req, res) => {
    const c = await Complaint.findById(req.params.id);
    if (!c?.billingReview) return res.status(404).json({ message: "Verification not found" });
    const b = c.billingReview;
    if (b.status === "VERIFIED" && action === "verify") return res.json({ data: record(c) });
    if (c.status !== "CLOSE_ON_VERIFICATION" || !["PENDING", "IN_REVIEW"].includes(b.status)) return res.status(409).json({ message: "This closure is not awaiting verification" });
    if (action !== "start" && req.body.revision !== b.revision) return res.status(409).json({ message: "Closure details changed. Reload before reviewing" });
    if (action === "verify" && (req.body.proofVerified !== true || req.body.workVerified !== true)) return res.status(400).json({ message: "Verify the amount evidence and completed work before approval" });
    if (["reject", "correction"].includes(action) && !req.body.reason?.trim()) return res.status(400).json({ message: "A reason is required" });
    const changes = { "billingReview.status": status };
    if (action !== "start") Object.assign(changes, { "billingReview.reviewedAt": new Date(), "billingReview.reviewedBy": req.user.name, "billingReview.reviewerId": req.user.id, "billingReview.remarks": req.body.remarks || "", "billingReview.reason": req.body.reason || "" });
    if (action === "verify") Object.assign(changes, { status: "CLOSED", closedAt: new Date() });
    if (action === "correction") changes["billingReview.correctionCount"] = b.correctionCount + 1;
    // Approval and its ledger source are one atomic document update: no duplicate posting or partial closure.
    const updated = await Complaint.findOneAndUpdate({ _id: c._id, updatedAt: c.updatedAt, "billingReview.revision": b.revision, "billingReview.status": b.status }, { $set: changes, $inc: { __v: 1 } }, { new: true, runValidators: true });
    if (!updated) return res.status(409).json({ message: "Another user changed this closure. Reload to continue" });
    res.json({ data: record(updated) });
  }));
}

// Posted complaint snapshots are the persistent, unique source of ledger billing entries.
const adjustmentSchema = new mongoose.Schema({ dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "Dealer", required: true }, amount: Number, adjustmentType: String, reason: String, remarks: String, createdBy: String }, { timestamps: true });
const Adjustment = mongoose.model("LedgerAdjustment", adjustmentSchema);
// ledgerRouter.use((req, res, next) => req.user.role.co  de === "DEALER" || canVerify(req.user, "ledger.view") || canVerify(req.user, "ledger.dealer.view") ? next() : res.status(403).json({ message: "Ledger access denied" }));
ledgerRouter.get("/", wrap(async (req, res) => {
  const dealerFilter = req.user.role.code === "DEALER" ? { _id: req.user.dealerId } : {};
  const dealers = await Dealer.find(dealerFilter);
  const ids = dealers.map(d => d._id);
  const complaints = await Complaint.find({ "billingReview.status": "VERIFIED", "billingReview.dealerId": { $in: ids } });
  const adjustments = await Adjustment.find({ dealerId: { $in: ids } });
  const transactions = [], summaries = [];
  for (const d of dealers) {
    const dealer = { id: String(d._id), name: d.technicianFirmName || d.technicianName, dealerCode: d.technicianCode || d.headCode || "", phone: d.mobileNumber, city: d.businessAddress?.city };
    const rows = [];
    const base = { dealerId: dealer.id, dealer, status: "POSTED" };
    if (d.openingBalance) rows.push({ ...base, id: `OPEN-${d._id}`, transactionNumber: `OPEN-${d.headCode || d._id}`, transactionType: "OPENING_BALANCE", referenceType: "OPENING", description: "Opening balance", credit: d.openingBalanceType === "CR" ? d.openingBalance : 0, debit: d.openingBalanceType === "DR" ? d.openingBalance : 0, transactionDate: d.createdAt, createdAt: d.createdAt, updatedAt: d.createdAt, createdBy: "Opening balance" });
    for (const c of complaints.filter(c => String(c.billingReview.dealerId) === dealer.id)) {
      const b = c.billingReview;
      rows.push({ ...base, id: String(c._id), transactionNumber: `BILL-${c.complaintNumber}`, transactionType: "BILL_CREDIT", referenceType: "BILL", referenceId: String(c._id), referenceNumber: c.complaintNumber, complaintId: String(c._id), complaintNumber: c.complaintNumber, description: `${b.method === "PROFIT_SHARING" ? "Profit" : "Customer amount"}: ${b.percentage}% of ₹${b.baseAmount} — DG approved`, credit: b.charge, debit: 0, transactionDate: b.reviewedAt, createdAt: b.reviewedAt, updatedAt: b.reviewedAt, createdBy: b.reviewedBy, remarks: b.remarks });
    }
    for (const a of adjustments.filter(a => String(a.dealerId) === dealer.id)) rows.push({ ...base, id: String(a._id), transactionNumber: `ADJ-${a._id}`, transactionType: `ADJUSTMENT_${a.adjustmentType}`, referenceType: "ADJUSTMENT", description: a.reason, credit: a.adjustmentType === "CREDIT" ? a.amount : 0, debit: a.adjustmentType === "DEBIT" ? a.amount : 0, transactionDate: a.createdAt, createdAt: a.createdAt, updatedAt: a.updatedAt, createdBy: a.createdBy, remarks: a.remarks });
    rows.sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate) || a.id.localeCompare(b.id));
    let balance = 0;
    for (const row of rows) { balance = Math.round((balance + row.credit - row.debit) * 100) / 100; row.balance = balance; }
    transactions.push(...rows);
    summaries.push({ dealer, openingBalance: rows.find(r => r.transactionType === "OPENING_BALANCE")?.balance || 0, totalCredits: rows.reduce((sum, r) => sum + r.credit, 0), totalDebits: rows.reduce((sum, r) => sum + r.debit, 0), totalPaid: 0, outstandingAmount: balance, pendingPaymentAmount: Math.max(balance, 0), lastTransactionAt: rows.at(-1)?.transactionDate });
  }
  res.json({ data: { transactions: transactions.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate)), summaries } });
}));
ledgerRouter.post("/adjustments", requirePermission("ledger.adjustment.create"), wrap(async (req, res) => {
  const { dealerId, adjustmentType, amount, reason, remarks } = req.body;
  if (!["CREDIT", "DEBIT"].includes(adjustmentType) || typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0 || !reason?.trim()) return res.status(400).json({ message: "Enter a valid adjustment amount, type and reason" });
  if (!await Dealer.exists({ _id: dealerId })) return res.status(404).json({ message: "Dealer not found" });
  const a = await Adjustment.create({ dealerId, adjustmentType, amount: Math.round(amount * 100) / 100, reason, remarks, createdBy: req.user.name });
  res.status(201).json({ data: { id: String(a._id) } });
}));
