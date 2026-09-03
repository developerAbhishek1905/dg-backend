import express from "express";

import {
  createDealer,
  getDealers,
  getDealerById,
  updateDealer,
  deleteDealer,
} from "../controllers/dealer.controller.js";

import dealerUpload from "../middleware/dealerUpload.middleware.js";

const router = express.Router();

const dealerDocuments =
  dealerUpload.fields([
    {
      name: "aadhaarFile",
      maxCount: 1,
    },
    {
      name: "panFile",
      maxCount: 1,
    },
    {
      name: "drivingLicenceFile",
      maxCount: 1,
    },
    {
      name: "documentUpload",
      maxCount: 10,
    },
  ]);

router.post(
  "/",
  dealerDocuments,
  createDealer,
);

router.get("/", getDealers);

router.get("/:id", getDealerById);

router.put(
  "/:id",
  dealerDocuments,
  updateDealer,
);

router.delete(
  "/:id",
  deleteDealer,
);

export default router;