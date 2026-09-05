import express from "express";

import {
  createPincode,
  getAllPincodes,
  getPincodeById,
  updatePincode,
  deletePincode,
  importPincodes,
  exportPincodes,
  getPincodesByCityId,
  searchPincodeDetails,
  getPincodeDropdown,
} from "../controller/pincode.controller.js";

import { uploadExcel } from "../middleware/upload.middleware.js";

const router = express.Router();

// Create
router.post("/", createPincode);

// Get all
router.get("/", getAllPincodes);
router.get(
  "/dropdown",
  getPincodeDropdown
);

router.get(
  "/:id",
  getPincodeById
);

// Import
router.post("/import", uploadExcel.single("file"), importPincodes);

// Export
router.get("/export", exportPincodes);
router.get("/city/:city_id", getPincodesByCityId);
router.get("/search/details", searchPincodeDetails);

// Get by pincode_id
router.get("/:id", getPincodeById);

// Update
router.put("/:id", updatePincode);

// Delete
router.delete("/:id", deletePincode);

export default router;
