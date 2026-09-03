import mongoose from "mongoose";

const citySchema = new mongoose.Schema(
  {
    city_id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },

    city_name: {
      type: String,
      required: true,
      trim: true,
    },

    district_id: {
      type: Number,
      // required: true,
      index: true,
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

export default mongoose.model("City", citySchema);