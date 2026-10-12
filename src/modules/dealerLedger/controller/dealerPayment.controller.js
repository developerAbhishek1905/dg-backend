import mongoose from "mongoose";

import Dealer from "../../dealers/models/dealer.model.js";
import DealerLedger from "../../dealerLedger/model/dealerLedger.model.js";
import DealerPayment from "../../dealerLedger/model/dealerPayment.model.js";

/*
|--------------------------------------------------------------------------
| Money Helpers
|--------------------------------------------------------------------------
*/

const toPaise = (value) => Math.round(Number(value) * 100);

const fromPaise = (value) => value / 100;

const getBalanceType = (signedBalance) => {
  return signedBalance < 0 ? "CR" : "DR";
};

/*
|--------------------------------------------------------------------------
| Create Dealer Payment
|--------------------------------------------------------------------------
*/

export const createDealerPayment = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      dealerId,
      additionalAmount = 0,
      complaintBillIds = [],
      paymentDate,
      paymentMode,
      transactionReference = "",
      remark = "",
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | Basic Validation
    |--------------------------------------------------------------------------
    */

    if (!mongoose.Types.ObjectId.isValid(dealerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid dealer ID",
      });
    }

    if (
      !Array.isArray(complaintBillIds) ||
      complaintBillIds.some((id) => !mongoose.Types.ObjectId.isValid(id))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint bill IDs",
      });
    }

    const uniqueBillIds = [...new Set(complaintBillIds.map(String))];

    if (uniqueBillIds.length !== complaintBillIds.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate complaint bills are not allowed",
      });
    }

    const amount = Number(additionalAmount);

    if (
      !Number.isFinite(amount) ||
      amount < 0 ||
      !Number.isInteger(Math.round(amount * 100))
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid additional amount",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Amount OR Complaint Required
    |--------------------------------------------------------------------------
    */

    if (amount === 0 && uniqueBillIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Enter an additional amount or select complaint bills",
      });
    }

    const allowedModes = ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE"];

    if (!allowedModes.includes(paymentMode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment mode",
      });
    }

    const date = paymentDate ? new Date(paymentDate) : new Date();

    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment date",
      });
    }

    let paymentResult = null;

    /*
    |--------------------------------------------------------------------------
    | MongoDB Transaction
    |--------------------------------------------------------------------------
    */

    await session.withTransaction(async () => {
      /*
      |--------------------------------------------------------------------------
      | Fetch Dealer
      |--------------------------------------------------------------------------
      */

      const dealer = await Dealer.findById(dealerId).session(session);

      if (!dealer) {
        throw new Error("Dealer not found");
      }

      /*
      |--------------------------------------------------------------------------
      | Current Dealer Outstanding
      |--------------------------------------------------------------------------
      |
      | DR = Positive
      | CR = Negative
      |
      */

      const openingBalance = toPaise(dealer.openingBalance || 0);

      const openingBalanceType = dealer.openingBalanceType || "DR";

      const signedOpeningBalance =
        openingBalanceType === "DR" ? openingBalance : -openingBalance;

      /*
      |--------------------------------------------------------------------------
      | Additional Amount Adjustment
      |--------------------------------------------------------------------------
      |
      | Example:
      |
      | 5000 DR - 7000 = 2000 CR
      |
      */

      const additionalAmountPaise = toPaise(amount);

      const balanceAfterAmount = signedOpeningBalance - additionalAmountPaise;

      /*
      |--------------------------------------------------------------------------
      | Available Credit
      |--------------------------------------------------------------------------
      */

      const availableCredit = Math.max(0, -balanceAfterAmount);

      /*
      |--------------------------------------------------------------------------
      | Fetch Selected Complaint Bills
      |--------------------------------------------------------------------------
      */

      let bills = [];
console.log("kjhhhhhhhhh",uniqueBillIds)
      

      if (uniqueBillIds.length > 0) {
        bills = await DealerLedger.find({
          _id: {
            $in: uniqueBillIds,
          },

          dealerId: dealer._id,

          transactionType: {
            $in: ["CLOSURE", "CANCELLATION"],
          },

          entryType: "DEBIT",

          status: {
            $in: ["APPROVED", "BILLED"],
          },

          reversed: false,

          complaintId: {
            $ne: null,
          },

          paymentStatus: {
            $in: ["UNPAID", "PARTIALLY_PAID",null],
          },
        }).session(session);
        console.log(bills)

        if (bills.length !== uniqueBillIds.length) {
          throw new Error("Some selected bills are invalid or already paid");
        }
      }

      /*
      |--------------------------------------------------------------------------
      | Calculate Selected Bills Total
      |--------------------------------------------------------------------------
      */

      const selectedBillsTotalPaise = bills.reduce((total, bill) => {
        const billAmount = toPaise(bill.amount);

        const alreadyPaid = toPaise(bill.paidAmount || 0);

        const remainingAmount = billAmount - alreadyPaid;

        if (remainingAmount <= 0) {
          throw new Error(`Complaint ${bill.complaintNumber} is already paid`);
        }

        return total + remainingAmount;
      }, 0);

      /*
      |--------------------------------------------------------------------------
      | Check Available Credit
      |--------------------------------------------------------------------------
      */

      if (selectedBillsTotalPaise > availableCredit) {
        throw new Error(
          "Selected complaint bills exceed available credit balance",
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Final Dealer Balance
      |--------------------------------------------------------------------------
      |
      | Example:
      |
      | Opening:      5000 DR
      | Added:        7000
      | After Amount: 2000 CR
      | Bills:        1200
      | Final:         800 CR
      |
      */

      const finalSignedBalance = balanceAfterAmount + selectedBillsTotalPaise;

      const finalOpeningBalance = fromPaise(Math.abs(finalSignedBalance));

      const finalOpeningBalanceType = getBalanceType(finalSignedBalance);

      /*
      |--------------------------------------------------------------------------
      | Prepare Complaint Bills
      |--------------------------------------------------------------------------
      */

      const complaintBills = bills.map((bill) => {
        const remainingAmount =
          toPaise(bill.amount) - toPaise(bill.paidAmount || 0);

        return {
          ledgerId: bill._id,
          complaintId: bill.complaintId,
          complaintNumber: bill.complaintNumber,
          amount: fromPaise(remainingAmount),
        };
      });

      /*
      |--------------------------------------------------------------------------
      | Generate Payment Number
      |--------------------------------------------------------------------------
      */

      const paymentObjectId = new mongoose.Types.ObjectId();

      const paymentNumber = `PAY-${paymentObjectId.toString().toUpperCase()}`;

      /*
      |--------------------------------------------------------------------------
      | Create Dealer Payment
      |--------------------------------------------------------------------------
      */

      const [payment] = await DealerPayment.create(
        [
          {
            _id: paymentObjectId,

            paymentNumber,

            dealerId: dealer._id,

            additionalAmount: amount,

            selectedBillsTotal: fromPaise(selectedBillsTotalPaise),

            complaintBills,

            openingOutstanding: fromPaise(signedOpeningBalance),

            closingOutstanding: fromPaise(finalSignedBalance),

            paymentDate: date,

            paymentMode,

            transactionReference: transactionReference.trim(),

            remark: remark.trim(),

            status: "COMPLETED",

            createdBy: req.user?._id || null,
          },
        ],
        { session },
      );

      /*
      |--------------------------------------------------------------------------
      | Update Selected Complaint Bills
      |--------------------------------------------------------------------------
      |
      | No new DealerLedger entry is created.
      | Only existing bill payment status is updated.
      |
      */

for (const bill of bills) {
  const oldPaidAmount = Number(bill.paidAmount ?? 0);

  const update = await DealerLedger.updateOne(
    {
      _id: bill._id,
      dealerId: dealer._id,

      // Already paid bills ko dobara update nahi karna
      paymentStatus: {
        $in: ["UNPAID", "PARTIALLY_PAID", null],
      },

      reversed: false,
    },
    {
      $set: {
        paidAmount: bill.amount,
        paymentStatus: "PAID",
        lastPaymentAt: new Date(),
      },
    },
    { session },
  );

  console.log("PAYMENT UPDATE:", {
    complaintNumber: bill.complaintNumber,
    oldPaidAmount,
    matchedCount: update.matchedCount,
    modifiedCount: update.modifiedCount,
  });

  if (update.matchedCount !== 1) {
    throw new Error(
      `Complaint ${bill.complaintNumber} was not found or is already paid`,
    );
  }

  if (update.modifiedCount !== 1) {
    throw new Error(
      `Complaint ${bill.complaintNumber} payment status was not updated`,
    );
  }
}

      /*
      |--------------------------------------------------------------------------
      | Update Dealer Opening Balance
      |--------------------------------------------------------------------------
      |
      | This becomes the new running outstanding.
      |
      */

      const dealerUpdate = await Dealer.updateOne(
        {
          _id: dealer._id,

          openingBalance: dealer.openingBalance,

          openingBalanceType: dealer.openingBalanceType,
        },
        {
          $set: {
            openingBalance: finalOpeningBalance,

            openingBalanceType: finalOpeningBalanceType,
          },
        },
        { session },
      );

      if (dealerUpdate.matchedCount !== 1) {
        throw new Error("Dealer balance changed during payment. Please retry.");
      }

      /*
      |--------------------------------------------------------------------------
      | Response Data
      |--------------------------------------------------------------------------
      */

      paymentResult = {
        paymentId: payment._id,

        paymentNumber,

        dealerId: dealer._id,

        dealerName: dealer.technicianFirmName || dealer.technicianName || "",

        previousBalance: {
          amount: fromPaise(Math.abs(signedOpeningBalance)),

          type: openingBalanceType,
        },

        additionalAmount: amount,

        balanceAfterAmount: {
          amount: fromPaise(Math.abs(balanceAfterAmount)),

          type: getBalanceType(balanceAfterAmount),
        },

        selectedBillsTotal: fromPaise(selectedBillsTotalPaise),

        selectedBillsCount: bills.length,

        remainingCredit: fromPaise(availableCredit - selectedBillsTotalPaise),

        finalBalance: {
          amount: finalOpeningBalance,

          type: finalOpeningBalanceType,
        },

        complaintBills,

        paymentDate: date,

        paymentMode,
      };
    });

    /*
    |--------------------------------------------------------------------------
    | Success Response
    |--------------------------------------------------------------------------
    */

    return res.status(201).json({
      success: true,

      message: "Dealer payment created successfully",

      data: paymentResult,
    });
  } catch (error) {
    console.error("Create Dealer Payment Error:", error);

    return res.status(400).json({
      success: false,

      message: error.message || "Failed to create dealer payment",
    });
  } finally {
    await session.endSession();
  }
};

export const getDealerPayments = async (req, res) => {
  try {
    const { dealerId } = req.params;

    const {
      search = "",
      paymentMode = "ALL",
      status = "ALL",
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = req.query;

    // Validate Dealer ID
    if (!mongoose.Types.ObjectId.isValid(dealerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid dealer ID",
      });
    }

    // Pagination
    const currentPage = Math.max(1, Number(page) || 1);
    const pageLimit = Math.min(
      100,
      Math.max(1, Number(limit) || 20),
    );

    const skip = (currentPage - 1) * pageLimit;

    // Filters
    const filter = {
      dealerId: new mongoose.Types.ObjectId(dealerId),
    };

    if (search.trim()) {
      const escapedSearch = search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        {
          paymentNumber: {
            $regex: escapedSearch,
            $options: "i",
          },
        },
        {
          transactionReference: {
            $regex: escapedSearch,
            $options: "i",
          },
        },
        {
          "complaintBills.complaintNumber": {
            $regex: escapedSearch,
            $options: "i",
          },
        },
      ];
    }

    if (
      paymentMode !== "ALL" &&
      ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE"].includes(
        paymentMode,
      )
    ) {
      filter.paymentMode = paymentMode;
    }

    if (
      status !== "ALL" &&
      ["COMPLETED", "REVERSED"].includes(status)
    ) {
      filter.status = status;
    }

    // Date range
    if (fromDate || toDate) {
      filter.paymentDate = {};

      if (fromDate) {
        const start = new Date(`${fromDate}T00:00:00.000Z`);

        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid fromDate",
          });
        }

        filter.paymentDate.$gte = start;
      }

      if (toDate) {
        const end = new Date(`${toDate}T00:00:00.000Z`);

        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid toDate",
          });
        }

        end.setUTCDate(end.getUTCDate() + 1);
        filter.paymentDate.$lt = end;
      }
    }

    const [payments, total] = await Promise.all([
      DealerPayment.find(filter)
        .populate("createdBy", "name email")
        .sort({
          paymentDate: -1,
          _id: -1,
        })
        .skip(skip)
        .limit(pageLimit)
        .lean(),

      DealerPayment.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Dealer payments fetched successfully",
      data: payments,
      pagination: {
        page: currentPage,
        limit: pageLimit,
        total,
        totalPages: Math.ceil(total / pageLimit),
      },
    });
  } catch (error) {
    console.error("Get dealer payments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dealer payments",
      error: error.message,
    });
  }
};
