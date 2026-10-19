import AllocationSettings from "../model/allocationSettings.model.js";

export const DEFAULT_SETTINGS = {
  autoAllocationEnabled: true,
  excludedCities: [],
  useCreditLimit: false,
  rangeFrom: null,
  rangeTo: null,
  noActionStartedAt: null,
  noActionReminderEnabled: true,
  noActionReminderMinutes: 30,
  noActionPenaltyEnabled: true,
  noActionPenaltyAfterMinutes: 30,
  noActionPenaltyAmount: 0,
  monthlyRecalcEnabled: false,
  monthlyRecalcDay: 1,
  lastScheduledRunAt: null,
  lastScheduledRunStatus: "",
  lastAppliedAt: null,
  lastAppliedSummary: null,
};

// Returns the saved settings (or defaults when nothing was saved yet)
export const getAllocationSettings = async () => {
  const saved = await AllocationSettings.findOne({ key: "DEFAULT" }).lean();

  return { ...DEFAULT_SETTINGS, ...(saved || {}) };
};

// Outstanding of a dealer from the running balance (DR positive, CR negative)
export const dealerOutstanding = (dealer) => {
  const balance = Number(dealer?.openingBalance || 0);

  return dealer?.openingBalanceType === "CR" ? -balance : balance;
};

// A dealer is blocked only when a credit limit is configured and used up
export const isOverCreditLimit = (dealer) => {
  const limit = Number(dealer?.creditLimit || 0);

  if (limit <= 0) return false;

  return dealerOutstanding(dealer) >= limit;
};
