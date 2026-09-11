import mongoose from "mongoose";

const dailyCapacityUsageSchema =
  new mongoose.Schema(
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
        type: String,
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

      /*
       * COMBINED => null
       *
       * INDIVIDUAL => actual product id
       */
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

dailyCapacityUsageSchema.index(
  {
    allocationId: 1,
    dealerId: 1,
    date: 1,
    cityId: 1,
    capacityRuleId: 1,
    productId: 1,
  },
  {
    unique: true,
  },
);

export default mongoose.model(
  "DailyCapacityUsage",
  dailyCapacityUsageSchema,
);