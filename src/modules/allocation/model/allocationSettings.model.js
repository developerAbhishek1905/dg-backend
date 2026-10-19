import mongoose from "mongoose";

/*
|--------------------------------------------------------------------------
| AUTO ALLOCATION SETTINGS (single document)
|--------------------------------------------------------------------------
*/

const excludedCitySchema = new mongoose.Schema(
  {
    cityId: { type: Number, required: true },
    cityName: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const allocationSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "DEFAULT",
      unique: true,
    },

    // Master on / off switch for automatic dealer allocation
    autoAllocationEnabled: {
      type: Boolean,
      default: true,
    },

    // No automatic allocation for complaints of these cities
    excludedCities: {
      type: [excludedCitySchema],
      default: [],
    },

    // Skip dealers whose outstanding has reached their Dealer.creditLimit
    useCreditLimit: {
      type: Boolean,
      default: false,
    },

    // Performance period used when the settings are applied
    rangeFrom: { type: Date, default: null },
    rangeTo: { type: Date, default: null },

    // No-action reminder + automatic penalty
    noActionReminderEnabled: { type: Boolean, default: true },
    noActionReminderMinutes: { type: Number, min: 1, max: 1440, default: 30 },
    noActionPenaltyEnabled: { type: Boolean, default: true },
    // minutes after the reminder before the penalty bill is raised
    noActionPenaltyAfterMinutes: { type: Number, min: 1, max: 1440, default: 30 },
    // 0 = use the dealer's cancellation charge
    noActionPenaltyAmount: { type: Number, min: 0, default: 0 },

    // Set once, on first run: complaints allocated before this are ignored
    noActionStartedAt: { type: Date, default: null },

    // Monthly automatic recalculation (previous one month)
    monthlyRecalcEnabled: { type: Boolean, default: false },
    monthlyRecalcDay: { type: Number, min: 1, max: 28, default: 1 },
    lastScheduledRunKey: { type: String, default: "" },
    lastScheduledRunAt: { type: Date, default: null },
    lastScheduledRunStatus: { type: String, default: "" },

    lastAppliedAt: { type: Date, default: null },

    lastAppliedSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model("AllocationSettings", allocationSettingsSchema);
