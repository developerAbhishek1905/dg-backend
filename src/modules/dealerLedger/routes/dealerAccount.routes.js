import express from "express";

import {
  searchAccountDealers,
  getDealerAccountContext,
  getDealerStatement,
  getDealerPendingBills,
  getDealerAllBills,
  createReceipts,
  createAdjustment,
  createCreditNote,
  createSecurityDeposit,
} from "../controller/dealerAccount.controller.js";
import { protect } from "../../auth/middleware/auth.middleware.js";

const router = express.Router();

router.get("/dealers", protect, searchAccountDealers);
router.get("/dealer/:dealerId/context", protect, getDealerAccountContext);
router.get("/dealer/:dealerId/statement", protect, getDealerStatement);
router.get("/dealer/:dealerId/pending-bills", protect, getDealerPendingBills);
router.get("/dealer/:dealerId/bills", protect, getDealerAllBills);

router.post("/receipts", protect, createReceipts);
router.post("/adjustments", protect, createAdjustment);
router.post("/credit-notes", protect, createCreditNote);
router.post("/security-deposits", protect, createSecurityDeposit);

export default router;
