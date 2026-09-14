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
  getProductTypeDropdown
} from "../controllers/productType.controller.js";

import { uploadExcel } from "../../address/middleware/upload.middleware.js";
import { protect } from "../../auth/middleware/auth.middleware.js";

const router = express.Router();

router.post("/",protect, createProductType);
router.get("/",protect, getAllProductTypes);
router.post("/import",protect, uploadExcel.single("file"), importProductTypes);
router.get("/export",protect, exportProductTypes);
router.get("/sample",protect, downloadProductTypeSample);
router.get("/dropdown",protect, getProductTypeDropdown);
router.get("/:id",protect, getProductTypeById);
router.put("/:id",protect, updateProductType);
router.delete("/:id",protect, deleteProductType);

export default router;
