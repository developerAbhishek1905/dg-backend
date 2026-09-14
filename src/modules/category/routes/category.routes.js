import express from "express";

import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getCategoryDropdown,
  importCategories,
  exportCategories,
  downloadCategorySample,
} from "../controllers/category.controller.js";
import { uploadExcel } from "../../address/middleware/upload.middleware.js";
import { protect } from "../../auth/middleware/auth.middleware.js";

const router = express.Router();

router.get("/dropdown",protect, getCategoryDropdown);
router.post("/import",protect, uploadExcel.single("file"), importCategories);
router.get("/export",protect, exportCategories);
router.get("/sample",protect, downloadCategorySample);
router.post("/",protect, createCategory);
router.get("/",protect, getCategories);
router.get("/:id",protect, getCategoryById);
router.put("/:id",protect, updateCategory);
router.delete("/:id",protect, deleteCategory);

export default router;
