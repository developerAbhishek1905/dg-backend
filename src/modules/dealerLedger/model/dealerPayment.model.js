import mongoose from "mongoose";

const dealerPaymentSchema = new mongoose.Schema(
  {
    paymentNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
      index: true,
    },

    additionalAmount: {
      type: Number,
      min: 0,
      required: true,
    },

    selectedBillsTotal: {
      type: Number,
      min: 0,
      required: true,
    },

    complaintBills: [
      {
        ledgerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "DealerLedger",
          required: true,
        },

        complaintId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Complaint",
          required: true,
        },

        complaintNumber: {
          type: String,
          required: true,
        },

        amount: {
          type: Number,
          min: 0,
          required: true,
        },
      },
    ],

    openingOutstanding: {
      type: Number,
      required: true,
    },

    closingOutstanding: {
      type: Number,
      required: true,
    },

    paymentDate: {
      type: Date,
      required: true,
    },

    paymentMode: {
      type: String,
      enum: ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE"],
      required: true,
    },

    transactionReference: {
      type: String,
      trim: true,
      default: "",
    },

    remark: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["COMPLETED", "REVERSED"],
      default: "COMPLETED",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

dealerPaymentSchema.index({
  dealerId: 1,
  paymentDate: -1,
});

export default mongoose.model(
  "DealerPayment",
  dealerPaymentSchema,
);