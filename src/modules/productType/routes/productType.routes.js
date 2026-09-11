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

const router = express.Router();

router.post("/", createProductType);
router.get("/", getAllProductTypes);
router.post("/import", uploadExcel.single("file"), importProductTypes);
router.get("/export", exportProductTypes);
router.get("/sample", downloadProductTypeSample);
router.get("/dropdown", getProductTypeDropdown);
router.get("/:id", getProductTypeById);
router.put("/:id", updateProductType);
router.delete("/:id", deleteProductType);

export default router;
