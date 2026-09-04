import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
  {
    brandName: {
      type: String,
      required: true,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Prevent exact duplicate brand names
brandSchema.index({ brandName: 1 }, { unique: true });

export default mongoose.model("Brand", brandSchema);
