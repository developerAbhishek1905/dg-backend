import express from "express";

import {
  createProductType,
  getAllProductTypes,
  getProductTypeById,
  updateProductType,
  deleteProductType,
  importProductTypes,
  exportProductTypes,
  downloadProductTypeSample,
} from "../controllers/productType.controller.js";

import { uploadExcel } from "../../address/middleware/upload.middleware.js";

const router = express.Router();

// ==========================================
// CRUD
// ==========================================

router.post("/", createProductType);

router.get("/", getAllProductTypes);

// ==========================================
// EXCEL
// Keep these BEFORE /:id
// ==========================================

router.post("/import", uploadExcel.single("file"), importProductTypes);

router.get("/export", exportProductTypes);

router.get("/sample", downloadProductTypeSample);

// ==========================================
// DYNAMIC ROUTES LAST
// ==========================================

router.get("/:id", getProductTypeById);

router.put("/:id", updateProductType);

router.delete("/:id", deleteProductType);

export default router;
