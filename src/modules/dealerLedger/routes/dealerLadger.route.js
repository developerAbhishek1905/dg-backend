import express from "express";

import {
  getAllDealerLedgers,
  approveDealerLedger,
} from "../controller/dealerLadger.controller.js";
import { protect } from "../../auth/middleware/auth.middleware.js";



const router = express.Router();

router.get(
  "/",
  protect,
  getAllDealerLedgers,
);

router.patch(
  "/:id/approve",
  protect,
  approveDealerLedger,
);

export default router;