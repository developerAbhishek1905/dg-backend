import mongoose from "mongoose";

/**
 * Leave registered by a dealer from the dealer panel.
 * Dates are stored as plain "YYYY-MM-DD" strings (no timezone shifts).
 */
const dealerLeaveSchema = new mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
      index: true,
    },
    fromDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    toDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "CANCELLED"],
      default: "ACTIVE",
      index: true,
    },
    cancelledAt: { type: Date, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

dealerLeaveSchema.index({ dealerId: 1, fromDate: 1, toDate: 1 });

export default mongoose.model("DealerLeave", dealerLeaveSchema);
