import express from "express";

import {
  createDealer,
  getDealers,
  getDealerById,
  updateDealer,
  deleteDealer,
  updateDealerStatus,
  registerDealerLeave,
  updateDealerRating,
  rejoinDealer,
  suspendDealer,
  getDealerDropdown,
  endDealerLeave
} from "../controllers/dealer.controller.js";

import { dealerDocumentUpload } from "../middleware/dealerUpload.middleware.js";
import { protect } from "../../auth/middleware/auth.middleware.js";

const router = express.Router();

/* CREATE */
router.post("/", dealerDocumentUpload, createDealer);

router.post("/:id/leave", protect, registerDealerLeave);
router.post("/:id/rejoin", protect, rejoinDealer);
router.patch(
  "/:id/leave/end",
  protect,
  endDealerLeave,
);
router.patch("/:id/rating", updateDealerRating);
router.patch("/:id/suspend", suspendDealer);
router.get(
  "/dropdown",
  // protect,
  getDealerDropdown,
);
/* GET ALL */
router.get("/", getDealers);

/* GET BY ID */
router.get("/:id", getDealerById);

/* UPDATE */
router.put("/:id", dealerDocumentUpload, updateDealer);

/* STATUS */
router.patch("/:id/status", updateDealerStatus);

/* DELETE */
router.delete("/:id", deleteDealer);

export default router;
