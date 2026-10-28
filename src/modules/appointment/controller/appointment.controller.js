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
import { getDealerCityProfile } from "../../dealers/helpers/dealerCity.js";
import Category from "../../category/models/category.model.js";
import { recalculateClosureLedger } from "../../dealerLedger/services/dealerBilling.service.js";
import DealerLedger from "../../dealerLedger/model/dealerLedger.model.js";
import Reason from "../../reason/models/reason.model.js";
import {escapeRegex} from "../../../helper/escapeRegex.js"
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
      closingReason,
      // Billing popup values
      customerAmount,
      profitAmount,
      warrantyAssured,
      closureCategoryId,
      closureId,
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
    const isWarrantyComplaint = complaint.complaintType === "WARRANTY";

    if (status === "CLOSE_ON_BILLING") {
      /*
       * Service category done by the dealer (must belong to the product).
       * Billing is decided from this category.
       */
      if (closureId) {
        const closureDealer = await Dealer.findById(
          complaint.allocatedDealerId || complaint.dealerId,
        ).lean();
        const cityProfile = getDealerCityProfile(
          closureDealer,
          complaint.address?.cityId,
        );
        const closureProduct = (
          cityProfile?.productServices ?? closureDealer?.productServices ?? []
        ).find((p) => Number(p.productId) === Number(complaint.productId));
        const picked = (closureProduct?.closures ?? []).find(
          (c) => String(c.closureId) === String(closureId),
        );

        if (!picked) {
          return res.status(400).json({
            success: false,
            message: "Selected closure is not configured for this dealer",
          });
        }

        complaint.dealerClosureId = String(picked.closureId);
        complaint.dealerClosureTitle = picked.title || "";
        complaint.dealerClosureRate = Number(picked.rate || 0);
        complaint.closureId = complaint.dealerClosureId;
        complaint.closureTitle = complaint.dealerClosureTitle;
        complaint.closureRate = complaint.dealerClosureRate;
      } else if (closureCategoryId) {
        if (!mongoose.isValidObjectId(closureCategoryId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid closure category",
          });
        }

        const closureCategory = await Category.findById(closureCategoryId).lean();

        if (
          !closureCategory ||
          Number(closureCategory.product_id) !== Number(complaint.productId)
        ) {
          return res.status(400).json({
            success: false,
            message: "Selected category does not belong to this product",
          });
        }

        complaint.closureCategoryId = closureCategory._id;
        complaint.closureCategory = closureCategory.category;

        // Remember what the dealer selected
        complaint.dealerClosureCategoryId = closureCategory._id;
        complaint.dealerClosureCategory = closureCategory.category;
      }

      if (warrantyAssured !== undefined && warrantyAssured !== null) {
        const warrantyValue = Number(warrantyAssured.value);
        const warrantyUnit =
          warrantyAssured.unit === "DAYS" ? "DAYS" : "MONTHS";

        if (!Number.isFinite(warrantyValue) || warrantyValue < 0) {
          return res.status(400).json({
            success: false,
            message: "Warranty assured must be 0 or more",
          });
        }

        complaint.warrantyAssured = {
          value: warrantyValue,
          unit: warrantyUnit,
          assuredAt: new Date(),
          assuredBy: req.user?.name || "",
        };
      }

      // const dealer = await Dealer.findById(
      //   complaint.allocatedDealerId || complaint.dealerId,
      // );

      // if (!dealer) {
      //   return res.status(404).json({
      //     success: false,
      //     message: "Dealer not found",
      //   });
      // }

      /*
  |--------------------------------------------------------------------------
  | WARRANTY COMPLAINT
  | No billing / no ledger
  |--------------------------------------------------------------------------
  */

      if (isWarrantyComplaint) {
        complaint.status = "CLOSE_ON_BILLING";
        complaint.closedAt = new Date();

        complaint.pendingReason = "";
        complaint.cancellationReason = "";
        complaint.closingReason = closingReason;

        await complaint.save();

        await createComplaintActivity({
          complaint,

          activityType: "COMPLAINT_CLOSED",

          previousStatus,

          newStatus: "CLOSE_ON_BILLING",

          title: "Warranty Complaint Closed",

          description: "Warranty complaint closed without billing",

          user: req.user,

          metadata: {
            complaintType: "WARRANTY",
            billingSkipped: true,
            reason: "WARRANTY_COMPLAINT",
          },
        });

        return res.status(200).json({
          success: true,

          message: "Warranty complaint closed successfully without billing",

          data: complaint,

          ledger: null,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | NORMAL COMPLAINT BILLING
      |--------------------------------------------------------------------------
      */

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
        const fixedCustomerAmount = Number(customerAmount);

        if (!Number.isFinite(fixedCustomerAmount) || fixedCustomerAmount <= 0) {
          return res.status(400).json({
            success: false,
            message: "Customer amount is required to close the complaint",
          });
        }

        complaint.closureCustomerAmount = fixedCustomerAmount;

        let ledger = null;

        try {
          ledger = await createClosureLedger({
            complaint,
            user: req.user,
          });
        } catch (ledgerError) {
          // The dealer has no rate for the selected category: still close
          // the complaint, DG sets the right category (and so the bill) from
          // Closure History.
          if (ledgerError.code !== "RATE_NOT_CONFIGURED") {
            throw ledgerError;
          }
        }

        /*
         * Closure marked "Auto Bill" in the dealer's Product & Capacity:
         * closure and bill are approved automatically, no DG verification.
         */
        let autoApproved = false;

        if (ledger && complaint.closureId) {
          const dealerProfile = getDealerCityProfile(dealer, complaint.address?.cityId);
          const dealerProduct = (
            dealerProfile?.productServices ?? dealer.productServices ?? []
          ).find((p) => Number(p.productId) === Number(complaint.productId));
          const closureCfg = (dealerProduct?.closures ?? []).find(
            (c) => String(c.closureId) === String(complaint.closureId),
          );

          if (closureCfg?.autoBill) {
            const approvedAt = new Date();

            ledger.status = "APPROVED";
            ledger.approvedAt = approvedAt;
            ledger.approvedBy = null;
            ledger.remarks = "Auto approved: closure is marked Auto Bill";
            await ledger.save();

            complaint.closureApproved = true;
            complaint.closureApprovalRemark = "Auto approved: closure is marked Auto Bill";
            complaint.closureApprovedAt = approvedAt;
            complaint.verifiedClosureTitle = complaint.closureTitle;

            autoApproved = true;
          }
        }

        // Waits for manual approval of the bill in the billing table
        complaint.status = autoApproved ? "CLOSED" : "CLOSE_ON_VERIFICATION";

        // Save the closing reason selected by the dealer
        complaint.closingReason = closingReason;
        complaint.pendingReason = "";
        complaint.cancellationReason = "";
        complaint.closedAt = new Date();

        complaint.pendingReason = "";
        complaint.cancellationReason = "";
        complaint.closingReason = closingReason;

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

          newStatus: autoApproved ? "CLOSED" : "CLOSE_ON_VERIFICATION",

          title: "Complaint Closed",

          description: autoApproved
            ? "Complaint closed with an Auto Bill closure, closure and bill approved automatically"
            : "Complaint closed with fixed billing, waiting for bill approval",

          user: req.user,

          metadata: {
            billingType: dealer.billingType,

            ledgerId: ledger?._id,
          },
        });

        return res.status(200).json({
          success: true,

          message: autoApproved
            ? "Complaint closed, bill approved automatically"
            : ledger
            ? "Complaint closed, bill sent for approval"
            : "Complaint closed. The bill amount will be set by DG from Closure History",

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

        // Save the closing reason selected by the dealer
        complaint.closingReason = closingReason;
        complaint.pendingReason = "";
        complaint.cancellationReason = "";

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

        // Save the closing reason selected by the dealer
        complaint.closingReason = closingReason;
        complaint.pendingReason = "";
        complaint.cancellationReason = "";

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
    if (closingReason) {
      complaint.closingReason = closingReason;
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
      closingReason,
    });

    await createComplaintActivity({
      complaint,

      activityType: activity.activityType,

      previousStatus,

      newStatus: status,

      title: activity.title,

      description: activity.description,

      reason: pendingReason || cancellationReason || closingReason || "",

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

      complaint.closingReason = "";

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
      complaint.closingReason = "";

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

    const isCancellation = cancellationStatuses.includes(status);

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

      complaint.cancellationReason = cancellationReason;

      complaint.cancelledAt = new Date();

      complaint.pendingReason = "";

      complaint.closingReason = "";
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

      complaint.closingReason = closingReason;
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
      console.log("Creating cancellation ledger...");

      console.log("Complaint:", complaint.complaintNumber);

      console.log("Dealer:", complaint.allocatedDealerId || complaint.dealerId);

      cancellationLedger = await createCancellationLedger({
        complaint,
        user: req.user,
      });

      console.log("Cancellation ledger:", cancellationLedger);
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

    // Every complaint belongs on the calendar:
    // - with an appointment  -> shown on its appointment date
    // - without one          -> shown on its complaint date
    const filter = {};

    /*
    |--------------------------------------------------------------------------
    | Dealer role: only own appointments
    |--------------------------------------------------------------------------
    */

    if (req.user?.role?.code === "DEALER") {
      if (!req.user.dealerId) {
        return res.status(403).json({
          success: false,
          message: "Dealer account is not linked with any dealer",
        });
      }

      filter.allocatedDealerId = req.user.dealerId;
    }

    /*
    |--------------------------------------------------------------------------
    | Date Filter
    | Appointment dates are stored as UTC midnight, so compare in UTC.
    |--------------------------------------------------------------------------
    */

    if (startDate || endDate) {
      const appointmentRange = {};
      const complaintRange = {};

      if (startDate) {
        appointmentRange.$gte = new Date(`${startDate}T00:00:00.000Z`);
        // complaint dates carry a time, so use the India day boundary
        complaintRange.$gte = new Date(`${startDate}T00:00:00.000+05:30`);
      }

      if (endDate) {
        appointmentRange.$lte = new Date(`${endDate}T23:59:59.999Z`);
        complaintRange.$lte = new Date(`${endDate}T23:59:59.999+05:30`);
      }

      filter.$or = [
        { appointmentDate: appointmentRange },
        { appointmentDate: null, complaintDateTime: complaintRange },
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (dealerId && req.user?.role?.code !== "DEALER") {
      filter.allocatedDealerId = dealerId;
    }

    const appointments = await Complaint.find(filter)
      .select(
        "complaintNumber complaintDateTime appointmentDate appointmentTime customerName status allocatedDealerId dealerName productName phone address",
      )
      .populate({
        path: "allocatedDealerId",
        select: "technicianCode technicianFirmName technicianName mobileNumber",
      })
      .sort({
        appointmentDate: 1,
        appointmentTime: 1,
        complaintDateTime: 1,
      })
      .lean();

    // Keep the shape the Appointment type / list page already uses
    // (_id + populated allocatedDealerId) and keep the older fields too.
    const data = appointments.map((complaint) => ({
      ...complaint,

      id: complaint._id,

      dealer: {
        id: complaint.allocatedDealerId?._id || null,
        dealerName: complaint.dealerName || "",
        firmName: complaint.allocatedDealerId?.technicianFirmName || "",
        technicianName: complaint.allocatedDealerId?.technicianName || "",
      },
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

const getComplaintsByStatuses = async ({
  req,
  res,
  statuses,
  label,
  reasonField,
  // createdAt is stable: acting on a row must not move it (updatedAt would)
  sortBy = "createdAt",
  sortOrder = -1,
}) => {
  try {
    const {
      search = "",
      page = 1,
      limit = 10,
      dealerId,
      cityId,
      createdBy,
      categoryId,
      startDate,
      endDate,
      status: statusParam,
      reason: reasonParam,
    } = req.query;

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const skip = (pageNumber - 1) * limitNumber;

    /*
    |--------------------------------------------------------------------------
    | Base Filter
    |--------------------------------------------------------------------------
    */

    const baseFilter = {};

if (dealerId) {
  if (!mongoose.Types.ObjectId.isValid(dealerId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid dealer ID",
    });
  }

  baseFilter.allocatedDealerId = new mongoose.Types.ObjectId(dealerId);
}

    if (cityId) {
      const parsedCityId = Number(cityId);

      if (!Number.isInteger(parsedCityId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid city ID",
        });
      }

      baseFilter["address.cityId"] = parsedCityId;
    }

    if (createdBy && mongoose.Types.ObjectId.isValid(createdBy)) {
      baseFilter.createdBy = new mongoose.Types.ObjectId(createdBy);
    }

    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID",
        });
      }

      baseFilter.categoryId = new mongoose.Types.ObjectId(categoryId);
    }

    /*
    |--------------------------------------------------------------------------
    | Date Filter
    |--------------------------------------------------------------------------
    */

    if (startDate || endDate) {
      baseFilter.complaintDateTime = {};

      if (startDate) {
        baseFilter.complaintDateTime.$gte = new Date(
          `${startDate}T00:00:00.000Z`,
        );
      }

      if (endDate) {
        baseFilter.complaintDateTime.$lte = new Date(
          `${endDate}T23:59:59.999Z`,
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Search
    |--------------------------------------------------------------------------
    */

    if (search.trim()) {
      const safeSearch = escapeRegex(search.trim());

      baseFilter.$or = [
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

    /*
    |--------------------------------------------------------------------------
    | Main Filter
    |--------------------------------------------------------------------------
    */

    const filter = {
      ...baseFilter,

      status: {
        $in: statuses,
      },
    };

    /*
     * Optional tab / card filters (e.g. On Call Cancel vs After Call Cancel).
     * The summary counts keep using `filter`, so the tabs always show
     * their own totals; only the list and its total use `listFilter`.
     */
    const listFilter = { ...filter };

    if (statusParam && statuses.includes(String(statusParam))) {
      listFilter.status = String(statusParam);
    }

    if (reasonParam && reasonParam !== "ALL") {
      listFilter[reasonField] = String(reasonParam);
    }

    /*
    |--------------------------------------------------------------------------
    | Queries
    |--------------------------------------------------------------------------
    */

    const [
      complaints,
      total,
      statusAggregation,
      reasonAggregation,
      closureAggregation,
    ] = await Promise.all([
      Complaint.find(listFilter)
        .populate(
          "allocatedDealerId",
          "technicianCode technicianFirmName technicianName mobileNumber status",
        )
        .populate("customerId", "customerCode name phone alternatePhone email")
        .populate("createdBy", "name")
        .sort({
          [sortBy]: sortOrder,
          _id: -1,
        })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      Complaint.countDocuments(listFilter),

      Complaint.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),

      Complaint.aggregate([
        {
          $match: {
            ...filter,
            [reasonField]: {
              $exists: true,
              $nin: [null, ""],
            },
          },
        },
        {
          $group: {
            _id: `$${reasonField}`,
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),

      Complaint.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,

            approved: {
              $sum: {
                $cond: [{ $eq: ["$closureApproved", true] }, 1, 0],
              },
            },

            pendingApproval: {
              $sum: {
                $cond: [{ $ne: ["$closureApproved", true] }, 1, 0],
              },
            },

            rated: {
              $sum: {
                $cond: [{ $gt: ["$rating", 0] }, 1, 0],
              },
            },

            notRated: {
              $sum: {
                $cond: [{ $gt: ["$rating", 0] }, 0, 1],
              },
            },
          },
        },
      ]),
    ]);

    /*
    |--------------------------------------------------------------------------
    | Status Counts
    |--------------------------------------------------------------------------
    */

    const statusCounts = {};

    statuses.forEach((status) => {
      statusCounts[status] = 0;
    });

    statusAggregation.forEach((item) => {
      statusCounts[item._id] = item.count;
    });

    /*
    |--------------------------------------------------------------------------
    | Reason Counts
    |--------------------------------------------------------------------------
    */

    const reasonCounts = {};

    reasonAggregation.forEach((item) => {
      reasonCounts[item._id] = item.count;
    });

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    const closureStats = closureAggregation[0] || {};

    const summary =
      label === "closed"
        ? {
            total,
            pendingApproval: closureStats.pendingApproval || 0,
            approved: closureStats.approved || 0,
            rejected: 0,
            rated: closureStats.rated || 0,
            notRated: closureStats.notRated || 0,
            statusCounts,
            reasonCounts,
          }
        : {
            total,
            statusCounts,
            reasonCounts,
          };

    return res.status(200).json({
      success: true,
      message: `${label} complaints fetched successfully`,
      data: complaints,
      summary,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });

    // return res.status(200).json({
    //   success: true,

    //   message: `${label} complaints fetched successfully`,

    //   data: complaints,

    //   summary: {
    //     total,
    //     statusCounts,
    //     reasonCounts,
    //   },

    //   pagination: {
    //     total,
    //     page: pageNumber,
    //     limit: limitNumber,
    //     totalPages: Math.ceil(total / limitNumber),
    //   },
    // });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: `Failed to fetch ${label} complaints`,
      error: error.message,
    });
  }
};

export const getCancelledComplaints = async (req, res) => {
  return getComplaintsByStatuses({
    req,
    res,

    statuses: ["CANCEL_ON_CALL", "CANCEL_ON_VISIT", "CANCELLED"],

    label: "cancelled",

    reasonField: "cancellationReason",
  });
};

export const getPendingComplaints = async (req, res) => {
  return getComplaintsByStatuses({
    req,
    res,

    statuses: ["PENDING_ON_CALL", "PENDING_ON_VISIT"],

    label: "pending",

    reasonField: "pendingReason",

    // Earliest customer follow-up first
    sortBy: "customerFollowUpDate",
    sortOrder: 1,
  });
};

export const getClosedComplaints = async (req, res) => {
  return getComplaintsByStatuses({
    req,
    res,
    statuses: [
      "CLOSE_ON_BILLING",
      "CLOSE_ON_VERIFICATION",
      "CLOSED",
    ],
    label: "closed",
    reasonField: "closeReason",
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

export const getPendingFollowUpStatuses = async (req, res) => {
  try {
    const statuses = [
      {
        value: "PENDING_ON_CALL",
        label: "Pending On Call",
      },
      {
        value: "PENDING_ON_VISIT",
        label: "Pending On Visit",
      },
    ];

    return res.status(200).json({
      success: true,
      data: statuses,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending follow-up statuses",
      error: error.message,
    });
  }
};

export const saveComplaintFollowUp = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      followUpReasonId,
      followUpDate,
      remark,
      sendToDealer = false,
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | Validation
    |--------------------------------------------------------------------------
    */

    if (!followUpReasonId) {
      return res.status(400).json({
        success: false,
        message: "Follow-up reason is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(followUpReasonId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid follow-up reason",
      });
    }

    if (!followUpDate) {
      return res.status(400).json({
        success: false,
        message: "Follow-up date is required",
      });
    }

    if (!remark?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Remark is required",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find Reason
    |--------------------------------------------------------------------------
    */

    const reason = await Reason.findById(followUpReasonId).lean();

    if (!reason) {
      return res.status(404).json({
        success: false,
        message: "Follow-up reason not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Only pending reasons allowed
    |--------------------------------------------------------------------------
    */

    if (!reason.reasonType?.toLowerCase().includes("pending")) {
      return res.status(400).json({
        success: false,
        message: "Selected reason is not a pending reason",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Complaint
    |--------------------------------------------------------------------------
    */

    const complaint = await Complaint.findById(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    const now = new Date();
    const parsedFollowUpDate = new Date(followUpDate);

    if (Number.isNaN(parsedFollowUpDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid follow-up date",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Latest Follow-up
    |--------------------------------------------------------------------------
    */

    complaint.customerFollowUpReasonId = reason._id;

    complaint.customerFollowUpStatus = reason.reasonName;

    complaint.customerFollowUpDate = parsedFollowUpDate;

    complaint.latestRemark = remark.trim();

    complaint.lastFollowUpUpdatedAt = now;

    /*
    |--------------------------------------------------------------------------
    | History
    |--------------------------------------------------------------------------
    */

    if (!Array.isArray(complaint.followUpRemarks)) {
      complaint.followUpRemarks = [];
    }

    complaint.followUpRemarks.push({
      followUpReasonId: reason._id,

      followUpStatus: reason.reasonName,

      reasonType: reason.reasonType,

      followUpDate: parsedFollowUpDate,

      remark: remark.trim(),

      sentToDealer: Boolean(sendToDealer),

      createdBy: req.user?._id || req.user?.id,

      createdAt: now,
      updatedAt: now,
    });

    await complaint.save();

    return res.status(200).json({
      success: true,

      message: sendToDealer
        ? "Remark saved and sent to dealer successfully"
        : "Remark saved successfully",

      data: complaint,
    });
  } catch (error) {
    console.error("Save complaint follow-up error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save complaint follow-up",
      error: error.message,
    });
  }
};

export const getComplaintFollowUpRemarks = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .select("complaintNumber customerName phone followUpRemarks")
      .populate("followUpRemarks.createdBy", "name email")
      .lean();

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    const remarks = [...(complaint.followUpRemarks || [])].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return res.status(200).json({
      success: true,

      data: {
        complaintNumber: complaint.complaintNumber,
        customerName: complaint.customerName,
        phone: complaint.phone,
        remarks,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch remarks",
      error: error.message,
    });
  }
};

export const getDealerComplaintRemarks = async (req, res) => {
  try {
    const complaint = await Complaint.findOne({
      _id: req.params.id,
      allocatedDealerId: req.user.dealerId,
    })
      .select("complaintNumber followUpRemarks")
      .lean();

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    const remarks = (complaint.followUpRemarks || [])
      .filter((item) => item.sentToDealer)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    return res.status(200).json({
      success: true,
      data: remarks,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dealer remarks",
      error: error.message,
    });
  }
};

export const getDealerRemarkNotifications = async (req, res) => {
  try {
    const roleCode = req.user?.role?.code || req.user?.roleCode || req.user?.role;

    if (roleCode !== "DEALER" || !req.user?.dealerId) {
      return res.status(200).json({ success: true, data: [] });
    }

    const complaints = await Complaint.find({
      allocatedDealerId: req.user.dealerId,
      "followUpRemarks.sentToDealer": true,
    })
      .select("complaintNumber followUpRemarks")
      .lean();

    const items = [];

    for (const complaint of complaints) {
      for (const remark of complaint.followUpRemarks || []) {
        if (!remark.sentToDealer) continue;

        items.push({
          id: `${complaint._id}-${remark._id}`,
          title: `Remark on complaint ${complaint.complaintNumber}`,
          message: [remark.followUpStatus, remark.remark]
            .filter(Boolean)
            .join(" — "),
          type: "COMPLAINT",
          priority: "MEDIUM",
          isRead: false,
          createdAt: remark.createdAt,
          actionUrl: `/appointments/${complaint._id}`,
          entityId: String(complaint._id),
          entityType: "COMPLAINT",
        });
      }
    }

    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({ success: true, data: items.slice(0, 100) });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
};

export const saveCancellationRemark = async (req, res) => {
  try {
    const { id } = req.params;

    const { reasonId, followUpDate, remark } = req.body;

    /*
    |--------------------------------------------------------------------------
    | Validation
    |--------------------------------------------------------------------------
    */

    if (!reasonId) {
      return res.status(400).json({
        success: false,
        message: "Reason is required",
      });
    }

    if (!followUpDate) {
      return res.status(400).json({
        success: false,
        message: "Follow-up date is required",
      });
    }

    if (!remark?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Remark is required",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find Reason
    |--------------------------------------------------------------------------
    */

    const reason = await Reason.findById(reasonId);

    if (!reason) {
      return res.status(404).json({
        success: false,
        message: "Reason not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Complaint
    |--------------------------------------------------------------------------
    */

    const complaint = await Complaint.findById(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    const now = new Date();

    /*
    |--------------------------------------------------------------------------
    | Push Cancellation Remark
    |--------------------------------------------------------------------------
    */

    complaint.cancellationRemarks.push({
      reasonId: reason._id,

      // Snapshot of reason name
      reason: reason.reasonName,

      followUpDate: new Date(followUpDate),

      remark: remark.trim(),

      createdBy: req.user?._id || req.user?.id,

      createdAt: now,
      updatedAt: now,
    });

    /*
    |--------------------------------------------------------------------------
    | Latest Follow-up Data
    |--------------------------------------------------------------------------
    */

    complaint.cancellationFollowUpDate = new Date(followUpDate);

    complaint.cancellationLatestRemark = remark.trim();

    complaint.cancellationLastUpdatedAt = now;

    await complaint.save();

    return res.status(200).json({
      success: true,
      message: "Cancellation follow-up saved successfully",
      data: complaint,
    });
  } catch (error) {
    console.error("Save cancellation follow-up error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save cancellation follow-up",
      error: error.message,
    });
  }
};

export const cancelComplaint = async (req, res) => {
  try {
    const { id } = req.params;

    const { reasonId, followUpDate, remark } = req.body;

    if (!reasonId) {
      return res.status(400).json({
        success: false,
        message: "Cancellation reason is required",
      });
    }

    if (!followUpDate) {
      return res.status(400).json({
        success: false,
        message: "Date and time is required",
      });
    }

    if (!remark?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Remark is required",
      });
    }

    const reason = await Reason.findById(reasonId);

    if (!reason) {
      return res.status(404).json({
        success: false,
        message: "Cancellation reason not found",
      });
    }

    if (!reason.reasonType?.toLowerCase().includes("cancel")) {
      return res.status(400).json({
        success: false,
        message: "Invalid cancellation reason",
      });
    }

    const complaint = await Complaint.findById(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent reopening / repeated cancellation
    |--------------------------------------------------------------------------
    */

    if (complaint.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Complaint is already cancelled",
      });
    }

    const now = new Date();
    const parsedFollowUpDate = new Date(followUpDate);

    if (Number.isNaN(parsedFollowUpDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date and time",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Cancel Complaint
    |--------------------------------------------------------------------------
    */

    complaint.status = "CANCELLED";

    complaint.cancelledAt = now;

    /*
    |--------------------------------------------------------------------------
    | DO NOT CHANGE ORIGINAL CANCELLATION REASON
    |--------------------------------------------------------------------------
    |
    | complaint.cancellationReason remains unchanged.
    |
    */

    /*
    |--------------------------------------------------------------------------
    | Store Cancellation Follow-up / Remark
    |--------------------------------------------------------------------------
    */

    if (!Array.isArray(complaint.cancellationRemarks)) {
      complaint.cancellationRemarks = [];
    }

    complaint.cancellationRemarks.push({
      reasonId: reason._id,
      reason: reason.reasonName,

      followUpDate: parsedFollowUpDate,

      remark: remark.trim(),

      createdBy: req.user?._id || req.user?.id,

      createdAt: now,
      updatedAt: now,
    });

    /*
    |--------------------------------------------------------------------------
    | Latest Follow-up Snapshot
    |--------------------------------------------------------------------------
    */

    complaint.cancellationFollowUpDate = parsedFollowUpDate;

    complaint.cancellationLatestRemark = remark.trim();

    complaint.cancellationLastUpdatedAt = now;

    await complaint.save();

    return res.status(200).json({
      success: true,
      message: "Complaint cancelled successfully",
      data: complaint,
    });
  } catch (error) {
    console.error("Cancel complaint error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel complaint",
      error: error.message,
    });
  }
};

export const approveClosure = async (req, res) => {
  try {
    const { id } = req.params;
    const { remark } = req.body;

    if (!remark?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Closure remark is required",
      });
    }

    const complaint = await Complaint.findById(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent Duplicate Approval
    |--------------------------------------------------------------------------
    */

    if (complaint.closureApproved) {
      return res.status(400).json({
        success: false,
        message: "Closure is already approved",
      });
    }

    const now = new Date();

    /*
    |--------------------------------------------------------------------------
    | Approve Closure
    |--------------------------------------------------------------------------
    */

    complaint.closureApproved = true;

    complaint.closureApprovalRemark = remark.trim();

    complaint.closureApprovedAt = now;

    complaint.closureApprovedBy = req.user?._id || req.user?.id;

    // The category in force at approval is the verified one
    if (!complaint.verifiedCategory) {
      complaint.verifiedCategoryId =
        complaint.closureCategoryId || complaint.categoryId || null;
      complaint.verifiedCategory =
        complaint.closureCategory || complaint.category || "";
    }

    // Approving the closure closes the complaint
    complaint.status = "CLOSED";

    if (!complaint.closedAt) {
      complaint.closedAt = now;
    }

    await complaint.save();

    return res.status(200).json({
      success: true,
      message: "Closure approved successfully",
      data: complaint,
    });
  } catch (error) {
    console.error("Approve closure error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to approve closure",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Change the closure category from Closure History
|--------------------------------------------------------------------------
| PATCH /appointments/complaints/:id/closure-category
| Allowed until the closure is approved. The pending bill is recalculated
| from the selected category.
*/

export const updateClosureCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId, closureId } = req.body;

    if (closureId && mongoose.isValidObjectId(id)) {
      return await changeVerificationClosure(req, res, closureId);
    }

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(categoryId)) {
      return res.status(400).json({
        success: false,
        message: "Valid complaint and category are required",
      });
    }

    const complaint = await Complaint.findById(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    if (
      !["CLOSE_ON_BILLING", "CLOSE_ON_VERIFICATION"].includes(complaint.status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Category can be changed only for a closed complaint",
      });
    }

    if (complaint.closureApproved) {
      return res.status(400).json({
        success: false,
        message: "Closure is already approved, category cannot be changed",
      });
    }

    const category = await Category.findById(categoryId).lean();

    if (
      !category ||
      Number(category.product_id) !== Number(complaint.productId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Selected category does not belong to this product",
      });
    }

    const previousCategory =
      complaint.closureCategory || complaint.category || "";

    complaint.closureCategoryId = category._id;
    complaint.closureCategory = category.category;

    // Remember what was selected at verification time
    complaint.verifiedCategoryId = category._id;
    complaint.verifiedCategory = category.category;

    // Recalculate first: it throws when the dealer has no rate for the
    // category, in which case nothing is saved.
    let ledger = null;

    try {
      ledger = await recalculateClosureLedger({ complaint });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    await complaint.save();

    await createComplaintActivity({
      complaint,
      activityType: "COMPLAINT_UPDATED",
      previousStatus: complaint.status,
      newStatus: complaint.status,
      title: "Closure Category Changed",
      description: `Closure category changed from ${previousCategory || "-"} to ${category.category}`,
      user: req.user,
      metadata: {
        categoryId: category._id,
        ledgerId: ledger?._id,
        amount: ledger?.amount,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Closure category updated",
      data: complaint,
      ledger,
    });
  } catch (error) {
    console.error("Update closure category error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update closure category",
      error: error.message,
    });
  }
};


/*
 * Closures the allocated dealer has configured for this complaint's product
 * and city (used by the Dealer Panel's close-complaint sheet).
 */
export const getComplaintClosureOptions = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).lean();

    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    const dealer = await Dealer.findById(
      complaint.allocatedDealerId || complaint.dealerId,
    ).lean();

    const cityProfile = getDealerCityProfile(dealer, complaint.address?.cityId);
    const product = (
      cityProfile?.productServices ?? dealer?.productServices ?? []
    ).find((p) => Number(p.productId) === Number(complaint.productId));

    const closures = (product?.closures ?? []).map((c) => ({
      closureId: String(c.closureId),
      title: c.title,
      rate: Number(c.rate || 0),
      autoBill: !!c.autoBill,
      defaultBill: !!c.defaultBill,
    }));

    return res.json({ success: true, data: closures });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


/*
 * Verification: DG picks another of the dealer's closures; the bill is
 * recalculated from that closure's rate.
 */
async function changeVerificationClosure(req, res, closureId) {
  const complaint = await Complaint.findById(req.params.id);

  if (!complaint) {
    return res.status(404).json({ success: false, message: "Complaint not found" });
  }

  if (!["CLOSE_ON_BILLING", "CLOSE_ON_VERIFICATION"].includes(complaint.status)) {
    return res.status(400).json({
      success: false,
      message: "Closure can be changed only for a closed complaint",
    });
  }

  if (complaint.closureApproved) {
    return res.status(400).json({
      success: false,
      message: "Closure is already approved, closure cannot be changed",
    });
  }

  const dealer = await Dealer.findById(
    complaint.allocatedDealerId || complaint.dealerId,
  ).lean();
  const cityProfile = getDealerCityProfile(dealer, complaint.address?.cityId);
  const product = (
    cityProfile?.productServices ?? dealer?.productServices ?? []
  ).find((p) => Number(p.productId) === Number(complaint.productId));
  const picked = (product?.closures ?? []).find(
    (c) => String(c.closureId) === String(closureId),
  );

  if (!picked) {
    return res.status(400).json({
      success: false,
      message: "Selected closure is not configured for this dealer",
    });
  }

  const previous = complaint.closureTitle || complaint.category || "";

  complaint.closureId = String(picked.closureId);
  complaint.closureTitle = picked.title || "";
  complaint.closureRate = Number(picked.rate || 0);
  complaint.verifiedClosureTitle = complaint.closureTitle;

  let ledger = null;

  try {
    ledger = await recalculateClosureLedger({ complaint });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }

  await complaint.save();

  await createComplaintActivity({
    complaint,
    activityType: "COMPLAINT_UPDATED",
    previousStatus: complaint.status,
    newStatus: complaint.status,
    title: "Closure Changed",
    description: `Closure changed from ${previous || "-"} to ${complaint.closureTitle}`,
    user: req.user,
    metadata: { closureId: complaint.closureId, ledgerId: ledger?._id, amount: ledger?.amount },
  });

  return res.status(200).json({
    success: true,
    message: "Closure updated",
    data: complaint,
    ledger,
  });
}
