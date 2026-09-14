import express from "express";

import {
  createBrand,
  getAllBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
  toggleBrandStatus,
  importBrands,
  exportBrands,
  downloadBrandSample,
  getBrandDropdown
} from "../controllers/brand.controller.js";
import { uploadExcel } from "../../address/middleware/upload.middleware.js";
import { protect } from "../../auth/middleware/auth.middleware.js";

const router = express.Router();


// Excel APIs
router.post("/import",protect, uploadExcel.single("file"), importBrands);
router.get("/export",protect, exportBrands);
router.get("/sample",protect, downloadBrandSample);
router.get("/dropdown",protect, getBrandDropdown);

// CRUD APIs
router.post("/",protect, createBrand);
router.get("/",protect, getAllBrands);
router.get("/:id",protect, getBrandById);
router.put("/:id",protect, updateBrand);
router.delete("/:id",protect, deleteBrand);
router.patch("/:id/status",protect, toggleBrandStatus);

export default router;
