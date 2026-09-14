import express from "express";

import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  importProducts,
  exportProducts,
  getProductDropdown,
  downloadProductSample,
} from "../controllers/product.controller.js";

import { uploadExcel } from "../../address/middleware/upload.middleware.js";
import { protect } from "../../auth/middleware/auth.middleware.js";

const router = express.Router();

router.post("/",protect, createProduct);
router.get("/",protect, getAllProducts);
router.get("/dropdown",protect, getProductDropdown);
router.post("/import",protect, uploadExcel.single("file"), importProducts);
router.get("/export",protect, exportProducts);
router.get("/sample",protect, downloadProductSample);
router.get("/:id",protect, getProductById);
router.put("/:id",protect, updateProduct);
router.delete("/:id",protect, deleteProduct);

export default router;
