import mongoose from "mongoose";

import Complaint from "../../Complaint/models/complaint.model.js";
import Dealer from "../models/dealer.model.js";
import DailyCapacityUsage from "../../allocation/model/dailyCapacityUsage.model.js";

/*
|--------------------------------------------------------------------------
| Get Daily Dealer Activity
|--------------------------------------------------------------------------
|
| GET /api/v1/dealer-activity/:dealerId/daily
|
| Query:
|   ?startDate=2026-10-01
|   &endDate=2026-10-06
|
| One row = one date
|
| Response:
|
| [
|   {
|     date: "2026-10-06",
|     assignedCalls: 12,
|     appointments: 5,
|     pending: 2,
|     rescheduled: 1,
|     cancelled: 1,
|     closed: 8,
|     usedCapacity: 12
|   }
| ]
|
*/

// export const getDailyDealerActivity = async (req, res) => {
//   try {
//     const { dealerId } = req.params;

//     let { startDate, endDate } = req.query;

//     /*
//     |--------------------------------------------------------------------------
//     | Validate Dealer ID
//     |--------------------------------------------------------------------------
//     */

//     if (!mongoose.Types.ObjectId.isValid(dealerId)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid dealer ID",
//       });
//     }

//     /*
//     |--------------------------------------------------------------------------
//     | Check Dealer
//     |--------------------------------------------------------------------------
//     */

//     const dealer = await Dealer.findById(dealerId)
//       .select(
//         `
//           dealerCode
//           headCode
//           technicianFirmName
//           technicianName
//           mobileNumber
//           businessAddress
//           status
//         `,
//       )
//       .lean();

//     if (!dealer) {
//       return res.status(404).json({
//         success: false,
//         message: "Dealer not found",
//       });
//     }

//     /*
//     |--------------------------------------------------------------------------
//     | Default Date Range
//     |--------------------------------------------------------------------------
//     |
//     | If no filter is passed:
//     | startDate = first day of current month
//     | endDate   = today
//     |
//     */

//     const now = new Date();

//     const today = formatDateKey(now);

//     if (!endDate) {
//       endDate = today;
//     }

//     if (!startDate) {
//       const firstDay = new Date(
//         now.getFullYear(),
//         now.getMonth(),
//         1,
//       );

//       startDate = formatDateKey(firstDay);
//     }

//     /*
//     |--------------------------------------------------------------------------
//     | Validate Date Format
//     |--------------------------------------------------------------------------
//     */

//     const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

//     if (
//       !dateRegex.test(startDate) ||
//       !dateRegex.test(endDate)
//     ) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "startDate and endDate must be in YYYY-MM-DD format",
//       });
//     }

//     if (startDate > endDate) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Start date cannot be greater than end date",
//       });
//     }

//     /*
//     |--------------------------------------------------------------------------
//     | Convert Date Range
//     |--------------------------------------------------------------------------
//     */

//     const start = new Date(
//       `${startDate}T00:00:00.000`,
//     );

//     const end = new Date(
//       `${endDate}T23:59:59.999`,
//     );

//     const dealerObjectId =
//       new mongoose.Types.ObjectId(dealerId);

//     /*
//     |--------------------------------------------------------------------------
//     | Get Complaints
//     |--------------------------------------------------------------------------
//     |
//     | IMPORTANT:
//     |
//     | We fetch complaints related to this dealer and then calculate each
//     | metric using its actual event date:
//     |
//     | assigned      -> allocatedAt
//     | appointment   -> appointmentDate
//     | rescheduled   -> currently appointmentDate*
//     | cancelled     -> cancelledAt
//     | closed        -> closedAt
//     |
//     | Pending is discussed below because current status alone does not
//     | provide historical pending counts.
//     |
//     */

//     const complaints = await Complaint.find({
//       $or: [
//         {
//           allocatedDealerId: dealerObjectId,
//         },
//         {
//           dealerId: dealerObjectId,
//         },
//       ],

//       $or: [
//         {
//           allocatedAt: {
//             $gte: start,
//             $lte: end,
//           },
//         },
//         {
//           appointmentDate: {
//             $gte: start,
//             $lte: end,
//           },
//         },
//         {
//           closedAt: {
//             $gte: start,
//             $lte: end,
//           },
//         },
//         {
//           cancelledAt: {
//             $gte: start,
//             $lte: end,
//           },
//         },
//       ],
//     })
//       .select(
//         `
//           allocatedDealerId
//           dealerId
//           allocatedAt
//           appointmentDate
//           status
//           closedAt
//           cancelledAt
//         `,
//       )
//       .lean();

//     /*
//     |--------------------------------------------------------------------------
//     | Create Date Map
//     |--------------------------------------------------------------------------
//     |
//     | Creates every date even if there was no activity.
//     |
//     */

//     const activityMap = {};

//     const dates = getDateRange(
//       startDate,
//       endDate,
//     );

//     for (const date of dates) {
//       activityMap[date] = {
//         date,

//         assignedCalls: 0,

//         appointments: 0,

//         pending: 0,

//         rescheduled: 0,

//         cancelled: 0,

//         closed: 0,

//         usedCapacity: 0,
//       };
//     }

//     /*
//     |--------------------------------------------------------------------------
//     | Assigned Calls
//     |--------------------------------------------------------------------------
//     */

//     for (const complaint of complaints) {
//       if (complaint.allocatedAt) {
//         const date = formatDateKey(
//           complaint.allocatedAt,
//         );

//         if (activityMap[date]) {
//           activityMap[date].assignedCalls += 1;
//         }
//       }

//       /*
//       |--------------------------------------------------------------------------
//       | Appointments
//       |--------------------------------------------------------------------------
//       */

//       if (complaint.appointmentDate) {
//         const date = formatDateKey(
//           complaint.appointmentDate,
//         );

//         if (activityMap[date]) {
//           activityMap[date].appointments += 1;
//         }
//       }

//       /*
//       |--------------------------------------------------------------------------
//       | Cancelled
//       |--------------------------------------------------------------------------
//       */

//       if (complaint.cancelledAt) {
//         const date = formatDateKey(
//           complaint.cancelledAt,
//         );

//         if (activityMap[date]) {
//           activityMap[date].cancelled += 1;
//         }
//       }

//       /*
//       |--------------------------------------------------------------------------
//       | Closed
//       |--------------------------------------------------------------------------
//       */

//       if (complaint.closedAt) {
//         const date = formatDateKey(
//           complaint.closedAt,
//         );

//         if (activityMap[date]) {
//           activityMap[date].closed += 1;
//         }
//       }
//     }

//     /*
//     |--------------------------------------------------------------------------
//     | Current Status Based Counts
//     |--------------------------------------------------------------------------
//     |
//     | NOTE:
//     |
//     | Current Complaint schema only stores the CURRENT status.
//     |
//     | Therefore this can safely represent today's/current status counts,
//     | but it cannot tell us that a complaint was PENDING or RESCHEDULED
//     | on an arbitrary historical date.
//     |
//     */

//     const currentStatusComplaints =
//       await Complaint.find({
//         $or: [
//           {
//             allocatedDealerId:
//               dealerObjectId,
//           },
//           {
//             dealerId: dealerObjectId,
//           },
//         ],

//         status: {
//           $in: [
//             "PENDING_ON_CALL",
//             "PENDING_ON_VISIT",
//             "RESCHEDULED",
//           ],
//         },
//       })
//         .select(
//           "status appointmentDate allocatedAt",
//         )
//         .lean();

//     for (const complaint of currentStatusComplaints) {
//       /*
//        * Pending/current activity is placed on today only.
//        *
//        * We should NOT fake historical pending counts.
//        */

//       if (!activityMap[today]) {
//         continue;
//       }

//       if (
//         complaint.status ===
//           "PENDING_ON_CALL" ||
//         complaint.status ===
//           "PENDING_ON_VISIT"
//       ) {
//         activityMap[today].pending += 1;
//       }

//       if (
//         complaint.status ===
//         "RESCHEDULED"
//       ) {
//         activityMap[today].rescheduled += 1;
//       }
//     }

//     /*
//     |--------------------------------------------------------------------------
//     | Capacity Usage
//     |--------------------------------------------------------------------------
//     |
//     | DailyCapacityUsage.date is already YYYY-MM-DD.
//     |
//     */

//     const capacityUsage =
//       await DailyCapacityUsage.aggregate([
//         {
//           $match: {
//             dealerId:
//               dealerObjectId,

//             date: {
//               $gte: startDate,
//               $lte: endDate,
//             },
//           },
//         },

//         {
//           $group: {
//             _id: "$date",

//             usedCapacity: {
//               $sum: "$usedCapacity",
//             },
//           },
//         },

//         {
//           $sort: {
//             _id: -1,
//           },
//         },
//       ]);

//     /*
//     |--------------------------------------------------------------------------
//     | Merge Capacity
//     |--------------------------------------------------------------------------
//     */

//     for (const capacity of capacityUsage) {
//       if (activityMap[capacity._id]) {
//         activityMap[
//           capacity._id
//         ].usedCapacity =
//           capacity.usedCapacity;
//       }
//     }

//     /*
//     |--------------------------------------------------------------------------
//     | Final Data
//     |--------------------------------------------------------------------------
//     */

//     const activity = Object.values(
//       activityMap,
//     ).sort((a, b) =>
//       b.date.localeCompare(a.date),
//     );

//     /*
//     |--------------------------------------------------------------------------
//     | Summary
//     |--------------------------------------------------------------------------
//     */

//     const summary = activity.reduce(
//       (acc, item) => {
//         acc.assignedCalls +=
//           item.assignedCalls;

//         acc.appointments +=
//           item.appointments;

//         acc.pending +=
//           item.pending;

//         acc.rescheduled +=
//           item.rescheduled;

//         acc.cancelled +=
//           item.cancelled;

//         acc.closed +=
//           item.closed;

//         acc.usedCapacity +=
//           item.usedCapacity;

//         return acc;
//       },
//       {
//         assignedCalls: 0,
//         appointments: 0,
//         pending: 0,
//         rescheduled: 0,
//         cancelled: 0,
//         closed: 0,
//         usedCapacity: 0,
//       },
//     );

//     /*
//     |--------------------------------------------------------------------------
//     | Response
//     |--------------------------------------------------------------------------
//     */

//     return res.status(200).json({
//       success: true,

//       message:
//         "Dealer daily activity fetched successfully",

//       data: {
//         dealer: {
//           _id: dealer._id,

//           dealerCode:
//             dealer.dealerCode || "",

//           headCode:
//             dealer.headCode || "",

//           dealerName:
//             dealer.technicianName || "",

//           firmName:
//             dealer.technicianFirmName ||
//             "",

//           mobile:
//             dealer.mobileNumber || "",

//           city:
//             dealer.businessAddress?.city ||
//             "",

//           cityId:
//             dealer.businessAddress?.cityId ??
//             null,

//           status: dealer.status,
//         },

//         filters: {
//           startDate,
//           endDate,
//         },

//         summary,

//         activity,
//       },
//     });
//   } catch (error) {
//     console.error(
//       "GET DAILY DEALER ACTIVITY ERROR:",
//       error,
//     );

//     return res.status(500).json({
//       success: false,

//       message:
//         "Failed to fetch dealer daily activity",

//       error: error.message,
//     });
//   }
// };


export const getDailyDealerActivity = async (req, res) => {
  try {
    const { dealerId } = req.params;

    let {
      startDate,
      endDate,
    } = req.query;

    /* =====================================================
       VALIDATE DEALER
    ===================================================== */

    if (
      !mongoose.Types.ObjectId.isValid(
        dealerId,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid dealer ID",
      });
    }

    const dealerObjectId =
      new mongoose.Types.ObjectId(
        dealerId,
      );

    const dealer =
      await Dealer.findById(
        dealerObjectId,
      )
        .select(`
          dealerCode
          headCode
          technicianFirmName
          technicianName
          mobileNumber
          businessAddress
          status
        `)
        .lean();

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer not found",
      });
    }

    /* =====================================================
       DEFAULT DATE RANGE
    ===================================================== */

    const today =
      formatDateKey(new Date());

    if (!endDate) {
      endDate = today;
    }

    if (!startDate) {
      const now = new Date();

      startDate = `${now.getFullYear()}-${String(
        now.getMonth() + 1,
      ).padStart(2, "0")}-01`;
    }

    /* =====================================================
       VALIDATE DATES
    ===================================================== */

    const dateRegex =
      /^\d{4}-\d{2}-\d{2}$/;

    if (
      !dateRegex.test(startDate) ||
      !dateRegex.test(endDate)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "startDate and endDate must be YYYY-MM-DD",
      });
    }

    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        message:
          "Start date cannot be greater than end date",
      });
    }

    const start =
      new Date(
        `${startDate}T00:00:00.000`,
      );

    const end =
      new Date(
        `${endDate}T23:59:59.999`,
      );

    /* =====================================================
       IMPORTANT:
       ONLY THIS DEALER'S COMPLAINTS
    ===================================================== */

    const complaints =
      await Complaint.find({
        allocatedDealerId:
          dealerObjectId,

        $or: [
          {
            allocatedAt: {
              $gte: start,
              $lte: end,
            },
          },

          {
            appointmentDate: {
              $gte: start,
              $lte: end,
            },
          },

          {
            cancelledAt: {
              $gte: start,
              $lte: end,
            },
          },

          {
            closedAt: {
              $gte: start,
              $lte: end,
            },
          },
        ],
      })
        .select(`
          complaintNumber
          allocatedDealerId
          allocatedAt
          appointmentDate
          cancelledAt
          closedAt
          status
        `)
        .lean();

    /* =====================================================
       CREATE ALL DATES
    ===================================================== */

    const dates =
      getDateRange(
        startDate,
        endDate,
      );

    const activityMap = {};

    for (const date of dates) {
      activityMap[date] = {
        date,

        assignedCalls: 0,

        appointments: 0,

        pending: 0,

        rescheduled: 0,

        cancelled: 0,

        closed: 0,
      };
    }

    /* =====================================================
       CALCULATE ACTIVITY
    ===================================================== */

    for (const complaint of complaints) {
      /* -------------------------------------------------
         ASSIGNED
      -------------------------------------------------- */

      if (complaint.allocatedAt) {
        const date =
          formatDateKey(
            complaint.allocatedAt,
          );

        if (activityMap[date]) {
          activityMap[
            date
          ].assignedCalls += 1;
        }
      }

      /* -------------------------------------------------
         APPOINTMENT
      -------------------------------------------------- */

      if (complaint.appointmentDate) {
        const date =
          formatDateKey(
            complaint.appointmentDate,
          );

        if (activityMap[date]) {
          activityMap[
            date
          ].appointments += 1;
        }
      }

      /* -------------------------------------------------
         CANCELLED
      -------------------------------------------------- */

      if (complaint.cancelledAt) {
        const date =
          formatDateKey(
            complaint.cancelledAt,
          );

        if (activityMap[date]) {
          activityMap[
            date
          ].cancelled += 1;
        }
      }

      /* -------------------------------------------------
         CLOSED
      -------------------------------------------------- */

      if (complaint.closedAt) {
        const date =
          formatDateKey(
            complaint.closedAt,
          );

        if (activityMap[date]) {
          activityMap[
            date
          ].closed += 1;
        }
      }
    }

    /* =====================================================
       TODAY CURRENT STATUS
    ===================================================== */

    if (
      activityMap[today]
    ) {
      const currentComplaints =
        await Complaint.find({
          allocatedDealerId:
            dealerObjectId,

          status: {
            $in: [
              "PENDING_ON_CALL",
              "PENDING_ON_VISIT",
              "RESCHEDULED",
            ],
          },
        })
          .select("status")
          .lean();

      for (
        const complaint of
          currentComplaints
      ) {
        if (
          complaint.status ===
            "PENDING_ON_CALL" ||
          complaint.status ===
            "PENDING_ON_VISIT"
        ) {
          activityMap[
            today
          ].pending += 1;
        }

        if (
          complaint.status ===
          "RESCHEDULED"
        ) {
          activityMap[
            today
          ].rescheduled += 1;
        }
      }
    }

    /* =====================================================
       FINAL ACTIVITY
    ===================================================== */

    const activity =
      Object.values(
        activityMap,
      ).sort((a, b) =>
        b.date.localeCompare(
          a.date,
        ),
      );

    /* =====================================================
       SUMMARY
    ===================================================== */

    const summary =
      activity.reduce(
        (acc, item) => {
          acc.assignedCalls +=
            item.assignedCalls;

          acc.appointments +=
            item.appointments;

          acc.pending +=
            item.pending;

          acc.rescheduled +=
            item.rescheduled;

          acc.cancelled +=
            item.cancelled;

          acc.closed +=
            item.closed;

          return acc;
        },
        {
          assignedCalls: 0,
          appointments: 0,
          pending: 0,
          rescheduled: 0,
          cancelled: 0,
          closed: 0,
        },
      );

    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.status(200).json({
      success: true,

      message:
        "Dealer daily activity fetched successfully",

      data: {
        dealer: {
          _id: dealer._id,

          dealerCode:
            dealer.dealerCode ||
            dealer.headCode ||
            "",

          dealerName:
            dealer.technicianName ||
            "",

          firmName:
            dealer.technicianFirmName ||
            "",

          mobile:
            dealer.mobileNumber ||
            "",

          city:
            dealer.businessAddress
              ?.city || "",

          cityId:
            dealer.businessAddress
              ?.cityId ?? null,

          status:
            dealer.status,
        },

        filters: {
          startDate,
          endDate,
        },

        summary,

        activity,
      },
    });
  } catch (error) {
    console.error(
      "GET DAILY DEALER ACTIVITY ERROR:",
      error,
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch dealer daily activity",

      error: error.message,
    });
  }
};
/*
|--------------------------------------------------------------------------
| Format Date -> YYYY-MM-DD
|--------------------------------------------------------------------------
*/

function formatDateKey(date) {
  const value = new Date(date);

  const year = value.getFullYear();

  const month = String(
    value.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    value.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/*
|--------------------------------------------------------------------------
| Generate Date Range
|--------------------------------------------------------------------------
*/

function getDateRange(
  startDate,
  endDate,
) {
  const dates = [];

  const current = new Date(
    `${startDate}T00:00:00`,
  );

  const end = new Date(
    `${endDate}T00:00:00`,
  );

  while (current <= end) {
    dates.push(
      formatDateKey(current),
    );

    current.setDate(
      current.getDate() + 1,
    );
  }

  return dates;
}


/*
|--------------------------------------------------------------------------
| GET ALL DEALER ACTIVITY
|--------------------------------------------------------------------------
|
| GET /api/v1/dealer-activity
|
| Query:
|
| ?date=2026-10-07
| &search=rahul
| &page=1
| &limit=20
|
| Default:
| date = today
| page = 1
| limit = 20
|
*/

export const getAllDealerActivity = async (req, res) => {
  try {
    let {
      date,
      search = "",
      page = 1,
      limit = 20,
    } = req.query;

    /*
    |--------------------------------------------------------------------------
    | Pagination
    |--------------------------------------------------------------------------
    */

    page = Math.max(Number(page) || 1, 1);

    limit = Math.min(
      Math.max(Number(limit) || 20, 1),
      100,
    );

    const skip = (page - 1) * limit;

    /*
    |--------------------------------------------------------------------------
    | Date
    |--------------------------------------------------------------------------
    */

    if (!date) {
      date = formatDateKey(new Date());
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        message:
          "Date must be in YYYY-MM-DD format",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent Future Date
    |--------------------------------------------------------------------------
    */

    const today = formatDateKey(new Date());

    if (date > today) {
      return res.status(400).json({
        success: false,
        message:
          "Future date activity cannot be viewed",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Start / End Of Selected Date
    |--------------------------------------------------------------------------
    */

    const startOfDay = new Date(
      `${date}T00:00:00.000`,
    );

    const endOfDay = new Date(
      `${date}T23:59:59.999`,
    );

    /*
    |--------------------------------------------------------------------------
    | Dealer Search
    |--------------------------------------------------------------------------
    */

    const dealerFilter = {};

    const trimmedSearch = search.trim();

    if (trimmedSearch) {
      const safeSearch =
        escapeRegex(trimmedSearch);

      const searchRegex = new RegExp(
        safeSearch,
        "i",
      );

      dealerFilter.$or = [
        {
          dealerCode: searchRegex,
        },
        {
          headCode: searchRegex,
        },
        {
          technicianName: searchRegex,
        },
        {
          technicianFirmName:
            searchRegex,
        },
        {
          mobileNumber: searchRegex,
        },
        {
          alternativeNumber:
            searchRegex,
        },
        {
          "businessAddress.city":
            searchRegex,
        },
      ];
    }

    /*
    |--------------------------------------------------------------------------
    | Get Dealers + Total
    |--------------------------------------------------------------------------
    */

    const [dealers, totalDealers] =
      await Promise.all([
        Dealer.find(dealerFilter)
          .select(`
            dealerCode
            headCode
            technicianName
            technicianFirmName
            mobileNumber
            alternativeNumber
            businessAddress
            productServices
            status
          `)
          .sort({
            technicianName: 1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        Dealer.countDocuments(
          dealerFilter,
        ),
      ]);

    /*
    |--------------------------------------------------------------------------
    | No Dealers
    |--------------------------------------------------------------------------
    */

    if (dealers.length === 0) {
      return res.status(200).json({
        success: true,

        message:
          "Dealer activity fetched successfully",

        data: [],

        summary: {
          totalDealers: 0,
          activeDealers: 0,
          onLeave: 0,

          assignedCalls: 0,
          appointments: 0,
          pending: 0,
          rescheduled: 0,
          cancelled: 0,
          closed: 0,
        },

        filters: {
          date,
          search:
            trimmedSearch || "",
        },

        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Dealer IDs
    |--------------------------------------------------------------------------
    */

    const dealerIds = dealers.map(
      (dealer) => dealer._id,
    );

    /*
    |--------------------------------------------------------------------------
    | Complaint Activity
    |--------------------------------------------------------------------------
    |
    | Get complaints related to dealers on this page.
    |
    | A complaint can contribute to:
    |
    | assignedCalls -> allocatedAt
    | appointments  -> appointmentDate
    | cancelled     -> cancelledAt
    | closed        -> closedAt
    |
    */

    const complaints =
      await Complaint.find({
        $and: [
          {
            $or: [
              {
                allocatedDealerId: {
                  $in: dealerIds,
                },
              },
              {
                dealerId: {
                  $in: dealerIds,
                },
              },
            ],
          },

          {
            $or: [
              {
                allocatedAt: {
                  $gte: startOfDay,
                  $lte: endOfDay,
                },
              },

              {
                appointmentDate: {
                  $gte: startOfDay,
                  $lte: endOfDay,
                },
              },

              {
                cancelledAt: {
                  $gte: startOfDay,
                  $lte: endOfDay,
                },
              },

              {
                closedAt: {
                  $gte: startOfDay,
                  $lte: endOfDay,
                },
              },
            ],
          },
        ],
      })
        .select(`
          dealerId
          allocatedDealerId
          allocatedAt
          appointmentDate
          cancelledAt
          closedAt
          status
        `)
        .lean();

    /*
    |--------------------------------------------------------------------------
    | Create Activity Map
    |--------------------------------------------------------------------------
    */

    const activityMap = new Map();

    for (const dealer of dealers) {
      activityMap.set(
        dealer._id.toString(),
        {
          assignedCalls: 0,
          appointments: 0,
          pending: 0,
          rescheduled: 0,
          cancelled: 0,
          closed: 0,
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Count Event-Based Activity
    |--------------------------------------------------------------------------
    */

    for (const complaint of complaints) {
      const complaintDealerId =
        getComplaintDealerId(
          complaint,
        );

      if (!complaintDealerId) {
        continue;
      }

      const dealerKey =
        complaintDealerId.toString();

      const activity =
        activityMap.get(dealerKey);

      if (!activity) {
        continue;
      }

      /*
      |--------------------------------------------------------------------------
      | Assigned
      |--------------------------------------------------------------------------
      */

      if (
        isDateInRange(
          complaint.allocatedAt,
          startOfDay,
          endOfDay,
        )
      ) {
        activity.assignedCalls += 1;
      }

      /*
      |--------------------------------------------------------------------------
      | Appointment
      |--------------------------------------------------------------------------
      */

      if (
        isDateInRange(
          complaint.appointmentDate,
          startOfDay,
          endOfDay,
        )
      ) {
        activity.appointments += 1;
      }

      /*
      |--------------------------------------------------------------------------
      | Cancelled
      |--------------------------------------------------------------------------
      */

      if (
        isDateInRange(
          complaint.cancelledAt,
          startOfDay,
          endOfDay,
        )
      ) {
        activity.cancelled += 1;
      }

      /*
      |--------------------------------------------------------------------------
      | Closed
      |--------------------------------------------------------------------------
      */

      if (
        isDateInRange(
          complaint.closedAt,
          startOfDay,
          endOfDay,
        )
      ) {
        activity.closed += 1;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Current Pending / Rescheduled
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    |
    | Your Complaint currently stores current status, not complete
    | historical status transitions.
    |
    | Therefore:
    |
    | TODAY:
    | Pending and Rescheduled can be shown from current status.
    |
    | HISTORICAL DATE:
    | We should NOT pretend current status was also the status on that
    | historical date.
    |
    */

    if (date === today) {
      const statusComplaints =
        await Complaint.find({
          $and: [
            {
              $or: [
                {
                  allocatedDealerId: {
                    $in: dealerIds,
                  },
                },
                {
                  dealerId: {
                    $in: dealerIds,
                  },
                },
              ],
            },

            {
              status: {
                $in: [
                  "PENDING_ON_CALL",
                  "PENDING_ON_VISIT",
                  "RESCHEDULED",
                ],
              },
            },
          ],
        })
          .select(`
            dealerId
            allocatedDealerId
            status
          `)
          .lean();

      for (
        const complaint of statusComplaints
      ) {
        const complaintDealerId =
          getComplaintDealerId(
            complaint,
          );

        if (!complaintDealerId) {
          continue;
        }

        const activity =
          activityMap.get(
            complaintDealerId.toString(),
          );

        if (!activity) {
          continue;
        }

        if (
          complaint.status ===
            "PENDING_ON_CALL" ||
          complaint.status ===
            "PENDING_ON_VISIT"
        ) {
          activity.pending += 1;
        }

        if (
          complaint.status ===
          "RESCHEDULED"
        ) {
          activity.rescheduled += 1;
        }
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Prepare Response
    |--------------------------------------------------------------------------
    */

    const data = dealers.map(
      (dealer) => {
        const activity =
          activityMap.get(
            dealer._id.toString(),
          ) || {
            assignedCalls: 0,
            appointments: 0,
            pending: 0,
            rescheduled: 0,
            cancelled: 0,
            closed: 0,
          };

        /*
        |--------------------------------------------------------------------------
        | Products
        |--------------------------------------------------------------------------
        */

        const products = [
          ...new Set(
            (
              dealer.productServices ||
              []
            )
              .map(
                (product) =>
                  product.productName,
              )
              .filter(Boolean),
          ),
        ];

        /*
        |--------------------------------------------------------------------------
        | Dealer Leave Status
        |--------------------------------------------------------------------------
        */

        const dealerStatus =
          dealer.status;

        return {
          _id: dealer._id,

          dealerCode:
            dealer.dealerCode ||
            dealer.headCode ||
            "",

          dealerName:
            dealer.technicianName ||
            "",

          firmName:
            dealer.technicianFirmName ||
            "",

          mobile:
            dealer.mobileNumber || "",

          alternativeNumber:
            dealer.alternativeNumber ||
            "",

          city:
            dealer.businessAddress
              ?.city || "",

          cityId:
            dealer.businessAddress
              ?.cityId ?? null,

          products,

          status: dealerStatus,

          /*
          |--------------------------------------------------------------------------
          | Activity
          |--------------------------------------------------------------------------
          */

          assignedCalls:
            activity.assignedCalls,

          appointments:
            activity.appointments,

          pending:
            activity.pending,

          rescheduled:
            activity.rescheduled,

          cancelled:
            activity.cancelled,

          closed:
            activity.closed,
        };
      },
    );

    /*
    |--------------------------------------------------------------------------
    | Page Summary
    |--------------------------------------------------------------------------
    |
    | NOTE:
    | This summary is for returned page dealers.
    |
    */

    const summary = data.reduce(
      (acc, dealer) => {
        if (
          dealer.status === "ACTIVE"
        ) {
          acc.activeDealers += 1;
        }

        if (
          dealer.status === "LEAVE"
        ) {
          acc.onLeave += 1;
        }

        acc.assignedCalls +=
          dealer.assignedCalls;

        acc.appointments +=
          dealer.appointments;

        acc.pending +=
          dealer.pending;

        acc.rescheduled +=
          dealer.rescheduled;

        acc.cancelled +=
          dealer.cancelled;

        acc.closed +=
          dealer.closed;

        return acc;
      },
      {
        totalDealers:
          totalDealers,

        activeDealers: 0,

        onLeave: 0,

        assignedCalls: 0,

        appointments: 0,

        pending: 0,

        rescheduled: 0,

        cancelled: 0,

        closed: 0,
      },
    );

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,

      message:
        "Dealer activity fetched successfully",

      data,

      summary,

      filters: {
        date,
        search:
          trimmedSearch || "",
      },

      pagination: {
        page,
        limit,

        total:
          totalDealers,

        totalPages:
          Math.ceil(
            totalDealers / limit,
          ),
      },
    });
  } catch (error) {
    console.error(
      "GET ALL DEALER ACTIVITY ERROR:",
      error,
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch dealer activity",

      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Get Complaint Dealer
|--------------------------------------------------------------------------
*/

function getComplaintDealerId(
  complaint,
) {
  return (
    complaint.allocatedDealerId ||
    complaint.dealerId ||
    null
  );
}

/*
|--------------------------------------------------------------------------
| Check Date
|--------------------------------------------------------------------------
*/

function isDateInRange(
  value,
  start,
  end,
) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  return (
    date >= start &&
    date <= end
  );
}

/*
|--------------------------------------------------------------------------
| Format Date
|--------------------------------------------------------------------------
*/

// function formatDateKey(
//   value,
// ) {
//   const date = new Date(value);

//   const year =
//     date.getFullYear();

//   const month = String(
//     date.getMonth() + 1,
//   ).padStart(2, "0");

//   const day = String(
//     date.getDate(),
//   ).padStart(2, "0");

//   return `${year}-${month}-${day}`;
// }

/*
|--------------------------------------------------------------------------
| Escape Regex
|--------------------------------------------------------------------------
*/

function escapeRegex(value) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}