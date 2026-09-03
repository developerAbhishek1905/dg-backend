import express from "express";

import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getCategoryDropdown
} from "../controllers/category.controller.js";

const router = express.Router();

router.get("/dropdown", getCategoryDropdown);

router.post("/", createCategory);

router.get("/", getCategories);

router.get("/:id", getCategoryById);

router.put("/:id", updateCategory);

router.delete("/:id", deleteCategory);

export default router;