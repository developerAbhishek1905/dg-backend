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

const router = express.Router();

router.post("/", createState);

router.get("/", getAllStates);

router.post("/import", uploadExcel.single("file"), importStates);

router.get("/export", exportStates);

router.get("/:id", getStateById);

router.put("/:id", updateState);

router.delete("/:id", deleteState);

export default router;
