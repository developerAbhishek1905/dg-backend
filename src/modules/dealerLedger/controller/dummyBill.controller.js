import mongoose from "mongoose";

import Dealer from "../../dealers/models/dealer.model.js";
import DealerLedger from "../model/dealerLedger.model.js";

/*
|--------------------------------------------------------------------------
| POST /dealer-ledger/dummy-bills
|--------------------------------------------------------------------------
|
| A dummy bill is a provisional bill raised against a complaint number that
| has no real complaint/closure yet. It is stored in DealerLedger as a
| DUMMY_BILL debit so it can be settled from the Adjustments tab
| (DUMMY_BILL_REF).
|
*/

export const createDummyBill = async (req, res) => {
  try {
    const {
      dealerId,
      complaintNumber,
      billingDate,
      amount,
      serviceDescription = "",
      customerName,
      customerMobile = "",
      customerAddress = "",
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(dealerId)) {
      return res.status(400).json({ success: false, message: "Select a dealer" });
    }

    const number = String(complaintNumber || "").trim().toUpperCase();

    if (!number) {
      return res
        .status(400)
        .json({ success: false, message: "Complaint number is required" });
    }

    const date = billingDate ? new Date(billingDate) : new Date();

    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date" });
    }

    const serviceAmount = Math.round(Number(amount) * 100) / 100;

    if (!Number.isFinite(serviceAmount) || serviceAmount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Enter a valid service amount" });
    }

    if (!String(customerName || "").trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Customer name is required" });
    }

    const dealer = await Dealer.findById(dealerId)
      .select("headCode technicianFirmName technicianName")
      .lean();

    if (!dealer) {
      return res.status(404).json({ success: false, message: "Dealer not found" });
    }

    const duplicate = await DealerLedger.exists({
      transactionType: "DUMMY_BILL",
      complaintNumber: number,
      reversed: false,
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: `A dummy bill already exists for ${number}`,
      });
    }

    const ledger = await DealerLedger.create({
      dealerId: dealer._id,
      dealerCode: dealer.headCode || "",
      dealerName: dealer.technicianFirmName || dealer.technicianName || "",

      complaintId: null,
      complaintNumber: number,

      transactionType: "DUMMY_BILL",
      billingType: "DUMMY_BILL",
      entrySource: "SYSTEM",
      entryType: "DEBIT",

      serviceDescription: String(serviceDescription).trim(),
      description: "Dummy bill",

      customerInfo: {
        name: String(customerName).trim(),
        mobile: String(customerMobile).trim(),
        address: String(customerAddress).trim(),
      },

      customerAmount: serviceAmount,
      amount: serviceAmount,

      status: "APPROVED",
      billingDate: date,
      billedBy: req.user?._id || null,
      approvedBy: req.user?._id || null,
      approvedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Dummy bill created successfully",
      data: ledger,
    });
  } catch (error) {
    console.error("Create dummy bill error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create dummy bill",
    });
  }
};
