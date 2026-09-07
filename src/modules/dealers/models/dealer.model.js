import mongoose from "mongoose";

const { Schema } = mongoose;

/* =========================================================
   ADDRESS
========================================================= */

const addressSchema = new mongoose.Schema(
  {
    addressLine: {
      type: String,
      trim: true,
      default: "",
    },

    stateId: {
      type: Number,
      default: null,
      index: true,
    },

    state: {
      type: String,
      trim: true,
      default: "",
    },

    stateCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    districtId: {
      type: Number,
      default: null,
      index: true,
    },

    district: {
      type: String,
      trim: true,
      default: "",
    },

    cityId: {
      type: Number,
      default: null,
      index: true,
    },

    city: {
      type: String,
      trim: true,
      default: "",
    },

    pincodeId: {
      type: Number,
      default: null,
      index: true,
    },

    pinCode: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: false,
  },
);

/* =========================================================
   PRODUCT SERVICE CATEGORY
========================================================= */

const productCategorySchema = new mongoose.Schema(
  {
    categoryId: {
      type: String,
      required: true,
      trim: true,
    },

    categoryName: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

/* =========================================================
   PRODUCT + SERVICES
========================================================= */

const productServiceSchema = new mongoose.Schema(
  {
    productId: {
      type: Number,
      required: true,
      index: true,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },

    categories: {
      type: [productCategorySchema],
      default: [],
    },
  },
  {
    _id: false,
  },
);

/* =========================================================
   COMBINED CAPACITY PRODUCT
========================================================= */

const capacityProductSchema = new mongoose.Schema(
  {
    productId: {
      type: Number,
      required: true,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

/* =========================================================
   COMBINED CAPACITY
========================================================= */

const combinedCapacitySchema = new mongoose.Schema(
  {
    products: {
      type: [capacityProductSchema],
      default: [],
    },

    capacity: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    _id: false,
  },
);

/* =========================================================
   INDIVIDUAL CAPACITY
========================================================= */

const individualCapacitySchema = new mongoose.Schema(
  {
    productId: {
      type: Number,
      required: true,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },

    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    _id: false,
  },
);

/* =========================================================
   DOCUMENTS
========================================================= */

const documentsSchema = new mongoose.Schema(
  {
    aadhaarFront: {
      type: String,
      default: "",
    },

    aadhaarBack: {
      type: String,
      default: "",
    },

    panFront: {
      type: String,
      default: "",
    },

    panBack: {
      type: String,
      default: "",
    },

    drivingLicenceFront: {
      type: String,
      default: "",
    },

    drivingLicenceBack: {
      type: String,
      default: "",
    },

    otherDocuments: {
      type: [String],
      default: [],
    },
  },
  {
    _id: false,
  },
);

/* =========================================================
   DEALER
========================================================= */

const dealerSchema = new mongoose.Schema(
  {
    dealerCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    technicianCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    /* =========================
       BASIC INFORMATION
    ========================= */

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

    /* =========================
       TECHNICIAN INFORMATION
    ========================= */

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
      trim: true,
      lowercase: true,
    },

    technicianStatus: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      index: true,
    },

    /* =========================
       IDENTITY
    ========================= */

    aadhaarNumber: {
      type: String,
      trim: true,
      default: "",
    },

    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    drivingLicenceNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    documents: {
      type: documentsSchema,
      default: () => ({}),
    },

    /* =========================
       ADDRESS
    ========================= */

    businessAddress: {
      type: addressSchema,
      default: () => ({}),
    },

    residentialAddress: {
      type: addressSchema,
      default: () => ({}),
    },

    zone: {
      type: String,
      trim: true,
      default: "",
    },

    contactPerson: {
      type: String,
      trim: true,
      default: "",
    },

    phoneNumbers: {
      type: String,
      trim: true,
      default: "",
    },

    /* =========================
       TAX INFORMATION
    ========================= */

    taxApply: {
      type: String,
      trim: true,
      default: "",
    },

    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
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
      enum: ["YES", "NO", ""],
      default: "",
    },

    gstRate: {
      type: Number,
      min: 0,
      default: 0,
    },

    hsnCode: {
      type: String,
      trim: true,
      default: "",
    },

    reverseChargeLimit: {
      type: Number,
      min: 0,
      default: 0,
    },

    taxInputPayable: {
      type: String,
      enum: ["INPUT", "PAYABLE", ""],
      default: "",
    },

    vat15Column: {
      type: String,
      trim: true,
      default: "",
    },

    segment: {
      type: String,
      trim: true,
      default: "",
    },

    /* =========================
       CREDIT
    ========================= */

    creditDays: {
      type: Number,
      min: 0,
      default: 0,
    },

    creditLimit: {
      type: Number,
      min: 0,
      default: 0,
    },

    /* =========================
       ACCOUNT
    ========================= */

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

    /* =========================
       OTHER INFORMATION
    ========================= */

    otherInfo: {
      type: String,
      trim: true,
      default: "",
    },

    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
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

    /* =========================
       PRODUCT & SERVICES
    ========================= */

    productServices: {
      type: [productServiceSchema],
      default: [],
    },

    /* =========================
       CAPACITY MASTER
    ========================= */

    // capacityType: {
    //   type: String,
    //   enum: ["COMBINED", "INDIVIDUAL"],
    //   required: true,
    //   default: "INDIVIDUAL",
    // },

    combinedCapacity: {
      type: combinedCapacitySchema,
      default: () => ({
        products: [],
        capacity: 0,
      }),
    },

    individualCapacities: {
      type: [individualCapacitySchema],
      default: [],
    },

    capacityMaster: {
      type: [individualCapacitySchema],
      default: [],
    },

    /* =========================
       STATUS
    ========================= */

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
      default: "ACTIVE",
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

/* =========================================================
   VALIDATION
========================================================= */

dealerSchema.pre("validate", function () {
  /* ======================================
     PRODUCT SERVICES DUPLICATES
  ====================================== */

  const productServiceIds =
    this.productServices?.map(
      (item) => item.productId,
    ) ?? [];

  if (
    new Set(productServiceIds).size !==
    productServiceIds.length
  ) {
    throw new Error(
      "Duplicate products are not allowed in product services",
    );
  }

  /* ======================================
     COMBINED CAPACITY
  ====================================== */

  const combinedProducts =
    this.combinedCapacity?.products ?? [];

  if (combinedProducts.length > 0) {
    const capacity = Number(
      this.combinedCapacity?.capacity ?? 0,
    );

    if (capacity < 1) {
      throw new Error(
        "Combined capacity must be greater than 0",
      );
    }

    const combinedProductIds =
      combinedProducts.map(
        (item) => item.productId,
      );

    if (
      new Set(combinedProductIds).size !==
      combinedProductIds.length
    ) {
      throw new Error(
        "Duplicate products are not allowed in combined capacity",
      );
    }
  }

  /* ======================================
     INDIVIDUAL CAPACITY
  ====================================== */

  const individualCapacities =
    this.individualCapacities ?? [];

  if (individualCapacities.length > 0) {
    const individualProductIds =
      individualCapacities.map(
        (item) => item.productId,
      );

    if (
      new Set(individualProductIds).size !==
      individualProductIds.length
    ) {
      throw new Error(
        "Duplicate products are not allowed in individual capacity",
      );
    }

    individualCapacities.forEach(
      (item) => {
        if (
          Number(item.capacity) < 1
        ) {
          throw new Error(
            `${
              item.productName ||
              "Product"
            } capacity must be greater than 0`,
          );
        }
      },
    );
  }
});

export default mongoose.model("Dealer", dealerSchema);
