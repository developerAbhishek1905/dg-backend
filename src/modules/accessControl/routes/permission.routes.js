// src/modules/accessControl/routes/permission.routes.js

import express from "express";
import { getPermissions } from "../controllers/permission.controller.js";
import { protect } from "../../auth/middleware/auth.middleware.js";

const router = express.Router();

router.get("/",protect, getPermissions);

export default router;