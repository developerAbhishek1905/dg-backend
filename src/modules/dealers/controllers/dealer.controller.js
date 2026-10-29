import BillingComplaint from "../../Complaint/models/complaint.model.js";
import { parseDealerBilling } from "../helpers/dealerBilling.js";
import Dealer from "../models/dealer.model.js";
import User from "../../users/models/user.model.js";
import Role from "../../accessControl/models/role.model.js";
import Allocation from "../../allocation/model/allocation.model.js";
import { syncDealerAllocation } from "../../allocation/services/allocateDealer.service.js";
import DealerLedger from "../../dealerLedger/model/dealerLedger.model.js";
import { getLeaveStatus } from "../helpers/dealerLeave.utils.js";
import DealerLifecycleLog from "../models/dealerLifecycleLog.model.js";
import SecurityRefund from "../models/securityRefund.model.js";
import mongoose from "mongoose";

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

// Parse + validate the "other cities" a dealer operates in.
// Returns { additionalCities } or { error }.
const parseAdditionalCities = (raw, primaryCityId) => {
  const list = parseJSON(raw, []);

  if (!Array.isArray(list)) return { additionalCities: [] };

  const seen = new Set([Number(primaryCityId)]);
  const additionalCities = [];

  for (const item of list) {
    const cityId = Number(item?.cityId);

    if (!cityId) {
      return { error: "Every additional city must have a city selected" };
    }

    if (seen.has(cityId)) {
      return {
        error: `City ${item.city || cityId} is added more than once`,
      };
    }

    seen.add(cityId);

    additionalCities.push({
      cityId,
      city: item.city ?? "",
      productServices: Array.isArray(item.productServices)
        ? item.productServices
        : [],
      combinedCapacity: {
        products: item.combinedCapacity?.products ?? [],
        capacity: parseNumber(item.combinedCapacity?.capacity),
      },
      individualCapacities: Array.isArray(item.individualCapacities)
        ? item.individualCapacities
        : [],
    });
  }

  return { additionalCities };
};

// The same mobile / alternative number may be registered for dealers in
// DIFFERENT cities. It conflicts only with a dealer that already works in
// one of the given cities (primary or additional).
const findPhoneConflict = async (numbers, excludeId, cityIds = []) => {
  const list = [...new Set(numbers.map((n) => n?.trim()).filter(Boolean))];

  if (list.length === 0) return null;

  const cities = [
    ...new Set(
      cityIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id)),
    ),
  ];

  const filter = {
    $and: [
      {
        $or: [
          { mobileNumber: { $in: list } },
          { alternativeNumber: { $in: list } },
        ],
      },
      ...(cities.length > 0
        ? [
            {
              $or: [
                { "businessAddress.cityId": { $in: cities } },
                { "residentialAddress.cityId": { $in: cities } },
                { "additionalCities.cityId": { $in: cities } },
              ],
            },
          ]
        : []),
    ],
  };

  if (excludeId) filter._id = { $ne: excludeId };

  return Dealer.findOne(filter).select("_id mobileNumber alternativeNumber");
};

// Capacity rules for ONE city's services + capacity
const buildCityCapacityRules = ({
  productServices = [],
  combinedCapacity,
  individualCapacities,
}) => {
  const capacityRules = [];

  const servicesOf = (serviceProduct) =>
    serviceProduct?.categories?.map((category) => ({
      categoryId: category.categoryId,

      category: category.categoryName ?? category.category ?? "",

      description: category.description ?? "",

      categoryDescription: category.categoryDescription ?? "",
    })) ?? [];

  /* COMBINED CAPACITY */

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

          services: servicesOf(serviceProduct),

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

  /* INDIVIDUAL CAPACITY */

  for (const individual of individualCapacities ?? []) {
    const productId = Number(individual.productId ?? individual.product_id);

    const individualDailyCapacity = Number(
      individual.capacity ?? individual.dailyCapacity ?? 0,
    );

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

      // Individual capacity is stored at product level.
      dailyCapacity: 0,

      products: [
        {
          productId,

          productName:
            individual.productName ?? serviceProduct?.productName ?? "",

          dailyCapacity: individualDailyCapacity,

          services: servicesOf(serviceProduct),
        },
      ],

      status: "ACTIVE",
    });
  }

  return capacityRules;
};

// One allocation rule per city the dealer operates in (primary first)
export const buildAllocationRules = ({
  dealer,
  productServices,
  combinedCapacity,
  individualCapacities,
}) => {
  const primaryCityId =
    dealer.businessAddress?.cityId ?? dealer.residentialAddress?.cityId ?? null;

  const primaryCityName =
    dealer.businessAddress?.city ?? dealer.residentialAddress?.city ?? "";

  const rules = [
    {
      cityId: primaryCityId,
      cityName: primaryCityName,
      capacityRules: buildCityCapacityRules({
        productServices: productServices ?? [],
        combinedCapacity,
        individualCapacities,
      }),
    },
  ];

  const seen = new Set([Number(primaryCityId)]);

  for (const extra of dealer.additionalCities ?? []) {
    const extraCityId = Number(extra.cityId);

    if (!extraCityId || seen.has(extraCityId)) continue;

    seen.add(extraCityId);

    rules.push({
      cityId: extraCityId,
      cityName: extra.city ?? "",
      capacityRules: buildCityCapacityRules({
        productServices: extra.productServices ?? [],
        combinedCapacity: extra.combinedCapacity,
        individualCapacities: extra.individualCapacities ?? [],
      }),
    });
  }

  return rules;
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

    // if (!email) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Email is required",
    //   });
    // }

    /* ===============================
       CHECK DEALER DUPLICATES
    =============================== */

    const existingMobile = await Dealer.findOne({
      mobileNumber,
    });

    // if (existingMobile) {
    //   return res.status(409).json({
    //     success: false,
    //     message: "Dealer with this mobile number already exists",
    //   });
    // }

    const existingDealerEmail = await Dealer.findOne({
      email: email.toLowerCase(),
    });

    // if (existingDealerEmail) {
    //   return res.status(409).json({
    //     success: false,
    //     message: "Dealer with this email already exists",
    //   });
    // }

    /* ===============================
       CHECK USER DUPLICATE
    =============================== */

    // const existingUser = await User.findOne({
    //   email: email.toLowerCase(),
    // });

    // if (existingUser) {
    //   return res.status(409).json({
    //     success: false,
    //     message: "User with this email already exists",
    //   });
    // }
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
    const additionalInfo = parseJSON(req.body.additionalInfo, []);

    /* =====================================================
   CHECK MOBILE / ALTERNATIVE NUMBER IN SAME CITY
===================================================== */

    const cityId = businessAddress?.cityId;

    if (!cityId) {
      return res.status(400).json({
        success: false,
        message: "Business city is required",
      });
    }

    const normalizedMobile = mobileNumber?.trim();
    const normalizedAlternative = alternativeNumber?.trim();

    if (
      normalizedAlternative &&
      normalizedAlternative === normalizedMobile
    ) {
      return res.status(400).json({
        success: false,
        message: "Alternative number must be different from the mobile number",
      });
    }

    // Cities this dealer will work in (primary + additional)
    const dealerCityIds = [
      cityId,
      ...(parseJSON(req.body.additionalCities, []) || []).map(
        (item) => item?.cityId,
      ),
    ];

    const phoneConflict = await findPhoneConflict(
      [normalizedMobile, normalizedAlternative],
      undefined,
      dealerCityIds,
    );

    if (phoneConflict) {
      return res.status(409).json({
        success: false,
        message:
          "This mobile/alternative number is already registered with another dealer in the same city. The same number can be used for dealers in different cities.",
      });
    }

    const { additionalCities, error: additionalCitiesError } =
      parseAdditionalCities(req.body.additionalCities, cityId);

    if (additionalCitiesError) {
      return res.status(400).json({
        success: false,
        message: additionalCitiesError,
      });
    }

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
      additionalCities,
      documents,
      technicianStatus: finalStatus === "ACTIVE" ? "ACTIVE" : "INACTIVE",
      securityAmount: parseNumber(req.body.securityAmount),

      additionalInfo,
      status: finalStatus,

      dateOfJoining: joiningDate,
      dateOfLeaving: leavingDate,
      // status: technicianStatus || "ACTIVE",
      // dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : new Date(),

      // dateOfLeaving: dateOfLeaving ? new Date(dateOfLeaving) : null,
    });

    await DealerLifecycleLog.create({
      dealerId: dealer._id,
      type: "JOINED",
      date: joiningDate,
      createdBy: req.user?._id || req.user?.id || null,
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

      email: headCode,

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

      creditLimit: dealer.creditLimit ?? 0,

      average_amount: 0,

      from,

      to,

      performanceSnapshot: {
        totalAmount: 0,
        average_amount: 0,
        rating: 0,
        totalAllocated: 0,
        totalCompleted: 0,
        performanceScore: 0,
      },

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

export const getDealers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      cityId = "",
      categoryId = "",
      productId = "",
    } = req.query;

    const currentPage = Math.max(Number(page) || 1, 1);
    const pageLimit = Math.max(Number(limit) || 10, 1);

    const filter = {};

    /*
    |--------------------------------------------------------------------------
    | Status Filter
    |--------------------------------------------------------------------------
    */

    if (status && status !== "ALL") {
      filter.status = status.toUpperCase();
    }

    /*
    |--------------------------------------------------------------------------
    | Search
    |--------------------------------------------------------------------------
    |
    | Search in:
    | - headCode
    | - technicianFirmName
    | - technicianName
    | - mobileNumber
    | - alternativeNumber
    |
    */

    if (search?.trim()) {
      const escapedSearch = search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const regex = new RegExp(escapedSearch, "i");

      filter.$or = [
        { headCode: regex },
        { technicianFirmName: regex },
        { technicianName: regex },
        { mobileNumber: regex },
        { alternativeNumber: regex },
      ];
    }

    /*
    |--------------------------------------------------------------------------
    | City Filter
    |--------------------------------------------------------------------------
    |
    | Stored as Number:
    |
    | businessAddress.cityId: 5351
    |
    */

    if (cityId) {
      const parsedCityId = Number(cityId);

      if (!Number.isNaN(parsedCityId)) {
        // primary city OR any additional operating city
        filter.$and = [
          ...(filter.$and ?? []),
          {
            $or: [
              { "businessAddress.cityId": parsedCityId },
              { "additionalCities.cityId": parsedCityId },
            ],
          },
        ];
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Product + Category Filters
    |--------------------------------------------------------------------------
    */

    if (productId && categoryId) {
      const parsedProductId = Number(productId);

      if (!Number.isNaN(parsedProductId)) {
        filter.productServices = {
          $elemMatch: {
            productId: parsedProductId,

            categories: {
              $elemMatch: {
                categoryId: categoryId,
              },
            },
          },
        };
      }
    } else if (productId) {
      const parsedProductId = Number(productId);

      if (!Number.isNaN(parsedProductId)) {
        filter["productServices.productId"] = parsedProductId;
      }
    } else if (categoryId) {
      filter["productServices.categories.categoryId"] = categoryId;
    }

    /*
    |--------------------------------------------------------------------------
    | Count
    |--------------------------------------------------------------------------
    */

    const total = await Dealer.countDocuments(filter);

    /*
    |--------------------------------------------------------------------------
    | Get Dealers
    |--------------------------------------------------------------------------
    */

    const dealers = await Dealer.find(filter)
      .sort({
        createdAt: -1,
      })
      .skip((currentPage - 1) * pageLimit)
      .limit(pageLimit)
      .lean();

    /*
    |--------------------------------------------------------------------------
    | Calculate Leave Status
    |--------------------------------------------------------------------------
    */

    const normalizedDealers = dealers.map((dealer) => {
      const leaves = (dealer.leaves ?? []).map((leave) => ({
        ...leave,
        status: getLeaveStatus(leave),
      }));

      const isOnLeave = leaves.some((leave) => leave.status === "ACTIVE");

      return {
        ...dealer,
        leaves,
        isOnLeave,
        effectiveStatus: isOnLeave ? "LEAVE" : dealer.status,
      };
    });

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,

      data: normalizedDealers,

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

export const getDealerById = async (req, res) => {
  try {
    const dealer = await Dealer.findById(req.params.id).lean();

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer not found",
      });
    }

    const leaves = (dealer.leaves ?? []).map((leave) => ({
      ...leave,

      // Calculate current status
      status: getLeaveStatus(leave),
    }));

    const onLeave = leaves.some((leave) => leave.status === "ACTIVE");

    return res.status(200).json({
      success: true,

      data: {
        ...dealer,

        leaves,

        // Useful for frontend
        isOnLeave: onLeave,

        // Optional display status
        effectiveStatus: onLeave ? "LEAVE" : dealer.status,
      },
    });
  } catch (error) {
    console.error("Get Dealer By ID Error:", error);

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
       DUPLICATE MOBILE (unique across all dealers)
    =============================== */

    {
      const newMobile = req.body.mobileNumber?.trim();
      const newAlternative = req.body.alternativeNumber?.trim();

      const changed = [];

      if (newMobile && newMobile !== dealer.mobileNumber) {
        changed.push(newMobile);
      }

      if (newAlternative && newAlternative !== dealer.alternativeNumber) {
        changed.push(newAlternative);
      }

      if (newMobile && newAlternative && newMobile === newAlternative) {
        return res.status(400).json({
          success: false,
          message:
            "Alternative number must be different from the mobile number",
        });
      }

      const citiesChanged =
        req.body.businessAddress !== undefined ||
        req.body.additionalCities !== undefined;

      // Check whenever a number OR a city changes, against the final values
      if (changed.length > 0 || citiesChanged) {
        const bodyAdditional = req.body.additionalCities
          ? parseJSON(req.body.additionalCities, []) || []
          : dealer.additionalCities ?? [];
        const bodyBusiness = req.body.businessAddress
          ? parseJSON(req.body.businessAddress, {})
          : dealer.businessAddress;

        const finalNumbers = [
          newMobile || dealer.mobileNumber,
          newAlternative !== undefined
            ? newAlternative
            : dealer.alternativeNumber,
        ];

        const conflict = await findPhoneConflict(finalNumbers, dealer._id, [
          bodyBusiness?.cityId,
          ...bodyAdditional.map((item) => item?.cityId),
        ]);

        if (conflict) {
          return res.status(409).json({
            success: false,
            message:
              "This mobile/alternative number is already registered with another dealer in the same city.",
          });
        }
      }
    }

    // if (req.body.mobileNumber) {
    //   const existingMobile = await Dealer.findOne({
    //     mobileNumber: req.body.mobileNumber,

    //     _id: {
    //       $ne: req.params.id,
    //     },
    //   });

    //   if (existingMobile) {
    //     return res.status(409).json({
    //       success: false,
    //       message: "Dealer with this mobile number already exists",
    //     });
    //   }
    // }

    /* ===============================
       DUPLICATE EMAIL
    =============================== */

    // if (req.body.email) {
    //   const existingEmail = await Dealer.findOne({
    //     email: req.body.email.toLowerCase(),

    //     _id: {
    //       $ne: req.params.id,
    //     },
    //   });

    //   if (existingEmail) {
    //     return res.status(409).json({
    //       success: false,
    //       message: "Dealer with this token",
    //     });
    //   }
    // }

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

    // Unique + sparse fields must be removed when empty. Saving "" makes
    // every dealer without a value collide on the unique index.
    const uniqueOptionalFields = ["technicianCode"];

    stringFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        const value = req.body[field];

        if (
          uniqueOptionalFields.includes(field) &&
          (value === null || String(value).trim() === "")
        ) {
          dealer[field] = undefined;
          return;
        }

        dealer[field] = value;
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
      "securityAmount",
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

    if (req.body.additionalCities !== undefined) {
      const primaryCityId =
        dealer.businessAddress?.cityId ?? dealer.residentialAddress?.cityId;

      const { additionalCities, error } = parseAdditionalCities(
        req.body.additionalCities,
        primaryCityId,
      );

      if (error) {
        return res.status(400).json({ success: false, message: error });
      }

      dealer.additionalCities = additionalCities;
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

    if (req.body.additionalInfo !== undefined) {
      dealer.additionalInfo = parseJSON(req.body.additionalInfo, [])
        .filter((item) => item?.value?.trim())
        .map((item) => ({
          value: item.value.trim(),
        }));
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

      // if (hasAlreadyLeft && requestedStatus === "ACTIVE") {
      //   return res.status(400).json({
      //     success: false,
      //     message:
      //       "Dealer has already left. Use the rejoin action to activate this dealer.",
      //   });
      // }

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

    // if (req.body.dateOfJoining !== undefined) {
    //   // if (!req.body.dateOfJoining) {
    //   //   return res.status(400).json({
    //   //     success: false,
    //   //     message: "Date of joining is required",
    //   //   });
    //   // }

    //   // const joiningDate = new Date(req.body.dateOfJoining);

    //   // if (Number.isNaN(joiningDate.getTime())) {
    //   //   return res.status(400).json({
    //   //     success: false,
    //   //     message: "Invalid date of joining",
    //   //   });
    //   // }

    //   dealer.dateOfJoining = joiningDate || now;
    // }

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
        const previousLeavingDate = dealer.dateOfLeaving;
        dealer.dateOfLeaving = leavingDate;

        if (leavingDate <= now) {
          dealer.status = "INACTIVE";
          dealer.technicianStatus = "INACTIVE";
        }

        const leavingDateChanged =
          !previousLeavingDate ||
          new Date(previousLeavingDate).getTime() !== leavingDate.getTime();

        if (leavingDateChanged) {
          await DealerLifecycleLog.create({
            dealerId: dealer._id,
            type: "LEFT",
            date: leavingDate,
            createdBy: req.user?._id || req.user?.id || null,
          });
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

    await User.updateMany(
      {
        dealerId: dealer._id,
      },
      {
        $inc: {
          tokenVersion: 1,
        },
      },
    );

    /* ===============================
   SYNC CURRENT ALLOCATION
================================ */

    let allocation = null;

const allocationRelatedChanged =
  req.body.productServices !== undefined ||
  req.body.combinedCapacity !== undefined ||
  req.body.individualCapacities !== undefined ||
  req.body.additionalCities !== undefined ||
  req.body.businessAddress !== undefined ||
  req.body.technicianStatus !== undefined ||
  req.body.technicianCode !== undefined ||
  req.body.technicianFirmName !== undefined ||
  req.body.technicianName !== undefined ||
  req.body.dateOfJoining !== undefined ||
  req.body.dateOfLeaving !== undefined ||
  req.body.creditLimit !== undefined;

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

    if (req.body.creditLimit !== undefined) {
  const now = new Date();

  await Allocation.updateOne(
    {
      dealerId: dealer._id,
      allocationMonth: now.getMonth() + 1,
      allocationYear: now.getFullYear(),
    },
    {
      $set: {
        creditLimit: dealer.creditLimit ?? 0,
      },
    },
  );
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

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave dates",
      });
    }

    if (toDate < fromDate) {
      return res.status(400).json({
        success: false,
        message: "Leave end date cannot be before start date",
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
        message: "Suspended dealer cannot register leave",
      });
    }

    // -------------------------------------
    // Check overlapping leave
    // -------------------------------------

    // const hasOverlap = (dealer.leaves ?? []).some((leave) => {
    //   if (leave.status === "CANCELLED") {
    //     return false;
    //   }

    //   const existingFrom = new Date(leave.from);
    //   const existingTo = new Date(leave.to);

    //   return fromDate <= existingTo && toDate >= existingFrom;
    // });

    const hasOverlap = (dealer.leaves ?? []).some((leave) => {
      /*
  |--------------------------------------------------------------------------
  | Completed / Cancelled leave should not block new leave
  |--------------------------------------------------------------------------
  */

      if (leave.status === "CANCELLED" || leave.status === "COMPLETED") {
        return false;
      }

      const existingFrom = new Date(leave.from);
      const existingTo = new Date(leave.to);

      if (
        Number.isNaN(existingFrom.getTime()) ||
        Number.isNaN(existingTo.getTime())
      ) {
        return false;
      }

      return fromDate <= existingTo && toDate >= existingFrom;
    });

    if (hasOverlap) {
      return res.status(400).json({
        success: false,
        message: "Dealer already has leave during this period",
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
          ...dealer.leaves[dealer.leaves.length - 1].toObject(),
          status: getLeaveStatus(dealer.leaves[dealer.leaves.length - 1]),
        },
      },
    });
  } catch (error) {
    console.error("Register Dealer Leave Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to register dealer leave",
    });
  }
};

export const endDealerLeave = async (req, res) => {
  try {
    const dealer = await Dealer.findById(req.params.id);

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer not found",
      });
    }

    const now = new Date();

    /*
    |--------------------------------------------------------------------------
    | Find ACTIVE leave
    |--------------------------------------------------------------------------
    */

    const activeLeave = dealer.leaves.find(
      (leave) => leave.status === "ACTIVE",
    );

    if (!activeLeave) {
      return res.status(400).json({
        success: false,
        message: "No active leave found for this dealer",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | End leave immediately
    |--------------------------------------------------------------------------
    */

    activeLeave.to = now;
    activeLeave.status = "COMPLETED";

    /*
    |--------------------------------------------------------------------------
    | Make dealer active
    |--------------------------------------------------------------------------
    */

    dealer.status = "ACTIVE";

    /*
    |--------------------------------------------------------------------------
    | Close LEAVE status history if available
    |--------------------------------------------------------------------------
    */

    const activeLeaveHistory = [...(dealer.statusHistory || [])]
      .reverse()
      .find((history) => history.status === "LEAVE" && !history.to);

    if (activeLeaveHistory) {
      activeLeaveHistory.to = now;
    }

    /*
    |--------------------------------------------------------------------------
    | Add ACTIVE history
    |--------------------------------------------------------------------------
    */

    dealer.statusHistory.push({
      status: "ACTIVE",
      from: now,
      to: null,
      reason: "",
      remarks: "Dealer leave ended manually",
    });

    await dealer.save();

    return res.status(200).json({
      success: true,
      message: "Dealer leave ended successfully",
      data: {
        dealerId: dealer._id,
        dealerStatus: dealer.status,
        leave: activeLeave,
      },
    });
  } catch (error) {
    console.error("End Dealer Leave Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to end dealer leave",
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

    // if (dealer.dateOfLeaving && date <= new Date(dealer.dateOfLeaving)) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Rejoining date must be after date of leaving",
    //   });
    // }

    dealer.rejoiningDates ??= [];

    dealer.rejoiningDates.push(date);

    if (date <= new Date()) {
      dealer.status = "ACTIVE";
      dealer.technicianStatus = "ACTIVE";

      // Keep old leaving date for history.
      // Do NOT clear dateOfLeaving.
    }

    await dealer.save();

    await DealerLifecycleLog.create({
      dealerId: dealer._id,
      type: "REJOINED",
      date,
      createdBy: req.user?._id || req.user?.id || null,
    });

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

    await DealerLifecycleLog.create({
      dealerId: dealer._id,
      type: "SUSPENDED",
      date: dealer.suspendedAt,
      reason: reason || "",
      createdBy: req.user?._id || req.user?.id || null,
    });

    await User.updateMany(
      {
        dealerId: dealer._id,
      },
      {
        $inc: {
          tokenVersion: 1,
        },
      },
    );

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

export const getDealerDropdown = async (req, res) => {
  try {
    const { search = "", cityId, limit = 50 } = req.query;

    const filter = {
      status: "ACTIVE",
    };

    /*
    |--------------------------------------------------------------------------
    | City Filter
    |--------------------------------------------------------------------------
    */

    if (cityId) {
      const numericCityId = Number(cityId);

      if (!Number.isNaN(numericCityId)) {
        filter.$and = [
          ...(filter.$and ?? []),
          {
            $or: [
              { "businessAddress.cityId": numericCityId },
              { "additionalCities.cityId": numericCityId },
            ],
          },
        ];
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Search
    |--------------------------------------------------------------------------
    */

    if (search?.trim()) {
      const escapedSearch = search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const regex = new RegExp(escapedSearch, "i");

      filter.$or = [
        { dealerCode: regex },
        { technicianCode: regex },
        { technicianName: regex },
        { technicianFirmName: regex },
        { mobileNumber: regex },
        { "businessAddress.city": regex },
      ];
    }

    /*
    |--------------------------------------------------------------------------
    | Get Dealers
    |--------------------------------------------------------------------------
    */

    const dealers = await Dealer.find(filter)
      .select(
        "_id dealerCode technicianCode technicianName technicianFirmName mobileNumber businessAddress status",
      )
      .sort({
        technicianFirmName: 1,
      })
      .limit(Math.min(Number(limit) || 50, 100))
      .lean();

    /*
    |--------------------------------------------------------------------------
    | Dropdown Response
    |--------------------------------------------------------------------------
    */

    const data = dealers.map((dealer) => ({
      value: dealer._id,

      label: `${dealer.technicianFirmName} - ${dealer.technicianName}`,

      dealerCode: dealer.dealerCode || "",

      technicianCode: dealer.technicianCode || "",

      technicianName: dealer.technicianName || "",

      technicianFirmName: dealer.technicianFirmName || "",

      mobileNumber: dealer.mobileNumber || "",

      cityId: dealer.businessAddress?.cityId ?? null,

      city: dealer.businessAddress?.city || "",
    }));

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get dealer dropdown error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dealer dropdown",
      error: error.message,
    });
  }
};

export const getDealerLifecycleLogs = async (req, res) => {
  try {
    const logs = await DealerLifecycleLog.find({
      dealerId: req.params.id,
    })
      .populate("createdBy", "name email")
      .sort({
        date: -1,
        createdAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Calculate eligible refund date
|--------------------------------------------------------------------------
*/

const getEligibleRefundDate = (leavingDate) => {
  const date = new Date(leavingDate);

  // Add 3 calendar months, clamp month-end dates.
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 3;
  const day = date.getUTCDate();

  const targetMonth = new Date(Date.UTC(year, month, 1));

  const lastDay = new Date(
    Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0),
  ).getUTCDate();

  targetMonth.setUTCDate(Math.min(day, lastDay));

  targetMonth.setUTCHours(
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  );

  return targetMonth;
};

/*
|--------------------------------------------------------------------------
| Refund Dealer Security Amount
|--------------------------------------------------------------------------
*/

export const refundDealerSecurity = async (req, res) => {
  const { dealerId } = req.params;

  const { paymentMode, transactionReference = "", remark = "" } = req.body;

  if (!mongoose.Types.ObjectId.isValid(dealerId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid dealer ID",
    });
  }

  const validModes = ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE"];

  if (!validModes.includes(paymentMode)) {
    return res.status(400).json({
      success: false,
      message: "Valid payment mode is required",
    });
  }

  if (!req.user?._id) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const session = await mongoose.startSession();

  try {
    let refundRecord;

    await session.withTransaction(async () => {
      const dealer = await Dealer.findById(dealerId).session(session);

      if (!dealer) {
        const error = new Error("Dealer not found");
        error.statusCode = 404;
        throw error;
      }

      /*
      |--------------------------------------------------------------------------
      | Validate latest leaving date
      |--------------------------------------------------------------------------
      */

      if (!dealer.dateOfLeaving) {
        const error = new Error(
          "Dealer has no leaving date. Security refund is not allowed.",
        );
        error.statusCode = 400;
        throw error;
      }

      const leavingDate = new Date(dealer.dateOfLeaving);

      const now = new Date();

      if (Number.isNaN(leavingDate.getTime()) || leavingDate > now) {
        const error = new Error(
          "Dealer leaving date is invalid or in the future.",
        );
        error.statusCode = 400;
        throw error;
      }

      /*
      |--------------------------------------------------------------------------
      | Dealer must not have rejoined after leaving
      |--------------------------------------------------------------------------
      */

      const hasRejoinedAfterLeaving =
        (dealer.lastRejoiningDate &&
          new Date(dealer.lastRejoiningDate) > leavingDate) ||
        dealer.rejoiningDates?.some((date) => new Date(date) > leavingDate);

      if (hasRejoinedAfterLeaving) {
        const error = new Error(
          "Dealer has rejoined after the latest leaving date. Refund is not allowed.",
        );
        error.statusCode = 400;
        throw error;
      }

      // Do not refund a currently active dealer.
      if (dealer.status === "ACTIVE") {
        const error = new Error("Active dealer security cannot be refunded.");
        error.statusCode = 400;
        throw error;
      }

      /*
      |--------------------------------------------------------------------------
      | Check 3-month eligibility
      |--------------------------------------------------------------------------
      */

      const eligibleRefundDate = getEligibleRefundDate(leavingDate);

      if (now < eligibleRefundDate) {
        const error = new Error(
          "Security amount can only be refunded after 3 months from the latest leaving date.",
        );

        error.statusCode = 400;
        error.eligibleRefundDate = eligibleRefundDate;

        throw error;
      }

      /*
      |--------------------------------------------------------------------------
      | Validate security amount
      |--------------------------------------------------------------------------
      */

      const refundAmount = Number(dealer.securityAmount ?? 0);

      if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
        const error = new Error("No refundable security amount available.");
        error.statusCode = 400;
        throw error;
      }

      /*
      |--------------------------------------------------------------------------
      | Update security amount
      |--------------------------------------------------------------------------
      */

      dealer.securityAmount = 0;

      await dealer.save({ session });

      /*
      |--------------------------------------------------------------------------
      | Create refund log
      |--------------------------------------------------------------------------
      */

      const [createdRefund] = await SecurityRefund.create(
        [
          {
            dealerId: dealer._id,

            refundAmount,

            securityAmountBefore: refundAmount,
            securityAmountAfter: 0,

            dateOfLeaving: leavingDate,
            eligibleRefundDate,

            refundDate: now,

            paymentMode,

            transactionReference: String(transactionReference).trim(),

            remark: String(remark).trim(),

            refundedBy: req.user._id,
          },
        ],
        { session },
      );

      refundRecord = createdRefund;
    });

    return res.status(200).json({
      success: true,
      message: "Security amount refunded successfully",
      data: refundRecord,
    });
  } catch (error) {
    console.error("Security refund error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to refund security amount",
      ...(error.eligibleRefundDate && {
        eligibleRefundDate: error.eligibleRefundDate,
      }),
    });
  } finally {
    await session.endSession();
  }
};

export const getDealerSecurityRefunds = async (req, res) => {
  try {
    const { dealerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(dealerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid dealer ID",
      });
    }

    const refunds = await SecurityRefund.find({
      dealerId,
    })
      .populate("refundedBy", "name email")
      .sort({ refundDate: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Security refund history fetched",
      data: refunds,
    });
  } catch (error) {
    console.error("Refund history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch refund history",
    });
  }
};

export const getRefundsByDealer = async (req, res) => {
  try {
    const { dealerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(dealerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid dealer ID",
      });
    }

    const dealer = await Dealer.findById(dealerId)
      .select(
        "headCode technicianFirmName securityAmount dateOfLeaving lastRejoiningDate rejoiningDates status",
      )
      .lean();

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer not found",
      });
    }

    const refunds = await SecurityRefund.find({
      dealerId,
    })
      .populate("refundedBy", "name email")
      .sort({ refundDate: -1, createdAt: -1 })
      .lean();

    const now = new Date();
    const leavingDate = dealer.dateOfLeaving
      ? new Date(dealer.dateOfLeaving)
      : null;

    const eligibleRefundDate = leavingDate
      ? getEligibleRefundDate(leavingDate)
      : null;

    const rejoinedAfterLeaving =
      Boolean(
        leavingDate &&
        dealer.lastRejoiningDate &&
        new Date(dealer.lastRejoiningDate) > leavingDate,
      ) ||
      Boolean(
        leavingDate &&
        dealer.rejoiningDates?.some((date) => new Date(date) > leavingDate),
      );

    const securityAmount = Number(dealer.securityAmount ?? 0);

    let reason = "";

    if (!leavingDate) {
      reason = "Dealer leaving date is not available.";
    } else if (dealer.status === "ACTIVE" || rejoinedAfterLeaving) {
      reason = "Dealer is active or has rejoined after leaving.";
    } else if (now < eligibleRefundDate) {
      reason = "Three months have not completed since leaving.";
    } else if (securityAmount <= 0) {
      reason = "No refundable security amount available.";
    }

    const canRefund = reason === "";

    return res.status(200).json({
      success: true,
      message: "Dealer security refunds fetched successfully",
      data: {
        dealerId: dealer._id,
        securityAmount,
        dateOfLeaving: leavingDate,
        eligibleRefundDate,
        canRefund,
        reason,
        refunds,
      },
    });
  } catch (error) {
    console.error("Get dealer refunds error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dealer refunds",
    });
  }
};
