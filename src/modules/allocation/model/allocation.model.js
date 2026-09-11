// import mongoose from "mongoose";

// const allocationSchema = mongoose.Schema({
//   dealers: [
//     {
//       dealerId: { type: mongoose.Schema.Types.ObjectId, ref: "Dealer" },
//       from:{
//         type:Date
//       },
//       to:{
//         type:Date
//       },
//       rule:{
//         cityId:Number,
//         cityName:String,
//         services:[
//             {type:String}
//         ],
//         capacity:{},
//         status:{
//             type:String,
//             enum:['ACTIVE','INACTIVE','LEAVE'],
//             default: 'ACTIVE'
//         }
//       }
//     },
//   ],
// });

import mongoose from "mongoose";

const allocationServiceSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    category: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    categoryDescription: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: false,
  },
);

const allocationProductSchema = new mongoose.Schema(
  {
    productId: {
      type: Number,
      required: true,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },

    services: {
      type: [allocationServiceSchema],
      default: [],
    },

    /*
     * Used when capacity type is INDIVIDUAL.
     *
     * All categories/services under this product
     * consume this product's daily capacity.
     */
    dailyCapacity: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    _id: false,
  },
);

const capacityRuleSchema = new mongoose.Schema(
  {
    capacityType: {
      type: String,
      enum: ["COMBINED", "INDIVIDUAL"],
      required: true,
    },

    ruleName: {
      type: String,
      trim: true,
      default: "",
    },

    /*
     * Mainly for COMBINED capacity.
     *
     * Example:
     * Microwave + Refrigerator = 20/day
     */
    dailyCapacity: {
      type: Number,
      min: 0,
      default: 0,
    },

    products: {
      type: [allocationProductSchema],
      default: [],
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
  },
  {
    _id: true,
  },
);

const cityRuleSchema = new mongoose.Schema(
  {
    cityId: Number,

    cityName: String,

    capacityRules: {
      type: [capacityRuleSchema],
      default: [],
    },
  },
  {
    _id: false,
  },
);

const performanceSnapshotSchema = new mongoose.Schema(
  {
    from: {
      type: Date,
    },

    to: {
      type: Date,
    },

    totalAllocated: {
      type: Number,
      default: 0,
    },

    totalCompleted: {
      type: Number,
      default: 0,
    },

    totalCancelled: {
      type: Number,
      default: 0,
    },

    totalPending: {
      type: Number,
      default: 0,
    },

    completionPercentage: {
      type: Number,
      default: 0,
    },

    cancellationPercentage: {
      type: Number,
      default: 0,
    },

    performanceScore: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
  },
);

const allocationSchema = new mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
      index: true,
    },

    dealerCode: {
      type: String,
      trim: true,
    },

    dealerName: {
      type: String,
      trim: true,
    },

    allocationMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
      index: true,
    },

    allocationYear: {
      type: Number,
      required: true,
      index: true,
    },

    /*
     * Monthly average amount for this dealer.
     *
     * Example:
     * Dealer completed ₹3,00,000 business
     * across 300 jobs
     *
     * average_amount = 1000
     */
    average_amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    generatedAt: {
      type: Date,
      default: Date.now,
    },

    from: {
      type: Date,
      required: true,
    },

    to: {
      type: Date,
      required: true,
    },

    // performanceSnapshot: {
    //   type: performanceSnapshotSchema,
    //   default: {},
    // },

    performanceSnapshot: {
      totalAmount: {
        type: Number,
        default: 0,
      },

      average_amount: {
        type: Number,
        default: 0,
      },

      rating: {
        type: Number,
        default: 0,
      },

      totalAllocated: {
        type: Number,
        default: 0,
      },

      totalCompleted: {
        type: Number,
        default: 0,
      },

      performanceScore: {
        type: Number,
        default: 0,
      },
    },

    rules: {
      type: [cityRuleSchema],
      default: [],
    },

    status: {
      type: String,
      enum: ["DRAFT", "ACTIVE", "COMPLETED", "INACTIVE"],
      default: "DRAFT",
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

/*
|--------------------------------------------------------------------------
| ONE ALLOCATION PER DEALER PER MONTH
|--------------------------------------------------------------------------
*/

allocationSchema.index(
  {
    dealerId: 1,
    allocationMonth: 1,
    allocationYear: 1,
  },
  {
    unique: true,
  },
);

export default mongoose.model("Allocation", allocationSchema);
