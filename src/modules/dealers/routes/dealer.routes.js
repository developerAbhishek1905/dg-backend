import express from "express";

import {
  createDealer,
  getDealers,
  getDealerById,
  updateDealer,
  deleteDealer,
  updateDealerStatus,
} from "../controllers/dealer.controller.js";

import { dealerDocumentUpload } from "../middleware/dealerUpload.middleware.js";

const router = express.Router();

/* CREATE */
router.post(
  "/",
  dealerDocumentUpload,
  createDealer,
);

/* GET ALL */
router.get("/", getDealers);

/* GET BY ID */
router.get("/:id", getDealerById);

/* UPDATE */
router.put(
  "/:id",
  dealerDocumentUpload,
  updateDealer,
);

/* STATUS */
router.patch(
  "/:id/status",
  updateDealerStatus,
);

/* DELETE */
router.delete(
  "/:id",
  deleteDealer,
);

export default router;