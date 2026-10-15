
import mongoose from "mongoose";
import Account from "../../accounts/model/account.model.js";
import Dealer from "../../dealers/models/dealer.model.js";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const isValidId = (id) => mongoose.isValidObjectId(id);

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const accountNameExists = async (name, excludeId = null) => {
  const filter = {
    accountName: {
      $regex: `^${escapeRegex(name)}$`,
      $options: "i",
    },
  };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  return Account.exists(filter);
};

const calculateSummary = (account) => {
  const entries = account.balance ?? [];

  const totalDebit = entries.reduce(
    (sum, item) =>
      sum + (item.accountType === "DEBIT" ? item.amount : 0),
    0,
  );

  const totalCredit = entries.reduce(
    (sum, item) =>
      sum + (item.accountType === "CREDIT" ? item.amount : 0),
    0,
  );

  const difference = totalCredit - totalDebit;

  return {
    totalDebit,
    totalCredit,
    netAmount: Math.abs(difference),
    netType:
      difference > 0
        ? "CREDIT"
        : difference < 0
          ? "DEBIT"
          : "BALANCED",
    totalEntries: entries.length,
    totalDealers: new Set(
      entries.map((item) =>
        String(item.dealerId?._id ?? item.dealerId),
      ),
    ).size,
  };
};

const populateAccount = (query) =>
  query.populate(
    "balance.dealerId",
    "headCode technicianFirmName technicianName mobileNumber",
  );

const validateBalancePayload = async (body) => {
  const { dealerId, amount, accountType } = body;

  if (!isValidId(dealerId)) {
    return { error: "Valid dealer ID is required" };
  }

  if (
    amount === undefined ||
    amount === null ||
    String(amount).trim() === "" ||
    !Number.isFinite(Number(amount)) ||
    Number(amount) <= 0
  ) {
    return { error: "Amount must be greater than zero" };
  }

  if (!["DEBIT", "CREDIT"].includes(accountType)) {
    return { error: "Account type must be DEBIT or CREDIT" };
  }

  const dealer = await Dealer.exists({ _id: dealerId });

  if (!dealer) {
    return { error: "Dealer not found" };
  }

  return {
    data: {
      dealerId,
      amount: Number(amount),
      accountType,
    },
  };
};

/*
|--------------------------------------------------------------------------
| CREATE ACCOUNT
| POST /api/v1/accounts
|--------------------------------------------------------------------------
*/

export const createAccount = async (req, res) => {
  try {
    const accountName = req.body.accountName?.trim();

    if (!accountName) {
      return res.status(400).json({
        success: false,
        message: "Account name is required",
      });
    }

    const exists = await accountNameExists(accountName);

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Account name already exists",
      });
    }

    const account = await Account.create({
      accountName,
      balance: [],
      createdBy: req.user?._id ?? null,
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: account,
    });
  } catch (error) {
    return res.status(error.code === 11000 ? 409 : 500).json({
      success: false,
      message:
        error.code === 11000
          ? "Account name already exists"
          : "Failed to create account",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET ALL ACCOUNTS
| GET /api/v1/accounts
|--------------------------------------------------------------------------
*/

export const getAccounts = async (req, res) => {
  try {
    const search = String(req.query.search ?? "").trim();

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10),
    );

    const skip = (page - 1) * limit;

    const filter = search
      ? {
          accountName: {
            $regex: escapeRegex(search),
            $options: "i",
          },
        }
      : {};

    const [accounts, total] = await Promise.all([
      populateAccount(
        Account.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
      ).lean(),

      Account.countDocuments(filter),
    ]);

    const data = accounts.map((account) => ({
      ...account,
      summary: calculateSummary(account),
    }));

    return res.status(200).json({
      success: true,
      message: "Accounts fetched successfully",
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch accounts",
    });
  }
};

/*
|--------------------------------------------------------------------------
| ACCOUNT DROPDOWN
| GET /api/v1/accounts/dropdown?search=
|--------------------------------------------------------------------------
*/

export const getAccountsDropdown = async (req, res) => {
  try {
    const search = String(req.query.search ?? "").trim();

    const filter = search
      ? {
          accountName: {
            $regex: escapeRegex(search),
            $options: "i",
          },
        }
      : {};

    const accounts = await Account.find(filter)
      .select("_id accountName")
      .sort({ accountName: 1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      success: true,
      data: accounts.map((account) => ({
        _id: account._id,
        accountName: account.accountName,
        label: account.accountName,
        value: account._id,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch account dropdown",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET ACCOUNT BY ID
| GET /api/v1/accounts/:id
|--------------------------------------------------------------------------
*/

export const getAccountById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID",
      });
    }

    const account = await populateAccount(
      Account.findById(id),
    ).lean();

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...account,
        summary: calculateSummary(account),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch account",
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE ACCOUNT NAME
| PUT /api/v1/accounts/:id
|--------------------------------------------------------------------------
*/

export const updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const accountName = req.body.accountName?.trim();

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID",
      });
    }

    if (!accountName) {
      return res.status(400).json({
        success: false,
        message: "Account name is required",
      });
    }

    const exists = await accountNameExists(accountName, id);

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Account name already exists",
      });
    }

    const account = await Account.findByIdAndUpdate(
      id,
      { $set: { accountName } },
      { new: true, runValidators: true },
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Account updated successfully",
      data: account,
    });
  } catch (error) {
    return res.status(error.code === 11000 ? 409 : 500).json({
      success: false,
      message:
        error.code === 11000
          ? "Account name already exists"
          : "Failed to update account",
    });
  }
};

/*
|--------------------------------------------------------------------------
| DELETE ACCOUNT
| DELETE /api/v1/accounts/:id
|--------------------------------------------------------------------------
*/

export const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID",
      });
    }

    const account = await Account.findById(id);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    // Prevent deleting accounts containing balance entries.
    if (account.balance.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Account contains dealer entries and cannot be deleted",
      });
    }

    await Account.deleteOne({ _id: id, "balance.0": { $exists: false } });

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete account",
    });
  }
};

/*
|--------------------------------------------------------------------------
| ADD DEALER BALANCE ENTRY
| POST /api/v1/accounts/:id/balance
|--------------------------------------------------------------------------
*/

export const addAccountBalance = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID",
      });
    }

    const validation = await validateBalancePayload(req.body);

    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const account = await Account.findByIdAndUpdate(
      id,
      {
        $push: {
          balance: validation.data,
        },
      },
      { new: true, runValidators: true },
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Dealer balance entry added successfully",
      data: account,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to add dealer balance entry",
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE DEALER BALANCE ENTRY
| PUT /api/v1/accounts/:id/balance/:balanceId
|--------------------------------------------------------------------------
*/

export const updateAccountBalance = async (req, res) => {
  try {
    const { id, balanceId } = req.params;

    if (!isValidId(id) || !isValidId(balanceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account or balance ID",
      });
    }

    const validation = await validateBalancePayload(req.body);

    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const account = await Account.findOneAndUpdate(
      {
        _id: id,
        "balance._id": balanceId,
      },
      {
        $set: {
          "balance.$.dealerId": validation.data.dealerId,
          "balance.$.amount": validation.data.amount,
          "balance.$.accountType": validation.data.accountType,
          "balance.$.updatedAt": new Date(),
        },
      },
      { new: true, runValidators: true },
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account or balance entry not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Dealer balance entry updated successfully",
      data: account,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update dealer balance entry",
    });
  }
};

/*
|--------------------------------------------------------------------------
| DELETE DEALER BALANCE ENTRY
| DELETE /api/v1/accounts/:id/balance/:balanceId
|--------------------------------------------------------------------------
*/

export const deleteAccountBalance = async (req, res) => {
  try {
    const { id, balanceId } = req.params;

    if (!isValidId(id) || !isValidId(balanceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account or balance ID",
      });
    }

    const account = await Account.findOneAndUpdate(
      {
        _id: id,
        "balance._id": balanceId,
      },
      {
        $pull: {
          balance: { _id: balanceId },
        },
      },
      { new: true },
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account or balance entry not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Dealer balance entry deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete dealer balance entry",
    });
  }
};
