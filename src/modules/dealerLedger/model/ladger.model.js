import mongoose from "mongoose";

/*
|--------------------------------------------------------------------------
| Ledger (dealer account vouchers)
|--------------------------------------------------------------------------
|
| RECEIPT           Money received from a dealer. Keeps an "adjustedAmount"
|                   so the unadjusted balance can be used later.
| ADJUSTMENT        Uses (part of) a RECEIPT to settle bills:
|                   BILL_REF       -> DealerLedger CLOSURE / CANCELLATION bill
|                   DUMMY_BILL_REF -> DealerLedger DUMMY_BILL
| CREDIT_NOTE       Reduces a bill without a receipt.
| SECURITY_DEPOSIT  Security money received from a dealer.
|
| Bill-level billing data (per complaint) stays in DealerLedger.
|
*/

const allocationSchema = new mongoose.Schema(
  {
    ledgerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DealerLedger",
      required: true,
    },

    refType: {
      type: String,
      enum: ["BILL_REF", "DUMMY_BILL_REF"],
      required: true,
    },

    complaintNumber: {
      type: String,
      trim: true,
      default: "",
    },

    amount: {
      type: Number,
      min: 0.01,
      required: true,
    },
  },
  { _id: false },
);

const ledgerSchema = new mongoose.Schema(
  {
    entryNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    entryType: {
      type: String,
      enum: ["RECEIPT", "ADJUSTMENT", "CREDIT_NOTE", "SECURITY_DEPOSIT"],
      required: true,
      index: true,
    },

    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
      index: true,
    },

    date: {
      type: Date,
      required: true,
      default: Date.now,
    },

    amount: {
      type: Number,
      min: 0.01,
      required: true,
    },

    // RECEIPT only — how much of the receipt has been adjusted so far
    adjustedAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    paymentMode: {
      type: String,
      enum: ["CASH", "UPI", "BANK_TRANSFER", "NET_BANKING", "CHEQUE"],
      default: undefined,
    },

    reference: {
      type: String,
      trim: true,
      default: "",
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    // ADJUSTMENT -> the receipt being used
    receiptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ledger",
      default: null,
      index: true,
    },

    // ADJUSTMENT / CREDIT_NOTE -> bills settled
    allocations: {
      type: [allocationSchema],
      default: [],
    },

    // CREDIT_NOTE only
    creditReason: {
      type: String,
      enum: ["RATE_DIFFERENCE", "BILL_REVERSAL", "SERVICE_ADJUSTMENT", "OTHER"],
      default: undefined,
    },

    // Receipts saved together from the multi-dealer Receipt tab
    batchId: {
      type: String,
      default: "",
      index: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "REVERSED"],
      default: "ACTIVE",
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

ledgerSchema.index({ dealerId: 1, entryType: 1, date: -1 });

export default mongoose.model("Ledger", ledgerSchema);
