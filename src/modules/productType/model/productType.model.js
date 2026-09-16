import mongoose from "mongoose";

const productTypeSchema = new mongoose.Schema(
  {
    product_id: {
      type: Number,
      required: true,
      index: true,
    },

    product_code: {
      type: String,
    //   required: true,
      trim: true,
      uppercase: true,
    },

    product_type: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Same product code cannot repeat inside same product
productTypeSchema.index(
  {
    product_id: 1,
  },
  {
    unique: true,
  },
);

// Same product type cannot repeat inside same product


export default mongoose.model("ProductType", productTypeSchema);
