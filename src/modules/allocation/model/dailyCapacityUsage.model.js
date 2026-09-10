const dailyCapacityUsageSchema = new mongoose.Schema(
  {
    allocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Allocation",
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
      index: true,
    },

    cityId: {
      type: Number,
      required: true,
    },

    capacityRuleId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    productId: {
      type: Number,
      default: null,
    },

    usedCapacity: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("DailyCapacityUsage", dailyCapacityUsageSchema);
