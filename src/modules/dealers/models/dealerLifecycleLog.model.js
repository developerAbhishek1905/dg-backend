import mongoose from "mongoose";

const dealerLifecycleLogSchema = new mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "JOINED",
        "LEFT",
        "SUSPENDED",
        "REJOINED",
      ],
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    reason: {
      type: String,
      default: "",
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

dealerLifecycleLogSchema.index({
  dealerId: 1,
  date: -1,
});

const DealerLifecycleLog = mongoose.model(
  "DealerLifecycleLog",
  dealerLifecycleLogSchema,
);

export default DealerLifecycleLog;