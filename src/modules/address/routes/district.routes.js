import express from "express";

import {
  createDistrict,
  getAllDistricts,
  getDistrictById,
  updateDistrict,
  deleteDistrict,
  importDistricts,
  exportDistricts,
  getDistrictsDropdown
} from "../controller/district.controller.js";

import { uploadExcel } from "../middleware/upload.middleware.js";
import { protect } from "../../auth/middleware/auth.middleware.js";

const router = express.Router();

// Create
router.post("/",protect, createDistrict);

// Get all
router.get("/",protect, getAllDistricts);

// Excel import
router.post("/import",protect, uploadExcel.single("file"), importDistricts);

// Excel export
router.get("/export",protect, exportDistricts);

router.get(
  "/dropdown",protect,
  getDistrictsDropdown
);

// Get by district_id
router.get("/:id",protect, getDistrictById);

// Update
router.put("/:id",protect, updateDistrict);

// Delete
router.delete("/:id",protect, deleteDistrict);

export default router;
