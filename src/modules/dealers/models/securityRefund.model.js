import mongoose from "mongoose";

const securityRefundSchema = new mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
      index: true,
    },

    refundAmount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    securityAmountBefore: {
      type: Number,
      required: true,
    },

    securityAmountAfter: {
      type: Number,
      required: true,
      default: 0,
    },

    dateOfLeaving: {
      type: Date,
      required: true,
    },

    eligibleRefundDate: {
      type: Date,
      required: true,
    },

    refundDate: {
      type: Date,
      required: true,
      default: Date.now,
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

    refundedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

securityRefundSchema.index({
  dealerId: 1,
  refundDate: -1,
});

export default mongoose.model(
  "SecurityRefund",
  securityRefundSchema,
);