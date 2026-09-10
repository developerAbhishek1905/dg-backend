import mongoose from "mongoose";
import XLSX from "xlsx";


import ProductType from "../model/productType.model.js";
import Product from "../../product/models/product.model.js";

// ======================================================
// CREATE PRODUCT TYPE
// ======================================================

export const createProductType = async (req, res) => {
  try {
    const { product_id, product_code, product_type } = req.body;

    const productId = Number(product_id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid product_id is required",
      });
    }

    // if (!String(product_code || "").trim()) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Product code is required",
    //   });
    // }

    if (!String(product_type || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Product type is required",
      });
    }

    // ==========================================
    // CHECK PRODUCT EXISTS
    // ==========================================

    const product = await Product.findOne({
      product_id: productId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found for product_id ${productId}`,
      });
    }

    // const productCode = String(product_code).trim().toUpperCase();

    const productTypeName = String(product_type).trim();

    // ==========================================
    // DUPLICATE PRODUCT CODE
    // ==========================================

    // const duplicateCode = await ProductType.findOne({
    //   product_id: productId,
    //   product_code: {
    //     $regex: `^${escapeRegex(productCode)}$`,
    //     $options: "i",
    //   },
    // });

    // if (duplicateCode) {
    //   return res.status(409).json({
    //     success: false,
    //     message: "Product code already exists for this product",
    //   });
    // }

    // ==========================================
    // DUPLICATE PRODUCT TYPE
    // ==========================================

    const duplicateType = await ProductType.findOne({
      product_id: productId,
      product_type: {
        $regex: `^${escapeRegex(productTypeName)}$`,
        $options: "i",
      },
    });

    if (duplicateType) {
      return res.status(409).json({
        success: false,
        message: "Product type already exists for this product",
      });
    }

    // ==========================================
    // CREATE
    // ==========================================

    const productType = await ProductType.create({
      product_id: productId,
    //   product_code: productCode,
      product_type: productTypeName,
    });

    return res.status(201).json({
      success: true,
      message: "Product type created successfully",

      data: {
        ...productType.toObject(),
        product_name: product.product_name,
      },
    });
  } catch (error) {
    console.error("Create product type error:", error);

    // if (error.code === 11000) {
    //   return res.status(409).json({
    //     success: false,
    //     message: "Product code or product type already exists",
    //   });
    // }

    return res.status(500).json({
      success: false,
      message: "Failed to create product type",
      error: error.message,
    });
  }
};

// ======================================================
// GET ALL PRODUCT TYPES
// ======================================================

export const getAllProductTypes = async (req, res) => {
  try {
    const { search = "", product_id, page = 1, limit = 20 } = req.query;

    const pageNumber = Math.max(Number(page) || 1, 1);

    const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const filter = {};

    // ==========================================
    // PRODUCT FILTER
    // ==========================================

    if (product_id) {
      const productId = Number(product_id);

      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid product_id",
        });
      }

      filter.product_id = productId;
    }

    // ==========================================
    // SEARCH
    // ==========================================

    if (String(search).trim()) {
      const regex = {
        $regex: escapeRegex(String(search).trim()),
        $options: "i",
      };

      filter.$or = [
        {
          product_code: regex,
        },
        {
          product_type: regex,
        },
      ];
    }

    // ==========================================
    // GET DATA
    // ==========================================

    const total = await ProductType.countDocuments(filter);

    const productTypes = await ProductType.find(filter)
      .sort({
        product_type: 1,
      })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .lean();

    // ==========================================
    // GET PRODUCT NAMES
    // ==========================================

    const productIds = [
      ...new Set(productTypes.map((item) => item.product_id)),
    ];

    const products = await Product.find({
      product_id: {
        $in: productIds,
      },
    })
      .select("product_id product_name")
      .lean();

    const productMap = new Map(
      products.map((product) => [product.product_id, product.product_name]),
    );

    // ==========================================
    // ADD PRODUCT NAME
    // ==========================================

    const data = productTypes.map((item) => ({
      ...item,

      product_name: productMap.get(item.product_id) || null,
    }));

    return res.status(200).json({
      success: true,
      message: "Product types fetched successfully",
      data,

      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get product types error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product types",
      error: error.message,
    });
  }
};

// ======================================================
// GET PRODUCT TYPE BY MONGO ID
// ======================================================

export const getProductTypeById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product type id",
      });
    }

    const productType = await ProductType.findById(id).lean();

    if (!productType) {
      return res.status(404).json({
        success: false,
        message: "Product type not found",
      });
    }

    const product = await Product.findOne({
      product_id: productType.product_id,
    })
      .select("product_id product_name")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Product type fetched successfully",

      data: {
        ...productType,
        product_name: product?.product_name || null,
      },
    });
  } catch (error) {
    console.error("Get product type error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product type",
      error: error.message,
    });
  }
};

// ======================================================
// UPDATE PRODUCT TYPE
// ======================================================

export const updateProductType = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product type id",
      });
    }

    const productType = await ProductType.findById(id);

    if (!productType) {
      return res.status(404).json({
        success: false,
        message: "Product type not found",
      });
    }

    const { product_id, product_code, product_type } = req.body;

    // ==========================================
    // PRODUCT
    // ==========================================

    if (product_id !== undefined) {
      const productId = Number(product_id);

      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid product_id",
        });
      }

      const product = await Product.findOne({
        product_id: productId,
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      productType.product_id = productId;
    }

    // ==========================================
    // PRODUCT CODE
    // ==========================================

    // if (product_code !== undefined) {
    //   const productCode = String(product_code).trim().toUpperCase();

    //   if (!productCode) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "Product code cannot be empty",
    //     });
    //   }

    //   productType.product_code = productCode;
    // }

    // ==========================================
    // PRODUCT TYPE
    // ==========================================

    if (product_type !== undefined) {
      const productTypeName = String(product_type).trim();

      if (!productTypeName) {
        return res.status(400).json({
          success: false,
          message: "Product type cannot be empty",
        });
      }

      productType.product_type = productTypeName;
    }

    // ==========================================
    // DUPLICATE CODE
    // ==========================================

    // const duplicateCode = await ProductType.findOne({
    //   _id: {
    //     $ne: productType._id,
    //   },

    //   product_id: productType.product_id,

    //   product_code: {
    //     $regex: `^${escapeRegex(productType.product_code)}$`,
    //     $options: "i",
    //   },
    // });

    // if (duplicateCode) {
    //   return res.status(409).json({
    //     success: false,
    //     message: "Product code already exists for this product",
    //   });
    // }

    // ==========================================
    // DUPLICATE TYPE
    // ==========================================

    const duplicateType = await ProductType.findOne({
      _id: {
        $ne: productType._id,
      },

      product_id: productType.product_id,

      product_type: {
        $regex: `^${escapeRegex(productType.product_type)}$`,
        $options: "i",
      },
    });

    if (duplicateType) {
      return res.status(409).json({
        success: false,
        message: "Product type already exists for this product",
      });
    }

    await productType.save();

    const product = await Product.findOne({
      product_id: productType.product_id,
    })
      .select("product_name")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Product type updated successfully",

      data: {
        ...productType.toObject(),
        product_name: product?.product_name || null,
      },
    });
  } catch (error) {
    console.error("Update product type error:", error);

    // if (error.code === 11000) {
    //   return res.status(409).json({
    //     success: false,
    //     message: "Product code or product type already exists",
    //   });
    // }

    return res.status(500).json({
      success: false,
      message: "Failed to update product type",
      error: error.message,
    });
  }
};

// ======================================================
// DELETE PRODUCT TYPE
// ======================================================

export const deleteProductType = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product type id",
      });
    }

    const productType = await ProductType.findByIdAndDelete(id);

    if (!productType) {
      return res.status(404).json({
        success: false,
        message: "Product type not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product type deleted successfully",
    });
  } catch (error) {
    console.error("Delete product type error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete product type",
      error: error.message,
    });
  }
};

// ======================================================
// IMPORT PRODUCT TYPES
// ======================================================

export const importProductTypes = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required",
      });
    }

    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
    });

    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return res.status(400).json({
        success: false,
        message: "Excel file does not contain any sheet",
      });
    }

    const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
    });

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: "Excel file is empty",
      });
    }

    const imported = [];
    const failed = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];

      try {
        // ======================================
        // READ EXCEL VALUES
        // ======================================

        const productId = Number(
          row.product_id ?? row["Product ID"] ?? row.productId,
        );

        // const productCode = String(
        //   row.product_code ?? row["Product Code"] ?? row.productCode ?? "",
        // )
        //   .trim()
        //   .toUpperCase();

        const productTypeName = String(
          row.product_type ?? row["Product Type"] ?? row.productType ?? "",
        ).trim();

        // ======================================
        // VALIDATION
        // ======================================

        if (!Number.isInteger(productId) || productId <= 0) {
          throw new Error("Valid Product ID is required");
        }

        if (!productCode) {
          throw new Error("Product Code is required");
        }

        if (!productTypeName) {
          throw new Error("Product Type is required");
        }

        // ======================================
        // CHECK PRODUCT
        // ======================================

        const product = await Product.findOne({
          product_id: productId,
        });

        if (!product) {
          throw new Error(`Product not found for Product ID ${productId}`);
        }

        // ======================================
        // DUPLICATE CODE
        // ======================================

        // const duplicateCode = await ProductType.findOne({
        //   product_id: productId,

        //   product_code: {
        //     $regex: `^${escapeRegex(productCode)}$`,
        //     $options: "i",
        //   },
        // });

        // if (duplicateCode) {
        //   throw new Error(`Product Code ${productCode} already exists`);
        // }

        // ======================================
        // DUPLICATE PRODUCT TYPE
        // ======================================

        const duplicateType = await ProductType.findOne({
          product_id: productId,

          product_type: {
            $regex: `^${escapeRegex(productTypeName)}$`,
            $options: "i",
          },
        });

        if (duplicateType) {
          throw new Error(
            `Product Type ${productTypeName} already exists for ${product.product_name}`,
          );
        }

        // ======================================
        // CREATE
        // ======================================

        const productType = await ProductType.create({
          product_id: productId,
        //   product_code: productCode,
          product_type: productTypeName,
        });

        imported.push({
          row: index + 2,

          _id: productType._id,

          product_id: productType.product_id,

          product_name: product.product_name,

        //   product_code: productType.product_code,

          product_type: productType.product_type,
        });
      } catch (rowError) {
        failed.push({
          row: index + 2,
          data: row,
          error: rowError.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Product Type import completed",

      summary: {
        totalRows: rows.length,
        imported: imported.length,
        failed: failed.length,
      },

      imported,
      failed,
    });
  } catch (error) {
    console.error("Product Type import error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to import product types",
      error: error.message,
    });
  }
};

// ======================================================
// EXPORT PRODUCT TYPES
// ======================================================

export const exportProductTypes = async (req, res) => {
  try {
    const productTypes = await ProductType.find()
      .sort({
        product_id: 1,
        product_type: 1,
      })
      .lean();

    // ==========================================
    // GET PRODUCTS
    // ==========================================

    const productIds = [
      ...new Set(productTypes.map((item) => item.product_id)),
    ];

    const products = await Product.find({
      product_id: {
        $in: productIds,
      },
    })
      .select("product_id product_name")
      .lean();

    const productMap = new Map(
      products.map((product) => [product.product_id, product.product_name]),
    );

    // ==========================================
    // FORMAT EXCEL
    // ==========================================

    const excelData = productTypes.map((item, index) => ({
      "S.No": index + 1,

      "Product ID": item.product_id,

      "Product Name": productMap.get(item.product_id) || "",

    //   "Product Code": item.product_code,

      "Product Type": item.product_type,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    worksheet["!cols"] = [
      { wch: 8 },
      { wch: 14 },
      { wch: 30 },
      { wch: 20 },
      { wch: 30 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Product Types");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="product_types.xlsx"',
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    return res.send(buffer);
  } catch (error) {
    console.error("Product Type export error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to export product types",
      error: error.message,
    });
  }
};

// ======================================================
// DOWNLOAD SAMPLE EXCEL
// ======================================================

export const downloadProductTypeSample = async (req, res) => {
  try {
    const sampleData = [
      {
        "Product ID": 1,
        "Product Code": "WM-FL",
        "Product Type": "Front Load",
      },
    //   {
    //     "Product ID": 1,
    //     "Product Code": "WM-TL",
    //     "Product Type": "Top Load",
    //   },
      {
        "Product ID": 2,
        "Product Code": "REF-DD",
        "Product Type": "Double Door",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);

    worksheet["!cols"] = [
      {
        wch: 15,
      },
      {
        wch: 20,
      },
      {
        wch: 30,
      },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Product Types");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="product_type_import_sample.xlsx"',
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    return res.send(buffer);
  } catch (error) {
    console.error("Product Type sample error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to download sample file",
      error: error.message,
    });
  }
};

export const getProductTypeDropdown = async (req, res) => {
  try {
    const { product_id, search = "" } = req.query;

    const filter = {};

    if (product_id) {
      filter.product_id = Number(product_id);
    }

    if (search.trim()) {
      filter.$or = [
        {
          product_type: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          product_code: {
            $regex: search.trim(),
            $options: "i",
          },
        },
      ];
    }

    const productTypes = await ProductType.find(filter)
      .select("_id product_id product_code product_type")
      .sort({ product_type: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Product type dropdown fetched successfully",
      data: productTypes.map((item) => ({
        id: item._id,
        product_id: item.product_id,
        product_code: item.product_code,
        product_type: item.product_type,
      })),
    });
  } catch (error) {
    console.error("Product type dropdown error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product type dropdown",
      error: error.message,
    });
  }
};

// ======================================================
// HELPER
// ======================================================

const escapeRegex = (value) => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
