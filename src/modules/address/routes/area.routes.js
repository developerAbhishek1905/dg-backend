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

const router = express.Router();

// Create
router.post("/", createArea);

// Get all
router.get("/", getAllAreas);

// Excel import
router.post("/import", uploadExcel.single("file"), importAreas);

// Excel export
router.get("/export", exportAreas);

// Get by Area Code
router.get("/code/:areaCode", getAreaByCode);

// Get by MongoDB ID
router.get("/:id", getAreaById);

// Update by MongoDB ID
router.put("/:id", updateArea);

// Delete by MongoDB ID
router.delete("/:id", deleteArea);

export default router;
