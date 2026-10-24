import express from "express";
import { protect } from "../../auth/middleware/auth.middleware.js";
import {
  createLeave,
  getMyLeaves,
  cancelLeave,
  getAllLeaves,
} from "../controllers/dealerLeave.controller.js";

const router = express.Router();

router.post("/", protect, createLeave);
router.get("/my", protect, getMyLeaves);
router.patch("/:id/cancel", protect, cancelLeave);
router.get("/", protect, getAllLeaves);

export default router;
