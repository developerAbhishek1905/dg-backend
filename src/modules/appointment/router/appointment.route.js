import express from "express";

import {
  getCancelledComplaints,
  getPendingComplaints,
  getClosedComplaints,
  getAppointmentComplaints,
  updateAppointmentStatus,
  getCalendarAppointments,
  getComplaintActivityByComplaintId,
  getPendingFollowUpStatuses,
  saveComplaintFollowUp,
  getComplaintFollowUpRemarks,
  getDealerComplaintRemarks,
  getDealerRemarkNotifications,
  saveCancellationRemark,
  cancelComplaint,
  approveClosure,
  updateClosureCategory,
  getComplaintClosureOptions
} from "../controller/appointment.controller.js";
import { protect } from "../../auth/middleware/auth.middleware.js";

const router = express.Router();
router.get("/calendar", protect, getCalendarAppointments);

router.get("/cancelled", getCancelledComplaints);

router.get("/pending", getPendingComplaints);

router.get("/closed", getClosedComplaints);

router.get("/complaint/:complaintId", getComplaintActivityByComplaintId);

router.get("/dealer-remarks", protect, getDealerRemarkNotifications);

router.get("/", protect, getAppointmentComplaints);

router.get("/:id/closure-options", protect, getComplaintClosureOptions);

router.patch("/:id/status", protect, updateAppointmentStatus);

router.get("/pending/follow-up-statuses", protect, getPendingFollowUpStatuses);

router.post("/complaints/:id/follow-up", protect, saveComplaintFollowUp);

router.get(
  "/complaints/:id/follow-up-remarks",
  protect,
  getComplaintFollowUpRemarks,
);

router.get(
  "/complaints/:id/dealer-remarks",
  protect,
  getDealerComplaintRemarks,
);

router.post(
  "/complaints/:id/cancellation-remark",
  protect,
  saveCancellationRemark,
  
);

router.patch(
  "/complaints/:id/cancel",
  protect,
  cancelComplaint,
);

router.patch(
  "/complaints/:id/approve-closure",
  protect,
  approveClosure,
);

router.patch(
  "/complaints/:id/closure-category",
  protect,
  updateClosureCategory,
);

export default router;
