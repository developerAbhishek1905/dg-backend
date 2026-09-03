import express from "express";

import {
  createDistrict,
  getAllDistricts,
  getDistrictById,
  updateDistrict,
  deleteDistrict,
  importDistricts,
  exportDistricts,
  getDistrictsByStateId
} from "../controller/district.controller.js";

import { uploadExcel } from "../middleware/upload.middleware.js";

const router = express.Router();

// Create
router.post("/", createDistrict);

// Get all
router.get("/", getAllDistricts);

// Excel import
router.post("/import", uploadExcel.single("file"), importDistricts);

// Excel export
router.get("/export", exportDistricts);

router.get("/state/:state_id", getDistrictsByStateId);

// Get by district_id
router.get("/:id", getDistrictById);

// Update
router.put("/:id", updateDistrict);

// Delete
router.delete("/:id", deleteDistrict);

export default router;
