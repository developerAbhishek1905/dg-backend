import express from "express";

import {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
} from "../controllers/complaint.controller.js";


const router =
  express.Router();


router.post(
  "/",
  createComplaint,
);


router.get(
  "/",
  getComplaints,
);


router.get(
  "/:id",
  getComplaintById,
);


router.put(
  "/:id",
  updateComplaint,
);


router.delete(
  "/:id",
  deleteComplaint,
);


export default router;