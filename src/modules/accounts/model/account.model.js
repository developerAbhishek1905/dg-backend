import mongoose from "mongoose";

const accountBalanceSchema = new mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    accountType: {
      type: String,
      enum: ["DEBIT", "CREDIT"],
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const accountSchema = new mongoose.Schema(
  {
    accountName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    balance: [
      {
        dealerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Dealer",
          required: true,
        },

        ledgerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "DealerLedger",
          default: null,
        },

        amount: {
          type: Number,
          required: true,
          min: 0,
        },

        accountType: {
          type: String,
          enum: ["DEBIT", "CREDIT"],
          required: true,
        },
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Account", accountSchema);