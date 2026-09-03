import mongoose from "mongoose";

const pincodeSchema = new mongoose.Schema(
  {
    pincode_id: {
      type: Number,
      // required: true,
      unique: true,
      index: true,
    },

    pincode_name: {
      type: String,
      required: true,
      trim: true,
    },

    city_id: {
      type: Number,
      required: true,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

export default mongoose.model("Pincode", pincodeSchema);