import mongoose from "mongoose";
import ComplaintActivityLog from "../../Complaint/models/complaintActivityLog.model.js";
import Allocation from "../model/allocation.model.js";
import AllocationSettings from "../model/allocationSettings.model.js";
import Dealer from "../../dealers/models/dealer.model.js";
import Complaint from "../../Complaint/models/complaint.model.js";
import Ledger from "../../dealerLedger/model/ladger.model.js";
import DealerPayment from "../../dealerLedger/model/dealerPayment.model.js";
import {
  getAllocationSettings,
  isOverCreditLimit,
  dealerOutstanding,
} from "../services/allocationSettings.service.js";

const COMPLETED_STATUSES = ["CLOSED", "CLOSE_ON_VERIFICATION", "CLOSE_ON_BILLING"];
const CANCELLED_STATUSES = ["CANCELLED"];

const toPaise = (value) => Math.round(Number(value || 0) * 100);
const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

/*
|--------------------------------------------------------------------------
| PERIOD STATS PER DEALER
|--------------------------------------------------------------------------
|
|  totalAllocated : complaints assigned to the dealer in the period
|  totalCompleted : of those, the ones the dealer completed
|  totalCancelled : of those, the ones cancelled
|  totalAmount    : payment received against the COMPLETED complaints
|                   (receipt adjustments on bills + "Add Payment" payments;
|                   credit notes are never counted)
|  averageAmount  : totalAmount / totalAllocated (all assigned complaints)
|
*/
const getPeriodStats = async (dealerIds, from, to) => {
  // Complaints are assigned through allocatedDealerId (dealerId is only a
  // fallback for older records)
  const complaints = await Complaint.find({
    $or: [
      { allocatedDealerId: { $in: dealerIds } },
      { dealerId: { $in: dealerIds } },
    ],
    allocatedAt: { $gte: from, $lte: to },
  })
    .select("dealerId allocatedDealerId complaintNumber status")
    .lean();

  const stats = new Map();
  const completedIds = new Set();
  const completedNumbers = new Set();

  const statOf = (dealerId) => {
    const key = String(dealerId);

    if (!stats.has(key)) {
      stats.set(key, {
        totalAllocated: 0,
        totalCompleted: 0,
        totalCancelled: 0,
        completed: { ids: new Set(), numbers: new Set() },
        paise: 0,
      });
    }

    return stats.get(key);
  };

  const wanted = new Set(dealerIds.map(String));

  for (const complaint of complaints) {
    const owner = complaint.allocatedDealerId || complaint.dealerId;

    if (!owner || !wanted.has(String(owner))) continue;

    const stat = statOf(owner);

    stat.totalAllocated += 1;

    if (COMPLETED_STATUSES.includes(complaint.status)) {
      stat.totalCompleted += 1;
      stat.completed.ids.add(String(complaint._id));

      if (complaint.complaintNumber) {
        stat.completed.numbers.add(complaint.complaintNumber);
        completedNumbers.add(complaint.complaintNumber);
      }

      completedIds.add(complaint._id);
    } else if (CANCELLED_STATUSES.includes(complaint.status)) {
      stat.totalCancelled += 1;
    }
  }

  if (completedIds.size) {
    const [adjustments, payments] = await Promise.all([
      Ledger.find({
        entryType: "ADJUSTMENT",
        status: "ACTIVE",
        dealerId: { $in: dealerIds },
        "allocations.complaintNumber": { $in: [...completedNumbers] },
      })
        .select("dealerId allocations")
        .lean(),
      DealerPayment.find({
        status: "COMPLETED",
        dealerId: { $in: dealerIds },
        "complaintBills.complaintId": { $in: [...completedIds] },
      })
        .select("dealerId complaintBills")
        .lean(),
    ]);

    for (const entry of adjustments) {
      const stat = stats.get(String(entry.dealerId));

      if (!stat) continue;

      for (const line of entry.allocations || []) {
        if (line.refType === "BILL_REF" && stat.completed.numbers.has(line.complaintNumber)) {
          stat.paise += toPaise(line.amount);
        }
      }
    }

    for (const payment of payments) {
      const stat = stats.get(String(payment.dealerId));

      if (!stat) continue;

      for (const bill of payment.complaintBills || []) {
        if (stat.completed.ids.has(String(bill.complaintId))) {
          stat.paise += toPaise(bill.amount);
        }
      }
    }
  }

  const result = new Map();

  for (const [key, stat] of stats) {
    const totalAmount = round2(stat.paise / 100);

    result.set(key, {
      totalAllocated: stat.totalAllocated,
      totalCompleted: stat.totalCompleted,
      totalCancelled: stat.totalCancelled,
      totalAmount,
      averageAmount: stat.totalAllocated ? round2(totalAmount / stat.totalAllocated) : 0,
    });
  }

  return result;
};

const parseDate = (value, endOfDay = false) => {
  if (!value) return null;

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) return null;

  if (endOfDay) date.setUTCHours(23, 59, 59, 999);

  return date;
};

/*
| GET /allocation-settings
*/
export const getSettings = async (req, res) => {
  try {
    const settings = await getAllocationSettings();

    return res.json({ success: true, data: settings });
  } catch (error) {
    console.error("Get allocation settings error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load allocation settings",
    });
  }
};

/*
| GET /allocation-settings/cities
| Cities that currently have allocation rules (the only ones that matter)
*/
export const getCityOptions = async (req, res) => {
  try {
    const rows = await Allocation.aggregate([
      { $unwind: "$rules" },
      {
        $group: {
          _id: "$rules.cityId",
          cityName: { $first: "$rules.cityName" },
        },
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { cityName: 1 } },
    ]);

    return res.json({
      success: true,
      data: rows.map((row) => ({
        cityId: Number(row._id),
        cityName: row.cityName || `City ${row._id}`,
      })),
    });
  } catch (error) {
    console.error("Get allocation cities error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load cities",
    });
  }
};

/*
| PUT /allocation-settings
*/
export const saveSettings = async (req, res) => {
  try {
    const {
      autoAllocationEnabled,
      excludedCities = [],
      useCreditLimit,
      rangeFrom,
      rangeTo,
      monthlyRecalcEnabled,
      monthlyRecalcDay,
      noActionReminderEnabled,
      noActionReminderMinutes,
      noActionPenaltyEnabled,
      noActionPenaltyAfterMinutes,
      noActionPenaltyAmount,
    } = req.body;

    const noActionFields = {};

    if (noActionReminderEnabled !== undefined)
      noActionFields.noActionReminderEnabled = Boolean(noActionReminderEnabled);
    if (noActionPenaltyEnabled !== undefined)
      noActionFields.noActionPenaltyEnabled = Boolean(noActionPenaltyEnabled);

    for (const [key, value, min] of [
      ["noActionReminderMinutes", noActionReminderMinutes, 1],
      ["noActionPenaltyAfterMinutes", noActionPenaltyAfterMinutes, 1],
      ["noActionPenaltyAmount", noActionPenaltyAmount, 0],
    ]) {
      if (value === undefined) continue;
      const n = Number(value);
      if (!Number.isFinite(n) || n < min || n > 1440 * (key === "noActionPenaltyAmount" ? 1000 : 1)) {
        return res.status(400).json({ success: false, message: `Invalid value for ${key}` });
      }
      noActionFields[key] = n;
    }

    const recalcDay = Number(monthlyRecalcDay ?? 1);

    if (!Number.isInteger(recalcDay) || recalcDay < 1 || recalcDay > 28) {
      return res.status(400).json({
        success: false,
        message: "Monthly recalculation day must be between 1 and 28",
      });
    }

    const from = parseDate(rangeFrom);
    const to = parseDate(rangeTo, true);

    if ((rangeFrom && !from) || (rangeTo && !to)) {
      return res.status(400).json({ success: false, message: "Invalid date range" });
    }

    if (from && to && from > to) {
      return res.status(400).json({
        success: false,
        message: "From date cannot be after To date",
      });
    }

    const cities = [];
    const seen = new Set();

    for (const item of Array.isArray(excludedCities) ? excludedCities : []) {
      const cityId = Number(item?.cityId);

      if (!Number.isInteger(cityId) || seen.has(cityId)) continue;

      seen.add(cityId);
      cities.push({ cityId, cityName: String(item?.cityName || "").trim() });
    }

    const settings = await AllocationSettings.findOneAndUpdate(
      { key: "DEFAULT" },
      {
        $set: {
          autoAllocationEnabled: Boolean(autoAllocationEnabled),
          excludedCities: cities,
          useCreditLimit: Boolean(useCreditLimit),
          rangeFrom: from,
          rangeTo: to,
          monthlyRecalcEnabled: Boolean(monthlyRecalcEnabled),
          monthlyRecalcDay: recalcDay,
          ...noActionFields,
          updatedBy: req.user?._id || null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    return res.json({
      success: true,
      message: "Allocation settings saved",
      data: settings,
    });
  } catch (error) {
    console.error("Save allocation settings error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to save allocation settings",
    });
  }
};

/*
| Recalculates every dealer's allocation performance for [from, to] and
| stores it on the current month's allocation documents.
| Used by the Apply button and by the monthly scheduler.
*/
export const recalculatePerformance = async ({ from, to, settings }) => {
  const now = new Date();

  const allocations = await Allocation.find({
    allocationMonth: now.getMonth() + 1,
    allocationYear: now.getFullYear(),
  })
    .select("_id dealerId")
    .lean();

  if (!allocations.length) {
    throw Object.assign(new Error("No dealer allocations found for the current month"), {
      status: 404,
    });
  }

  const dealerIds = allocations.map((item) => item.dealerId);

  const complaintMap = await getPeriodStats(dealerIds, new Date(from), new Date(to));

  const dealers = await Dealer.find({ _id: { $in: dealerIds } })
    .select("creditLimit openingBalance openingBalanceType")
    .lean();

  const dealerMap = new Map(dealers.map((item) => [String(item._id), item]));

  let creditBlocked = 0;

  const operations = allocations.map((allocation) => {
    const key = String(allocation.dealerId);
    const stats = complaintMap.get(key);
    const dealer = dealerMap.get(key);

    const totalAllocated = stats?.totalAllocated || 0;
    const totalCompleted = stats?.totalCompleted || 0;
    const totalCancelled = stats?.totalCancelled || 0;

    const totalAmount = stats?.totalAmount || 0;
    const averageAmount = stats?.averageAmount || 0;

    const completionPercentage = totalAllocated
      ? round2((totalCompleted / totalAllocated) * 100)
      : 0;

    const cancellationPercentage = totalAllocated
      ? round2((totalCancelled / totalAllocated) * 100)
      : 0;

    const performanceScore = Math.max(
      0,
      round2(completionPercentage - cancellationPercentage),
    );

    const rating = round2(performanceScore / 20);

    const blocked = Boolean(settings.useCreditLimit && dealer && isOverCreditLimit(dealer));

    if (blocked) creditBlocked += 1;

    return {
      updateOne: {
        filter: { _id: allocation._id },
        update: {
          $set: {
            average_amount: averageAmount,
            creditLimit: Number(dealer?.creditLimit || 0),
            creditBlocked: blocked,
            outstandingAtApply: dealer ? dealerOutstanding(dealer) : 0,
            performanceUpdatedAt: now,
            "performanceSnapshot.totalAmount": totalAmount,
            "performanceSnapshot.average_amount": averageAmount,
            "performanceSnapshot.rating": rating,
            "performanceSnapshot.totalAllocated": totalAllocated,
            "performanceSnapshot.totalCompleted": totalCompleted,
            "performanceSnapshot.totalCancelled": totalCancelled,
            "performanceSnapshot.completionPercentage": completionPercentage,
            "performanceSnapshot.cancellationPercentage": cancellationPercentage,
            "performanceSnapshot.performanceScore": performanceScore,
            "performanceSnapshot.periodFrom": new Date(from),
            "performanceSnapshot.periodTo": new Date(to),
          },
        },
      },
    };
  });

  await Allocation.bulkWrite(operations);

  const summary = {
    from: new Date(from),
    to: new Date(to),
    dealersUpdated: operations.length,
    creditBlocked,
    excludedCities: settings.excludedCities.length,
    autoAllocationEnabled: settings.autoAllocationEnabled,
    useCreditLimit: settings.useCreditLimit,
  };

  await AllocationSettings.updateOne(
    { key: "DEFAULT" },
    {
      $set: {
        lastAppliedAt: now,
        lastAppliedSummary: summary,
        rangeFrom: new Date(from),
        rangeTo: new Date(to),
      },
    },
    { upsert: true },
  );

  return summary;
};

/*
|--------------------------------------------------------------------------
| POST /allocation-settings/apply
|--------------------------------------------------------------------------
|
| For every dealer allocation of the current month, recalculates the
| performance for the saved date range:
|
|  - totalAllocated : complaints allocated to the dealer in the range
|  - totalCompleted : of those, closed complaints
|  - totalCancelled : of those, cancelled complaints
|  - totalAmount    : payment received against the COMPLETED complaints
|                     (credit notes are never counted)
|  - average_amount : totalAmount / totalAllocated
|  - performanceScore (0-100) = completion % - cancellation %
|  - rating (0-5)            = performanceScore / 20
|
| The rating feeds the allocation order (higher rating = larger share).
|
*/
export const applySettings = async (req, res) => {
  try {
    const settings = await getAllocationSettings();

    const from = parseDate(req.body?.rangeFrom) || settings.rangeFrom;
    const to = parseDate(req.body?.rangeTo, true) || settings.rangeTo;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: "Select a date range and save the settings first",
      });
    }

    if (new Date(from) > new Date(to)) {
      return res.status(400).json({
        success: false,
        message: "From date cannot be after To date",
      });
    }

    const summary = await recalculatePerformance({ from, to, settings });

    return res.json({
      success: true,
      message: `Allocation updated for ${summary.dealersUpdated} dealer(s)`,
      data: summary,
    });
  } catch (error) {
    console.error("Apply allocation settings error:", error);

    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to apply allocation settings",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET /allocation-settings/dealers
|--------------------------------------------------------------------------
| ALL dealers, with their allocation performance calculated live for the
| selected period.
| Query: month (1-12, 0 = whole year), year, search, page, limit
*/
export const getDealerAllocations = async (req, res) => {
  try {
    const now = new Date();

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const search = String(req.query.search || "").trim();

    // Period = the saved date range; current month when none is saved
    const settings = await getAllocationSettings();

    const from = settings.rangeFrom
      ? new Date(settings.rangeFrom)
      : new Date(now.getFullYear(), now.getMonth(), 1);

    const to = settings.rangeTo
      ? new Date(settings.rangeTo)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const allocationMonth = from.getMonth() + 1;
    const allocationYear = from.getFullYear();

    const filter = {};

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

      filter.$or = [
        { headCode: regex },
        { technicianFirmName: regex },
        { technicianName: regex },
      ];
    }

    const [total, dealers] = await Promise.all([
      Dealer.countDocuments(filter),
      Dealer.find(filter)
        .sort({ headCode: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select(
          "headCode technicianFirmName technicianName status creditLimit openingBalance openingBalanceType",
        )
        .lean(),
    ]);

    const dealerIds = dealers.map((item) => item._id);

    const [complaintMap, allocations, overrides] = await Promise.all([
      getPeriodStats(dealerIds, from, to),
      Allocation.find({
        dealerId: { $in: dealerIds },
        allocationMonth,
        allocationYear,
      })
        .select("dealerId status rules.cityName")
        .lean(),
      // Manual ratings live on the current month's allocation
      Allocation.find({
        dealerId: { $in: dealerIds },
        allocationMonth: now.getMonth() + 1,
        allocationYear: now.getFullYear(),
      })
        .select("dealerId ratingOverride")
        .lean(),
    ]);

    const overrideMap = new Map(
      overrides
        .filter((item) => item.ratingOverride !== null && item.ratingOverride !== undefined)
        .map((item) => [String(item.dealerId), Number(item.ratingOverride)]),
    );

    const allocationMap = new Map();

    for (const item of allocations) {
      const key = String(item.dealerId);
      const entry = allocationMap.get(key) || { status: item.status, cities: new Set() };

      for (const rule of item.rules || []) {
        if (rule.cityName) entry.cities.add(rule.cityName);
      }

      allocationMap.set(key, entry);
    }

    const data = dealers.map((dealer) => {
      const key = String(dealer._id);
      const stats = complaintMap.get(key);
      const allocation = allocationMap.get(key);

      const totalAllocated = stats?.totalAllocated || 0;
      const totalCompleted = stats?.totalCompleted || 0;
      const totalCancelled = stats?.totalCancelled || 0;

      const totalAmount = stats?.totalAmount || 0;

      const completionPercentage = totalAllocated
        ? round2((totalCompleted / totalAllocated) * 100)
        : 0;

      const cancellationPercentage = totalAllocated
        ? round2((totalCancelled / totalAllocated) * 100)
        : 0;

      const performanceScore = Math.max(0, round2(completionPercentage - cancellationPercentage));

      return {
        dealerId: dealer._id,
        dealerCode: dealer.headCode || "",
        dealerName: dealer.technicianFirmName || dealer.technicianName || "",
        status: dealer.status || "",
        hasAllocation: Boolean(allocation),
        cities: allocation ? [...allocation.cities] : [],
        creditLimit: Number(dealer.creditLimit || 0),
        outstanding: dealerOutstanding(dealer),
        creditBlocked: isOverCreditLimit(dealer),
        totalAllocated,
        totalCompleted,
        totalCancelled,
        completionPercentage,
        totalAmount,
        averageAmount: stats?.averageAmount || 0,
        calculatedRating: round2(performanceScore / 20),
        ratingOverridden: overrideMap.has(key),
        rating: overrideMap.has(key) ? overrideMap.get(key) : round2(performanceScore / 20),
      };
    });

    return res.json({
      success: true,
      data,
      period: { from, to, isDefault: !settings.rangeFrom || !settings.rangeTo },
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    console.error("Get dealer allocations error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load dealer allocations",
    });
  }
};

/*
| PUT /allocation-settings/dealers/:dealerId/rating
| Body: { rating: 0-5 }  -> force the rating
|       { rating: null }  -> back to the calculated rating
*/
export const setDealerRating = async (req, res) => {
  try {
    const { dealerId } = req.params;
    const raw = req.body?.rating;

    if (!mongoose.Types.ObjectId.isValid(dealerId)) {
      return res.status(400).json({ success: false, message: "Invalid dealer" });
    }

    let rating = null;

    if (raw !== null && raw !== undefined && raw !== "") {
      rating = Math.round(Number(raw) * 10) / 10;

      if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be between 0 and 5",
        });
      }
    }

    const now = new Date();

    const allocation = await Allocation.findOneAndUpdate(
      {
        dealerId,
        allocationMonth: now.getMonth() + 1,
        allocationYear: now.getFullYear(),
      },
      {
        $set: {
          ratingOverride: rating,
          ratingOverriddenAt: rating === null ? null : now,
          ratingOverriddenBy: rating === null ? null : req.user?._id || null,
        },
      },
      { new: true },
    )
      .select("performanceSnapshot.rating ratingOverride")
      .lean();

    if (!allocation) {
      return res.status(404).json({
        success: false,
        message: "This dealer has no allocation for the current month",
      });
    }

    return res.json({
      success: true,
      message: rating === null ? "Rating reset to automatic" : "Rating updated",
      data: { ratingOverride: allocation.ratingOverride },
    });
  } catch (error) {
    console.error("Set dealer rating error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update rating",
    });
  }
};

/*
| GET /allocation-settings/history
| Complaint -> dealer allocation history (allocated / changed / removed)
| Query: search, page, limit
*/
export const getAllocationHistory = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const search = String(req.query.search || "").trim();

    const filter = {
      activityType: { $in: ["DEALER_ALLOCATED", "DEALER_CHANGED", "DEALER_REMOVED"] },
    };

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

      filter.$or = [{ complaintNumber: regex }, { dealerName: regex }];
    }

    const [total, rows] = await Promise.all([
      ComplaintActivityLog.countDocuments(filter),
      ComplaintActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select(
          "complaintNumber activityType dealerId dealerName title description reason performedByName metadata createdAt",
        )
        .lean(),
    ]);

    const missing = rows.filter((row) => row.dealerId).map((row) => row.dealerId);

    const dealers = missing.length
      ? await Dealer.find({ _id: { $in: missing } })
          .select("headCode technicianFirmName technicianName")
          .lean()
      : [];

    const dealerNames = new Map(
      dealers.map((item) => [
        String(item._id),
        `${item.headCode ? `${item.headCode} — ` : ""}${item.technicianFirmName || item.technicianName || ""}`,
      ]),
    );

    const data = rows.map((row) => ({
      id: row._id,
      complaintNumber: row.complaintNumber,
      activityType: row.activityType,
      dealerName:
        row.activityType === "DEALER_REMOVED"
          ? "-"
          : dealerNames.get(String(row.dealerId)) || row.dealerName || "-",
      // Only a recorded deciding factor counts as a reason (older records have none)
      reason: row.reason || row.metadata?.allocationReason?.label || "",
      reasonCode: row.metadata?.allocationReason?.code || "",
      allocationType: row.metadata?.allocationType || "",
      performedBy: row.performedByName || "",
      createdAt: row.createdAt,
    }));

    return res.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    console.error("Get allocation history error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load allocation history",
    });
  }
};
