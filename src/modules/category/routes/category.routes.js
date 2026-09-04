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

const router = express.Router();

router.get("/dropdown", getCategoryDropdown);

router.post("/import", uploadExcel.single("file"), importCategories);

router.get("/export", exportCategories);

router.get("/sample", downloadCategorySample);

router.post("/", createCategory);

router.get("/", getCategories);

router.get("/:id", getCategoryById);

router.put("/:id", updateCategory);

router.delete("/:id", deleteCategory);

export default router;
