import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    addressLine: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const capacitySchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    rate: {
      type: Number,
      default: 0,
      min: 0,
    },

    capacity: {
      type: Number,
      required: true,
      min: 1,
    },

    serviceType: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: false,
  },
);

const documentSchema = new mongoose.Schema(
  {
    fileName: String,
    filePath: String,
    mimeType: String,
  },
  {
    _id: false,
  },
);

const dealerSchema = new mongoose.Schema(
  {
    // =====================================
    // BASIC INFORMATION
    // =====================================
    headCode: {
      type: String,
      required: true,
      trim: true,
    },

    groupHead: {
      type: String,
      trim: true,
      default: "",
    },

    headName: {
      type: String,
      required: true,
      trim: true,
    },

    grade: {
      type: String,
      trim: true,
      default: "",
    },

    segment: {
      type: String,
      trim: true,
      default: "",
    },

    // =====================================
    // TECHNICIAN INFORMATION
    // =====================================
    technicianCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    technicianFirmName: {
      type: String,
      required: true,
      trim: true,
    },

    technicianName: {
      type: String,
      required: true,
      trim: true,
    },

    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },

    alternativeNumber: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    technicianStatus: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },

    // =====================================
    // ADDRESS
    // =====================================
    address: {
      type: [addressSchema],
      default: [],
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    district: {
      type: String,
      trim: true,
      default: "",
    },

    state: {
      type: String,
      required: true,
      trim: true,
    },

    stateCode: {
      type: String,
      trim: true,
      default: "",
    },

    pinCode: {
      type: String,
      required: true,
      trim: true,
    },

    zone: {
      type: String,
      trim: true,
      default: "",
    },

    // =====================================
    // IDENTITY
    // =====================================
    aadhaarNumber: {
      type: String,
      required: true,
      trim: true,
    },

    panNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    drivingLicenceNumber: {
      type: String,
      required: true,
      trim: true,
    },

    aadhaarFile: {
      type: documentSchema,
      default: null,
    },

    panFile: {
      type: documentSchema,
      default: null,
    },

    drivingLicenceFile: {
      type: documentSchema,
      default: null,
    },

    documentUpload: {
      type: [documentSchema],
      default: [],
    },

    // =====================================
    // TAX
    // =====================================
    taxApply: {
      type: String,
      enum: ["", "WITHIN_STATE", "OUTSIDE_STATE"],
      default: "",
    },

    gstNumber: {
      type: String,
      trim: true,
      default: "",
    },

    tinNumber: {
      type: String,
      trim: true,
      default: "",
    },

    uinNumber: {
      type: String,
      trim: true,
      default: "",
    },

    gstApplicable: {
      type: String,
      enum: ["", "YES", "NO"],
      default: "",
    },

    gstRate: {
      type: Number,
      default: 0,
      min: 0,
    },

    hsnCode: {
      type: String,
      trim: true,
      default: "",
    },

    reverseChargeLimit: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxInputPayable: {
      type: String,
      enum: ["", "INPUT", "PAYABLE"],
      default: "",
    },

    vat15Column: {
      type: String,
      trim: true,
      default: "",
    },

    // =====================================
    // CREDIT
    // =====================================
    creditDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    creditLimit: {
      type: Number,
      default: 0,
      min: 0,
    },

    // =====================================
    // ACCOUNT CONFIG
    // =====================================
    accountType: {
      type: String,
      enum: [
        "STANDARD",
        "OTHER_EXPENSE_IN_INVOICE",
        "BANK",
        "TAX_CODE",
        "SALE_PURCHASE_ACCOUNT",
      ],
      default: "STANDARD",
    },

    isDealer: {
      type: Boolean,
      default: true,
    },

    disableChallan: {
      type: Boolean,
      default: false,
    },

    ledgerSummaryOnly: {
      type: Boolean,
      default: false,
    },

    accountDeactivated: {
      type: Boolean,
      default: false,
    },

    // =====================================
    // OTHER INFORMATION
    // =====================================
    otherInfo: {
      type: String,
      trim: true,
      default: "",
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
    },

    openingBalance: {
      type: Number,
      default: 0,
    },

    openingBalanceType: {
      type: String,
      enum: ["DR", "CR"],
      default: "DR",
    },

    // =====================================
    // PRODUCT / SERVICE
    // =====================================
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    productServiceType: {
      type: String,
      enum: [
        "INSTALLATION",
        "SERVICE",
        "REPAIR",
        "MAINTENANCE",
        "UNINSTALLATION",
      ],
      required: true,
    },

    capacityMaster: {
      type: [capacitySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Dealer", dealerSchema);