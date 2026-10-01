import express from "express";

import {
  login,
  logout,
  changePassword,
} from "../controllers/auth.controller.js";

import {
  protect,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/login", login);

router.post("/logout", protect, logout);

router.put(
  "/change-password",
  protect,
  changePassword,
);
export default router;