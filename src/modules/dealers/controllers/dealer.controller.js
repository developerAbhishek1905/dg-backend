import Dealer from "../models/dealer.model.js";

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

    /* ===============================
       CHECK DUPLICATES
    =============================== */

    if (mobileNumber) {
      const existingMobile = await Dealer.findOne({
        mobileNumber,
      });

      if (existingMobile) {
        return res.status(409).json({
          success: false,
          message: "Dealer with this mobile number already exists",
        });
      }
    }

    if (email) {
      const existingEmail = await Dealer.findOne({
        email: email.toLowerCase(),
      });

      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: "Dealer with this email already exists",
        });
      }
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

    return res.status(201).json({
      success: true,
      message: "Dealer created successfully",
      data: dealer,
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
