import mongoose from "mongoose";
import DealerLeave from "../models/dealerLeave.model.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Today in India (IST), as YYYY-MM-DD
const todayIST = () =>
  new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

const getDealerId = (req) => {
  const raw = req.user?.dealerId;
  return raw?._id || raw || null;
};

const isDealer = (req) => req.user?.role?.code === "DEALER";

/* POST /dealer-leaves  (dealer) */
export const createLeave = async (req, res) => {
  try {
    if (!isDealer(req) || !getDealerId(req)) {
      return res.status(403).json({
        success: false,
        message: "Only dealers can register leave",
      });
    }

    const { fromDate, toDate, reason } = req.body;

    if (!DATE_RE.test(fromDate || "") || !DATE_RE.test(toDate || "")) {
      return res.status(400).json({
        success: false,
        message: "From date and to date are required",
      });
    }

    if (!reason?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reason is required",
      });
    }

    if (toDate < fromDate) {
      return res.status(400).json({
        success: false,
        message: "To date cannot be before from date",
      });
    }

    if (fromDate < todayIST()) {
      return res.status(400).json({
        success: false,
        message: "Leave cannot start in the past",
      });
    }

    const dealerId = getDealerId(req);

    const overlap = await DealerLeave.findOne({
      dealerId,
      status: "ACTIVE",
      fromDate: { $lte: toDate },
      toDate: { $gte: fromDate },
    });

    if (overlap) {
      return res.status(409).json({
        success: false,
        message: `You already have leave from ${overlap.fromDate} to ${overlap.toDate}`,
      });
    }

    const leave = await DealerLeave.create({
      dealerId,
      fromDate,
      toDate,
      reason: reason.trim(),
      createdBy: req.user?._id || req.user?.id || null,
    });

    return res.status(201).json({
      success: true,
      message: "Leave registered successfully",
      data: leave,
    });
  } catch (error) {
    console.error("CREATE LEAVE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to register leave",
      error: error.message,
    });
  }
};

/* GET /dealer-leaves/my  (dealer) */
export const getMyLeaves = async (req, res) => {
  try {
    const dealerId = getDealerId(req);

    if (!dealerId) {
      return res.status(403).json({
        success: false,
        message: "Dealer account is not linked with any dealer",
      });
    }

    const leaves = await DealerLeave.find({ dealerId })
      .sort({ fromDate: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: leaves });
  } catch (error) {
    console.error("GET MY LEAVES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch leaves",
      error: error.message,
    });
  }
};

/* PATCH /dealer-leaves/:id/cancel  (dealer, own leave) */
export const cancelLeave = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid leave ID" });
    }

    const leave = await DealerLeave.findById(id);

    if (!leave) {
      return res.status(404).json({ success: false, message: "Leave not found" });
    }

    if (String(leave.dealerId) !== String(getDealerId(req))) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    if (leave.status === "CANCELLED") {
      return res.status(400).json({ success: false, message: "Leave is already cancelled" });
    }

    if (leave.toDate < todayIST()) {
      return res.status(400).json({ success: false, message: "Completed leave cannot be cancelled" });
    }

    leave.status = "CANCELLED";
    leave.cancelledAt = new Date();
    await leave.save();

    return res.status(200).json({
      success: true,
      message: "Leave cancelled",
      data: leave,
    });
  } catch (error) {
    console.error("CANCEL LEAVE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel leave",
      error: error.message,
    });
  }
};

/* GET /dealer-leaves  (CRM users – all dealers) */
export const getAllLeaves = async (req, res) => {
  try {
    if (isDealer(req)) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    const { dealerId, status } = req.query;
    const filter = {};
    if (dealerId && mongoose.Types.ObjectId.isValid(dealerId)) filter.dealerId = dealerId;
    if (status) filter.status = status;

    const leaves = await DealerLeave.find(filter)
      .populate("dealerId", "headCode technicianFirmName technicianName mobileNumber")
      .sort({ fromDate: -1, createdAt: -1 })
      .limit(500)
      .lean();

    return res.status(200).json({ success: true, data: leaves });
  } catch (error) {
    console.error("GET ALL LEAVES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch leaves",
      error: error.message,
    });
  }
};
