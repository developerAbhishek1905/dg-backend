// import { closingStatuses, percentageMethods } from "../../billing/rules.js";
// import BillingDealer from "../../dealers/models/dealer.model.js";
import mongoose from "mongoose";
import Complaint from "../../Complaint/models/complaint.model.js";
import { createComplaintActivity } from "../../Complaint/services/complaintActivity.service.js";
import { getStatusActivityData } from "../../Complaint/helpers/complaintActivity.helper.js";
import ComplaintActivityLog from "../../Complaint/models/complaintActivityLog.model.js";
import {
  createClosureLedger,
  createCancellationLedger,
} from "../../dealerLedger/services/dealerBilling.service.js";
import Dealer from "../../dealers/models/dealer.model.js";
import DealerLedger from "../../dealerLedger/model/dealerLedger.model.js";

/*
|--------------------------------------------------------------------------
| Get Appointment Complaints
|--------------------------------------------------------------------------
| ADMIN / other roles:
|   -> All complaints
|
| DEALER:
|   -> Only complaints allocated to logged-in dealer
|--------------------------------------------------------------------------
*/

export const getAppointmentComplaints = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      priority = "",
      complaintType = "",
      fromDate = "",
      toDate = "",
    } = req.query;

    const user = req.user;

    console.log(user);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const filter = {};

    /*
    |--------------------------------------------------------------------------
    | Dealer Role Filter
    |--------------------------------------------------------------------------
    */

    const roleCode = user?.role?.code;
    console.log("jfhdkfkdnfkdfkdfkdbfkdbfkdjb", roleCode);

    if (roleCode === "DEALER") {
      if (!user.id) {
        return res.status(403).json({
          success: false,
          message: "Dealer account is not linked with any dealer",
        });
      }

      filter.allocatedDealerId = user.dealerId;
    }

    /*
    |--------------------------------------------------------------------------
    | Search
    |--------------------------------------------------------------------------
    */

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");

      filter.$or = [
        { complaintNumber: regex },
        { customerName: regex },
        { phone: regex },
        { alternatePhone: regex },
        { productName: regex },
        { productType: regex },
        { category: regex },
        { faultReported: regex },
        { dealerName: regex },
        { technicianName: regex },
      ];
    }

    /*
    |--------------------------------------------------------------------------
    | Status
    |--------------------------------------------------------------------------
    */

    if (status) {
      filter.status = status;
    }

    /*
    |--------------------------------------------------------------------------
    | Priority
    |--------------------------------------------------------------------------
    */

    if (priority) {
      filter.priority = priority;
    }

    /*
    |--------------------------------------------------------------------------
    | Complaint Type
    |--------------------------------------------------------------------------
    */

    if (complaintType) {
      filter.complaintType = complaintType;
    }

    /*
    |--------------------------------------------------------------------------
    | Date Filter
    |--------------------------------------------------------------------------
    */

    if (fromDate || toDate) {
      filter.complaintDateTime = {};

      if (fromDate) {
        filter.complaintDateTime.$gte = new Date(`${fromDate}T00:00:00.000Z`);
      }

      if (toDate) {
        filter.complaintDateTime.$lte = new Date(`${toDate}T23:59:59.999Z`);
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Pagination
    |--------------------------------------------------------------------------
    */

    const currentPage = Math.max(Number(page) || 1, 1);
    const pageLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const skip = (currentPage - 1) * pageLimit;

    /*
    |--------------------------------------------------------------------------
    | Query
    |--------------------------------------------------------------------------
    */

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .populate({
          path: "customerId",
          select: "name phone alternatePhone email",
        })
        .populate({
          path: "brandId",
          select: "brandName",
        })
        .populate({
          path: "productTypeId",
          select: "product_id product_code product_type",
        })
        .populate({
          path: "categoryId",
          select: "category description product_id",
        })
        .populate({
          path: "allocatedDealerId",
          select: `
    headCode
    technicianName
    technicianFirmName
    mobileNumber
    alternativeNumber
    email
    status
    billingType
    billingPercentage
  `,
        })
        // .populate({
        //   path: "allocatedDealerId",
        //   select:
        //     "headCode technicianName technicianFirmName mobileNumber alternativeNumber email status",
        // })
        // .populate({
        //   path: "technicianId",
        //   select:
        //     "technicianCode technicianName phone status",
        // })
        .sort({
          complaintDateTime: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(pageLimit)
        .lean(),

      Complaint.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Appointment complaints fetched successfully",

      data: complaints,

      pagination: {
        total,
        page: currentPage,
        limit: pageLimit,
        totalPages: Math.ceil(total / pageLimit),
      },
    });
  } catch (error) {
    console.error("GET APPOINTMENT COMPLAINTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch appointment complaints",
      error: error.message,
    });
  }
};

export const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      status,
      appointmentDate,
      appointmentTime,
      pendingReason,
      cancellationReason,

      // Billing popup values
      customerAmount,
      profitAmount,
    } = req.body;

    const allowedStatuses = [
      "APPOINTMENT_SCHEDULED",
      "PENDING_ON_CALL",
      "CANCEL_ON_CALL",
      "RESCHEDULED",
      "VISITED",
      "CLOSE_ON_BILLING",
      "CANCEL_ON_VISIT",
      "PENDING_ON_VISIT",
      "CLOSE_ON_VERIFICATION",
      "REOPEN",

      "CANCELLED",
      "CLOSED",
    ];

    console.log(status);
    console.log(appointmentDate);
    console.log(appointmentTime);
    console.log(pendingReason);
    console.log(cancellationReason);

    // const complaint = await Complaint.findById(req.params.id);

    // const allowedPendingReasons = [
    //   "WAITING_FOR_CUSTOMER",
    //   "PRODUCT_INSPECTION_PENDING",
    //   "SPARE_PARTS_NOT_AVAILABLE",
    // ];

    // const allowedCancellationReasons = [
    //   "CUSTOMER_NOT_AVAILABLE",
    //   "PHONE_NOT_PICKED",
    //   "CUSTOMER_REQUESTED_CALLBACK",
    //   "CUSTOMER_BOUGHT_ANOTHER_PRODUCT",
    //   "WRONG_LOCATION_SHARED",
    //   "ADDRESS_NOT_AVAILABLE",
    //   "NOT_INTERESTED",

    //   "ISSUE_ALREADY_RESOLVED",
    //   "WRONG_PRODUCT",
    //   "PRODUCT_REPLACED",
    //   "LOCAL_TECHNICIAN_ATTENDED",
    //   "DUPLICATE_COMPLAINT",
    //   "SERVICE_NOT_REQUIRED",
    //   "HIGH_REPAIR_COST",
    // ];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint ID",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const roleCode = user?.role?.code || user?.roleCode || user?.role;

    const filter = {
      _id: id,
    };

    if (roleCode === "DEALER") {
      if (!user.dealerId) {
        return res.status(403).json({
          success: false,
          message: "Dealer account is not linked with any dealer",
        });
      }

      filter.allocatedDealerId = user.dealerId;
    }

    const complaint = await Complaint.findOne(filter);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message:
          roleCode === "DEALER"
            ? "Complaint not found or not allocated to this dealer"
            : "Complaint not found",
      });
    }

    // if (complaint.billingReview) {
    //   return res
    //     .status(409)
    //     .json({
    //       message:
    //         "This complaint has a billing review. Use DG verification to complete or return its closure.",
    //     });
    // }
    // if (closingStatuses.includes(status)) {
    //   const billingDealer = await BillingDealer.findById(complaint.allocatedDealerId || complaint.dealerId);
    //   if (percentageMethods.includes(billingDealer?.billingType)) {
    //     return res.status(409).json({ message: "Submit the billing amount for DG verification before closing this complaint." });
    //   }
    // }

    const previousStatus = complaint.status;

    if (status === "CLOSE_ON_BILLING") {
      // const dealer = await Dealer.findById(
      //   complaint.allocatedDealerId || complaint.dealerId,
      // );

      // if (!dealer) {
      //   return res.status(404).json({
      //     success: false,
      //     message: "Dealer not found",
      //   });
      // }

      const dealerId = complaint.allocatedDealerId || complaint.dealerId;

      if (!dealerId) {
        return res.status(400).json({
          success: false,
          message: "Dealer is not assigned to this complaint",
        });
      }

      const dealer = await Dealer.findById(dealerId);

      if (!dealer) {
        return res.status(404).json({
          success: false,
          message: "Dealer not found",
        });
      }

      /*
    |--------------------------------------------------------------------------
    | FIXED
    |--------------------------------------------------------------------------
    */

      if (dealer.billingType === "FIXED") {
        const ledger = await createClosureLedger({
          complaint,
          user: req.user,
        });

        complaint.status = "CLOSED";
        complaint.closedAt = new Date();

        complaint.pendingReason = "";
        complaint.cancellationReason = "";

        await complaint.save();

        /*
      |--------------------------------------------------------------------------
      | Activity
      |--------------------------------------------------------------------------
      */

        await createComplaintActivity({
          complaint,

          activityType: "COMPLAINT_CLOSED",

          previousStatus: complaint.status,

          newStatus: "CLOSED",

          title: "Complaint Closed",

          description: "Complaint closed with fixed billing",

          user: req.user,

          metadata: {
            billingType: dealer.billingType,

            ledgerId: ledger?._id,
          },
        });

        return res.status(200).json({
          success: true,

          message: "Complaint closed and ledger approved automatically",

          data: complaint,

          ledger,
        });
      }

      /*
    |--------------------------------------------------------------------------
    | PARTIAL / PROFIT
    |--------------------------------------------------------------------------
    */

      // if (["PARTIAL_PAYMENT", "PROFIT_SHARING"].includes(dealer.billingType)) {
      //   if (!complaint.billingReview) {
      //     return res.status(400).json({
      //       success: false,
      //       message: "Billing amount must be submitted before closing",
      //       billingType: dealer.billingType,
      //       requiresBillingReview: true,
      //     });
      //   }

      //   const ledger = await createClosureLedger({
      //     complaint,
      //     user: req.user,
      //   });

      //   complaint.status = "CLOSE_ON_VERIFICATION";

      //   await complaint.save();

      //   return res.status(200).json({
      //     success: true,
      //     message: "Complaint submitted for DG billing verification",
      //     data: complaint,
      //     ledger,
      //   });
      // }

      if (dealer.billingType === "PARTIAL_PAYMENT") {
        const parsedCustomerAmount = Number(customerAmount);

        if (
          !Number.isFinite(parsedCustomerAmount) ||
          parsedCustomerAmount <= 0
        ) {
          return res.status(400).json({
            success: false,

            message: "Customer amount is required for partial payment billing",

            requiresBillingInput: true,

            billingType: "PARTIAL_PAYMENT",

            percentage: dealer.billingPercentage,
          });
        }

        /*
      |--------------------------------------------------------------------------
      | Percentage from Dealer registration
      |--------------------------------------------------------------------------
      */

        const percentage = Number(dealer.billingPercentage || 0);

        if (percentage <= 0) {
          return res.status(400).json({
            success: false,
            message: "Dealer billing percentage is not configured",
          });
        }

        const charge = Number(
          ((parsedCustomerAmount * percentage) / 100).toFixed(2),
        );

        complaint.billingReview = {
          dealerId: dealer._id,

          method: "PARTIAL_PAYMENT",

          customerAmount: parsedCustomerAmount,

          profitAmount: 0,

          baseAmount: parsedCustomerAmount,

          percentage,

          charge,

          status: "PENDING",

          submittedAt: new Date(),

          submittedBy: req.user?.name || "Dealer",
        };

        console.log("hkhkhdkhkhkdhkhkwhkhkhkhkjhk", complaint.billingReview);

        /*
      |--------------------------------------------------------------------------
      | Create pending ledger
      |--------------------------------------------------------------------------
      */

        /*
      |--------------------------------------------------------------------------
      | Waiting for DG
      |--------------------------------------------------------------------------
      */

        complaint.status = "CLOSE_ON_VERIFICATION";

        console.log("hkhkhdkhkhkdhkhkwhkhkhkhkjhk", complaint.billingReview);

        console.log("complaint", complaint);

        await complaint.save();

        const ledger = await createClosureLedger({
          complaint,
          user: req.user,
        });

        return res.status(200).json({
          success: true,

          message: "Billing submitted for DG verification",

          data: complaint,

          ledger,
        });
      }

      /*
    |--------------------------------------------------------------------------
    | PROFIT SHARING
    |--------------------------------------------------------------------------
    */

      if (dealer.billingType === "PROFIT_SHARING") {
        const parsedCustomerAmount = Number(customerAmount);

        const parsedProfitAmount = Number(profitAmount);

        if (
          !Number.isFinite(parsedCustomerAmount) ||
          parsedCustomerAmount <= 0
        ) {
          return res.status(400).json({
            success: false,

            message: "Customer amount is required for profit sharing",

            requiresBillingInput: true,

            billingType: "PROFIT_SHARING",

            percentage: dealer.billingPercentage,
          });
        }

        if (!Number.isFinite(parsedProfitAmount) || parsedProfitAmount <= 0) {
          return res.status(400).json({
            success: false,

            message: "Profit amount is required for profit sharing",

            requiresBillingInput: true,

            billingType: "PROFIT_SHARING",

            percentage: dealer.billingPercentage,
          });
        }

        if (parsedProfitAmount > parsedCustomerAmount) {
          return res.status(400).json({
            success: false,
            message: "Profit amount cannot be greater than customer amount",
          });
        }

        /*
      |--------------------------------------------------------------------------
      | Percentage from Dealer
      |--------------------------------------------------------------------------
      */

        const percentage = Number(dealer.billingPercentage || 0);

        if (percentage <= 0) {
          return res.status(400).json({
            success: false,
            message: "Dealer billing percentage is not configured",
          });
        }

        /*
      |--------------------------------------------------------------------------
      | Calculate charge on PROFIT
      |--------------------------------------------------------------------------
      */

        const charge = Number(
          ((parsedProfitAmount * percentage) / 100).toFixed(2),
        );

        complaint.billingReview = {
          dealerId: dealer._id,

          method: "PROFIT_SHARING",

          customerAmount: parsedCustomerAmount,

          profitAmount: parsedProfitAmount,

          baseAmount: parsedProfitAmount,

          percentage,

          charge,

          status: "PENDING",

          submittedAt: new Date(),

          submittedBy: req.user?.name || "Dealer",
        };

        /*
      |--------------------------------------------------------------------------
      | Create pending ledger
      |--------------------------------------------------------------------------
      */
        console.log("complaint", complaint);
        const ledger = await createClosureLedger({
          complaint,
          user: req.user,
        });

        complaint.status = "CLOSE_ON_VERIFICATION";

        await complaint.save();

        return res.status(200).json({
          success: true,

          message: "Profit sharing billing submitted for DG verification",

          data: complaint,

          ledger,
        });
      }

      return res.status(400).json({
        success: false,
        message: `Unsupported dealer billing type: ${dealer.billingType}`,
      });
    }

    complaint.status = status;

    if (appointmentDate) {
      complaint.appointmentDate = appointmentDate;
    }

    if (appointmentTime) {
      complaint.appointmentTime = appointmentTime;
    }

    if (pendingReason) {
      complaint.pendingReason = pendingReason;
    }

    if (cancellationReason) {
      complaint.cancellationReason = cancellationReason;
    }

    /*
      |--------------------------------------------------------------------------
      | ACTIVITY
      |--------------------------------------------------------------------------
      */

    const activity = getStatusActivityData({
      status,
      previousStatus,
      pendingReason,
      cancellationReason,
    });

    await createComplaintActivity({
      complaint,

      activityType: activity.activityType,

      previousStatus,

      newStatus: status,

      title: activity.title,

      description: activity.description,

      reason: pendingReason || cancellationReason || "",

      appointmentDate: complaint.appointmentDate,

      appointmentTime: complaint.appointmentTime,

      user: req.user,

      metadata: {
        status,
      },
    });

    // await complaint.save();

    /*
      |--------------------------------------------------------------------------
      | APPOINTMENT SCHEDULED
      |--------------------------------------------------------------------------
      */

    if (status === "APPOINTMENT_SCHEDULED" || status === "RESCHEDULED") {
      if (!appointmentDate || !appointmentTime) {
        return res.status(400).json({
          success: false,
          message: "Appointment date and time are required",
        });
      }

      const selectedDate = new Date(appointmentDate);

      selectedDate.setHours(0, 0, 0, 0);

      const today = new Date();

      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);

      tomorrow.setDate(tomorrow.getDate() + 1);

      const isToday = selectedDate.getTime() === today.getTime();

      const isTomorrow = selectedDate.getTime() === tomorrow.getTime();
      if (status === "APPOINTMENT_SCHEDULED") {
        if (!isToday && !isTomorrow) {
          return res.status(400).json({
            success: false,
            message: "Appointment can only be scheduled for today or tomorrow",
          });
        }
      }

      complaint.appointmentDate = selectedDate;

      complaint.appointmentTime = appointmentTime;

      complaint.pendingReason = "";

      complaint.cancellationReason = "";

      complaint.cancelledAt = null;
    }

    /*
      |--------------------------------------------------------------------------
      | PENDING
      |--------------------------------------------------------------------------
      */

    if (status === "PENDING_ON_CALL") {
      if (!pendingReason) {
        return res.status(400).json({
          success: false,
          message: "Pending reason is required",
        });
      }

      complaint.pendingReason = pendingReason;

      complaint.cancellationReason = "";

      complaint.cancelledAt = null;
    }

    /*
      |--------------------------------------------------------------------------
      | CANCELLED
      |--------------------------------------------------------------------------
      */

    // if (status === "CANCELLED") {
    //   if (!cancellationReason) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Cancellation reason is required",
    //     });
    //   }

    //   if (!allowedCancellationReasons.includes(cancellationReason)) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Invalid cancellation reason",
    //     });
    //   }

    //   complaint.cancellationReason = cancellationReason;

    //   complaint.cancelledAt = new Date();

    //   complaint.pendingReason = "";
    // }

    const cancellationStatuses = [
  "CANCEL_ON_CALL",
  "CANCEL_ON_VISIT",
  "CANCELLED",
];

const isCancellation =
  cancellationStatuses.includes(status);

if (isCancellation) {
  /*
  |--------------------------------------------------------------------------
  | Validate cancellation reason
  |--------------------------------------------------------------------------
  */

  if (!cancellationReason) {
    return res.status(400).json({
      success: false,
      message: "Cancellation reason is required",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Update complaint cancellation data
  |--------------------------------------------------------------------------
  */

  complaint.cancellationReason =
    cancellationReason;

  complaint.cancelledAt =
    new Date();

  complaint.pendingReason =
    "";
}

    /*
      |--------------------------------------------------------------------------
      | CLOSED
      |--------------------------------------------------------------------------
      */

    if (status === "CLOSED") {
      complaint.closedAt = new Date();

      complaint.pendingReason = "";

      complaint.cancellationReason = "";
    }

    complaint.status = status;

    await complaint.save();

    /*
|--------------------------------------------------------------------------
| Cancellation Billing
|--------------------------------------------------------------------------
*/

    // let cancellationLedger = null;

    // const cancellationStatuses = [
    //   "CANCEL_ON_CALL",
    //   "CANCEL_ON_VISIT",
    //   "CANCELLED",
    // ];

    // if (cancellationStatuses.includes(status)) {
    //   cancellationLedger = await createCancellationLedger({
    //     complaint,
    //     user: req.user,
    //   });
    // }



// if (
//   cancellationStatuses.includes(
//     status,
//   )
// ) {
//   if (!cancellationReason) {
//     return res.status(400).json({
//       success: false,
//       message:
//         "Cancellation reason is required",
//     });
//   }

//   complaint.cancellationReason =
//     cancellationReason;

//   complaint.cancelledAt =
//     new Date();

//   complaint.pendingReason =
//     "";
// }

let cancellationLedger = null;

if (isCancellation) {
  console.log(
    "Creating cancellation ledger...",
  );

  console.log(
    "Complaint:",
    complaint.complaintNumber,
  );

  console.log(
    "Dealer:",
    complaint.allocatedDealerId ||
      complaint.dealerId,
  );

  cancellationLedger =
    await createCancellationLedger({
      complaint,
      user: req.user,
    });

  console.log(
    "Cancellation ledger:",
    cancellationLedger,
  );
}

    return res.status(200).json({
      success: true,

      message: cancellationLedger
        ? "Complaint cancelled and cancellation ledger created"
        : "Complaint status updated successfully",

      data: complaint,

      ...(cancellationLedger && {
        ledger: cancellationLedger,
      }),
    });

    // return res.status(200).json({
    //   success: true,
    //   message: "Complaint status updated successfully",
    //   data: complaint,
    // });
  } catch (error) {
    console.error("UPDATE STATUS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update complaint status",
      error: error.message,
    });
  }
};

export const getCalendarAppointments = async (req, res) => {
  try {
    const { startDate, endDate, status, dealerId } = req.query;

    const filter = {
      appointmentDate: {
        $ne: null,
      },
    };

    /*
    |--------------------------------------------------------------------------
    | Date Filter
    |--------------------------------------------------------------------------
    */

    if (startDate || endDate) {
      filter.appointmentDate = {};

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        filter.appointmentDate.$gte = start;
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        filter.appointmentDate.$lte = end;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Status Filter
    |--------------------------------------------------------------------------
    */

    if (status) {
      filter.status = status;
    }

    /*
    |--------------------------------------------------------------------------
    | Dealer Filter
    |--------------------------------------------------------------------------
    */

    if (dealerId) {
      filter.allocatedDealerId = dealerId;
    }

    /*
    |--------------------------------------------------------------------------
    | Get Appointments
    |--------------------------------------------------------------------------
    */

    const appointments = await Complaint.find(filter)
      .select(
        `
        complaintNumber
        appointmentDate
        appointmentTime
        customerName
        status
        allocatedDealerId
        dealerName
        productName
        phone
        address
        `,
      )
      .populate({
        path: "allocatedDealerId",
        select: "dealerName technicianFirmName technicianName mobileNumber",
      })
      .sort({
        appointmentDate: 1,
        appointmentTime: 1,
      })
      .lean();

    /*
    |--------------------------------------------------------------------------
    | Format Calendar Response
    |--------------------------------------------------------------------------
    */

    const data = appointments.map((complaint) => ({
      id: complaint._id,

      complaintNumber: complaint.complaintNumber,

      appointmentDate: complaint.appointmentDate,

      appointmentTime: complaint.appointmentTime,

      customerName: complaint.customerName,

      status: complaint.status,

      dealer: {
        id: complaint.allocatedDealerId?._id || null,

        dealerName:
          complaint.allocatedDealerId?.dealerName || complaint.dealerName || "",

        firmName: complaint.allocatedDealerId?.technicianFirmName || "",

        technicianName: complaint.allocatedDealerId?.technicianName || "",
      },

      productName: complaint.productName,

      phone: complaint.phone,

      address: complaint.address,
    }));

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Get calendar appointments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch calendar appointments",
      error: error.message,
    });
  }
};

export const getComplaintActivityByComplaintId = async (req, res) => {
  try {
    const { complaintId } = req.params;

    if (!mongoose.isValidObjectId(complaintId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint id",
      });
    }

    /*
      |--------------------------------------------------------------------------
      | Optional complaint validation
      |--------------------------------------------------------------------------
      */

    const complaint = await Complaint.findById(complaintId).select(
      "_id complaintNumber",
    );

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    /*
      |--------------------------------------------------------------------------
      | Fetch Activities
      |--------------------------------------------------------------------------
      */

    const activities = await ComplaintActivityLog.find({
      complaintId,
    })
      .populate("performedBy", "name fullName username email role")
      .populate("dealerId", "technicianFirmName technicianName mobileNumber")
      // .populate(
      //   "technicianId",
      //   "technicianName mobileNumber",
      // )
      .sort({
        activityAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,

      message: "Complaint activities fetched successfully",

      data: {
        complaintId: complaint._id,

        complaintNumber: complaint.complaintNumber,

        totalActivities: activities.length,

        activities,
      },
    });
  } catch (error) {
    console.error("Get complaint activities error:", error);

    return res.status(500).json({
      success: false,

      message: "Failed to fetch complaint activities",

      error: error.message,
    });
  }
};

const getComplaintsByStatuses = async ({ req, res, statuses, label }) => {
  try {
    const {
      search = "",
      page = 1,
      limit = 10,

      dealerId,

      startDate,
      endDate,
    } = req.query;

    const pageNumber = Math.max(Number(page) || 1, 1);

    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const skip = (pageNumber - 1) * limitNumber;

    const filter = {
      status: {
        $in: statuses,
      },
    };

    /*
    |--------------------------------------------------------------------------
    | Dealer
    |--------------------------------------------------------------------------
    */

    if (dealerId) {
      filter.allocatedDealerId = dealerId;
    }

    /*
    |--------------------------------------------------------------------------
    | Date
    |--------------------------------------------------------------------------
    */

    if (startDate || endDate) {
      filter.complaintDateTime = {};

      if (startDate) {
        filter.complaintDateTime.$gte = new Date(`${startDate}T00:00:00.000Z`);
      }

      if (endDate) {
        filter.complaintDateTime.$lte = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Search
    |--------------------------------------------------------------------------
    */

    if (search.trim()) {
      const safeSearch = escapeRegex(search.trim());

      filter.$or = [
        {
          complaintNumber: {
            $regex: safeSearch,

            $options: "i",
          },
        },

        {
          customerName: {
            $regex: safeSearch,

            $options: "i",
          },
        },

        {
          phone: {
            $regex: safeSearch,

            $options: "i",
          },
        },

        {
          productName: {
            $regex: safeSearch,

            $options: "i",
          },
        },

        {
          category: {
            $regex: safeSearch,

            $options: "i",
          },
        },
      ];
    }

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .populate(
          "allocatedDealerId",
          "technicianCode technicianFirmName technicianName mobileNumber status",
        )
        .populate("customerId", "customerCode name phone alternatePhone email")
        .sort({
          updatedAt: -1,
        })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      Complaint.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,

      message: `${label} complaints fetched successfully`,

      data: complaints,

      pagination: {
        total,

        page: pageNumber,

        limit: limitNumber,

        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,

      message: `Failed to fetch ${label} complaints`,

      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| CANCEL
|--------------------------------------------------------------------------
*/

export const getCancelledComplaints = async (req, res) => {
  return getComplaintsByStatuses({
    req,
    res,

    statuses: ["CANCEL_ON_CALL", "CANCEL_ON_VISIT"],

    label: "cancelled",
  });
};

/*
|--------------------------------------------------------------------------
| PENDING
|--------------------------------------------------------------------------
*/

export const getPendingComplaints = async (req, res) => {
  return getComplaintsByStatuses({
    req,
    res,

    statuses: ["PENDING_ON_CALL", "PENDING_ON_VISIT"],

    label: "pending",
  });
};

/*
|--------------------------------------------------------------------------
| CLOSED
|--------------------------------------------------------------------------
*/

export const getClosedComplaints = async (req, res) => {
  return getComplaintsByStatuses({
    req,
    res,

    statuses: ["CLOSE_ON_BILLING", "CLOSED"],

    label: "closed",
  });
};

export const approveDealerBilling = async (req, res) => {
  try {
    const { complaintId } = req.params;

    const ledger = await DealerLedger.findOne({
      complaintId,
      transactionType: "CLOSURE",
      status: "PENDING",
    });

    if (!ledger) {
      return res.status(404).json({
        success: false,
        message: "Pending billing ledger not found",
      });
    }

    const complaint = await Complaint.findById(complaintId);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Approve Ledger
    |--------------------------------------------------------------------------
    */

    ledger.status = "APPROVED";

    ledger.remarks = req.body.remarks || "Billing approved by DG";

    await ledger.save();

    /*
    |--------------------------------------------------------------------------
    | Approve billing review
    |--------------------------------------------------------------------------
    */

    if (complaint.billingReview) {
      complaint.billingReview.status = "VERIFIED";

      complaint.billingReview.reviewedAt = new Date();

      complaint.billingReview.reviewerId =
        req.user?._id || req.user?.id || null;

      complaint.billingReview.reviewedBy = req.user?.name || "DG";
    }

    /*
    |--------------------------------------------------------------------------
    | Close Complaint
    |--------------------------------------------------------------------------
    */

    complaint.status = "CLOSED";
    complaint.closedAt = new Date();

    await complaint.save();

    await createComplaintActivity({
      complaint,

      activityType: "COMPLAINT_CLOSED",

      previousStatus, // ✅ original status

      newStatus: "CLOSED",

      title: "Complaint Closed",

      description: "Complaint closed with fixed billing",

      user: req.user,

      metadata: {
        billingType: dealer.billingType,
        ledgerId: ledger?._id,
      },
    });

    return res.status(200).json({
      success: true,

      message: "Billing approved and complaint closed successfully",

      data: {
        complaint,
        ledger,
      },
    });
  } catch (error) {
    console.error("APPROVE BILLING ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to approve billing",
      error: error.message,
    });
  }
};
