
import mongoose from "mongoose";

/*
|--------------------------------------------------------------------------
| Account Entry Sub Schema
|--------------------------------------------------------------------------
*/

const accountEntrySchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
  },
  {
    _id: true,
  },
);

/*
|--------------------------------------------------------------------------
| Dealer Ledger Schema
|--------------------------------------------------------------------------
*/

const dealerLedgerSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | Dealer Information
    |--------------------------------------------------------------------------
    */

    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
      index: true,
    },

    dealerCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
      index: true,
    },

    dealerName: {
      type: String,
      trim: true,
      default: "",
    },

    /*
    |--------------------------------------------------------------------------
    | Complaint Information
    |--------------------------------------------------------------------------
    */

    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      default: null,
      index: true,
    },

    complaintNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Transaction Type
    |--------------------------------------------------------------------------
    */

    transactionType: {
      type: String,
      enum: [
        "OPENING_BALANCE",
        "CLOSURE",
        "CANCELLATION",
        "ADJUSTMENT",
        "PAYMENT",
        "DUMMY_BILL",
        "PENALTY",
      ],
      required: true,
      index: true,
    },

    billingType: {
      type: String,
      enum: [
        "OPENING_BALANCE",
        "FIXED",
        "PARTIAL_PAYMENT",
        "PROFIT_SHARING",
        "CANCELLATION",
        "ADJUSTMENT",
        "PAYMENT",
        "DUMMY_BILL",
        "PENALTY",
      ],
      required: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Entry Source
    |--------------------------------------------------------------------------
    */

    entrySource: {
      type: String,
      enum: ["SYSTEM", "MANUAL_ACCOUNT_ENTRY"],
      default: "SYSTEM",
      index: true,
    },

    referenceNumber: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Multiple Debit / Credit Account Entries
    |--------------------------------------------------------------------------
    |
    | Used for MANUAL_ACCOUNT_ENTRY.
    |
    | Example:
    |
    | Debit:
    | OUTSTANDING A/C       3000
    | SECURITY DEPOSIT A/C  2000
    |
    | Credit:
    | PAYMENT A/C           5000
    |
    */

    debitEntries: {
      type: [accountEntrySchema],
      default: [],
    },

    creditEntries: {
      type: [accountEntrySchema],
      default: [],
    },

    totalDebit: {
      type: Number,
      min: 0,
      default: 0,
    },

    totalCredit: {
      type: Number,
      min: 0,
      default: 0,
    },

    /*
    |--------------------------------------------------------------------------
    | Customer Information (used by DUMMY_BILL)
    |--------------------------------------------------------------------------
    */

    customerInfo: {
      name: { type: String, trim: true, default: "" },
      mobile: { type: String, trim: true, default: "" },
      address: { type: String, trim: true, default: "" },
    },

    /*
    |--------------------------------------------------------------------------
    | Product / Service Snapshot
    |--------------------------------------------------------------------------
    */

    productId: {
      type: Number,
      default: null,
      index: true,
    },

    productName: {
      type: String,
      trim: true,
      default: "",
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    category: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    serviceDescription: {
      type: String,
      trim: true,
      default: "",
    },

    /*
    |--------------------------------------------------------------------------
    | Billing Calculation
    |--------------------------------------------------------------------------
    */

    customerAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    profitAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    baseAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    serviceRate: {
      type: Number,
      min: 0,
      default: 0,
    },

    /*
    |--------------------------------------------------------------------------
    | Existing Single Ledger Amount
    |--------------------------------------------------------------------------
    |
    | Used by existing billing/payment functionality.
    |
    | For manual account entries, use debitEntries/creditEntries
    | instead of treating this amount as the voucher total.
    |
    */

    amount: {
      type: Number,
      min: 0,
      required: true,
    },

    entryType: {
      type: String,
      enum: ["DEBIT", "CREDIT"],
      default: "DEBIT",
      required: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Cancellation Details
    |--------------------------------------------------------------------------
    */

    cancellationReason: {
      type: String,
      trim: true,
      default: "",
    },

    cancellationApproved: {
      type: Boolean,
      default: false,
    },

    cancellationApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    cancellationApprovedAt: {
      type: Date,
      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | Calculation Snapshot
    |--------------------------------------------------------------------------
    */

    calculation: {
      fixedRate: {
        type: Number,
        default: 0,
      },

      customerAmount: {
        type: Number,
        default: 0,
      },

      profitAmount: {
        type: Number,
        default: 0,
      },

      percentage: {
        type: Number,
        default: 0,
      },
    },

    /*
    |--------------------------------------------------------------------------
    | Description / Remarks
    |--------------------------------------------------------------------------
    */

    description: {
      type: String,
      trim: true,
      default: "",
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    /*
    |--------------------------------------------------------------------------
    | Billing Status
    |--------------------------------------------------------------------------
    */

    status: {
      type: String,
      enum: [
        "PENDING",
        "APPROVED",
        "BILLED",
        "REVERSED",
        "CANCELLED",
      ],
      default: "APPROVED",
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Billing Date / Created By
    |--------------------------------------------------------------------------
    */

    billingDate: {
      type: Date,
      default: Date.now,
      index: true,
    },

    billedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | Units / Closure Remark
    |--------------------------------------------------------------------------
    */

    units: {
      type: Number,
      min: 1,
      default: 1,
    },

    closingRemark: {
      type: String,
      trim: true,
      default: "",
    },

    /*
    |--------------------------------------------------------------------------
    | Payment Tracking
    |--------------------------------------------------------------------------
    */

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DealerPayment",
      default: null,
      index: true,
    },

    paidAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PARTIALLY_PAID", "PAID"],
      default: "UNPAID",
      index: true,
    },

    lastPaymentAt: {
      type: Date,
      default: null,
    },

    /*
    |--------------------------------------------------------------------------
    | Reversal
    |--------------------------------------------------------------------------
    */

    reversed: {
      type: Boolean,
      default: false,
    },

    reversedAt: {
      type: Date,
      default: null,
    },

    reversedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reversalReason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

/*
|--------------------------------------------------------------------------
| Calculate Manual Debit / Credit Totals
|--------------------------------------------------------------------------
*/

dealerLedgerSchema.pre("validate", function () {
  if (this.entrySource !== "MANUAL_ACCOUNT_ENTRY") {
    return;
  }

  const debitEntries = this.debitEntries ?? [];
  const creditEntries = this.creditEntries ?? [];

  const calculateTotal = (entries) =>
    Math.round(
      entries.reduce(
        (sum, entry) => sum + Number(entry.amount || 0),
        0,
      ) * 100,
    ) / 100;

  this.totalDebit = calculateTotal(debitEntries);
  this.totalCredit = calculateTotal(creditEntries);

  if (
    debitEntries.length === 0 &&
    creditEntries.length === 0
  ) {
    this.invalidate(
      "debitEntries",
      "At least one debit or credit entry is required",
    );
  }

  // Existing single-sided amount is not applicable to
  // a manual multi-account voucher.
  this.amount = 0;
  this.entryType = "DEBIT";

  // Intentionally no debit === credit validation here.
  // Enable that rule if only balanced journal entries
  // should be allowed.
});

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

// Dealer ledger history
dealerLedgerSchema.index({
  dealerId: 1,
  billingDate: -1,
});

// Complaint billing
dealerLedgerSchema.index({
  complaintId: 1,
});

// Dealer transaction reports
dealerLedgerSchema.index({
  dealerId: 1,
  transactionType: 1,
  billingDate: -1,
});

// Monthly billing reports
dealerLedgerSchema.index({
  dealerId: 1,
  status: 1,
  billingDate: -1,
});

// Account-wise debit lookup
dealerLedgerSchema.index({
  "debitEntries.accountId": 1,
  billingDate: -1,
});

// Account-wise credit lookup
dealerLedgerSchema.index({
  "creditEntries.accountId": 1,
  billingDate: -1,
});

// Manual entry reports
dealerLedgerSchema.index({
  entrySource: 1,
  dealerId: 1,
  billingDate: -1,
});

export default mongoose.model(
  "DealerLedger",
  dealerLedgerSchema,
);
