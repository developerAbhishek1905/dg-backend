import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    // groupCategoryCode: {
    //   type: String,
    //   // required: true,
    //   trim: true,
    //   uppercase: true,
    //   unique: true,
    //   index: true,
    // },

    product_id: {
      type: Number,
      required: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    category: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },

    categoryDescription: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Category", categorySchema);