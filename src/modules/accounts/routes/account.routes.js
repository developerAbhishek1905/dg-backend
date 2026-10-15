import express from "express";

import {
  createAccount,
  getAccounts,
  getAccountsDropdown,
  getAccountById,
  updateAccount,
  deleteAccount,
  addAccountBalance,
  updateAccountBalance,
  deleteAccountBalance,
} from "../controller/account.controller.js";
import { protect } from "../../auth/middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

// Account CRUD
router.post("/", createAccount);
router.get("/", getAccounts);
router.get("/dropdown", getAccountsDropdown);
router.get("/:id", getAccountById);
router.put("/:id", updateAccount);
router.delete("/:id", deleteAccount);

// Dealer Balance CRUD
router.post("/:id/balance", addAccountBalance);
router.put("/:id/balance/:balanceId", updateAccountBalance);
router.delete("/:id/balance/:balanceId", deleteAccountBalance);

export default router;
