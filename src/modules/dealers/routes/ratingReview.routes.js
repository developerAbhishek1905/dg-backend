import express from "express";

import {
  getRatings,
//   submitRatingReview,
} from "../controllers/ratingReview.controller.js";
import { protect } from "../../auth/middleware/auth.middleware.js";


const router = express.Router();

router.get("/", protect, getRatings);

// router.post("/", protect, submitRatingReview);

export default router;