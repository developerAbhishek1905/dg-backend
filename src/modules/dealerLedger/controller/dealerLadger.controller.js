// dealerLedger.controller.js

import mongoose from "mongoose";
import DealerLedger from "../model/dealerLedger.model.js";
import Dealer from "../../dealers/models/dealer.model.js";
import Category from "../../category/models/category.model.js";
import Complaint from "../../Complaint/models/complaint.model.js";
import { createComplaintActivity } from "../../Complaint/services/complaintActivity.service.js";
import Account from "../../accounts/model/account.model.js";
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

const BILLING_TYPES = [
  "FIXED",
  "PARTIAL_PAYMENT",
  "PROFIT_SHARING",
  "CANCELLATION",
  "OPENING_BALANCE",
  "ADJUSTMENT",
];

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
          select: `
    complaintNumber
    customerName
    phone
    status
    units
    closureApprovalRemark
  `,
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

    const formattedLedgers = ledgers.map((ledger) => {
      const complaint = ledger.complaintId;

      return {
        ...ledger,

        units: complaint?.units ?? 1,

        closingRemark: complaint?.closureApprovalRemark || "",
      };
    });

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

const getTransactionType = (billingType) => {
  switch (billingType) {
    case "CANCELLATION":
      return "CANCELLATION";

    case "OPENING_BALANCE":
      return "OPENING_BALANCE";

    case "ADJUSTMENT":
      return "ADJUSTMENT";

    default:
      return "CLOSURE";
  }
};

const roundAmount = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const getBillCalculation = (data) => {
  const { billingType, customerAmount, profitAmount, percentage, amount } =
    data;

  let finalAmount = 0;
  let baseAmount = 0;

  if (billingType === "PARTIAL_PAYMENT") {
    baseAmount = customerAmount;
    finalAmount = roundAmount((customerAmount * percentage) / 100);
  } else if (billingType === "PROFIT_SHARING") {
    baseAmount = profitAmount;
    finalAmount = roundAmount((profitAmount * percentage) / 100);
  } else {
    baseAmount = amount;
    finalAmount = amount;
  }

  return {
    baseAmount,
    amount: finalAmount,
    calculation: {
      fixedRate: billingType === "FIXED" ? finalAmount : 0,
      customerAmount,
      profitAmount,
      percentage,
    },
  };
};

const validateBill = (body) => {
  if (!mongoose.isValidObjectId(body.dealerId)) {
    return "Valid dealer is required";
  }

  if (!BILLING_TYPES.includes(body.billingType)) {
    return "Invalid billing type";
  }

  if (!Number.isInteger(Number(body.units)) || Number(body.units) < 1) {
    return "Units must be a positive integer";
  }

  const numbers = ["customerAmount", "profitAmount", "percentage", "amount"];

  for (const key of numbers) {
    const value = Number(body[key] ?? 0);

    if (!Number.isFinite(value) || value < 0) {
      return `${key} must be a valid non-negative number`;
    }
  }

  const percentage = Number(body.percentage ?? 0);

  if (percentage > 100) {
    return "Percentage cannot exceed 100";
  }

  if (body.categoryId && !mongoose.isValidObjectId(body.categoryId)) {
    return "Invalid category ID";
  }

  if (
    body.productId !== null &&
    body.productId !== undefined &&
    body.productId !== "" &&
    !Number.isFinite(Number(body.productId))
  ) {
    return "Invalid product ID";
  }

  return null;
};

const buildBillData = async (body, existingBill = null) => {
  const dealer = await Dealer.findById(body.dealerId).lean();

  if (!dealer) {
    return {
      error: "Dealer not found",
      status: 404,
    };
  }

  let category = null;

  if (body.categoryId) {
    category = await Category.findById(body.categoryId).lean();

    if (!category) {
      return {
        error: "Category not found",
        status: 404,
      };
    }
  }

  const complaintNumber = String(body.complaintNumber || "")
    .trim()
    .toUpperCase();

  let complaint = null;

  if (complaintNumber) {
    complaint = await Complaint.findOne({
      complaintNumber,
    }).lean();

    if (!complaint) {
      return {
        error: "Complaint not found",
        status: 404,
      };
    }
  }

  const billingType = body.billingType;

  // Manual closure/cancellation bills must reference a complaint.
  if (
    ["FIXED", "PARTIAL_PAYMENT", "PROFIT_SHARING", "CANCELLATION"].includes(
      billingType,
    ) &&
    !complaint
  ) {
    return {
      error: "Complaint is required for this billing type",
      status: 400,
    };
  }

  // Prevent a duplicate ledger for the same complaint and transaction.
  // if (complaint) {
  //   const duplicate = await DealerLedger.findOne({
  //     complaintId: complaint._id,
  //     transactionType: getTransactionType(billingType),
  //     reversed: { $ne: true },
  //     status: { $nin: ["REVERSED", "CANCELLED"] },
  //     ...(existingBill
  //       ? { _id: { $ne: existingBill._id } }
  //       : {}),
  //   }).lean();

  //   if (duplicate) {
  //     return {
  //       error: "An active bill already exists for this complaint and transaction type",
  //       status: 409,
  //     };
  //   }
  // }

  const customerAmount = Number(body.customerAmount ?? 0);
  const profitAmount = Number(body.profitAmount ?? 0);
  const percentage = Number(body.percentage ?? 0);
  const enteredAmount = Number(body.amount ?? 0);

  const calculation = getBillCalculation({
    billingType,
    customerAmount,
    profitAmount,
    percentage,
    amount: enteredAmount,
  });

  // Use verified category/product snapshot when linked to a complaint.
  // For manual adjustment/opening balance, use submitted fields.
  const productId =
    body.productId === null ||
    body.productId === undefined ||
    body.productId === ""
      ? null
      : Number(body.productId);

  const billData = {
    dealerId: dealer._id,
    dealerCode: dealer.headCode || "",
    dealerName: dealer.technicianFirmName || dealer.technicianName || "",

    complaintId: complaint?._id ?? null,
    complaintNumber,

    transactionType: getTransactionType(billingType),
    billingType,

    productId,
    productName: String(body.productName || "").trim(),

    categoryId: category?._id ?? null,
    category: category?.category || String(body.category || "").trim(),
    serviceDescription:
      category?.description || existingBill?.serviceDescription || "",

    units: Number(body.units),

    customerAmount,
    profitAmount,
    baseAmount: calculation.baseAmount,
    percentage,

    serviceRate: billingType === "FIXED" ? calculation.amount : 0,

    amount: calculation.amount,
    calculation: calculation.calculation,

    entryType: body.entryType === "CREDIT" ? "CREDIT" : "DEBIT",

    description: String(
      body.description ||
        `${billingType.replaceAll("_", " ")} billing${
          complaintNumber ? ` for complaint ${complaintNumber}` : ""
        }`,
    ).trim(),
  };

  return {
    billData,
    complaint,
  };
};

/*
|--------------------------------------------------------------------------
| CREATE BILL
|--------------------------------------------------------------------------
| POST /api/v1/billing/ledgers
*/

const isValidId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

export const createDealerLedger = async (req, res) => {
  /*
  |--------------------------------------------------------------------------
  | Manual Account Entry
  |--------------------------------------------------------------------------
  */

  if (req.body.entrySource === "MANUAL_ACCOUNT_ENTRY") {
    let session;

    try {
      const {
        dealerId,
        billingDate,
        referenceNumber,
        description,
        debitEntries = [],
        creditEntries = [],
      } = req.body;

      if (!isValidId(dealerId)) {
        return res.status(400).json({
          success: false,
          message: "Valid dealer is required",
        });
      }

      if (
        !Array.isArray(debitEntries) ||
        !Array.isArray(creditEntries)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid debit or credit entries",
        });
      }

      const entries = [
        ...debitEntries.map((entry) => ({
          ...entry,
          accountType: "DEBIT",
        })),
        ...creditEntries.map((entry) => ({
          ...entry,
          accountType: "CREDIT",
        })),
      ];

      if (!entries.length) {
        return res.status(400).json({
          success: false,
          message: "At least one entry is required",
        });
      }

      for (const entry of entries) {
        if (
          !isValidId(entry.accountId) ||
          !Number.isFinite(Number(entry.amount)) ||
          Number(entry.amount) <= 0
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid account or amount",
          });
        }
      }

      if (
        !billingDate ||
        !/^\d{4}-\d{2}-\d{2}$/.test(billingDate) ||
        Number.isNaN(Date.parse(billingDate))
      ) {
        return res.status(400).json({
          success: false,
          message: "Valid billing date is required",
        });
      }

      const uniqueAccountIds = [
        ...new Set(
          entries.map((entry) => String(entry.accountId)),
        ),
      ];

      session = await mongoose.startSession();

      let ledger;

      await session.withTransaction(async () => {
        const dealer = await Dealer.findById(
          dealerId,
        ).session(session);

        if (!dealer) {
          const error = new Error("Dealer not found");
          error.statusCode = 404;
          throw error;
        }

        const accounts = await Account.find({
          _id: { $in: uniqueAccountIds },
        }).session(session);

        if (accounts.length !== uniqueAccountIds.length) {
          const error = new Error(
            "One or more selected accounts do not exist",
          );
          error.statusCode = 400;
          throw error;
        }

        const [createdLedger] = await DealerLedger.create(
          [
            {
              dealerId: dealer._id,
              dealerCode: dealer.headCode || "",
              dealerName:
                dealer.technicianFirmName ||
                dealer.technicianName ||
                "",

              transactionType: "ADJUSTMENT",
              billingType: "ADJUSTMENT",
              entrySource: "MANUAL_ACCOUNT_ENTRY",

              debitEntries: debitEntries.map((entry) => ({
                accountId: entry.accountId,
                amount: Number(entry.amount),
              })),

              creditEntries: creditEntries.map((entry) => ({
                accountId: entry.accountId,
                amount: Number(entry.amount),
              })),

              amount: 0,
              entryType: "DEBIT",

              referenceNumber:
                String(referenceNumber || "").trim(),

              description:
                String(description || "").trim(),

              billingDate: new Date(
                `${billingDate}T00:00:00.000Z`,
              ),

              billedBy: req.user?._id ?? null,
              status: "APPROVED",
              approvedBy: req.user?._id ?? null,
              approvedAt: new Date(),
            },
          ],
          { session },
        );

        ledger = createdLedger;

        /*
        |--------------------------------------------------------------------------
        | Sync All Entries To Account.balance[]
        |--------------------------------------------------------------------------
        */

        for (const entry of entries) {
          const result = await Account.updateOne(
            {
              _id: entry.accountId,
              "balance.ledgerId": {
                $ne: ledger._id,
              },
            },
            {
              $push: {
                balance: {
                  dealerId: dealer._id,
                  ledgerId: ledger._id,
                  amount: Number(entry.amount),
                  accountType: entry.accountType,
                },
              },
            },
            { session },
          );

          if (result.modifiedCount !== 1) {
            throw new Error(
              "Failed to sync account balance",
            );
          }
        }
      });

      return res.status(201).json({
        success: true,
        message: "Dealer entry saved successfully",
        data: ledger,
      });
    } catch (error) {
      console.error("MANUAL LEDGER ERROR:", error);

      return res.status(error.statusCode || 500).json({
        success: false,
        message:
          error.statusCode
            ? error.message
            : "Failed to save dealer entry",
      });
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Existing Normal Bill Creation
  |--------------------------------------------------------------------------
  |
  | Manual bill from the billing module (create bill form).
  | Created as PENDING and approved later from the billing table.
  |
  */

  try {
    const error = validateBill(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    const result = await buildBillData(req.body);

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    const { billData } = result;

    const ledger = await DealerLedger.create({
      ...billData,
      entrySource: "SYSTEM",
      status: "PENDING",
      billingDate: new Date(),
      billedBy: req.user?._id || req.user?.id || null,
    });

    return res.status(201).json({
      success: true,
      message: "Bill created successfully",
      data: ledger,
    });
  } catch (error) {
    console.error("CREATE BILL ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create bill",
    });
  }
};


/*
|--------------------------------------------------------------------------
| UPDATE BILL
|--------------------------------------------------------------------------
| PATCH /api/v1/billing/ledgers/:id
*/

export const updateDealerLedger = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bill ID",
      });
    }

    const existingBill = await DealerLedger.findById(id);

    if (!existingBill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }

    if (existingBill.status !== "PENDING") {
      return res.status(403).json({
        success: false,
        message: "Only pending bills can be edited",
      });
    }

    if (existingBill.reversed) {
      return res.status(403).json({
        success: false,
        message: "Reversed bills cannot be edited",
      });
    }

    // Merge existing values because PATCH can contain partial fields.
    const body = {
      dealerId: existingBill.dealerId.toString(),
      complaintNumber: existingBill.complaintNumber,
      productId: existingBill.productId,
      productName: existingBill.productName,
      categoryId: existingBill.categoryId?.toString() || "",
      category: existingBill.category,
      units: existingBill.units,
      billingType: existingBill.billingType,
      customerAmount: existingBill.customerAmount,
      profitAmount: existingBill.profitAmount,
      percentage: existingBill.percentage,
      amount: existingBill.amount,
      entryType: existingBill.entryType,
      description: existingBill.description,
      ...req.body,
    };

    const error = validateBill(body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    const result = await buildBillData(body, existingBill);

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    const { billData } = result;

    // Atomic status guard prevents overwriting a bill approved
    // while the edit request was being processed.
    const updatedBill = await DealerLedger.findOneAndUpdate(
      {
        _id: id,
        status: "PENDING",
        reversed: { $ne: true },
      },
      {
        $set: billData,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedBill) {
      return res.status(409).json({
        success: false,
        message: "Bill status changed. Please reload.",
      });
    }

    // closingRemark is intentionally not updated.
    // approvedBy, approvedAt and billingDate remain unchanged.

    return res.status(200).json({
      success: true,
      message: "Bill updated successfully",
      data: updatedBill,
    });
  } catch (error) {
    console.error("UPDATE BILL ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update bill",
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

    /*
     * Manual bills that are not a complaint closure (opening balance,
     * adjustment, cancellation, or no complaint) have no complaint flow:
     * just approve the bill.
     */
    if (ledger.transactionType !== "CLOSURE" || !ledger.complaintId) {
      ledger.status = "APPROVED";

      ledger.remarks = remarks;

      ledger.approvedAt = new Date();

      ledger.approvedBy = req.user?._id || req.user?.id || null;

      await ledger.save({ session });

      await session.commitTransaction();

      return res.status(200).json({
        success: true,
        message: "Bill approved successfully",
        data: { ledger },
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
    console.log("khdbfkbdkbdkb", complaint);

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

    console.log("aaaaaaaaaaaaaa",complaint.billingReview)

    // FIXED billing has no billing review, it only needs manual approval
    const isFixedBilling = ledger.billingType === "FIXED";

    if (!complaint.billingReview && !isFixedBilling) {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message: "Billing review not found for this complaint",
      });
    }

    /*
     * The complaint billing is already verified (for example a manually
     * created extra bill for the same complaint). Only this bill is
     * approved, the complaint is not touched again.
     */
    const complaintAlreadyVerified =
      complaint.billingReview?.status === "VERIFIED";

    /*
    |--------------------------------------------------------------------------
    | Previous status for activity
    |--------------------------------------------------------------------------
    */

    /*
    |--------------------------------------------------------------------------
    | The complaint must be approved (closed) from Closure History first
    |--------------------------------------------------------------------------
    */

    if (complaint.status !== "CLOSED") {
      await session.abortTransaction();

      return res.status(400).json({
        success: false,
        message:
          "Approve this complaint from Closure History first. The bill can be approved only after the complaint is CLOSED.",
      });
    }

    const previousStatus = complaint.status;

    if (complaintAlreadyVerified) {
      ledger.status = "APPROVED";

      ledger.remarks = remarks;

      ledger.approvedAt = new Date();

      ledger.approvedBy = req.user?._id || req.user?.id || null;

      await ledger.save({ session });

      await session.commitTransaction();

      return res.status(200).json({
        success: true,
        message: "Bill approved successfully",
        data: { ledger, complaint },
      });
    }

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

    if (complaint.billingReview) {
      complaint.billingReview.status = "VERIFIED";

      complaint.billingReview.reviewedAt = new Date();

      complaint.billingReview.reviewedBy = req.user?.name || "DG";

      complaint.billingReview.reviewerId =
        req.user?._id || req.user?.id || null;

      complaint.billingReview.remarks = remarks;
    }

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

export const getDealerUnpaidBills = async (req, res) => {
  try {
    const { dealerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(dealerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid dealer ID",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Dealer + Opening Balance
    |--------------------------------------------------------------------------
    */

    const dealer = await Dealer.findById(dealerId)
      .select(
        "headCode technicianFirmName technicianName mobileNumber openingBalance openingBalanceType",
      )
      .lean();

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer not found",
      });
    }

    const openingBalance = Number(dealer.openingBalance || 0);

    const openingDebit =
      dealer.openingBalanceType === "DR" ? openingBalance : 0;

    const openingCredit =
      dealer.openingBalanceType === "CR" ? openingBalance : 0;

    /*
    |--------------------------------------------------------------------------
    | Approved Ledger Totals
    |--------------------------------------------------------------------------
    */

    const dealerObjectId = new mongoose.Types.ObjectId(dealerId);

    const totals = await DealerLedger.aggregate([
      {
        $match: {
          dealerId: dealerObjectId,
          status: { $in: ["APPROVED", "BILLED"] },
          reversed: false,

          // Opening balance is already stored in Dealer.
          // Avoid counting it twice.
          transactionType: {
            $ne: "OPENING_BALANCE",
          },
        },
      },
      {
        $group: {
          _id: "$entryType",
          total: { $sum: "$amount" },
        },
      },
    ]);

    const ledgerDebit = totals.find((item) => item._id === "DEBIT")?.total || 0;

    const ledgerCredit =
      totals.find((item) => item._id === "CREDIT")?.total || 0;

    const totalDebit = openingDebit + ledgerDebit;

    const totalCredit = openingCredit + ledgerCredit;

    const netOutstanding = totalDebit - totalCredit;

    const balanceType =
      netOutstanding > 0 ? "DEBIT" : netOutstanding < 0 ? "CREDIT" : "SETTLED";

    /*
    |--------------------------------------------------------------------------
    | Unpaid Complaint Bills
    |--------------------------------------------------------------------------
    */

    const bills = await DealerLedger.find({
      dealerId: dealerObjectId,

      transactionType: {
        $in: ["CLOSURE", "CANCELLATION", "PENALTY"],
      },

      status: {
        $in: ["APPROVED", "BILLED"],
      },

      reversed: false,

      complaintId: { $ne: null },

      paymentStatus: {
        $in: ["UNPAID", "PARTIALLY_PAID", null],
      },
    })
      .select(
        "_id complaintId complaintNumber productName category serviceDescription amount paidAmount paymentStatus entryType billingDate",
      )
      .sort({ billingDate: -1 })
      .lean();

    const unpaidBills = bills
      .map((bill) => {
        const paidAmount = Number(bill.paidAmount || 0);

        const remainingAmount = Math.max(
          0,
          Number(bill.amount || 0) - paidAmount,
        );

        return {
          _id: bill._id,
          complaintId: bill.complaintId,
          complaintNumber: bill.complaintNumber,

          productName: bill.productName,
          category: bill.category,
          serviceDescription: bill.serviceDescription,

          amount: bill.amount,
          paidAmount,
          remainingAmount,

          paymentStatus: bill.paymentStatus,
          entryType: bill.entryType,
          billingDate: bill.billingDate,
        };
      })
      .filter((bill) => bill.remainingAmount > 0);

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,
      message: "Dealer unpaid bills fetched successfully",

      data: {
        dealer: {
          _id: dealer._id,
          headCode: dealer.headCode,
          technicianFirmName: dealer.technicianFirmName,
          technicianName: dealer.technicianName,
          mobileNumber: dealer.mobileNumber,
        },

        summary: {
          openingBalance,
          openingBalanceType: dealer.openingBalanceType,

          openingDebit,
          openingCredit,

          ledgerDebit,
          ledgerCredit,

          totalDebit,
          totalCredit,

          netOutstanding,
          balanceType,
        },

        bills: unpaidBills,

        totalUnpaidBills: unpaidBills.length,

        totalUnpaidAmount: unpaidBills.reduce(
          (total, bill) => total + bill.remainingAmount,
          0,
        ),
      },
    });
  } catch (error) {
    console.error("Get Dealer Unpaid Bills Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dealer unpaid bills",
      error: error.message,
    });
  }
};

export const getDealerLedgerOverview = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const search = String(req.query.search || "").trim();

    const match = {};

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");

      match.$or = [
        { headCode: regex },
        { technicianFirmName: regex },
        { technicianName: regex },
        { mobileNumber: regex },
      ];
    }

    const dealers = await Dealer.find(match)
      .select(
        "headCode technicianFirmName technicianName mobileNumber openingBalance openingBalanceType securityAmount creditLimit",
      )
      .sort({ headCode: 1 })
      .lean();

    const dealerIds = dealers.map((dealer) => dealer._id);

    const unpaidGroups = await DealerLedger.aggregate([
      {
        $match: {
          dealerId: { $in: dealerIds },
          transactionType: { $in: ["CLOSURE", "CANCELLATION", "PENALTY"] },
          entryType: "DEBIT",
          status: { $in: ["APPROVED", "BILLED"] },
          reversed: false,
          complaintId: { $ne: null },
          paymentStatus: {
            $in: ["UNPAID", "PARTIALLY_PAID", null],
          },
        },
      },
      {
        $project: {
          dealerId: 1,
          remainingAmount: {
            $max: [
              0,
              {
                $subtract: [
                  { $ifNull: ["$amount", 0] },
                  { $ifNull: ["$paidAmount", 0] },
                ],
              },
            ],
          },
        },
      },
      {
        $match: {
          remainingAmount: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: "$dealerId",
          unpaidBillsCount: { $sum: 1 },
          unpaidBillsAmount: { $sum: "$remainingAmount" },
        },
      },
    ]);

    const unpaidMap = new Map(
      unpaidGroups.map((item) => [String(item._id), item]),
    );

    const money = (value) => Math.round((Number(value) || 0) * 100) / 100;

    const rows = dealers.map((dealer) => {
      const balance = money(dealer.openingBalance);
      const isCredit = dealer.openingBalanceType === "CR";
      const unpaid = unpaidMap.get(String(dealer._id));

      return {
        dealerId: dealer._id,
        headCode: dealer.headCode || "",
        dealerName: dealer.technicianFirmName || dealer.technicianName || "",
        mobileNumber: dealer.mobileNumber || "",

        unpaidBillsCount: unpaid?.unpaidBillsCount || 0,
        unpaidBillsAmount: money(unpaid?.unpaidBillsAmount),

        // Outstanding = Unpaid Bills Amount
        currentOutstanding: money(unpaid?.unpaidBillsAmount),

        // Running Balance
        openingBalance: money(dealer.openingBalance),
        openingBalanceType: dealer.openingBalanceType || "DR",

        creditLimit: money(dealer.creditLimit),
        securityDeposit: money(dealer.securityAmount),

        creditAmount:
          dealer.openingBalanceType === "CR" ? money(dealer.openingBalance) : 0,
      };
    });

    const summary = rows.reduce(
      (total, row) => {
        total.unpaidBillsCount += row.unpaidBillsCount;
        total.unpaidBillsAmount += row.unpaidBillsAmount;
        total.currentOutstanding += row.currentOutstanding;
        total.creditAmount += row.creditAmount;
        total.securityDeposit += row.securityDeposit;
        return total;
      },
      {
        totalDealers: rows.length,
        unpaidBillsCount: 0,
        unpaidBillsAmount: 0,
        currentOutstanding: 0,
        creditAmount: 0,
        securityDeposit: 0,
      },
    );

    for (const key of [
      "unpaidBillsAmount",
      "currentOutstanding",
      "creditAmount",
      "securityDeposit",
    ]) {
      summary[key] = money(summary[key]);
    }

    const totalPages = Math.ceil(rows.length / limit);
    const paginatedRows = rows.slice((page - 1) * limit, page * limit);

    return res.status(200).json({
      success: true,
      message: "Dealer ledger overview fetched successfully",
      data: paginatedRows,
      summary,
      pagination: {
        page,
        limit,
        total: rows.length,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Dealer Ledger Overview Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dealer ledger overview",
    });
  }
};
