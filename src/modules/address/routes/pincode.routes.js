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
import { protect } from "../../auth/middleware/auth.middleware.js";

const router = express.Router();

// Create
router.post("/",protect, createPincode);

// Get all
router.get("/",protect, getAllPincodes);
router.get("/dropdown",protect, getPincodeDropdown);

router.get("/:id",protect, getPincodeById);

// Import
router.post("/import",protect, uploadExcel.single("file"), importPincodes);

// Export
router.get("/export",protect, exportPincodes);
router.get("/city/:city_id",protect, getPincodesByCityId);
router.get("/search/details",protect, searchPincodeDetails);

// Get by pincode_id
router.get("/:id",protect, getPincodeById);

// Update
router.put("/:id",protect, updatePincode);

// Delete
router.delete("/:id",protect, deletePincode);

export default router;
