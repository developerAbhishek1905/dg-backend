import mongoose from "mongoose";

const districtSchema = new mongoose.Schema(
  {
    district_id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },

    district_name: {
      type: String,
      required: true,
      trim: true,
    },

    state_id: {
      type: Number,
      required: true,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

export default mongoose.model("District", districtSchema);