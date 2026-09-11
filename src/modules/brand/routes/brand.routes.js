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

const router = express.Router();


// Excel APIs
router.post("/import", uploadExcel.single("file"), importBrands);
router.get("/export", exportBrands);
router.get("/sample", downloadBrandSample);
router.get("/dropdown", getBrandDropdown);

// CRUD APIs
router.post("/", createBrand);
router.get("/", getAllBrands);
router.get("/:id", getBrandById);
router.put("/:id", updateBrand);
router.delete("/:id", deleteBrand);
router.patch("/:id/status", toggleBrandStatus);

export default router;
