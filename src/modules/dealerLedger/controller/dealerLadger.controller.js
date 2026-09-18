// dealerLedger.controller.js

import mongoose from "mongoose";
import DealerLedger from "../model/dealerLedger.model.js";
import Complaint from "../../Complaint/models/complaint.model.js";
import { createComplaintActivity } from "../../Complaint/services/complaintActivity.service.js";

/*
|--------------------------------------------------------------------------
| GET ALL DEALER LEDGERS
|--------------------------------------------------------------------------
|
| Filters:
| search
| dealerId
| status
| billingType
| transactionType
| fromDate
| toDate
| page
| limit
|
*/

export const getAllDealerLedgers = async (req, res) => {
  try {
    const {
      search = "",
      dealerId,
      status,
      billingType,
      transactionType,
      fromDate,
      toDate,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    /*
    |--------------------------------------------------------------------------
    | Search
    |--------------------------------------------------------------------------
    */

    if (search.trim()) {
      const regex = new RegExp(
        search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      );

      filter.$or = [
        { dealerCode: regex },
        { dealerName: regex },
        { complaintNumber: regex },
        { productName: regex },
        { category: regex },
        { description: regex },
      ];
    }

    /*
    |--------------------------------------------------------------------------
    | Dealer Filter
    |--------------------------------------------------------------------------
    */

    if (dealerId) {
      if (!mongoose.Types.ObjectId.isValid(dealerId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid dealer ID",
        });
      }

      filter.dealerId = dealerId;
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
    | Billing Type
    |--------------------------------------------------------------------------
    */

    if (billingType) {
      filter.billingType = billingType;
    }

    /*
    |--------------------------------------------------------------------------
    | Transaction Type
    |--------------------------------------------------------------------------
    */

    if (transactionType) {
      filter.transactionType = transactionType;
    }

    /*
    |--------------------------------------------------------------------------
    | Custom Date Filter
    |--------------------------------------------------------------------------
    */

    if (fromDate || toDate) {
      filter.billingDate = {};

      if (fromDate) {
        const startDate = new Date(fromDate);

        if (Number.isNaN(startDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid fromDate",
          });
        }

        startDate.setHours(0, 0, 0, 0);

        filter.billingDate.$gte = startDate;
      }

      if (toDate) {
        const endDate = new Date(toDate);

        if (Number.isNaN(endDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid toDate",
          });
        }

        endDate.setHours(23, 59, 59, 999);

        filter.billingDate.$lte = endDate;
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

    const [ledgers, total] = await Promise.all([
      DealerLedger.find(filter)
        .populate({
          path: "dealerId",
          select:
            "headCode technicianFirmName technicianName mobileNumber email billingType billingPercentage",
        })
        .populate({
          path: "complaintId",
          select: "complaintNumber customerName phone status",
        })
        .sort({
          billingDate: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(pageLimit)
        .lean(),

      DealerLedger.countDocuments(filter),
    ]);

    /*
    |--------------------------------------------------------------------------
    | Summary for current filter
    |--------------------------------------------------------------------------
    */

    const summaryResult = await DealerLedger.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: null,

          totalAmount: {
            $sum: "$amount",
          },

          approvedAmount: {
            $sum: {
              $cond: [
                {
                  $eq: ["$status", "APPROVED"],
                },
                "$amount",
                0,
              ],
            },
          },

          pendingAmount: {
            $sum: {
              $cond: [
                {
                  $eq: ["$status", "PENDING"],
                },
                "$amount",
                0,
              ],
            },
          },

          totalDebit: {
            $sum: {
              $cond: [
                {
                  $eq: ["$entryType", "DEBIT"],
                },
                "$amount",
                0,
              ],
            },
          },

          totalCredit: {
            $sum: {
              $cond: [
                {
                  $eq: ["$entryType", "CREDIT"],
                },
                "$amount",
                0,
              ],
            },
          },
        },
      },
    ]);

    const summary = summaryResult[0] || {
      totalAmount: 0,
      approvedAmount: 0,
      pendingAmount: 0,
      totalDebit: 0,
      totalCredit: 0,
    };

    return res.status(200).json({
      success: true,
      message: "Dealer ledgers fetched successfully",

      data: ledgers,

      summary: {
        totalAmount: summary.totalAmount || 0,

        approvedAmount: summary.approvedAmount || 0,

        pendingAmount: summary.pendingAmount || 0,

        totalDebit: summary.totalDebit || 0,

        totalCredit: summary.totalCredit || 0,

        balance: (summary.totalDebit || 0) - (summary.totalCredit || 0),
      },

      pagination: {
        page: currentPage,

        limit: pageLimit,

        total,

        totalPages: Math.ceil(total / pageLimit),

        hasNextPage: currentPage < Math.ceil(total / pageLimit),

        hasPreviousPage: currentPage > 1,
      },
    });
  } catch (error) {
    console.error("GET DEALER LEDGER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dealer ledger",
      error: error.message,
    });
  }
};

export const approveDealerLedger = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { id } = req.params;
    const { remarks = "" } = req.body;

    /*
    |--------------------------------------------------------------------------
    | Validate ID
    |--------------------------------------------------------------------------
    */

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ledger ID",
      });
    }

    session.startTransaction();

    /*
    |--------------------------------------------------------------------------
    | Find Ledger
    |--------------------------------------------------------------------------
    */

    const ledger = await DealerLedger.findById(id).session(session);

    if (!ledger) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Dealer ledger not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Already Approved
    |--------------------------------------------------------------------------
    */

    if (ledger.status === "APPROVED") {
      await session.abortTransaction();

      return res.status(409).json({
        success: false,
        message: "Ledger is already approved",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Only pending ledger can be approved
    |--------------------------------------------------------------------------
    */

    if (ledger.status !== "PENDING") {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: `Cannot approve ledger with status ${ledger.status}`,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate transaction
    |--------------------------------------------------------------------------
    */

    if (ledger.transactionType !== "CLOSURE") {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Only closure billing can be approved from this API",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find Complaint
    |--------------------------------------------------------------------------
    */

    const complaint = await Complaint.findById(ledger.complaintId).session(
      session,
    );
    console.log("khdbfkbdkbdkb",complaint)

    if (!complaint) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Complaint linked to this ledger was not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Billing Review
    |--------------------------------------------------------------------------
    */

    if (!complaint.billingReview) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Billing review not found for this complaint",
      });
    }

    if (complaint.billingReview.status === "VERIFIED") {
      await session.abortTransaction();

      return res.status(409).json({
        success: false,
        message: "Complaint billing is already verified",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Previous status for activity
    |--------------------------------------------------------------------------
    */

    const previousStatus = complaint.status;

    /*
    |--------------------------------------------------------------------------
    | Approve Ledger
    |--------------------------------------------------------------------------
    */

    ledger.status = "APPROVED";

    ledger.remarks = remarks;

    ledger.approvedAt = new Date();

    ledger.approvedBy = req.user?._id || req.user?.id || null;

    await ledger.save({
      session,
    });

    /*
    |--------------------------------------------------------------------------
    | Verify Complaint Billing
    |--------------------------------------------------------------------------
    */

    complaint.billingReview.status = "VERIFIED";

    complaint.billingReview.reviewedAt = new Date();

    complaint.billingReview.reviewedBy = req.user?.name || "DG";

    complaint.billingReview.reviewerId = req.user?._id || req.user?.id || null;

    complaint.billingReview.remarks = remarks;

    /*
    |--------------------------------------------------------------------------
    | Close Complaint
    |--------------------------------------------------------------------------
    */

    complaint.status = "CLOSED";

    complaint.closedAt = new Date();

    complaint.pendingReason = "";

    complaint.cancellationReason = "";

    await complaint.save({
      session,
    });

    /*
    |--------------------------------------------------------------------------
    | Activity
    |--------------------------------------------------------------------------
    */

    await createComplaintActivity({
      complaint,

      activityType: "COMPLAINT_CLOSED",

      previousStatus,

      newStatus: "CLOSED",

      title: "Billing Approved & Complaint Closed",

      description: "Dealer billing approved by DG and complaint closed",

      user: req.user,

      metadata: {
        ledgerId: ledger._id,

        billingType: ledger.billingType,

        amount: ledger.amount,
      },

      session,
    });

    /*
    |--------------------------------------------------------------------------
    | Commit
    |--------------------------------------------------------------------------
    */

    await session.commitTransaction();

    return res.status(200).json({
      success: true,

      message: "Ledger approved and complaint closed successfully",

      data: {
        ledger,
        complaint,
      },
    });
  } catch (error) {
    await session.abortTransaction();

    console.error("APPROVE DEALER LEDGER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to approve dealer ledger",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};
