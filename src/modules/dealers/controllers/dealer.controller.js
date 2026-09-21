import BillingComplaint from "../../Complaint/models/complaint.model.js";
import { parseDealerBilling } from "../helpers/dealerBilling.js";
import Dealer from "../models/dealer.model.js";
import User from "../../users/models/user.model.js";
import Role from "../../accessControl/models/role.model.js";
import Allocation from "../../allocation/model/allocation.model.js";
import { syncDealerAllocation } from "../../allocation/services/allocateDealer.service.js";
import DealerLedger from "../../dealerLedger/model/dealerLedger.model.js";
import { getLeaveStatus } from "../helpers/dealerLeave.utils.js";

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

const generateHeadCode = async () => {
  const lastDealer = await Dealer.findOne({
    headCode: /^HEAD\d+$/,
  })
    .sort({ headCode: -1 })
    .select("headCode")
    .lean();

  let nextNumber = 1;

  if (lastDealer?.headCode) {
    const match = lastDealer.headCode.match(/\d+$/);

    if (match) {
      nextNumber = Number(match[0]) + 1;
    }
  }

  return `HEAD${String(nextNumber).padStart(4, "0")}`;
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

export const buildAllocationRules = ({
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
    const combinedProducts = combinedCapacity.products.map(
      (capacityProduct) => {
        const serviceProduct = productServices.find(
          (item) =>
            Number(item.productId) === Number(capacityProduct.productId),
        );

        return {
          productId: Number(capacityProduct.productId),

          productName:
            capacityProduct.productName ?? serviceProduct?.productName ?? "",

          services:
            serviceProduct?.categories?.map((category) => ({
              categoryId: category.categoryId,

              category: category.categoryName ?? category.category ?? "",

              description: category.description ?? "",

              categoryDescription: category.categoryDescription ?? "",
            })) ?? [],

          dailyCapacity: 0,
        };
      },
    );

    capacityRules.push({
      capacityType: "COMBINED",

      ruleName: combinedProducts
        .map((product) => product.productName)
        .filter(Boolean)
        .join(" + "),

      dailyCapacity: Number(combinedCapacity.capacity ?? 0),

      products: combinedProducts,

      status: "ACTIVE",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | INDIVIDUAL CAPACITY
  |--------------------------------------------------------------------------
  */

  /*
|--------------------------------------------------------------------------
| INDIVIDUAL CAPACITY
|--------------------------------------------------------------------------
*/

  for (const individual of individualCapacities ?? []) {
    const productId = Number(individual.productId ?? individual.product_id);

    const individualDailyCapacity = Number(
      individual.capacity ?? individual.dailyCapacity ?? 0,
    );

    console.log("INDIVIDUAL PRODUCT:", {
      productId,
      productName: individual.productName,
      capacity: individual.capacity,
      dailyCapacity: individual.dailyCapacity,
      finalCapacity: individualDailyCapacity,
    });

    if (!productId) {
      console.warn(
        "Skipping individual capacity: productId missing",
        individual,
      );

      continue;
    }

    const serviceProduct = productServices.find(
      (item) => Number(item.productId ?? item.product_id) === productId,
    );

    capacityRules.push({
      capacityType: "INDIVIDUAL",

      ruleName: individual.productName ?? serviceProduct?.productName ?? "",

      // Individual capacity is stored
      // at product level.
      dailyCapacity: 0,

      products: [
        {
          productId,

          productName:
            individual.productName ?? serviceProduct?.productName ?? "",

          // IMPORTANT
          dailyCapacity: individualDailyCapacity,

          services:
            serviceProduct?.categories?.map((category) => ({
              categoryId: category.categoryId,

              category: category.categoryName ?? category.category ?? "",

              description: category.description ?? "",

              categoryDescription: category.categoryDescription ?? "",
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
    dealer.businessAddress?.cityId ?? dealer.residentialAddress?.cityId ?? null;

  const cityName =
    dealer.businessAddress?.city ?? dealer.residentialAddress?.city ?? "";

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
    let billing;
    try {
      billing = parseDealerBilling(req.body);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
    const {
      technicianCode,
      technicianFirmName,
      technicianName,
      aadhaarNumber,
      alternativeNumber,
      panNumber,
      drivingLicenceNumber,
      technicianStatus,
      // headCode,
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
      openingBalance,
      openingBalanceType,
      dateOfJoining,
      dateOfLeaving,
    } = req.body;

    console.log(req.body);
    console.log(req.files);

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

    const headCode = await generateHeadCode();

    //     const openingBalance = parseNumber(req.body.openingBalance);
    // const openingBalanceType = req.body.openingBalanceType || "DR";

    const now = new Date();

    const joiningDate = dateOfJoining ? new Date(dateOfJoining) : now;

    const leavingDate = dateOfLeaving ? new Date(dateOfLeaving) : null;

    if (Number.isNaN(joiningDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date of joining",
      });
    }

    if (leavingDate && Number.isNaN(leavingDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date of leaving",
      });
    }

    if (leavingDate && leavingDate < joiningDate) {
      return res.status(400).json({
        success: false,
        message: "Date of leaving cannot be before date of joining",
      });
    }

    let finalStatus = technicianStatus || "ACTIVE";

    if (joiningDate > now) {
      finalStatus = "INACTIVE";
    }

    if (leavingDate && leavingDate <= now) {
      finalStatus = "INACTIVE";
    }

    /* ===============================
       CREATE
    =============================== */

    const dealer = await Dealer.create({
      ...billing,
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
      technicianStatus: finalStatus === "ACTIVE" ? "ACTIVE" : "INACTIVE",

      status: finalStatus,

      dateOfJoining: joiningDate,
      dateOfLeaving: leavingDate,
      // status: technicianStatus || "ACTIVE",
      // dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : new Date(),

      // dateOfLeaving: dateOfLeaving ? new Date(dateOfLeaving) : null,
    });

    /* ===============================
   CREATE OPENING BALANCE LEDGER
================================ */

    let openingLedgerEntry = null;

    if (openingBalance > 0) {
      openingLedgerEntry = await DealerLedger.create({
        dealerId: dealer._id,

        dealerCode:
          dealer.dealerCode || dealer.technicianCode || dealer.headCode,

        dealerName: dealer.technicianFirmName || dealer.technicianName,

        transactionType: "OPENING_BALANCE",

        billingType: "OPENING_BALANCE",

        entryType: openingBalanceType === "DR" ? "DEBIT" : "CREDIT",

        amount: openingBalance,

        description: "Dealer opening balance",

        remarks: `Opening balance created during dealer creation (${openingBalanceType})`,

        status: "APPROVED",

        billingDate: new Date(),
      });
    }

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
      status: finalStatus === "ACTIVE" ? "ACTIVE" : "INACTIVE",

      // status: technicianStatus === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    });

    /* ===============================
   CREATE INITIAL ALLOCATION
=============================== */



    const allocationMonth = now.getMonth() + 1;

    const allocationYear = now.getFullYear();

    const from = new Date(allocationYear, allocationMonth - 1, 1);

    const to = new Date(allocationYear, allocationMonth, 0, 23, 59, 59, 999);

    const allocationRules = buildAllocationRules({
      dealer,
      productServices,
      combinedCapacity,
      individualCapacities,
    });

    const allocation = await Allocation.create({
      dealerId: dealer._id,

      dealerCode: dealer.technicianCode,

      dealerName: dealer.technicianFirmName || dealer.technicianName,

      allocationMonth,

      allocationYear,

      average_amount: 0,

      from,

      to,

      rules: allocationRules,

      status: dealer.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
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

// export const getDealers = async (req, res) => {
//   try {
//     const { page = 1, limit = 10, search = "", status = "" } = req.query;

//     const currentPage = Math.max(Number(page) || 1, 1);

//     const pageLimit = Math.max(Number(limit) || 10, 1);

//     const filter = {};

//     if (status) {
//       filter.status = status;
//     }

//     if (search) {
//       const regex = new RegExp(search, "i");

//       filter.$or = [
//         {
//           technicianFirmName: regex,
//         },
//         {
//           technicianName: regex,
//         },
//         {
//           technicianCode: regex,
//         },
//         {
//           mobileNumber: regex,
//         },
//         {
//           email: regex,
//         },
//         {
//           gstNumber: regex,
//         },
//       ];
//     }

//     const total = await Dealer.countDocuments(filter);

//     const dealers = await Dealer.find(filter)
//       .sort({
//         createdAt: -1,
//       })
//       .skip((currentPage - 1) * pageLimit)
//       .limit(pageLimit);

//     return res.status(200).json({
//       success: true,

//       data: dealers,

//       pagination: {
//         page: currentPage,
//         limit: pageLimit,
//         total,
//         totalPages: Math.ceil(total / pageLimit),
//       },
//     });
//   } catch (error) {
//     console.error("Get Dealers Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch dealers",
//     });
//   }
// };

export const getDealers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
    } = req.query;

    const currentPage = Math.max(
      Number(page) || 1,
      1,
    );

    const pageLimit = Math.max(
      Number(limit) || 10,
      1,
    );

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (search) {
      const regex = new RegExp(search, "i");

      filter.$or = [
        { technicianFirmName: regex },
        { technicianName: regex },
        { technicianCode: regex },
        { mobileNumber: regex },
        { email: regex },
        { gstNumber: regex },
      ];
    }

    const total = await Dealer.countDocuments(
      filter,
    );

    const dealers = await Dealer.find(filter)
      .sort({
        createdAt: -1,
      })
      .skip((currentPage - 1) * pageLimit)
      .limit(pageLimit)
      .lean();

    // -------------------------------------
    // Calculate leave statuses
    // -------------------------------------

    const normalizedDealers = dealers.map(
      (dealer) => {
        const leaves = (
          dealer.leaves ?? []
        ).map((leave) => ({
          ...leave,
          status: getLeaveStatus(leave),
        }));

        const isOnLeave = leaves.some(
          (leave) =>
            leave.status === "ACTIVE",
        );

        return {
          ...dealer,

          leaves,

          isOnLeave,

          effectiveStatus: isOnLeave
            ? "LEAVE"
            : dealer.status,
        };
      },
    );

    return res.status(200).json({
      success: true,

      data: normalizedDealers,

      pagination: {
        page: currentPage,
        limit: pageLimit,
        total,
        totalPages: Math.ceil(
          total / pageLimit,
        ),
      },
    });
  } catch (error) {
    console.error(
      "Get Dealers Error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dealers",
    });
  }
};
/* =========================================================
   GET DEALER BY ID
========================================================= */

// export const getDealerById = async (req, res) => {
//   try {
//     const dealer = await Dealer.findById(req.params.id);

//     if (!dealer) {
//       return res.status(404).json({
//         success: false,
//         message: "Dealer not found",
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       data: dealer,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch dealer",
//     });
//   }
// };

export const getDealerById = async (req, res) => {
  try {
    const dealer = await Dealer.findById(
      req.params.id,
    ).lean();

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer not found",
      });
    }

    const leaves = (dealer.leaves ?? []).map(
      (leave) => ({
        ...leave,

        // Calculate current status
        status: getLeaveStatus(leave),
      }),
    );

    const onLeave = leaves.some(
      (leave) => leave.status === "ACTIVE",
    );

    return res.status(200).json({
      success: true,

      data: {
        ...dealer,

        leaves,

        // Useful for frontend
        isOnLeave: onLeave,

        // Optional display status
        effectiveStatus: onLeave
          ? "LEAVE"
          : dealer.status,
      },
    });
  } catch (error) {
    console.error(
      "Get Dealer By ID Error:",
      error,
    );

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

    console.log(req.body);
    console.log(req.files);

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer not found",
      });
    }

    // Validate billing before changing the dealer or related records.
    const billingFields = [
      "billingType",
      "billingPercentage",
      "cancellationBillingEnabled",
      "cancellationCharge",
    ];
    if (billingFields.some((field) => req.body[field] !== undefined)) {
      try {
        Object.assign(dealer, parseDealerBilling(req.body, dealer));
      } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
      }
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

    // const numberFields = [
    //   "gstRate",
    //   "reverseChargeLimit",
    //   "creditDays",
    //   "creditLimit",
    //   "rating",
    //   "openingBalance",
    // ];

    const numberFields = [
      "gstRate",
      "reverseChargeLimit",
      "creditDays",
      "creditLimit",
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
      const requestedStatus = req.body.technicianStatus;

      const leavingDate = dealer.dateOfLeaving
        ? new Date(dealer.dateOfLeaving)
        : null;

      const hasAlreadyLeft = leavingDate && leavingDate <= new Date();

      if (hasAlreadyLeft && requestedStatus === "ACTIVE") {
        return res.status(400).json({
          success: false,
          message:
            "Dealer has already left. Use the rejoin action to activate this dealer.",
        });
      }

      if (!["LEAVE", "SUSPENDED"].includes(dealer.status)) {
        dealer.status = requestedStatus;
      }
    }
    /* ===============================
   DEALER LIFECYCLE
=============================== */

    const now = new Date();

    /* ===============================
   DATE OF JOINING
================================ */

    if (req.body.dateOfJoining !== undefined) {
      if (!req.body.dateOfJoining) {
        return res.status(400).json({
          success: false,
          message: "Date of joining is required",
        });
      }

      const joiningDate = new Date(req.body.dateOfJoining);

      if (Number.isNaN(joiningDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date of joining",
        });
      }

      dealer.dateOfJoining = joiningDate;
    }

    /* ===============================
   DATE OF LEAVING
================================ */

    if (req.body.dateOfLeaving !== undefined) {
      if (req.body.dateOfLeaving) {
        const leavingDate = new Date(req.body.dateOfLeaving);

        if (Number.isNaN(leavingDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid date of leaving",
          });
        }

        const joiningDate = dealer.dateOfJoining
          ? new Date(dealer.dateOfJoining)
          : null;

        if (joiningDate && leavingDate < joiningDate) {
          return res.status(400).json({
            success: false,
            message: "Date of leaving cannot be before date of joining",
          });
        }

        dealer.dateOfLeaving = leavingDate;

        if (leavingDate <= now) {
          dealer.status = "INACTIVE";
          dealer.technicianStatus = "INACTIVE";
        }
      } else {
        dealer.dateOfLeaving = null;
      }
    }
    /*
|--------------------------------------------------------------------------
| REJOIN DEALER
|--------------------------------------------------------------------------
*/

    // if (req.body.rejoiningDate) {
    //   const rejoiningDate = new Date(req.body.rejoiningDate);

    //   if (Number.isNaN(rejoiningDate.getTime())) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Invalid rejoining date",
    //     });
    //   }

    //   /*
    //    * Store every rejoining date.
    //    */
    //   dealer.rejoiningDates ??= [];

    //   const alreadyExists = dealer.rejoiningDates.some(
    //     (date) => new Date(date).getTime() === rejoiningDate.getTime(),
    //   );

    //   if (!alreadyExists) {
    //     dealer.rejoiningDates.push(rejoiningDate);
    //   }

    //   dealer.lastRejoiningDate = rejoiningDate;

    //   /*
    //    * Activate immediately only when
    //    * rejoining date has arrived.
    //    */
    //   if (rejoiningDate <= now) {
    //     dealer.status = "ACTIVE";
    //     dealer.technicianStatus = "ACTIVE";

    //     dealer.dateOfLeaving = null;
    //   }
    // }

    /*
|--------------------------------------------------------------------------
| LEAVE
|--------------------------------------------------------------------------
*/

    // if (req.body.leaveFrom !== undefined) {
    //   dealer.leaveFrom = req.body.leaveFrom
    //     ? new Date(req.body.leaveFrom)
    //     : null;
    // }

    // if (req.body.leaveTo !== undefined) {
    //   dealer.leaveTo = req.body.leaveTo ? new Date(req.body.leaveTo) : null;
    // }

    // if (
    //   dealer.leaveFrom &&
    //   now >= new Date(dealer.leaveFrom) &&
    //   (!dealer.leaveTo || now <= new Date(dealer.leaveTo))
    // ) {
    //   dealer.status = "LEAVE";
    // }

    /*
|--------------------------------------------------------------------------
| SUSPEND
|--------------------------------------------------------------------------
*/

    // if (req.body.status === "SUSPENDED") {
    //   dealer.status = "SUSPENDED";

    //   dealer.suspendedAt = now;

    //   dealer.suspensionReason = req.body.suspensionReason || "";
    // }

    /*
|--------------------------------------------------------------------------
| RATING
|--------------------------------------------------------------------------
*/

    // if (req.body.rating !== undefined) {
    //   const rating = Number(req.body.rating);

    //   if (Number.isNaN(rating) || rating < 0 || rating > 5) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Rating must be between 0 and 5",
    //     });
    //   }

    //   dealer.rating = rating;
    // }

    await dealer.save();

    /* ===============================
   SYNC CURRENT ALLOCATION
================================ */

    let allocation = null;

    const allocationRelatedChanged =
      req.body.productServices !== undefined ||
      req.body.combinedCapacity !== undefined ||
      req.body.individualCapacities !== undefined ||
      req.body.technicianStatus !== undefined ||
      req.body.technicianCode !== undefined ||
      req.body.technicianFirmName !== undefined ||
      req.body.technicianName !== undefined ||
      req.body.dateOfJoining !== undefined ||
      req.body.dateOfLeaving !== undefined;

    if (allocationRelatedChanged) {
      allocation = await syncDealerAllocation({
        dealer,

        productServices: dealer.productServices ?? [],

        combinedCapacity: dealer.combinedCapacity ?? {
          products: [],
          capacity: 0,
        },

        individualCapacities: dealer.individualCapacities ?? [],
      });
    }

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
    if (
      await BillingComplaint.exists({ "billingReview.dealerId": req.params.id })
    )
      return res.status(409).json({
        message:
          "Dealers with billing reviews or ledger entries cannot be deleted",
      });
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

// export const registerDealerLeave = async (req, res) => {
//   try {
//     const { from, to, reason } = req.body;

//     if (!from || !to) {
//       return res.status(400).json({
//         success: false,
//         message: "Leave from and to dates are required",
//       });
//     }

//     const fromDate = new Date(from);
//     const toDate = new Date(to);

//     if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid leave dates",
//       });
//     }

//     if (toDate < fromDate) {
//       return res.status(400).json({
//         success: false,
//         message: "Leave end date cannot be before start date",
//       });
//     }

//     const dealer = await Dealer.findById(req.params.id);

//     if (!dealer) {
//       return res.status(404).json({
//         success: false,
//         message: "Dealer not found",
//       });
//     }

//     if (dealer.status === "SUSPENDED") {
//       return res.status(400).json({
//         success: false,
//         message: "Suspended dealer cannot register leave",
//       });
//     }

//     dealer.leaves.push({
//       from: fromDate,
//       to: toDate,
//       reason: reason || "",
//       status:
//         fromDate <= new Date() && toDate >= new Date() ? "ACTIVE" : "SCHEDULED",
//     });

//     if (fromDate <= new Date() && toDate >= new Date()) {
//       dealer.status = "LEAVE";
//     }

//     await dealer.save();

//     await syncDealerAllocation({
//       dealer,
//       productServices: dealer.productServices ?? [],
//       combinedCapacity: dealer.combinedCapacity ?? {
//         products: [],
//         capacity: 0,
//       },
//       individualCapacities: dealer.individualCapacities ?? [],
//     });

//     return res.json({
//       success: true,
//       message: "Dealer leave registered successfully",
//       data: dealer,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

export const registerDealerLeave = async (req, res) => {
  try {
    const { from, to, reason } = req.body;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: "Leave from and to dates are required",
      });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (
      Number.isNaN(fromDate.getTime()) ||
      Number.isNaN(toDate.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave dates",
      });
    }

    if (toDate < fromDate) {
      return res.status(400).json({
        success: false,
        message:
          "Leave end date cannot be before start date",
      });
    }

    const dealer = await Dealer.findById(req.params.id);

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer not found",
      });
    }

    if (dealer.status === "SUSPENDED") {
      return res.status(400).json({
        success: false,
        message:
          "Suspended dealer cannot register leave",
      });
    }

    // -------------------------------------
    // Check overlapping leave
    // -------------------------------------

    const hasOverlap = (dealer.leaves ?? []).some(
      (leave) => {
        if (leave.status === "CANCELLED") {
          return false;
        }

        const existingFrom = new Date(leave.from);
        const existingTo = new Date(leave.to);

        return (
          fromDate <= existingTo &&
          toDate >= existingFrom
        );
      },
    );

    if (hasOverlap) {
      return res.status(400).json({
        success: false,
        message:
          "Dealer already has leave during this period",
      });
    }

    // -------------------------------------
    // Create leave
    // -------------------------------------

    const leave = {
      from: fromDate,
      to: toDate,
      reason: reason?.trim() || "",
      status: "SCHEDULED",
    };

    leave.status = getLeaveStatus(leave);

    dealer.leaves.push(leave);

    await dealer.save();

    return res.status(200).json({
      success: true,
      message: "Dealer leave registered successfully",

      data: {
        dealer,
        leave: {
          ...dealer.leaves[
            dealer.leaves.length - 1
          ].toObject(),
          status: getLeaveStatus(
            dealer.leaves[
              dealer.leaves.length - 1
            ],
          ),
        },
      },
    });
  } catch (error) {
    console.error(
      "Register Dealer Leave Error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to register dealer leave",
    });
  }
};
export const rejoinDealer = async (req, res) => {
  try {
    const { rejoiningDate } = req.body;

    if (!rejoiningDate) {
      return res.status(400).json({
        success: false,
        message: "Rejoining date is required",
      });
    }

    const dealer = await Dealer.findById(req.params.id);

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer not found",
      });
    }

    const date = new Date(rejoiningDate);

    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid rejoining date",
      });
    }

    if (dealer.dateOfLeaving && date <= new Date(dealer.dateOfLeaving)) {
      return res.status(400).json({
        success: false,
        message: "Rejoining date must be after date of leaving",
      });
    }

    dealer.rejoiningDates ??= [];

    dealer.rejoiningDates.push(date);

    if (date <= new Date()) {
      dealer.status = "ACTIVE";
      dealer.technicianStatus = "ACTIVE";

      // Keep old leaving date for history.
      // Do NOT clear dateOfLeaving.
    }

    await dealer.save();

    await syncDealerAllocation({
      dealer,
      productServices: dealer.productServices ?? [],
      combinedCapacity: dealer.combinedCapacity ?? {
        products: [],
        capacity: 0,
      },
      individualCapacities: dealer.individualCapacities ?? [],
    });

    return res.json({
      success: true,
      message: "Dealer rejoined successfully",
      data: dealer,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateDealerRating = async (req, res) => {
  try {
    const { rating } = req.body;

    const value = Number(rating);

    if (Number.isNaN(value) || value < 0 || value > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 0 and 5",
      });
    }

    const dealer = await Dealer.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          rating: value,
        },
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

    return res.json({
      success: true,
      message: "Dealer rating updated successfully",
      data: dealer,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const suspendDealer = async (req, res) => {
  try {
    const { reason } = req.body;

    const dealer = await Dealer.findById(req.params.id);

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer not found",
      });
    }

    dealer.status = "SUSPENDED";
    dealer.suspendedAt = new Date();
    dealer.suspensionReason = reason || "";

    await dealer.save();

    await syncDealerAllocation({
      dealer,
      productServices: dealer.productServices ?? [],
      combinedCapacity: dealer.combinedCapacity ?? {
        products: [],
        capacity: 0,
      },
      individualCapacities: dealer.individualCapacities ?? [],
    });

    return res.json({
      success: true,
      message: "Dealer suspended successfully",
      data: dealer,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
