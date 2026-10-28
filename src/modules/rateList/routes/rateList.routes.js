import express from "express";

import {
  createRate,
  getRates,
  updateRate,
  toggleRateStatus,
  deleteRate,
} from "../controllers/rateList.controller.js";
import { protect } from "../../auth/middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getRates);
router.post("/", protect, createRate);
router.put("/:id", protect, updateRate);
router.patch("/:id/status", protect, toggleRateStatus);
router.delete("/:id", protect, deleteRate);

export default router;
