import mongoose from "mongoose";

export const REASON_TYPES = [
  "close",
  "on_call_pending",
  "after_call_pending",
  "on_call_cancel",
  "after_call_cancel",
];

const reasonSchema = new mongoose.Schema({
  reasonName: { type: String, required: true, trim: true },
  reasonType: { type: String, required: true, enum: REASON_TYPES },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Names are unique within a type, ignoring case (including concurrent writes).
reasonSchema.index({ reasonType: 1, reasonName: 1 }, {
  unique: true,
  collation: { locale: "en", strength: 2 },
});
reasonSchema.index({ isActive: 1, reasonType: 1 });

export default mongoose.model("Reason", reasonSchema);
