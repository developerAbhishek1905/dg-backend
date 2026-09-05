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

// CREATE
router.post("/", createProduct);

// GET ALL
router.get("/", getAllProducts);
router.get(
  "/dropdown",
  getProductDropdown
);


// IMPORTANT:
// these routes must be BEFORE /:id

// IMPORT
router.post("/import", uploadExcel.single("file"), importProducts);

// EXPORT
router.get("/export", exportProducts);

router.get("/sample", downloadProductSample);

// GET ONE
router.get("/:id", getProductById);

// UPDATE
router.put("/:id", updateProduct);

// DELETE
router.delete("/:id", deleteProduct);

export default router;
