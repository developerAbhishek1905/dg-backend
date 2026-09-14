import express from "express";

import {
  createState,
  getAllStates,
  getStateById,
  updateState,
  deleteState,
  importStates,
  exportStates,
} from "../controller/state.controller.js";

import { uploadExcel } from "../middleware/upload.middleware.js";
import { protect } from "../../auth/middleware/auth.middleware.js";

const router = express.Router();

router.post("/",protect, createState);

router.get("/",protect, getAllStates);

router.post("/import",protect, uploadExcel.single("file"), importStates);

router.get("/export",protect, exportStates);

router.get("/:id",protect, getStateById);

router.put("/:id",protect, updateState);

router.delete("/:id",protect, deleteState);

export default router;
