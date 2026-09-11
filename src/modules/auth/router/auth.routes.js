import express from "express";

import {
  login,
  logout,
} from "../controllers/auth.controller.js";

import {
  protect,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/login", login);

router.post("/logout", protect, logout);

export default router;