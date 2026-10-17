import express from "express";

import {
  createDealerLedger,
  updateDealerLedger,
  getAllDealerLedgers,
  approveDealerLedger,
  getDealerUnpaidBills,
  getDealerLedgerOverview,
} from "../controller/dealerLadger.controller.js";
import { createDummyBill } from "../controller/dummyBill.controller.js";
import { protect } from "../../auth/middleware/auth.middleware.js";
// import { createDealerPayment } from "../controller/dealerPayment.controller.js";

const router = express.Router();
router.get(
  "/:dealerId/unpaid-bills",
  getDealerUnpaidBills,
);

router.get("/overview", protect, getDealerLedgerOverview);


router.get("/", protect, getAllDealerLedgers);

router.patch("/:id/approve", protect, approveDealerLedger);

router.post("/dummy-bills", protect, createDummyBill);

router.post("/", protect, createDealerLedger);

// router.post("/", protect, createDealerPayment);

router.patch("/:id", protect, updateDealerLedger);

export default router;
