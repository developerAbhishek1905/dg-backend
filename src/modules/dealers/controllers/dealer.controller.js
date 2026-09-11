import Dealer from "../models/dealer.model.js";
import User from "../../users/models/user.model.js";
import Role from "../../accessControl/models/role.model.js";
import Allocation from '../../allocation/model/allocation.model.js'
/* =========================================================
   HELPERS
========================================================= */

const parseJSON = (value, fallback = undefined) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const parseNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const number = Number(value);

  return Number.isNaN(number) ? fallback : number;
};

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return value === "true";
};

const getUploadedFile = (files, fieldName) => {
  return files?.[fieldName]?.[0]
    ? `/uploads/dealers/${files[fieldName][0].filename}`
    : "";
};

const getUploadedFiles = (files, fieldName) => {
  return (
    files?.[fieldName]?.map((file) => `/uploads/dealers/${file.filename}`) ?? []
  );
};

const buildAllocationRules = ({
  dealer,
  productServices,
  combinedCapacity,
  individualCapacities,
}) => {
  const capacityRules = [];

  /*
  |--------------------------------------------------------------------------
  | COMBINED CAPACITY
  |--------------------------------------------------------------------------
  */

  if (
    combinedCapacity?.products?.length &&
    Number(combinedCapacity.capacity) > 0
  ) {
    const combinedProducts =
      combinedCapacity.products.map((capacityProduct) => {
        const serviceProduct = productServices.find(
          (item) =>
            Number(item.productId) ===
            Number(capacityProduct.productId),
        );

        return {
          productId: Number(capacityProduct.productId),

          productName:
            capacityProduct.productName ??
            serviceProduct?.productName ??
            "",

          services:
            serviceProduct?.categories?.map((category) => ({
              categoryId: category.categoryId,

              category:
                category.categoryName ??
                category.category ??
                "",

              description:
                category.description ?? "",

              categoryDescription:
                category.categoryDescription ?? "",
            })) ?? [],

          dailyCapacity: 0,
        };
      });

    capacityRules.push({
      capacityType: "COMBINED",

      ruleName: combinedProducts
        .map((product) => product.productName)
        .filter(Boolean)
        .join(" + "),

      dailyCapacity: Number(
        combinedCapacity.capacity ?? 0,
      ),

      products: combinedProducts,

      status: "ACTIVE",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | INDIVIDUAL CAPACITY
  |--------------------------------------------------------------------------
  */

  for (const individual of individualCapacities ?? []) {
    const serviceProduct = productServices.find(
      (item) =>
        Number(item.productId) ===
        Number(individual.productId),
    );

    capacityRules.push({
      capacityType: "INDIVIDUAL",

      ruleName:
        individual.productName ??
        serviceProduct?.productName ??
        "",

      dailyCapacity: 0,

      products: [
        {
          productId: Number(individual.productId),

          productName:
            individual.productName ??
            serviceProduct?.productName ??
            "",

          dailyCapacity: Number(
            individual.capacity ?? 0,
          ),

          services:
            serviceProduct?.categories?.map((category) => ({
              categoryId: category.categoryId,

              category:
                category.categoryName ??
                category.category ??
                "",

              description:
                category.description ?? "",

              categoryDescription:
                category.categoryDescription ?? "",
            })) ?? [],
        },
      ],

      status: "ACTIVE",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | DEALER CITY
  |--------------------------------------------------------------------------
  */

  const cityId =
    dealer.businessAddress?.cityId ??
    dealer.residentialAddress?.cityId ??
    null;

  const cityName =
    dealer.businessAddress?.city ??
    dealer.residentialAddress?.city ??
    "";

  return [
    {
      cityId,
      cityName,
      capacityRules,
    },
  ];
};

/* =========================================================
   CREATE DEALER
========================================================= */

export const createDealer = async (req, res) => {
  try {
    const {
      technicianCode,
      technicianFirmName,
      technicianName,
      aadhaarNumber,
      alternativeNumber,
      panNumber,
      drivingLicenceNumber,
      technicianStatus,
      headCode,
      groupHead,
      headName,
      grade,
      zone,
      contactPerson,
      phoneNumbers,
      mobileNumber,
      email,
      taxApply,
      gstNumber,
      tinNumber,
      uinNumber,
      gstApplicable,
      hsnCode,
      taxInputPayable,
      vat15Column,
      segment,
      accountType,
      otherInfo,
      openingBalanceType,
    } = req.body;

    console.log(req.body)
    console.log(req.files)

    /* ===============================
       REQUIRED LOGIN FIELDS
    =============================== */

    if (!mobileNumber) {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required",
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    /* ===============================
       CHECK DEALER DUPLICATES
    =============================== */

    const existingMobile = await Dealer.findOne({
      mobileNumber,
    });

    if (existingMobile) {
      return res.status(409).json({
        success: false,
        message: "Dealer with this mobile number already exists",
      });
    }

    const existingDealerEmail = await Dealer.findOne({
      email: email.toLowerCase(),
    });

    if (existingDealerEmail) {
      return res.status(409).json({
        success: false,
        message: "Dealer with this email already exists",
      });
    }

    /* ===============================
       CHECK USER DUPLICATE
    =============================== */

    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }
    /* ===============================
       NESTED DATA
    =============================== */

    const businessAddress = parseJSON(req.body.businessAddress, {});

    const residentialAddress = parseJSON(req.body.residentialAddress, {});

    const productServices = parseJSON(req.body.productServices, []);

    const combinedCapacity = parseJSON(req.body.combinedCapacity, {
      products: [],
      capacity: 0,
    });

    const individualCapacities = parseJSON(req.body.individualCapacities, []);

    /* ===============================
       DOCUMENTS
    =============================== */

    const documents = {
      aadhaarFront: getUploadedFile(req.files, "aadhaarFrontFile"),

      aadhaarBack: getUploadedFile(req.files, "aadhaarBackFile"),

      panFront: getUploadedFile(req.files, "panFrontFile"),

      panBack: getUploadedFile(req.files, "panBackFile"),

      drivingLicenceFront: getUploadedFile(
        req.files,
        "drivingLicenceFrontFile",
      ),

      drivingLicenceBack: getUploadedFile(req.files, "drivingLicenceBackFile"),

      otherDocuments: getUploadedFiles(req.files, "documentUpload"),
    };

    /* ===============================
       CREATE
    =============================== */

    const dealer = await Dealer.create({
      technicianCode: technicianCode || undefined,
      technicianFirmName,
      technicianName,
      aadhaarNumber,
      alternativeNumber,
      panNumber,
      drivingLicenceNumber,
      technicianStatus: technicianStatus || "ACTIVE",
      headCode,
      groupHead,
      headName,
      grade,
      businessAddress,
      residentialAddress,
      zone,
      contactPerson,
      phoneNumbers,
      mobileNumber,
      email,
      taxApply,
      gstNumber,
      tinNumber,
      uinNumber,
      gstApplicable,
      gstRate: parseNumber(req.body.gstRate),
      hsnCode,
      reverseChargeLimit: parseNumber(req.body.reverseChargeLimit),
      taxInputPayable,
      vat15Column,
      segment,
      creditDays: parseNumber(req.body.creditDays),
      creditLimit: parseNumber(req.body.creditLimit),
      accountType: accountType || "STANDARD",
      isDealer: parseBoolean(req.body.isDealer, true),
      disableChallan: parseBoolean(req.body.disableChallan),
      ledgerSummaryOnly: parseBoolean(req.body.ledgerSummaryOnly),
      accountDeactivated: parseBoolean(req.body.accountDeactivated),
      otherInfo,
      rating: parseNumber(req.body.rating),
      openingBalance: parseNumber(req.body.openingBalance),
      openingBalanceType: openingBalanceType || "DR",
      productServices,
      combinedCapacity: {
        products: combinedCapacity?.products ?? [],
        capacity: parseNumber(combinedCapacity?.capacity),
      },
      individualCapacities,
      documents,
      status: technicianStatus || "ACTIVE",
    });

    /* ===============================
       FIND DEALER ROLE
    =============================== */

    const dealerRole = await Role.findOne({
      code: "DEALER",
      status: "ACTIVE",
    });

    /* ===============================
       CREATE LOGIN USER
    =============================== */

    const user = await User.create({
      name: technicianName,

      email: email.toLowerCase(),

      phone: mobileNumber,

      // Mobile number will be initial password.
      // Your User pre-save hook will automatically hash it.
      password: mobileNumber,

      // If DEALER role is not found -> null
      roleId: dealerRole?._id ?? null,

      dealerId: dealer._id,

      status: technicianStatus === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    });

    /* ===============================
   CREATE INITIAL ALLOCATION
=============================== */

const now = new Date();

const allocationMonth = now.getMonth() + 1;

const allocationYear = now.getFullYear();

const from = new Date(
  allocationYear,
  allocationMonth - 1,
  1,
);

const to = new Date(
  allocationYear,
  allocationMonth,
  0,
  23,
  59,
  59,
  999,
);

const allocationRules = buildAllocationRules({
  dealer,
  productServices,
  combinedCapacity,
  individualCapacities,
});

const allocation = await Allocation.create({
  dealerId: dealer._id,

  dealerCode: dealer.technicianCode,

  dealerName:
    dealer.technicianFirmName ||
    dealer.technicianName,

  allocationMonth,

  allocationYear,

  average_amount: 0,

  from,

  to,

  rules: allocationRules,

  status:
    dealer.status === "ACTIVE"
      ? "ACTIVE"
      : "INACTIVE",
});

    return res.status(201).json({
      success: true,
      message: "Dealer created successfully",
      data: dealer,
      allocation,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        dealerId: user.dealerId,
        roleId: user.roleId,
        roleAssigned: !!dealerRole,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Create Dealer Error:", error);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern ?? {})[0] ?? "field";

      return res.status(409).json({
        success: false,
        message: `${field} already exists`,
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create dealer",
    });
  }
};

/* =========================================================
   GET ALL DEALERS
========================================================= */

export const getDealers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status = "" } = req.query;

    const currentPage = Math.max(Number(page) || 1, 1);

    const pageLimit = Math.max(Number(limit) || 10, 1);

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (search) {
      const regex = new RegExp(search, "i");

      filter.$or = [
        {
          technicianFirmName: regex,
        },
        {
          technicianName: regex,
        },
        {
          technicianCode: regex,
        },
        {
          mobileNumber: regex,
        },
        {
          email: regex,
        },
        {
          gstNumber: regex,
        },
      ];
    }

    const total = await Dealer.countDocuments(filter);

    const dealers = await Dealer.find(filter)
      .sort({
        createdAt: -1,
      })
      .skip((currentPage - 1) * pageLimit)
      .limit(pageLimit);

    return res.status(200).json({
      success: true,

      data: dealers,

      pagination: {
        page: currentPage,
        limit: pageLimit,
        total,
        totalPages: Math.ceil(total / pageLimit),
      },
    });
  } catch (error) {
    console.error("Get Dealers Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dealers",
    });
  }
};

/* =========================================================
   GET DEALER BY ID
========================================================= */

export const getDealerById = async (req, res) => {
  try {
    const dealer = await Dealer.findById(req.params.id);

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: dealer,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dealer",
    });
  }
};

/* =========================================================
   UPDATE DEALER
========================================================= */

export const updateDealer = async (req, res) => {
  try {
    const dealer = await Dealer.findById(req.params.id);

    console.log(req.body)
    console.log(req.files)

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer not found",
      });
    }

    /* ===============================
       DUPLICATE MOBILE
    =============================== */

    if (req.body.mobileNumber) {
      const existingMobile = await Dealer.findOne({
        mobileNumber: req.body.mobileNumber,

        _id: {
          $ne: req.params.id,
        },
      });

      if (existingMobile) {
        return res.status(409).json({
          success: false,
          message: "Dealer with this mobile number already exists",
        });
      }
    }

    /* ===============================
       DUPLICATE EMAIL
    =============================== */

    if (req.body.email) {
      const existingEmail = await Dealer.findOne({
        email: req.body.email.toLowerCase(),

        _id: {
          $ne: req.params.id,
        },
      });

      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: "Dealer with this email already exists",
        });
      }
    }

    /* ===============================
       STRING FIELDS
    =============================== */

    const stringFields = [
      "technicianCode",
      "technicianFirmName",
      "technicianName",
      "aadhaarNumber",
      "alternativeNumber",
      "panNumber",
      "drivingLicenceNumber",
      "technicianStatus",

      "headCode",
      "groupHead",
      "headName",
      "grade",

      "zone",
      "contactPerson",
      "phoneNumbers",
      "mobileNumber",
      "email",

      "taxApply",
      "gstNumber",
      "tinNumber",
      "uinNumber",
      "gstApplicable",
      "hsnCode",
      "taxInputPayable",
      "vat15Column",
      "segment",

      "accountType",
      "otherInfo",
      "openingBalanceType",
    ];

    stringFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        dealer[field] = req.body[field];
      }
    });

    /* ===============================
       NUMBER FIELDS
    =============================== */

    const numberFields = [
      "gstRate",
      "reverseChargeLimit",
      "creditDays",
      "creditLimit",
      "rating",
      "openingBalance",
    ];

    numberFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        dealer[field] = parseNumber(req.body[field]);
      }
    });

    /* ===============================
       BOOLEAN FIELDS
    =============================== */

    const booleanFields = [
      "isDealer",
      "disableChallan",
      "ledgerSummaryOnly",
      "accountDeactivated",
    ];

    booleanFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        dealer[field] = parseBoolean(req.body[field]);
      }
    });

    /* ===============================
       NESTED FIELDS
    =============================== */

    if (req.body.businessAddress !== undefined) {
      dealer.businessAddress = parseJSON(req.body.businessAddress, {});
    }

    if (req.body.residentialAddress !== undefined) {
      dealer.residentialAddress = parseJSON(req.body.residentialAddress, {});
    }

    if (req.body.productServices !== undefined) {
      dealer.productServices = parseJSON(req.body.productServices, []);
    }

    if (req.body.combinedCapacity !== undefined) {
      const combined = parseJSON(req.body.combinedCapacity, {
        products: [],
        capacity: 0,
      });

      dealer.combinedCapacity = {
        products: combined.products ?? [],

        capacity: parseNumber(combined.capacity),
      };
    }

    if (req.body.individualCapacities !== undefined) {
      dealer.individualCapacities = parseJSON(
        req.body.individualCapacities,
        [],
      );
    }

    /* ===============================
       UPDATE FILES
    =============================== */

    if (req.files?.aadhaarFrontFile?.[0]) {
      dealer.documents.aadhaarFront = getUploadedFile(
        req.files,
        "aadhaarFrontFile",
      );
    }

    if (req.files?.aadhaarBackFile?.[0]) {
      dealer.documents.aadhaarBack = getUploadedFile(
        req.files,
        "aadhaarBackFile",
      );
    }

    if (req.files?.panFrontFile?.[0]) {
      dealer.documents.panFront = getUploadedFile(req.files, "panFrontFile");
    }

    if (req.files?.panBackFile?.[0]) {
      dealer.documents.panBack = getUploadedFile(req.files, "panBackFile");
    }

    if (req.files?.drivingLicenceFrontFile?.[0]) {
      dealer.documents.drivingLicenceFront = getUploadedFile(
        req.files,
        "drivingLicenceFrontFile",
      );
    }

    if (req.files?.drivingLicenceBackFile?.[0]) {
      dealer.documents.drivingLicenceBack = getUploadedFile(
        req.files,
        "drivingLicenceBackFile",
      );
    }

    const newOtherDocuments = getUploadedFiles(req.files, "documentUpload");

    if (newOtherDocuments.length) {
      dealer.documents.otherDocuments = [
        ...(dealer.documents.otherDocuments ?? []),
        ...newOtherDocuments,
      ];
    }

    if (req.body.technicianStatus) {
      dealer.status = req.body.technicianStatus;
    }

    await dealer.save();

    return res.status(200).json({
      success: true,
      message: "Dealer updated successfully",
      data: dealer,
    });
  } catch (error) {
    console.error("Update Dealer Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update dealer",
    });
  }
};

/* =========================================================
   DELETE DEALER
========================================================= */

export const deleteDealer = async (req, res) => {
  try {
    const dealer = await Dealer.findByIdAndDelete(req.params.id);

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Dealer deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete dealer",
    });
  }
};

/* =========================================================
   UPDATE STATUS
========================================================= */

export const updateDealerStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["ACTIVE", "INACTIVE", "SUSPENDED"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid dealer status",
      });
    }

    const dealer = await Dealer.findByIdAndUpdate(
      req.params.id,
      {
        status,

        technicianStatus: status === "SUSPENDED" ? "INACTIVE" : status,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Dealer status updated successfully",
      data: dealer,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update dealer status",
    });
  }
};
