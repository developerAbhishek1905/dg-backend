import express from "express";

import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserDropdown
} from "../controllers/user.controller.js";
import { protect } from "../../auth/middleware/auth.middleware.js";

const router = express.Router();

router.post("/", createUser);

router.get("/dropdown", protect, getUserDropdown);

router.get("/", getUsers);

router.get("/:id", getUserById);

router.put("/:id", updateUser);

router.delete("/:id", deleteUser);

export default router;