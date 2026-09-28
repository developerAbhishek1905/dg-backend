import mongoose from "mongoose";

const dealerLeaveSchema = new mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
      index: true,
    },

    from: {
      type: Date,
      required: true,
      index: true,
    },

    to: {
      type: Date,
      required: true,
      index: true,
    },

    reason: {
      type: String,
      trim: true,
      default: "",
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "SCHEDULED",
        "ACTIVE",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "SCHEDULED",
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    cancellationReason: {
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
| Validate Leave Dates
|--------------------------------------------------------------------------
*/

dealerLeaveSchema.pre("validate", function () {
  if (this.from && this.to && this.to < this.from) {
    throw new Error("Leave end date cannot be before start date");
  }
});

/*
|--------------------------------------------------------------------------
| Useful Indexes
|--------------------------------------------------------------------------
*/

dealerLeaveSchema.index({
  dealerId: 1,
  from: 1,
  to: 1,
});

dealerLeaveSchema.index({
  dealerId: 1,
  status: 1,
});

export default mongoose.model("DealerLeave", dealerLeaveSchema);