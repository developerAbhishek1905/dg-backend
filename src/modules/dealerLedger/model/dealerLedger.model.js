import mongoose from "mongoose";

const dealerLedgerSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | Dealer
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
    | Complaint
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
    |
    | CLOSURE      -> normal complaint closure billing
    | CANCELLATION -> approved cancellation billing
    | ADJUSTMENT   -> manual debit/credit adjustment
    |
    */

    transactionType: {
      type: String,
      enum: ["OPENING_BALANCE", "CLOSURE", "CANCELLATION", "ADJUSTMENT"],
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
      ],
      required: true,
      index: true,
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

    // Amount on which percentage calculation is performed.
    // Example: dealer collected ₹5000 from customer.

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

    // Billing percentage configured at the time of billing.
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // Fixed service rate snapshot.
    // Example: AC Installation = ₹300
    serviceRate: {
      type: Number,
      min: 0,
      default: 0,
    },

    /*
    |--------------------------------------------------------------------------
    | Final Ledger Amount
    |--------------------------------------------------------------------------
    */

    amount: {
      type: Number,
      min: 0,
      required: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Debit / Credit
    |--------------------------------------------------------------------------
    |
    | DEBIT:
    | DG is charging dealer.
    |
    | CREDIT:
    | DG is giving adjustment/credit to dealer.
    |
    */

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
    | Source / Calculation Snapshot
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
    | Description
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
      enum: ["PENDING", "APPROVED", "BILLED", "REVERSED", "CANCELLED"],
      default: "APPROVED",
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Billing Date
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
| Indexes
|--------------------------------------------------------------------------
*/

// Fast dealer ledger/history
dealerLedgerSchema.index({
  dealerId: 1,
  billingDate: -1,
});

// Complaint billing lookup
dealerLedgerSchema.index({
  complaintId: 1,
});

// Reports
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

export default mongoose.model("DealerLedger", dealerLedgerSchema);
