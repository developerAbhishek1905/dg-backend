import Allocation from "../model/allocation.model.js";
import Dealer from "../../dealers/models/dealer.model.js";
import Complaint from "../../Complaint/models/complaint.model.js";
import DailyCapacityUsage from "../model/dailyCapacityUsage.model.js";
import { buildAllocationRules } from "../../dealers/controllers/dealer.controller.js";
import { canDealerReceiveComplaint } from "../../dealers/helpers/dealerAvailability.js";
import { isDealerOnLeave } from "../../dealers/helpers/dealerLeave.utils.js";
import {
  getAllocationSettings,
  isOverCreditLimit,
} from "./allocationSettings.service.js";

//----------

export const syncDealerAllocation = async ({
  dealer,
  productServices,
  combinedCapacity,
  individualCapacities,
}) => {
  const now = new Date();

  const allocationMonth = now.getMonth() + 1;
  const allocationYear = now.getFullYear();

  /*
  |--------------------------------------------------------------------------
  | STEP 1 - Find current allocation
  |--------------------------------------------------------------------------
  */

  const allocation = await Allocation.findOne({
    dealerId: dealer._id,
    allocationMonth,
    allocationYear,
  });

  if (!allocation) {
    console.warn(
      `Allocation not found for dealer ${dealer._id} - ${allocationMonth}/${allocationYear}`,
    );

    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | STEP 2 - Save OLD capacity rule IDs
  |--------------------------------------------------------------------------
  |
  | Needed so we can determine which rules disappeared after rebuilding.
  */

  const oldRuleIds = new Set();

  for (const cityRule of allocation.rules ?? []) {
    for (const capacityRule of cityRule.capacityRules ?? []) {
      if (capacityRule._id) {
        oldRuleIds.add(String(capacityRule._id));
      }
    }
  }

  /*
  |--------------------------------------------------------------------------
  | STEP 3 - Rebuild allocation rules from updated Dealer
  |--------------------------------------------------------------------------
  */

  const newRules = buildAllocationRules({
    dealer,
    productServices,
    combinedCapacity,
    individualCapacities,
  });

  /*
  |--------------------------------------------------------------------------
  | IMPORTANT
  |--------------------------------------------------------------------------
  |
  | We should preserve existing capacityRule _id values where possible.
  |
  | DailyCapacityUsage references:
  |
  | capacityRuleId
  |
  | If we blindly replace all rules, Mongoose may generate new _ids and
  | today's DailyCapacityUsage will point to old rule IDs.
  */

  preserveCapacityRuleIds(allocation.rules ?? [], newRules);

  /*
  |--------------------------------------------------------------------------
  | STEP 4 - Update Allocation
  |--------------------------------------------------------------------------
  */

  allocation.dealerCode = dealer.technicianCode || dealer.dealerCode || "";

  allocation.dealerName =
    dealer.technicianFirmName || dealer.technicianName || "";

  // Sync latest dealer credit limit
  allocation.creditLimit = dealer.creditLimit ?? 0;

  // Update capacity rules
  allocation.rules = newRules;

  // Update allocation status
  allocation.status = dealer.status === "ACTIVE" ? "ACTIVE" : "INACTIVE";

  await allocation.save();

  /*
  |--------------------------------------------------------------------------
  | STEP 5 - Determine currently valid rule IDs
  |--------------------------------------------------------------------------
  */

  const validRuleIds = new Set();

  for (const cityRule of allocation.rules ?? []) {
    for (const capacityRule of cityRule.capacityRules ?? []) {
      if (capacityRule._id) {
        validRuleIds.add(String(capacityRule._id));
      }
    }
  }

  /*
  |--------------------------------------------------------------------------
  | STEP 6 - Find removed rules
  |--------------------------------------------------------------------------
  */

  const removedRuleIds = [...oldRuleIds].filter(
    (ruleId) => !validRuleIds.has(ruleId),
  );

  /*
  |--------------------------------------------------------------------------
  | STEP 7 - Delete usage belonging to removed rules
  |--------------------------------------------------------------------------
  */

  if (removedRuleIds.length > 0) {
    await DailyCapacityUsage.deleteMany({
      allocationId: allocation._id,

      dealerId: dealer._id,

      capacityRuleId: {
        $in: removedRuleIds,
      },
    });
  }

  return allocation;
};

/*
|--------------------------------------------------------------------------
| PRESERVE CAPACITY RULE IDS
|--------------------------------------------------------------------------
|
| DailyCapacityUsage stores capacityRuleId.
|
| Therefore existing rules should keep their MongoDB _id when capacity
| changes.
|
| Matching strategy:
|
| COMBINED:
| product IDs are used as identity.
|
| INDIVIDUAL:
| product IDs are used as identity.
*/

const preserveCapacityRuleIds = (oldCityRules, newCityRules) => {
  for (const newCityRule of newCityRules) {
    const oldCityRule = oldCityRules.find(
      (item) => Number(item.cityId) === Number(newCityRule.cityId),
    );

    if (!oldCityRule) {
      continue;
    }

    for (const newCapacityRule of newCityRule.capacityRules ?? []) {
      const matchingOldRule = oldCityRule.capacityRules?.find(
        (oldCapacityRule) =>
          isSameCapacityRule(oldCapacityRule, newCapacityRule),
      );

      if (matchingOldRule?._id) {
        newCapacityRule._id = matchingOldRule._id;
      }
    }
  }
};

const isSameCapacityRule = (oldRule, newRule) => {
  if (oldRule.capacityType !== newRule.capacityType) {
    return false;
  }

  const oldProductIds = (oldRule.products ?? [])
    .map((item) => Number(item.productId))
    .sort((a, b) => a - b);

  const newProductIds = (newRule.products ?? [])
    .map((item) => Number(item.productId))
    .sort((a, b) => a - b);

  if (oldProductIds.length !== newProductIds.length) {
    return false;
  }

  return oldProductIds.every(
    (productId, index) => productId === newProductIds[index],
  );
};

//---------

const getTodayKey = () => {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const NEUTRAL_RATING = 2.5;

const inr = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/*
|--------------------------------------------------------------------------
| ALLOCATION REASON
|--------------------------------------------------------------------------
|
| Explains which factor decided the dealer. Saved with the complaint and the
| activity log so the history can show it.
|
|  ONLY_ELIGIBLE    - only one dealer had free capacity
|  LOWEST_LOAD      - fewest complaints so far today
|  HIGHER_RATING    - same complaints today, higher rating gets the share
|  HIGHEST_PAYMENT  - tied on load, highest payment received
|  RATING_TIEBREAK  - tied on load and payment, higher rating
|  FIRST_AVAILABLE  - every factor tied, first dealer in order
|  CAPACITY_FALLBACK- preferred dealer's capacity filled meanwhile
|
*/
const buildAllocationReason = ({ selected, index, ordered, creditSkipped }) => {
  const next = ordered[1];

  const details = {
    usedToday: selected.usedCapacity,
    dailyCapacity: selected.dailyCapacity,
    rating: selected.rating,
    totalAmount: selected.totalAmount,
    eligibleDealers: ordered.length,
    creditSkipped,
  };

  let code = "FIRST_AVAILABLE";
  let label = "All factors were equal, first available dealer chosen";

  if (index > 0) {
    code = "CAPACITY_FALLBACK";
    label = "Preferred dealer's capacity was filled, next eligible dealer chosen";
  } else if (!next) {
    code = "ONLY_ELIGIBLE";
    label = "Only eligible dealer with free capacity";
  } else if (selected.usedCapacity !== next.usedCapacity) {
    code = "LOWEST_LOAD";
    label = `Fewest complaints today (${selected.usedCapacity} of ${selected.dailyCapacity} capacity used)`;
  } else if ((selected.rating || 0) !== (next.rating || 0)) {
    code = "HIGHER_RATING";
    label = `Same load as other dealers, higher rating (${Number(selected.rating).toFixed(1)}) gets the share`;
  } else if (selected.totalAmount !== next.totalAmount) {
    code = "HIGHEST_PAYMENT";
    label = `Tied on load and rating, highest payment received (${inr(selected.totalAmount)})`;
  }

  const text = creditSkipped
    ? `${label}. ${creditSkipped} dealer(s) skipped: credit limit reached`
    : label;

  return { code, label: text, details };
};

export const allocateDealerForComplaint = async ({
  cityId,
  productId,
  categoryId,
  category,
  customerId = null,
}) => {
  const now = new Date();

  const month = now.getMonth() + 1;

  const year = now.getFullYear();

  const today = getTodayKey();

  /*
  |--------------------------------------------------------------------------
  | AUTO ALLOCATION SETTINGS
  |--------------------------------------------------------------------------
  |
  | OFF  -> nothing is allocated automatically (manual allocation).
  | City excluded -> no automatic allocation for that city.
  */

  const settings = await getAllocationSettings();

  if (!settings.autoAllocationEnabled) {
    return null;
  }

  if (
    (settings.excludedCities || []).some(
      (item) => Number(item.cityId) === Number(cityId),
    )
  ) {
    return null;
  }

  /*
    |--------------------------------------------------------------------------
    | STEP 1
    | Find allocations matching current month + city
    |--------------------------------------------------------------------------
    */

  const allocations = await Allocation.find({
    allocationMonth: month,

    allocationYear: year,

    status: "ACTIVE",

    from: {
      $lte: now,
    },

    to: {
      $gte: now,
    },

    "rules.cityId": Number(cityId),
  }).lean();

  if (!allocations.length) {
    return null;
  }

  /*
    |--------------------------------------------------------------------------
    | STEP 2
    | Verify actual Dealer status = ACTIVE
    |--------------------------------------------------------------------------
    */

  const dealerIds = allocations.map((allocation) => allocation.dealerId);

  const dealers = await Dealer.find({
    _id: {
      $in: dealerIds,
    },
  })
    .select(
      "_id status dateOfJoining dateOfLeaving rejoiningDates leaves creditLimit openingBalance openingBalanceType",
    )
    .lean();

  const availableDealers = dealers.filter((dealer) =>
    canDealerReceiveComplaint(dealer, now),
  );

  // Optional: skip dealers who have used up their credit limit
  const creditSkipped = settings.useCreditLimit
    ? availableDealers.filter((dealer) => isOverCreditLimit(dealer)).length
    : 0;

  const activeDealerIds = new Set(
    availableDealers
      .filter(
        (dealer) => !(settings.useCreditLimit && isOverCreditLimit(dealer)),
      )
      .map((dealer) => String(dealer._id)),
  );

  /*
    |--------------------------------------------------------------------------
    | STEP 3
    | Find eligible dealer + matching rule
    |--------------------------------------------------------------------------
    */

  const candidates = [];

  for (const allocation of allocations) {
    /*
     * Dealer must currently be active.
     */
    if (!activeDealerIds.has(String(allocation.dealerId))) {
      continue;
    }

    /*
     * Find matching city.
     */
    const cityRule = allocation.rules?.find(
      (rule) => Number(rule.cityId) === Number(cityId),
    );

    if (!cityRule) {
      continue;
    }

    /*
     * Dealer can contain multiple:
     *
     * COMBINED
     * INDIVIDUAL
     *
     * capacity rules.
     */
    for (const capacityRule of cityRule.capacityRules ?? []) {
      if (capacityRule.status !== "ACTIVE") {
        continue;
      }

      /*
       * Find requested product inside capacity rule.
       */
      const product = capacityRule.products?.find(
        (item) => Number(item.productId) === Number(productId),
      );

      if (!product) {
        continue;
      }

      /*
       * Check requested service/category.
       */
      const service = product.services?.find((item) => {
        /*
         * Prefer ObjectId matching.
         */
        if (categoryId && item.categoryId) {
          return String(item.categoryId) === String(categoryId);
        }

        /*
         * Fallback to category code.
         */
        return (
          item.category?.trim().toLowerCase() === category?.trim().toLowerCase()
        );
      });

      if (!service) {
        continue;
      }

      /*
        |--------------------------------------------------------------------------
        | Determine daily capacity
        |--------------------------------------------------------------------------
        */

      let dailyCapacity = 0;

      let usageProductId = null;

      if (capacityRule.capacityType === "COMBINED") {
        /*
         * Microwave + Refrigerator etc.
         *
         * All products share same capacity.
         */
        dailyCapacity = Number(capacityRule.dailyCapacity ?? 0);

        usageProductId = null;
      }

      if (capacityRule.capacityType === "INDIVIDUAL") {
        /*
         * Product-specific capacity.
         *
         * Example:
         * AC = 10/day
         */
        dailyCapacity = Number(product.dailyCapacity ?? 0);

        usageProductId = Number(product.productId);
      }

      if (dailyCapacity <= 0) {
        continue;
      }

      candidates.push({
        allocation,

        dealerId: allocation.dealerId,

        cityRule,

        capacityRule,

        product,

        service,

        dailyCapacity,

        usageProductId,

        totalAmount: Number(allocation.performanceSnapshot?.totalAmount ?? 0),

        // A manually set rating wins over the calculated one
        rating: Number(
          allocation.ratingOverride ?? allocation.performanceSnapshot?.rating ?? 0,
        ),
      });
    }
  }

  if (!candidates.length) {
    return null;
  }

  /*
    |--------------------------------------------------------------------------
    | STEP 4
    | Load today's usage
    |--------------------------------------------------------------------------
    */

  const usageRecords = await DailyCapacityUsage.find({
    date: today,

    cityId: Number(cityId),

    dealerId: {
      $in: candidates.map((candidate) => candidate.dealerId),
    },
  }).lean();

  /*
    |--------------------------------------------------------------------------
    | STEP 5
    | Attach current daily usage
    |--------------------------------------------------------------------------
    */

  for (const candidate of candidates) {
    const usage = usageRecords.find((item) => {
      const sameDealer = String(item.dealerId) === String(candidate.dealerId);

      const sameRule =
        String(item.capacityRuleId) === String(candidate.capacityRule._id);

      /*
       * COMBINED
       */
      if (candidate.capacityRule.capacityType === "COMBINED") {
        return sameDealer && sameRule && item.productId == null;
      }

      /*
       * INDIVIDUAL
       */
      return (
        sameDealer &&
        sameRule &&
        Number(item.productId) === Number(candidate.usageProductId)
      );
    });

    candidate.usedCapacity = Number(usage?.usedCapacity ?? 0);
  }

  /*
    |--------------------------------------------------------------------------
    | STEP 6
    | Remove dealers whose capacity is full
    |--------------------------------------------------------------------------
    */

  console.log("candidates", candidates);
  const availableCandidates = candidates.filter(
    (candidate) => candidate.usedCapacity < candidate.dailyCapacity,
  );

  if (!availableCandidates.length) {
    return null;
  }

  /*
    |--------------------------------------------------------------------------
    | SAME CUSTOMER, SAME DAY
    |--------------------------------------------------------------------------
    |
    | If this customer already got a complaint allocated today, prefer that
    | same dealer, but only when the dealer also provides this service (it is
    | one of the available candidates). Otherwise the normal allocation runs
    | and another dealer is picked.
    */

  let sameCustomerDealerIds = null;

  if (customerId) {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const todaysComplaints = await Complaint.find({
      customerId,
      complaintDateTime: { $gte: startOfDay },
      allocatedDealerId: { $ne: null },
      status: { $nin: ["CANCELLED"] },
    })
      .select("allocatedDealerId")
      .lean();

    const earlierDealerIds = new Set(
      todaysComplaints.map((item) => String(item.allocatedDealerId)),
    );

    const preferred = availableCandidates.filter((candidate) =>
      earlierDealerIds.has(String(candidate.dealerId)),
    );

    if (preferred.length) {
      sameCustomerDealerIds = new Set(
        preferred.map((candidate) => String(candidate.dealerId)),
      );

      availableCandidates.splice(
        0,
        availableCandidates.length,
        ...preferred,
      );
    }
  }

  /*
    |--------------------------------------------------------------------------
    | STEP 7
    | ROUND ROBIN + PERFORMANCE PRIORITY
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    |
    | Lowest usedCapacity first.
    |
    | This automatically creates:
    |
    | A -> B -> C -> D -> E
    | A -> B -> C -> D -> E
    |
    | Within same round:
    |
    | totalAmount DESC
    | rating DESC
    |
    */

  availableCandidates.sort((a, b) => {
    /*
     * Weighted round-robin: a higher rated dealer gets a larger share.
     * Unrated dealers (rating 0) use a neutral weight, so when no
     * ratings exist this is the plain round-robin.
     */
    const weightA = a.rating > 0 ? a.rating : NEUTRAL_RATING;
    const weightB = b.rating > 0 ? b.rating : NEUTRAL_RATING;

    const loadA = a.usedCapacity / weightA;
    const loadB = b.usedCapacity / weightB;

    if (loadA !== loadB) {
      return loadA - loadB;
    }

    /*
     * Highest amount first
     */
    if (a.totalAmount !== b.totalAmount) {
      return b.totalAmount - a.totalAmount;
    }

    /*
     * Same amount ->
     * highest rating first
     */
    if (a.rating !== b.rating) {
      return b.rating - a.rating;
    }

    return 0;
  });

  /*
    |--------------------------------------------------------------------------
    | STEP 8
    | Try candidate one by one
    |--------------------------------------------------------------------------
    */

  for (const [index, selected] of availableCandidates.entries()) {
    const usageFilter = {
      allocationId: selected.allocation._id,

      dealerId: selected.dealerId,

      date: today,

      cityId: Number(cityId),

      capacityRuleId: selected.capacityRule._id,

      productId: selected.usageProductId,
    };

    /*
     * First ensure usage document exists.
     */
    await DailyCapacityUsage.updateOne(
      usageFilter,
      {
        $setOnInsert: {
          usedCapacity: 0,
        },
      },
      {
        upsert: true,
      },
    );

    /*
     * Atomic capacity increment.
     *
     * Dealer won't cross daily capacity.
     */
    const reserved = await DailyCapacityUsage.findOneAndUpdate(
      {
        ...usageFilter,

        usedCapacity: {
          $lt: selected.dailyCapacity,
        },
      },
      {
        $inc: {
          usedCapacity: 1,
        },
      },
      {
        new: true,
      },
    );

    /*
     * Another request may have filled
     * this dealer meanwhile.
     *
     * So try next dealer.
     */
    if (!reserved) {
      continue;
    }

    const allocationReason = buildAllocationReason({
      selected,
      index,
      ordered: availableCandidates,
      creditSkipped,
    });

    if (sameCustomerDealerIds) {
      allocationReason.code = "SAME_CUSTOMER_SAME_DAY";
      allocationReason.label =
        "Same customer already had a complaint today with this dealer, and the dealer provides this service";
    }

    return {
      allocationReason,

      dealerId: selected.dealerId,

      allocationId: selected.allocation._id,

      capacityRuleId: selected.capacityRule._id,

      capacityType: selected.capacityRule.capacityType,

      productId: selected.product.productId,

      categoryId: selected.service.categoryId,

      category: selected.service.category,

      description: selected.service.description,

      dailyCapacity: selected.dailyCapacity,

      usedCapacity: reserved.usedCapacity,

      remainingCapacity: selected.dailyCapacity - reserved.usedCapacity,

      totalAmount: selected.totalAmount,

      rating: selected.rating,
    };
  }

  return null;
};
