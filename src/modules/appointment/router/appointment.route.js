import express from "express";

import {
  getAppointmentComplaints,updateAppointmentStatus
} from "../controller/appointment.controller.js";
import { protect } from "../../auth/middleware/auth.middleware.js";

const router = express.Router();

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