import express from "express";

import {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
  suspendComplaint,
  getEligibleDealersForComplaint,
  assignDealerToComplaint
} from "../controllers/complaint.controller.js";
import { protect } from "../../auth/middleware/auth.middleware.js";


const router =
  express.Router();


router.post(
  "/",protect,
  createComplaint,
);


router.get(
  "/",protect,
  getComplaints,
);


router.get(
  "/:id",protect,
  getComplaintById,
);


router.put(
  "/:id",protect,
  updateComplaint,
);


router.delete(
  "/:id",protect,
  deleteComplaint,
);

router.patch(
  "/:id/suspend",protect
  ,
  suspendComplaint
);


router.get(
  "/:complaintId/eligible-dealers",
  getEligibleDealersForComplaint,
);

router.patch(
  "/:complaintId/assign-dealer",
  assignDealerToComplaint,
);

export default router;