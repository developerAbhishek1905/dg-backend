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
} from "../controller/appointment.controller.js";
import { protect } from "../../auth/middleware/auth.middleware.js";

const router = express.Router();
router.get("/calendar", protect, getCalendarAppointments);

router.get("/cancelled", getCancelledComplaints);

router.get("/pending", getPendingComplaints);

router.get("/closed", getClosedComplaints);

router.get("/complaint/:complaintId", getComplaintActivityByComplaintId);

router.get("/", protect, getAppointmentComplaints);

router.patch("/:id/status", protect, updateAppointmentStatus);

router.get("/pending/follow-up-statuses", protect, getPendingFollowUpStatuses);

router.post("/complaints/:id/follow-up", protect, saveComplaintFollowUp);

router.get(
  "/complaints/:id/follow-up-remarks",
  protect,
  getComplaintFollowUpRemarks,
);
export default router;
