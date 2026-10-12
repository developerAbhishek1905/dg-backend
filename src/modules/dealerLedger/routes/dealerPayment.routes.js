import express from "express";
import {
  createDealerPayment,getDealerPayments,
} from "../controller/dealerPayment.controller.js";
import { protect } from "../../auth/middleware/auth.middleware.js";

const router = express.Router();

router.get(
  "/dealer/:dealerId",
  protect,
  getDealerPayments,
);

router.post("/", protect, createDealerPayment);

export default router;