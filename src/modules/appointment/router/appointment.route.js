import express from "express";

import {
      getCancelledComplaints,
  getPendingComplaints,
  getClosedComplaints,
  getAppointmentComplaints,updateAppointmentStatus,getCalendarAppointments,getComplaintActivityByComplaintId
} from "../controller/appointment.controller.js";
import { protect } from "../../auth/middleware/auth.middleware.js";

const router = express.Router();
router.get(
  "/calendar",protect,
  getCalendarAppointments,
);

router.get(
  "/cancelled",
  getCancelledComplaints,
);

router.get(
  "/pending",
  getPendingComplaints,
);

router.get(
  "/closed",
  getClosedComplaints,
);

router.get(
  "/complaint/:complaintId",
  getComplaintActivityByComplaintId,
);

router.get(
  "/",
  protect,
  getAppointmentComplaints,
);

router.patch(
  "/:id/status",
  protect,
  updateAppointmentStatus,
);


export default router;