// src/modules/accessControl/routes/role.routes.js

import express from "express";

import {
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  deleteRole,
} from "../controllers/role.controller.js";
import { protect } from "../../auth/middleware/auth.middleware.js";

const router = express.Router();

router.post("/",protect, createRole);

router.get("/",protect, getRoles);

router.get("/:id",protect, getRoleById);

router.put("/:id",protect, updateRole);

router.delete("/:id",protect, deleteRole);

export default router;