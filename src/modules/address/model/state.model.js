import mongoose from "mongoose";

const stateSchema = new mongoose.Schema(
  {
    state_id: {
      type: Number,
      unique: true,
      required: true,
      index: true,
    },

    state_name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("State", stateSchema);
