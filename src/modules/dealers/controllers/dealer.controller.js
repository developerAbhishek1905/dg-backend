import mongoose from "mongoose";

import Dealer from "../models/dealer.model.js";
import Category from "../../category/models/category.model.js";


const parseJSON = (value, fallback = []) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);

  return Number.isNaN(parsed)
    ? fallback
    : parsed;
};

const toBoolean = (value) => {
  return value === true || value === "true";
};

const mapFile = (file) => {
  if (!file) return null;

  return {
    fileName: file.originalname,
    filePath: file.path,
    mimeType: file.mimetype,
  };
};


export const createDealer = async (req, res) => {
  try {
    const {
      headCode,
      groupHead = "",
      headName,
      grade = "",
      segment = "",

      technicianFirmName,
      technicianName,
      mobileNumber,
      alternativeNumber = "",
      email,
      technicianStatus = "ACTIVE",

      city,
      district = "",
      state,
      stateCode = "",
      pinCode,
      zone = "",

      aadhaarNumber,
      panNumber,
      drivingLicenceNumber,

      taxApply = "",
      gstNumber = "",
      tinNumber = "",
      uinNumber = "",
      gstApplicable = "",
      hsnCode = "",
      taxInputPayable = "",
      vat15Column = "",

      accountType = "STANDARD",
      otherInfo = "",
      openingBalanceType = "DR",

      productId,
      productServiceType,
    } = req.body;

    if (!headCode?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Head code is required",
      });
    }

    if (!headName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Head name is required",
      });
    }

    if (!technicianFirmName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Technician firm name is required",
      });
    }

    if (!technicianName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Technician name is required",
      });
    }

    if (!mobileNumber?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    if (!email?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product/category ID",
      });
    }

    const product = await Category.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product/category not found",
      });
    }

    const address = parseJSON(
      req.body.address,
      [],
    );

    const capacityMaster = parseJSON(
      req.body.capacityMaster,
      [],
    );

    if (!Array.isArray(address) || address.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one address is required",
      });
    }

    if (
      !Array.isArray(capacityMaster) ||
      capacityMaster.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one capacity mapping is required",
      });
    }

    for (const item of capacityMaster) {
      if (
        !mongoose.Types.ObjectId.isValid(
          item.categoryId,
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid category in capacity master",
        });
      }
    }

    const lastDealer = await Dealer.findOne()
      .sort({
        createdAt: -1,
      })
      .select("technicianCode");

    let nextNumber = 1;

    if (lastDealer?.technicianCode) {
      const match =
        lastDealer.technicianCode.match(/\d+$/);

      if (match) {
        nextNumber =
          Number(match[0]) + 1;
      }
    }

    const technicianCode = `TECH-${String(
      nextNumber,
    ).padStart(5, "0")}`;

    const aadhaarFile =
      req.files?.aadhaarFile?.[0];

    const panFile =
      req.files?.panFile?.[0];

    const drivingLicenceFile =
      req.files?.drivingLicenceFile?.[0];

    const otherDocuments =
      req.files?.documentUpload || [];

    if (!aadhaarFile) {
      return res.status(400).json({
        success: false,
        message: "Aadhaar document is required",
      });
    }

    if (!panFile) {
      return res.status(400).json({
        success: false,
        message: "PAN document is required",
      });
    }

    if (!drivingLicenceFile) {
      return res.status(400).json({
        success: false,
        message: "Driving licence document is required",
      });
    }

    const dealer = await Dealer.create({
      headCode: headCode.trim(),
      groupHead: groupHead.trim(),
      headName: headName.trim(),
      grade: grade.trim(),
      segment: segment.trim(),

      technicianCode,

      technicianFirmName:
        technicianFirmName.trim(),

      technicianName:
        technicianName.trim(),

      mobileNumber: mobileNumber.trim(),

      alternativeNumber:
        alternativeNumber.trim(),

      email: email.trim().toLowerCase(),

      technicianStatus,

      address,

      city: city?.trim() || "",
      district: district.trim(),
      state: state?.trim() || "",
      stateCode: stateCode.trim(),
      pinCode: pinCode?.trim() || "",
      zone: zone.trim(),

      aadhaarNumber:
        aadhaarNumber?.trim() || "",

      panNumber:
        panNumber?.trim().toUpperCase() || "",

      drivingLicenceNumber:
        drivingLicenceNumber?.trim() || "",

      aadhaarFile:
        mapFile(aadhaarFile),

      panFile:
        mapFile(panFile),

      drivingLicenceFile:
        mapFile(drivingLicenceFile),

      documentUpload:
        otherDocuments.map(mapFile),

      taxApply,
      gstNumber: gstNumber.trim(),
      tinNumber: tinNumber.trim(),
      uinNumber: uinNumber.trim(),
      gstApplicable,

      gstRate: toNumber(
        req.body.gstRate,
      ),

      hsnCode: hsnCode.trim(),

      reverseChargeLimit: toNumber(
        req.body.reverseChargeLimit,
      ),

      taxInputPayable,
      vat15Column: vat15Column.trim(),

      creditDays: toNumber(
        req.body.creditDays,
      ),

      creditLimit: toNumber(
        req.body.creditLimit,
      ),

      accountType,

      isDealer: toBoolean(
        req.body.isDealer,
      ),

      disableChallan: toBoolean(
        req.body.disableChallan,
      ),

      ledgerSummaryOnly: toBoolean(
        req.body.ledgerSummaryOnly,
      ),

      accountDeactivated: toBoolean(
        req.body.accountDeactivated,
      ),

      otherInfo: otherInfo.trim(),

      rating: toNumber(
        req.body.rating,
      ),

      openingBalance: toNumber(
        req.body.openingBalance,
      ),

      openingBalanceType,

      productId,

      productServiceType,

      capacityMaster: capacityMaster.map(
        (item) => ({
          categoryId: item.categoryId,
          rate: toNumber(item.rate),
          capacity: toNumber(
            item.capacity,
          ),
          serviceType:
            item.serviceType || "",
        }),
      ),
    });

    return res.status(201).json({
      success: true,
      message: "Dealer created successfully",
      data: dealer,
    });
  } catch (error) {
    console.error(
      "Create Dealer Error:",
      error,
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Duplicate dealer information found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create dealer",
    });
  }
};

export const getDealers = async (
  req,
  res,
) => {
  try {
    const {
      search = "",
      status = "",
    } = req.query;

    const filter = {};

    if (search.trim()) {
      const escapedSearch =
        search
          .trim()
          .replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
          );

      const regex =
        new RegExp(
          escapedSearch,
          "i",
        );

      filter.$or = [
        {
          technicianCode: regex,
        },
        {
          technicianFirmName: regex,
        },
        {
          technicianName: regex,
        },
        {
          mobileNumber: regex,
        },
        {
          email: regex,
        },
        {
          headCode: regex,
        },
        {
          headName: regex,
        },
        {
          city: regex,
        },
      ];
    }

    if (status) {
      if (
        ![
          "ACTIVE",
          "INACTIVE",
        ].includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid status",
        });
      }

      filter.technicianStatus =
        status;
    }

    const dealers =
      await Dealer.find(filter)
        .populate(
          "productId",
          "groupCategoryCode category categoryDescription",
        )
        .populate(
          "capacityMaster.categoryId",
          "groupCategoryCode category categoryDescription",
        )
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,
      count: dealers.length,
      data: dealers,
    });
  } catch (error) {
    console.error(
      "Get Dealers Error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch dealers",
    });
  }
};

export const getDealerById = async (
  req,
  res,
) => {
  try {
    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid dealer ID",
      });
    }

    const dealer =
      await Dealer.findById(id)
        .populate(
          "productId",
          "groupCategoryCode category categoryDescription",
        )
        .populate(
          "capacityMaster.categoryId",
          "groupCategoryCode category categoryDescription",
        );

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message:
          "Dealer not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: dealer,
    });
  } catch (error) {
    console.error(
      "Get Dealer Error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch dealer",
    });
  }
};

export const updateDealer = async (
  req,
  res,
) => {
  try {
    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid dealer ID",
      });
    }

    const dealer =
      await Dealer.findById(id);

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message:
          "Dealer not found",
      });
    }

    const fields = [
      "headCode",
      "groupHead",
      "headName",
      "grade",
      "segment",

      "technicianFirmName",
      "technicianName",
      "mobileNumber",
      "alternativeNumber",
      "email",
      "technicianStatus",

      "city",
      "district",
      "state",
      "stateCode",
      "pinCode",
      "zone",

      "aadhaarNumber",
      "panNumber",
      "drivingLicenceNumber",

      "taxApply",
      "gstNumber",
      "tinNumber",
      "uinNumber",
      "gstApplicable",
      "hsnCode",
      "taxInputPayable",
      "vat15Column",

      "accountType",
      "otherInfo",
      "openingBalanceType",

      "productId",
      "productServiceType",
    ];

    fields.forEach((field) => {
      if (
        req.body[field] !== undefined
      ) {
        dealer[field] =
          req.body[field];
      }
    });

    if (
      req.body.address !== undefined
    ) {
      dealer.address =
        parseJSON(
          req.body.address,
          dealer.address,
        );
    }

    if (
      req.body.capacityMaster !==
      undefined
    ) {
      dealer.capacityMaster =
        parseJSON(
          req.body.capacityMaster,
          dealer.capacityMaster,
        ).map((item) => ({
          categoryId:
            item.categoryId,
          rate:
            toNumber(item.rate),
          capacity:
            toNumber(
              item.capacity,
            ),
          serviceType:
            item.serviceType || "",
        }));
    }

    const numericFields = [
      "gstRate",
      "reverseChargeLimit",
      "creditDays",
      "creditLimit",
      "rating",
      "openingBalance",
    ];

    numericFields.forEach(
      (field) => {
        if (
          req.body[field] !==
          undefined
        ) {
          dealer[field] =
            toNumber(
              req.body[field],
            );
        }
      },
    );

    const booleanFields = [
      "isDealer",
      "disableChallan",
      "ledgerSummaryOnly",
      "accountDeactivated",
    ];

    booleanFields.forEach(
      (field) => {
        if (
          req.body[field] !==
          undefined
        ) {
          dealer[field] =
            toBoolean(
              req.body[field],
            );
        }
      },
    );

    if (
      req.files?.aadhaarFile?.[0]
    ) {
      dealer.aadhaarFile =
        mapFile(
          req.files
            .aadhaarFile[0],
        );
    }

    if (
      req.files?.panFile?.[0]
    ) {
      dealer.panFile =
        mapFile(
          req.files.panFile[0],
        );
    }

    if (
      req.files
        ?.drivingLicenceFile?.[0]
    ) {
      dealer.drivingLicenceFile =
        mapFile(
          req.files
            .drivingLicenceFile[0],
        );
    }

    if (
      req.files?.documentUpload
        ?.length
    ) {
      dealer.documentUpload = [
        ...dealer.documentUpload,
        ...req.files.documentUpload.map(
          mapFile,
        ),
      ];
    }

    await dealer.save();

    return res.status(200).json({
      success: true,
      message:
        "Dealer updated successfully",
      data: dealer,
    });
  } catch (error) {
    console.error(
      "Update Dealer Error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update dealer",
    });
  }
};

export const deleteDealer = async (
  req,
  res,
) => {
  try {
    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid dealer ID",
      });
    }

    const dealer =
      await Dealer.findById(id);

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message:
          "Dealer not found",
      });
    }

    await dealer.deleteOne();

    return res.status(200).json({
      success: true,
      message:
        "Dealer deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Dealer Error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete dealer",
    });
  }
};