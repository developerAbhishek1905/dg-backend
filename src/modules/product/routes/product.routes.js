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

const router = express.Router();

router.post("/", createProduct);
router.get("/", getAllProducts);
router.get("/dropdown", getProductDropdown);
router.post("/import", uploadExcel.single("file"), importProducts);
router.get("/export", exportProducts);
router.get("/sample", downloadProductSample);
router.get("/:id", getProductById);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

export default router;
