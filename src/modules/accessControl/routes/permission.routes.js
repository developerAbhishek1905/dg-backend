// src/modules/accessControl/routes/permission.routes.js

import express from "express";
import { getPermissions } from "../controllers/permission.controller.js";

const router = express.Router();

router.get("/", getPermissions);

export default router;