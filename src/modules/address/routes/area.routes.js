// routes/area.routes.js

import express from "express";

import {
  createArea,
  getAllAreas,
  getAreaById,
  getAreaByCode,
  updateArea,
  deleteArea,
  importAreas,
  exportAreas,
} from "../controller/area.controller.js";

import { uploadExcel } from "../middleware/upload.middleware.js";
import { protect } from "../../auth/middleware/auth.middleware.js";

const router = express.Router();

// Create
router.post("/",protect, createArea);

// Get all
router.get("/",protect, getAllAreas);

// Excel import
router.post("/import",protect, uploadExcel.single("file"), importAreas);

// Excel export
router.get("/export",protect, exportAreas);

// Get by Area Code
router.get("/code/:areaCode",protect, getAreaByCode);

// Get by MongoDB ID
router.get("/:id",protect, getAreaById);

// Update by MongoDB ID
router.put("/:id",protect, updateArea);

// Delete by MongoDB ID
router.delete("/:id",protect, deleteArea);

export default router;
