import express from "express";

import {
  getSettings,
  saveSettings,
  getCityOptions,
  applySettings,
  getDealerAllocations,
  setDealerRating,
  getAllocationHistory,
} from "../controller/allocationSettings.controller.js";
import { protect } from "../../auth/middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getSettings);
router.put("/", protect, saveSettings);
router.get("/cities", protect, getCityOptions);
router.get("/dealers", protect, getDealerAllocations);
router.put("/dealers/:dealerId/rating", protect, setDealerRating);
router.get("/history", protect, getAllocationHistory);
router.post("/apply", protect, applySettings);

export default router;
