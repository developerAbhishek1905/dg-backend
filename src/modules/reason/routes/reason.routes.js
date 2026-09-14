import express from "express";
import { protect } from "../../auth/middleware/auth.middleware.js";
import {
  createReason, getAllReasons, getReasonById, updateReason,
  deleteReason, setReasonStatus, getReasonDropdown,
} from "../controllers/reason.controller.js";

const router = express.Router();
router.use(protect);
router.get("/dropdown", getReasonDropdown);
router.post("/", createReason);
router.get("/", getAllReasons);
router.get("/:id", getReasonById);
router.put("/:id", updateReason);
router.patch("/:id/status", setReasonStatus);
router.delete("/:id", deleteReason);
export default router;
