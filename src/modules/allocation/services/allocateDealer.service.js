import Allocation from "../model/allocation.model.js";
import Dealer from "../../dealers/models/dealer.model.js";
import DailyCapacityUsage from "../model/dailyCapacityUsage.model.js";

const getTodayKey = () => {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    now.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const allocateDealerForComplaint =
  async ({
    cityId,
    productId,
    categoryId,
    category,
  }) => {
    const now = new Date();

    const month = now.getMonth() + 1;

    const year = now.getFullYear();

    const today = getTodayKey();

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

    const dealerIds = allocations.map(
      (allocation) => allocation.dealerId,
    );

    const activeDealers = await Dealer.find({
      _id: {
        $in: dealerIds,
      },

      status: "ACTIVE",
    })
      .select("_id")
      .lean();

    const activeDealerIds = new Set(
      activeDealers.map((dealer) =>
        String(dealer._id),
      ),
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
      if (
        !activeDealerIds.has(
          String(allocation.dealerId),
        )
      ) {
        continue;
      }

      /*
       * Find matching city.
       */
      const cityRule = allocation.rules?.find(
        (rule) =>
          Number(rule.cityId) ===
          Number(cityId),
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
      for (const capacityRule of
        cityRule.capacityRules ?? []) {
        if (
          capacityRule.status !== "ACTIVE"
        ) {
          continue;
        }

        /*
         * Find requested product inside capacity rule.
         */
        const product =
          capacityRule.products?.find(
            (item) =>
              Number(item.productId) ===
              Number(productId),
          );

        if (!product) {
          continue;
        }

        /*
         * Check requested service/category.
         */
        const service =
          product.services?.find(
            (item) => {
              /*
               * Prefer ObjectId matching.
               */
              if (
                categoryId &&
                item.categoryId
              ) {
                return (
                  String(item.categoryId) ===
                  String(categoryId)
                );
              }

              /*
               * Fallback to category code.
               */
              return (
                item.category
                  ?.trim()
                  .toLowerCase() ===
                category
                  ?.trim()
                  .toLowerCase()
              );
            },
          );

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

        if (
          capacityRule.capacityType ===
          "COMBINED"
        ) {
          /*
           * Microwave + Refrigerator etc.
           *
           * All products share same capacity.
           */
          dailyCapacity = Number(
            capacityRule.dailyCapacity ?? 0,
          );

          usageProductId = null;
        }

        if (
          capacityRule.capacityType ===
          "INDIVIDUAL"
        ) {
          /*
           * Product-specific capacity.
           *
           * Example:
           * AC = 10/day
           */
          dailyCapacity = Number(
            product.dailyCapacity ?? 0,
          );

          usageProductId =
            Number(product.productId);
        }

        if (dailyCapacity <= 0) {
          continue;
        }

        candidates.push({
          allocation,

          dealerId:
            allocation.dealerId,

          cityRule,

          capacityRule,

          product,

          service,

          dailyCapacity,

          usageProductId,

          totalAmount: Number(
            allocation.performanceSnapshot
              ?.totalAmount ?? 0,
          ),

          rating: Number(
            allocation.performanceSnapshot
              ?.rating ?? 0,
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

    const usageRecords =
      await DailyCapacityUsage.find({
        date: today,

        cityId: Number(cityId),

        dealerId: {
          $in: candidates.map(
            (candidate) =>
              candidate.dealerId,
          ),
        },
      }).lean();

    /*
    |--------------------------------------------------------------------------
    | STEP 5
    | Attach current daily usage
    |--------------------------------------------------------------------------
    */

    for (const candidate of candidates) {
      const usage =
        usageRecords.find((item) => {
          const sameDealer =
            String(item.dealerId) ===
            String(candidate.dealerId);

          const sameRule =
            String(
              item.capacityRuleId,
            ) ===
            String(
              candidate.capacityRule._id,
            );

          /*
           * COMBINED
           */
          if (
            candidate.capacityRule
              .capacityType ===
            "COMBINED"
          ) {
            return (
              sameDealer &&
              sameRule &&
              item.productId == null
            );
          }

          /*
           * INDIVIDUAL
           */
          return (
            sameDealer &&
            sameRule &&
            Number(item.productId) ===
              Number(
                candidate.usageProductId,
              )
          );
        });

      candidate.usedCapacity = Number(
        usage?.usedCapacity ?? 0,
      );
    }

    /*
    |--------------------------------------------------------------------------
    | STEP 6
    | Remove dealers whose capacity is full
    |--------------------------------------------------------------------------
    */

    const availableCandidates =
      candidates.filter(
        (candidate) =>
          candidate.usedCapacity <
          candidate.dailyCapacity,
      );

    if (!availableCandidates.length) {
      return null;
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

    availableCandidates.sort(
      (a, b) => {
        /*
         * Round-robin priority
         */
        if (
          a.usedCapacity !==
          b.usedCapacity
        ) {
          return (
            a.usedCapacity -
            b.usedCapacity
          );
        }

        /*
         * Highest amount first
         */
        if (
          a.totalAmount !==
          b.totalAmount
        ) {
          return (
            b.totalAmount -
            a.totalAmount
          );
        }

        /*
         * Same amount ->
         * highest rating first
         */
        if (a.rating !== b.rating) {
          return b.rating - a.rating;
        }

        return 0;
      },
    );

    /*
    |--------------------------------------------------------------------------
    | STEP 8
    | Try candidate one by one
    |--------------------------------------------------------------------------
    */

    for (const selected of
      availableCandidates) {
      const usageFilter = {
        allocationId:
          selected.allocation._id,

        dealerId:
          selected.dealerId,

        date: today,

        cityId: Number(cityId),

        capacityRuleId:
          selected.capacityRule._id,

        productId:
          selected.usageProductId,
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
      const reserved =
        await DailyCapacityUsage.findOneAndUpdate(
          {
            ...usageFilter,

            usedCapacity: {
              $lt:
                selected.dailyCapacity,
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

      return {
        dealerId:
          selected.dealerId,

        allocationId:
          selected.allocation._id,

        capacityRuleId:
          selected.capacityRule._id,

        capacityType:
          selected.capacityRule
            .capacityType,

        productId:
          selected.product.productId,

        categoryId:
          selected.service.categoryId,

        category:
          selected.service.category,

        description:
          selected.service.description,

        dailyCapacity:
          selected.dailyCapacity,

        usedCapacity:
          reserved.usedCapacity,

        remainingCapacity:
          selected.dailyCapacity -
          reserved.usedCapacity,

        totalAmount:
          selected.totalAmount,

        rating:
          selected.rating,
      };
    }

    return null;
  };