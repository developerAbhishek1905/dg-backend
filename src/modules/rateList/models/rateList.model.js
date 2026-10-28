import mongoose from "mongoose";

/*
|--------------------------------------------------------------------------
| CLOSURE MASTER
|--------------------------------------------------------------------------
| A titled entry linked to a product.
*/

const closureMasterSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    productId: {
      type: Number,
      required: true,
      index: true,
    },

    productName: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      index: true,
    },
  },
  { timestamps: true },
);

// Fresh collection (the earlier category-based draft used "ratelists")
export default mongoose.model(
  "ClosureMaster",
  closureMasterSchema,
  "closure_masters",
);
