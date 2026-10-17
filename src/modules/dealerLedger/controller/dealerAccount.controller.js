import mongoose from "mongoose";

import Dealer from "../../dealers/models/dealer.model.js";
import DealerLedger from "../model/dealerLedger.model.js";
import Ledger from "../model/ladger.model.js";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
|
| Dealer.openingBalance / openingBalanceType is the dealer's running balance:
|   DR = positive, CR = negative (CR means the dealer has unadjusted credit).
| A receipt makes it more CR; adjusting that receipt against bills consumes
| the credit again. This mirrors createDealerPayment.
|
*/

const toPaise = (value) => Math.round(Number(value) * 100);
const fromPaise = (value) => value / 100;

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const PAYMENT_MODES = ["CASH", "UPI", "BANK_TRANSFER", "NET_BANKING", "CHEQUE"];

const CREDIT_REASONS = [
  "RATE_DIFFERENCE",
  "BILL_REVERSAL",
  "SERVICE_ADJUSTMENT",
  "OTHER",
];

const BILL_TRANSACTION_TYPES = ["CLOSURE", "CANCELLATION", "DUMMY_BILL"];

const refTypeOf = (bill) =>
  bill.transactionType === "DUMMY_BILL" ? "DUMMY_BILL_REF" : "BILL_REF";

const signedBalance = (dealer) => {
  const paise = toPaise(dealer.openingBalance || 0);
  return dealer.openingBalanceType === "CR" ? -paise : paise;
};

const unpaidBillFilter = (extra = {}) => ({
  transactionType: { $in: BILL_TRANSACTION_TYPES },
  entryType: "DEBIT",
  status: "APPROVED",
  reversed: false,
  paymentStatus: { $in: ["UNPAID", "PARTIALLY_PAID", null] },
  $or: [
    // Real complaint bills must be linked to a complaint
    {
      transactionType: { $in: ["CLOSURE", "CANCELLATION"] },
      complaintId: { $ne: null },
    },
    { transactionType: "DUMMY_BILL" },
  ],
  ...extra,
});

const remainingOf = (bill) =>
  Math.max(0, toPaise(bill.amount) - toPaise(bill.paidAmount || 0));

const formatBill = (bill) => ({
  _id: bill._id,
  kind: refTypeOf(bill),
  complaintNumber: bill.complaintNumber,
  productName: bill.productName || "",
  serviceDescription: bill.serviceDescription || "",
  customerName: bill.customerInfo?.name || "",
  amount: bill.amount,
  paidAmount: bill.paidAmount || 0,
  remainingAmount: fromPaise(remainingOf(bill)),
  paymentStatus: bill.paymentStatus,
  billingDate: bill.billingDate,
});

const newEntryNumber = (prefix, id) =>
  `${prefix}-${id.toString().slice(-8).toUpperCase()}`;

const dealerName = (dealer) =>
  dealer.technicianFirmName || dealer.technicianName || "";

const parseDate = (value) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? null : date;
};

// Optimistic update of the dealer running balance (signed, in paise)
const setDealerBalance = async (session, dealer, newSignedPaise) => {
  const result = await Dealer.updateOne(
    {
      _id: dealer._id,
      openingBalance: dealer.openingBalance,
      openingBalanceType: dealer.openingBalanceType,
    },
    {
      $set: {
        openingBalance: fromPaise(Math.abs(newSignedPaise)),
        openingBalanceType: newSignedPaise < 0 ? "CR" : "DR",
      },
    },
    { session },
  );

  if (result.matchedCount !== 1) {
    throw new Error("Dealer balance changed. Please retry.");
  }
};

// Match a numeric field whose stored value may be missing on older documents
const sameAmount = (field, value) =>
  Number(value || 0) === 0
    ? { $or: [{ [field]: 0 }, { [field]: null }, { [field]: { $exists: false } }] }
    : { [field]: value };

// Mark (part of) a bill as paid. Optimistic on the previously read paidAmount.
const applyToBill = async (session, bill, amountPaise) => {
  const newPaid = toPaise(bill.paidAmount || 0) + amountPaise;
  const total = toPaise(bill.amount);

  const result = await DealerLedger.updateOne(
    {
      _id: bill._id,
      ...sameAmount("paidAmount", bill.paidAmount),
      reversed: false,
    },
    {
      $set: {
        paidAmount: fromPaise(newPaid),
        paymentStatus: newPaid >= total ? "PAID" : "PARTIALLY_PAID",
        lastPaymentAt: new Date(),
      },
    },
    { session },
  );

  if (result.matchedCount !== 1) {
    throw new Error(
      `Bill ${bill.complaintNumber} changed while saving. Please retry.`,
    );
  }
};

const runTransaction = async (res, successStatus, message, work) => {
  const session = await mongoose.startSession();

  try {
    let data = null;

    await session.withTransaction(async () => {
      data = await work(session);
    });

    return res.status(successStatus).json({ success: true, message, data });
  } catch (error) {
    console.error(`${message} error:`, error);

    return res.status(400).json({
      success: false,
      message: error.message || "Request failed",
    });
  } finally {
    await session.endSession();
  }
};

/*
|--------------------------------------------------------------------------
| GET /dealers?search=   — dealer picker with outstanding / credit / security
|--------------------------------------------------------------------------
*/

export const searchAccountDealers = async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const match = {};

    if (search) {
      const regex = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      );

      match.$or = [
        { headCode: regex },
        { technicianFirmName: regex },
        { technicianName: regex },
        { mobileNumber: regex },
      ];
    }

    const dealers = await Dealer.find(match)
      .select(
        "headCode technicianFirmName technicianName openingBalance openingBalanceType securityAmount",
      )
      .sort({ headCode: 1 })
      .limit(50)
      .lean();

    const unpaid = await DealerLedger.aggregate([
      {
        $match: unpaidBillFilter({
          dealerId: { $in: dealers.map((item) => item._id) },
        }),
      },
      {
        $group: {
          _id: "$dealerId",
          total: {
            $sum: {
              $max: [
                0,
                {
                  $subtract: [
                    { $ifNull: ["$amount", 0] },
                    { $ifNull: ["$paidAmount", 0] },
                  ],
                },
              ],
            },
          },
        },
      },
    ]);

    const unpaidMap = new Map(unpaid.map((item) => [String(item._id), item.total]));

    return res.status(200).json({
      success: true,
      data: dealers.map((dealer) => ({
        dealerId: dealer._id,
        headCode: dealer.headCode || "",
        dealerName: dealerName(dealer),
        outstanding: Math.round((unpaidMap.get(String(dealer._id)) || 0) * 100) / 100,
        creditBalance:
          dealer.openingBalanceType === "CR"
            ? Number(dealer.openingBalance || 0)
            : 0,
        securityAmount: Number(dealer.securityAmount || 0),
      })),
    });
  } catch (error) {
    console.error("Search account dealers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dealers",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET /dealer/:dealerId/context
| Unpaid bills (BILL_REF + DUMMY_BILL_REF) and receipts with a balance
|--------------------------------------------------------------------------
*/

export const getDealerAccountContext = async (req, res) => {
  try {
    const { dealerId } = req.params;

    if (!isValidId(dealerId)) {
      return res.status(400).json({ success: false, message: "Invalid dealer ID" });
    }

    const dealer = await Dealer.findById(dealerId)
      .select(
        "headCode technicianFirmName technicianName openingBalance openingBalanceType securityAmount",
      )
      .lean();

    if (!dealer) {
      return res.status(404).json({ success: false, message: "Dealer not found" });
    }

    const [bills, receipts] = await Promise.all([
      DealerLedger.find(unpaidBillFilter({ dealerId }))
        .select(
          "transactionType complaintNumber productName serviceDescription customerInfo amount paidAmount paymentStatus billingDate",
        )
        .sort({ billingDate: 1 })
        .lean(),

      Ledger.find({ dealerId, entryType: "RECEIPT", status: "ACTIVE" })
        .sort({ date: -1, _id: -1 })
        .lean(),
    ]);

    const billRows = bills.map(formatBill).filter((bill) => bill.remainingAmount > 0);

    const receiptRows = receipts
      .map((receipt) => ({
        _id: receipt._id,
        entryNumber: receipt.entryNumber,
        date: receipt.date,
        paymentMode: receipt.paymentMode,
        reference: receipt.reference,
        amount: receipt.amount,
        adjustedAmount: receipt.adjustedAmount,
        availableAmount:
          Math.round((receipt.amount - receipt.adjustedAmount) * 100) / 100,
      }))
      .filter((receipt) => receipt.availableAmount > 0);

    return res.status(200).json({
      success: true,
      data: {
        dealer: {
          _id: dealer._id,
          headCode: dealer.headCode || "",
          dealerName: dealerName(dealer),
          securityAmount: Number(dealer.securityAmount || 0),
          creditBalance:
            dealer.openingBalanceType === "CR"
              ? Number(dealer.openingBalance || 0)
              : 0,
          outstanding:
            Math.round(
              billRows.reduce((sum, bill) => sum + bill.remainingAmount, 0) * 100,
            ) / 100,
        },
        bills: billRows,
        receipts: receiptRows,
      },
    });
  } catch (error) {
    console.error("Dealer account context error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dealer account",
    });
  }
};

/*
|--------------------------------------------------------------------------
| POST /receipts   — multi dealer receipt
| { date, paymentMode, receipts: [{ dealerId, amount, reference, remark }] }
|--------------------------------------------------------------------------
*/

export const createReceipts = async (req, res) => {
  const { date, paymentMode, receipts } = req.body;

  const receiptDate = parseDate(date);

  if (!receiptDate) {
    return res.status(400).json({ success: false, message: "Invalid date" });
  }

  if (!PAYMENT_MODES.includes(paymentMode)) {
    return res.status(400).json({ success: false, message: "Invalid payment mode" });
  }

  if (!Array.isArray(receipts) || !receipts.length) {
    return res
      .status(400)
      .json({ success: false, message: "Add at least one dealer" });
  }

  const dealerIds = receipts.map((row) => String(row.dealerId));

  if (
    dealerIds.some((id) => !isValidId(id)) ||
    receipts.some((row) => !(toPaise(row.amount) > 0))
  ) {
    return res.status(400).json({
      success: false,
      message: "Every row needs a valid dealer and a positive amount",
    });
  }

  if (new Set(dealerIds).size !== dealerIds.length) {
    return res
      .status(400)
      .json({ success: false, message: "The same dealer cannot be added twice" });
  }

  const batchId = new mongoose.Types.ObjectId().toString();

  return runTransaction(res, 201, "Receipts recorded successfully", async (session) => {
    const created = [];

    for (const row of receipts) {
      const dealer = await Dealer.findById(row.dealerId).session(session);

      if (!dealer) {
        throw new Error("Dealer not found");
      }

      const amountPaise = toPaise(row.amount);
      const id = new mongoose.Types.ObjectId();

      const [entry] = await Ledger.create(
        [
          {
            _id: id,
            entryNumber: newEntryNumber("RCPT", id),
            entryType: "RECEIPT",
            dealerId: dealer._id,
            date: receiptDate,
            amount: fromPaise(amountPaise),
            adjustedAmount: 0,
            paymentMode,
            reference: String(row.reference || "").trim(),
            remarks: String(row.remark || "").trim(),
            batchId,
            createdBy: req.user?._id || null,
          },
        ],
        { session },
      );

      await setDealerBalance(session, dealer, signedBalance(dealer) - amountPaise);

      created.push({
        _id: entry._id,
        entryNumber: entry.entryNumber,
        dealerId: dealer._id,
        dealerName: dealerName(dealer),
        amount: entry.amount,
      });
    }

    return { batchId, receipts: created };
  });
};

/*
|--------------------------------------------------------------------------
| POST /adjustments
| { receiptId, date, remark, allocations: [{ ledgerId, amount }] }
|--------------------------------------------------------------------------
*/

export const createAdjustment = async (req, res) => {
  const { receiptId, date, remark = "", allocations } = req.body;

  if (!isValidId(receiptId)) {
    return res.status(400).json({ success: false, message: "Select a receipt" });
  }

  const adjustDate = parseDate(date);

  if (!adjustDate) {
    return res.status(400).json({ success: false, message: "Invalid date" });
  }

  if (!Array.isArray(allocations) || !allocations.length) {
    return res
      .status(400)
      .json({ success: false, message: "Add at least one bill adjustment" });
  }

  const billIds = allocations.map((item) => String(item.ledgerId));

  if (
    billIds.some((id) => !isValidId(id)) ||
    allocations.some((item) => !(toPaise(item.amount) > 0))
  ) {
    return res.status(400).json({
      success: false,
      message: "Every row needs a bill and a positive amount",
    });
  }

  if (new Set(billIds).size !== billIds.length) {
    return res
      .status(400)
      .json({ success: false, message: "The same bill cannot be selected twice" });
  }

  return runTransaction(res, 201, "Adjustment saved successfully", async (session) => {
    const receipt = await Ledger.findOne({
      _id: receiptId,
      entryType: "RECEIPT",
      status: "ACTIVE",
    }).session(session);

    if (!receipt) {
      throw new Error("Receipt not found");
    }

    const dealer = await Dealer.findById(receipt.dealerId).session(session);

    if (!dealer) {
      throw new Error("Dealer not found");
    }

    const bills = await DealerLedger.find(
      unpaidBillFilter({ _id: { $in: billIds }, dealerId: receipt.dealerId }),
    ).session(session);

    if (bills.length !== billIds.length) {
      throw new Error("Some selected bills are invalid or already paid");
    }

    const billMap = new Map(bills.map((bill) => [String(bill._id), bill]));

    let totalPaise = 0;
    const entries = [];

    for (const item of allocations) {
      const bill = billMap.get(String(item.ledgerId));
      const amountPaise = toPaise(item.amount);

      if (amountPaise > remainingOf(bill)) {
        throw new Error(
          `Amount exceeds outstanding for ${bill.complaintNumber}`,
        );
      }

      totalPaise += amountPaise;

      entries.push({
        ledgerId: bill._id,
        refType: refTypeOf(bill),
        complaintNumber: bill.complaintNumber,
        amount: fromPaise(amountPaise),
      });
    }

    const availablePaise =
      toPaise(receipt.amount) - toPaise(receipt.adjustedAmount || 0);

    if (totalPaise > availablePaise) {
      throw new Error("Adjustment exceeds the available receipt balance");
    }

    for (const item of allocations) {
      await applyToBill(session, billMap.get(String(item.ledgerId)), toPaise(item.amount));
    }

    const receiptUpdate = await Ledger.updateOne(
      { _id: receipt._id, ...sameAmount("adjustedAmount", receipt.adjustedAmount) },
      { $set: { adjustedAmount: fromPaise(toPaise(receipt.adjustedAmount || 0) + totalPaise) } },
      { session },
    );

    if (receiptUpdate.matchedCount !== 1) {
      throw new Error("Receipt changed while saving. Please retry.");
    }

    const id = new mongoose.Types.ObjectId();

    const [entry] = await Ledger.create(
      [
        {
          _id: id,
          entryNumber: newEntryNumber("ADJ", id),
          entryType: "ADJUSTMENT",
          dealerId: dealer._id,
          date: adjustDate,
          amount: fromPaise(totalPaise),
          receiptId: receipt._id,
          allocations: entries,
          remarks: String(remark).trim(),
          createdBy: req.user?._id || null,
        },
      ],
      { session },
    );

    // The credit created by the receipt is now consumed by the bills
    await setDealerBalance(session, dealer, signedBalance(dealer) + totalPaise);

    return {
      _id: entry._id,
      entryNumber: entry.entryNumber,
      receiptNumber: receipt.entryNumber,
      amount: entry.amount,
      allocations: entries,
    };
  });
};

/*
|--------------------------------------------------------------------------
| POST /credit-notes
| { dealerId, ledgerId, amount, date, reason, remark }
|--------------------------------------------------------------------------
*/

export const createCreditNote = async (req, res) => {
  const { dealerId, ledgerId, amount, date, reason, remark = "" } = req.body;

  if (!isValidId(dealerId) || !isValidId(ledgerId)) {
    return res
      .status(400)
      .json({ success: false, message: "Select a dealer and a bill" });
  }

  const noteDate = parseDate(date);

  if (!noteDate) {
    return res.status(400).json({ success: false, message: "Invalid date" });
  }

  if (!(toPaise(amount) > 0)) {
    return res
      .status(400)
      .json({ success: false, message: "Enter a valid credit note amount" });
  }

  if (!CREDIT_REASONS.includes(reason)) {
    return res.status(400).json({ success: false, message: "Invalid credit reason" });
  }

  return runTransaction(res, 201, "Credit note saved successfully", async (session) => {
    const bill = await DealerLedger.findOne(
      unpaidBillFilter({ _id: ledgerId, dealerId }),
    ).session(session);

    if (!bill) {
      throw new Error("Bill not found or already paid");
    }

    const amountPaise = toPaise(amount);

    if (amountPaise > remainingOf(bill)) {
      throw new Error("Credit note cannot exceed the bill outstanding");
    }

    await applyToBill(session, bill, amountPaise);

    const id = new mongoose.Types.ObjectId();

    const [entry] = await Ledger.create(
      [
        {
          _id: id,
          entryNumber: newEntryNumber("CN", id),
          entryType: "CREDIT_NOTE",
          dealerId: bill.dealerId,
          date: noteDate,
          amount: fromPaise(amountPaise),
          creditReason: reason,
          allocations: [
            {
              ledgerId: bill._id,
              refType: refTypeOf(bill),
              complaintNumber: bill.complaintNumber,
              amount: fromPaise(amountPaise),
            },
          ],
          remarks: String(remark).trim(),
          createdBy: req.user?._id || null,
        },
      ],
      { session },
    );

    return { _id: entry._id, entryNumber: entry.entryNumber, amount: entry.amount };
  });
};

/*
|--------------------------------------------------------------------------
| POST /security-deposits   — receive security money
| { dealerId, amount, date, paymentMode, reference, remark }
| (Refunds keep using /dealers/security-refunds/:dealerId/refund)
|--------------------------------------------------------------------------
*/

export const createSecurityDeposit = async (req, res) => {
  const { dealerId, amount, date, paymentMode, reference = "", remark = "" } = req.body;

  if (!isValidId(dealerId)) {
    return res.status(400).json({ success: false, message: "Select a dealer" });
  }

  const depositDate = parseDate(date);

  if (!depositDate) {
    return res.status(400).json({ success: false, message: "Invalid date" });
  }

  if (!(toPaise(amount) > 0)) {
    return res.status(400).json({ success: false, message: "Enter a valid amount" });
  }

  if (!PAYMENT_MODES.includes(paymentMode)) {
    return res.status(400).json({ success: false, message: "Invalid payment mode" });
  }

  return runTransaction(res, 201, "Security deposit recorded successfully", async (session) => {
    const dealer = await Dealer.findById(dealerId).session(session);

    if (!dealer) {
      throw new Error("Dealer not found");
    }

    const amountPaise = toPaise(amount);

    const update = await Dealer.updateOne(
      { _id: dealer._id, ...sameAmount("securityAmount", dealer.securityAmount) },
      {
        $set: {
          securityAmount: fromPaise(toPaise(dealer.securityAmount || 0) + amountPaise),
        },
      },
      { session },
    );

    if (update.matchedCount !== 1) {
      throw new Error("Dealer security changed. Please retry.");
    }

    const id = new mongoose.Types.ObjectId();

    const [entry] = await Ledger.create(
      [
        {
          _id: id,
          entryNumber: newEntryNumber("SEC", id),
          entryType: "SECURITY_DEPOSIT",
          dealerId: dealer._id,
          date: depositDate,
          amount: fromPaise(amountPaise),
          paymentMode,
          reference: String(reference).trim(),
          remarks: String(remark).trim(),
          createdBy: req.user?._id || null,
        },
      ],
      { session },
    );

    return {
      _id: entry._id,
      entryNumber: entry.entryNumber,
      amount: entry.amount,
      securityAmount: fromPaise(toPaise(dealer.securityAmount || 0) + amountPaise),
    };
  });
};

/*
|--------------------------------------------------------------------------
| Date range helper  (fromDate / toDate are YYYY-MM-DD, toDate inclusive)
|--------------------------------------------------------------------------
*/

const parseRange = (fromDate, toDate) => {
  const range = { from: null, toExclusive: null };

  if (fromDate) {
    const from = new Date(`${fromDate}T00:00:00.000Z`);

    if (Number.isNaN(from.getTime())) return { error: "Invalid fromDate" };

    range.from = from;
  }

  if (toDate) {
    const to = new Date(`${toDate}T00:00:00.000Z`);

    if (Number.isNaN(to.getTime())) return { error: "Invalid toDate" };

    to.setUTCDate(to.getUTCDate() + 1);
    range.toExclusive = to;
  }

  return range;
};

/*
|--------------------------------------------------------------------------
| GET /dealer/:dealerId/statement?fromDate&toDate
|--------------------------------------------------------------------------
|
| Dealer ledger:
|   Debit  = approved bills (sales / cancellation / dummy bill)
|   Credit = receipts and credit notes
| Adjustments are shown as child lines under the receipt they used, and
| bill allocations as child lines under the credit note.
| balance > 0 = Dr (dealer owes), < 0 = Cr.
|
*/

export const getDealerStatement = async (req, res) => {
  try {
    const { dealerId } = req.params;

    if (!isValidId(dealerId)) {
      return res.status(400).json({ success: false, message: "Invalid dealer ID" });
    }

    const range = parseRange(req.query.fromDate, req.query.toDate);

    if (range.error) {
      return res.status(400).json({ success: false, message: range.error });
    }

    const [bills, receipts, notes, adjustments] = await Promise.all([
      DealerLedger.find({
        dealerId,
        entryType: "DEBIT",
        status: "APPROVED",
        reversed: false,
        $or: [
          {
            transactionType: { $in: ["CLOSURE", "CANCELLATION"] },
            complaintId: { $ne: null },
          },
          { transactionType: "DUMMY_BILL" },
        ],
      })
        .select("transactionType complaintNumber amount billingDate createdAt")
        .lean(),

      Ledger.find({ dealerId, entryType: "RECEIPT", status: "ACTIVE" }).lean(),
      Ledger.find({ dealerId, entryType: "CREDIT_NOTE", status: "ACTIVE" }).lean(),
      Ledger.find({ dealerId, entryType: "ADJUSTMENT", status: "ACTIVE" }).lean(),
    ]);

    const childrenByReceipt = new Map();

    for (const adjustment of adjustments) {
      const key = String(adjustment.receiptId);
      const list = childrenByReceipt.get(key) || [];

      for (const allocation of adjustment.allocations || []) {
        list.push({
          date: adjustment.date,
          particulars: allocation.complaintNumber,
          amount: allocation.amount,
        });
      }

      childrenByReceipt.set(key, list);
    }

    const entries = [
      ...bills.map((bill) => ({
        key: `bill-${bill._id}`,
        date: bill.billingDate,
        sortId: String(bill._id),
        particulars: bill.complaintNumber,
        reference: "",
        type:
          bill.transactionType === "DUMMY_BILL"
            ? "Dummy Bill"
            : bill.transactionType === "CANCELLATION"
              ? "Cancellation"
              : "Sales",
        debitPaise: toPaise(bill.amount),
        creditPaise: 0,
        children: [],
      })),

      ...receipts.map((receipt) => ({
        key: `receipt-${receipt._id}`,
        date: receipt.date,
        sortId: String(receipt._id),
        particulars: "Receipt",
        reference: receipt.entryNumber,
        type: "Receipt",
        debitPaise: 0,
        creditPaise: toPaise(receipt.amount),
        children: (childrenByReceipt.get(String(receipt._id)) || []).sort(
          (a, b) => new Date(a.date) - new Date(b.date),
        ),
      })),

      ...notes.map((note) => ({
        key: `note-${note._id}`,
        date: note.date,
        sortId: String(note._id),
        particulars: "Credit Note",
        reference: note.entryNumber,
        type: "Credit Note",
        debitPaise: 0,
        creditPaise: toPaise(note.amount),
        children: (note.allocations || []).map((allocation) => ({
          date: note.date,
          particulars: allocation.complaintNumber,
          amount: allocation.amount,
        })),
      })),
    ].sort(
      (a, b) =>
        new Date(a.date) - new Date(b.date) || a.sortId.localeCompare(b.sortId),
    );

    let running = 0;
    let openingPaise = 0;
    let debitTotal = 0;
    let creditTotal = 0;
    const rows = [];

    for (const entry of entries) {
      const time = new Date(entry.date).getTime();

      running += entry.debitPaise - entry.creditPaise;

      if (range.from && time < range.from.getTime()) {
        openingPaise = running;
        continue;
      }

      if (range.toExclusive && time >= range.toExclusive.getTime()) {
        continue;
      }

      debitTotal += entry.debitPaise;
      creditTotal += entry.creditPaise;

      rows.push({
        key: entry.key,
        date: entry.date,
        particulars: entry.particulars,
        reference: entry.reference,
        type: entry.type,
        debit: fromPaise(entry.debitPaise),
        credit: fromPaise(entry.creditPaise),
        balance: fromPaise(running),
        children: entry.children,
      });
    }

    // Balance after the last row inside the range (or the opening balance)
    const closingPaise = rows.length
      ? toPaise(rows[rows.length - 1].balance)
      : openingPaise;

    return res.status(200).json({
      success: true,
      data: {
        openingBalance: fromPaise(openingPaise),
        rows,
        totals: {
          debit: fromPaise(debitTotal),
          credit: fromPaise(creditTotal),
          closingBalance: fromPaise(closingPaise),
        },
      },
    });
  } catch (error) {
    console.error("Dealer statement error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dealer ledger",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET /dealer/:dealerId/pending-bills?fromDate&toDate
| Approved bills (real + dummy) that are not fully settled
|--------------------------------------------------------------------------
*/

export const getDealerPendingBills = async (req, res) => {
  try {
    const { dealerId } = req.params;

    if (!isValidId(dealerId)) {
      return res.status(400).json({ success: false, message: "Invalid dealer ID" });
    }

    const range = parseRange(req.query.fromDate, req.query.toDate);

    if (range.error) {
      return res.status(400).json({ success: false, message: range.error });
    }

    const filter = unpaidBillFilter({ dealerId });

    if (range.from || range.toExclusive) {
      filter.billingDate = {
        ...(range.from && { $gte: range.from }),
        ...(range.toExclusive && { $lt: range.toExclusive }),
      };
    }

    const bills = await DealerLedger.find(filter)
      .select(
        "transactionType complaintNumber productName serviceDescription customerInfo amount paidAmount paymentStatus billingDate",
      )
      .sort({ billingDate: 1, _id: 1 })
      .lean();

    const now = Date.now();

    const rows = bills
      .map((bill) => ({
        ...formatBill(bill),
        ageDays: Math.max(
          0,
          Math.floor((now - new Date(bill.billingDate).getTime()) / 86400000),
        ),
      }))
      .filter((bill) => bill.remainingAmount > 0);

    const sum = (field) =>
      fromPaise(rows.reduce((total, bill) => total + toPaise(bill[field]), 0));

    return res.status(200).json({
      success: true,
      data: {
        rows,
        totals: {
          count: rows.length,
          amount: sum("amount"),
          paidAmount: sum("paidAmount"),
          remainingAmount: sum("remainingAmount"),
        },
      },
    });
  } catch (error) {
    console.error("Dealer pending bills error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending bills",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET /dealer/:dealerId/bills?fromDate&toDate&paymentStatus
| Every bill of the dealer (real + dummy), settled or not
|--------------------------------------------------------------------------
*/

export const getDealerAllBills = async (req, res) => {
  try {
    const { dealerId } = req.params;
    const paymentStatus = String(req.query.paymentStatus || "ALL");

    if (!isValidId(dealerId)) {
      return res.status(400).json({ success: false, message: "Invalid dealer ID" });
    }

    const range = parseRange(req.query.fromDate, req.query.toDate);

    if (range.error) {
      return res.status(400).json({ success: false, message: range.error });
    }

    const filter = {
      dealerId,
      entryType: "DEBIT",
      reversed: false,
      $or: [
        {
          transactionType: { $in: ["CLOSURE", "CANCELLATION"] },
          complaintId: { $ne: null },
        },
        { transactionType: "DUMMY_BILL" },
      ],
    };

    if (paymentStatus === "UNPAID") {
      filter.paymentStatus = { $in: ["UNPAID", null] };
    } else if (["PARTIALLY_PAID", "PAID"].includes(paymentStatus)) {
      filter.paymentStatus = paymentStatus;
    }

    if (range.from || range.toExclusive) {
      filter.billingDate = {
        ...(range.from && { $gte: range.from }),
        ...(range.toExclusive && { $lt: range.toExclusive }),
      };
    }

    const bills = await DealerLedger.find(filter)
      .select(
        "transactionType complaintNumber productName serviceDescription customerInfo amount paidAmount paymentStatus status billingDate",
      )
      .sort({ billingDate: 1, _id: 1 })
      .lean();

    const rows = bills.map((bill) => ({
      ...formatBill(bill),
      paymentStatus: bill.paymentStatus || "UNPAID",
      status: bill.status,
    }));

    const sum = (field) =>
      fromPaise(rows.reduce((total, bill) => total + toPaise(bill[field]), 0));

    return res.status(200).json({
      success: true,
      data: {
        rows,
        totals: {
          count: rows.length,
          amount: sum("amount"),
          paidAmount: sum("paidAmount"),
          remainingAmount: sum("remainingAmount"),
        },
      },
    });
  } catch (error) {
    console.error("Dealer all bills error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dealer bills",
    });
  }
};
