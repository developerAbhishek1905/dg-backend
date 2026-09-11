import XLSX from "xlsx";
import Product from "../models/product.model.js";
import Category from "../../category/models/category.model.js";
import Brand from "../../brand/models/brand.model.js";
import {
  getNextProductId,
  syncProductCounter,
} from "../utils/productId.util.js";
import { escapeRegex } from "../../../helper/escapeRegex.js";


// CREATE PRODUCT
export const createProduct = async (req, res) => {
  try {
    const {
      product_id,
      product_name,
      status = "ACTIVE",
    } = req.body;

    if (!String(product_name || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    const normalizedStatus = String(status)
      .trim()
      .toUpperCase();

    if (!["ACTIVE", "INACTIVE"].includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Status must be ACTIVE or INACTIVE",
      });
    }

    const duplicateProduct = await Product.findOne({
      product_name: {
        $regex: `^${escapeRegex(String(product_name).trim())}$`,
        $options: "i",
      },
    });

    if (duplicateProduct) {
      return res.status(409).json({
        success: false,
        message: "Product already exists",
      });
    }

    let productId;

    if (
      product_id !== undefined &&
      product_id !== null &&
      product_id !== ""
    ) {
      productId = Number(product_id);

      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({
          success: false,
          message: "product_id must be a positive integer",
        });
      }

      const existingId = await Product.findOne({
        product_id: productId,
      });

      if (existingId) {
        return res.status(409).json({
          success: false,
          message: `product_id ${productId} already exists`,
        });
      }

      await syncProductCounter(productId);
    } else {
      productId = await getNextProductId();
    }

    const product = await Product.create({
      product_id: productId,
      product_name: String(product_name).trim(),
      status: normalizedStatus,
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error("Create product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create product",
      error: error.message,
    });
  }
};


// GET ALL PRODUCTS
export const getAllProducts = async (req, res) => {
  try {
    const {
      search = "",
      status,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNumber = Math.max(Number(page) || 1, 1);

    const limitNumber = Math.min(
      Math.max(Number(limit) || 20, 1),
      100
    );

    const filter = {};

    if (String(search).trim()) {
      filter.product_name = {
        $regex: escapeRegex(String(search).trim()),
        $options: "i",
      };
    }

    if (status) {
      filter.status = String(status).trim().toUpperCase();
    }

    const total = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .sort({
        product_name: 1,
      })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .lean();

    return res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      data: products,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get products error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};


// GET PRODUCT BY PRODUCT_ID
export const getProductById = async (req, res) => {
  try {
    const productId = Number(req.params.id);

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

    return res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: product,
    });
  } catch (error) {
    console.error("Get product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product",
      error: error.message,
    });
  }
};


// UPDATE PRODUCT
export const updateProduct = async (req, res) => {
  try {
    const productId = Number(req.params.id);

    const product = await Product.findOne({
      product_id: productId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const {
      product_name,
      status,
    } = req.body;

    if (product_name !== undefined) {
      const name = String(product_name).trim();

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Product name cannot be empty",
        });
      }

      const duplicate = await Product.findOne({
        _id: {
          $ne: product._id,
        },
        product_name: {
          $regex: `^${escapeRegex(name)}$`,
          $options: "i",
        },
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Product already exists",
        });
      }

      product.product_name = name;
    }

    if (status !== undefined) {
      const normalizedStatus = String(status)
        .trim()
        .toUpperCase();

      if (!["ACTIVE", "INACTIVE"].includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          message: "Status must be ACTIVE or INACTIVE",
        });
      }

      product.status = normalizedStatus;
    }

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    console.error("Update product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message,
    });
  }
};


// DELETE PRODUCT
export const deleteProduct = async (req, res) => {
  try {
    const productId = Number(req.params.id);

    const product = await Product.findOneAndDelete({
      product_id: productId,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete product",
      error: error.message,
    });
  }
};


// IMPORT PRODUCTS
export const importProducts = async (req, res) => {
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
        const productName = String(
          row.product_name ?? row["Product Name"] ?? row.productName ?? "",
        ).trim();

        const categoryId = Number(
          row.category_id ?? row["Category ID"] ?? row.categoryId,
        );

        const brandId = Number(row.brand_id ?? row["Brand ID"] ?? row.brandId);

        const rawProductTypeId =
          row.product_type_id ??
          row["Product Type ID"] ??
          row.productTypeId ??
          "";

        const productTypeId =
          rawProductTypeId === "" ? null : Number(rawProductTypeId);

        const modelNumber = String(
          row.model_number ?? row["Model Number"] ?? row.modelNumber ?? "",
        ).trim();

        const description = String(
          row.description ?? row.Description ?? "",
        ).trim();

        const status = String(row.status ?? row.Status ?? "ACTIVE")
          .trim()
          .toUpperCase();

        if (!productName) {
          throw new Error("Product Name is required");
        }

        if (!Number.isInteger(categoryId) || categoryId <= 0) {
          throw new Error("Valid Category ID is required");
        }

        if (!Number.isInteger(brandId) || brandId <= 0) {
          throw new Error("Valid Brand ID is required");
        }

        const category = await Category.findOne({
          category_id: categoryId,
        });

        if (!category) {
          throw new Error(`Category ${categoryId} not found`);
        }

        const brand = await Brand.findOne({
          brand_id: brandId,
        });

        if (!brand) {
          throw new Error(`Brand ${brandId} not found`);
        }

        if (productTypeId) {
          const productType = await ProductType.findOne({
            product_type_id: productTypeId,
          });

          if (!productType) {
            throw new Error(`Product Type ${productTypeId} not found`);
          }
        }

        if (!["ACTIVE", "INACTIVE"].includes(status)) {
          throw new Error("Status must be ACTIVE or INACTIVE");
        }

        const duplicate = await Product.findOne({
          product_name: {
            $regex: `^${escapeRegex(productName)}$`,
            $options: "i",
          },
          category_id: categoryId,
          brand_id: brandId,
        });

        if (duplicate) {
          throw new Error("Product already exists");
        }

        const productId = await getNextProductId();

        const product = await Product.create({
          product_id: productId,
          product_name: productName,
          category_id: categoryId,
          brand_id: brandId,
          product_type_id: productTypeId,
          model_number: modelNumber,
          description,
          status,
        });

        imported.push({
          row: index + 2,
          product_id: product.product_id,
          product_name: product.product_name,
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
      message: "Product import completed",

      summary: {
        totalRows: rows.length,
        imported: imported.length,
        failed: failed.length,
      },

      imported,
      failed,
    });
  } catch (error) {
    console.error("Product import error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to import products",
      error: error.message,
    });
  }
};


// EXPORT PRODUCTS
export const exportProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .sort({
        product_name: 1,
      })
      .lean();

    const categoryIds = [...new Set(products.map((item) => item.category_id))];
    const brandIds = [...new Set(products.map((item) => item.brand_id))];
    const productTypeIds = [
      ...new Set(products.map((item) => item.product_type_id).filter(Boolean)),
    ];

    const [categories, brands, productTypes] = await Promise.all([
      Category.find({
        category_id: {
          $in: categoryIds,
        },
      })
        .select("category_id category_name")
        .lean(),

      Brand.find({
        brand_id: {
          $in: brandIds,
        },
      })
        .select("brand_id brand_name")
        .lean(),

      ProductType.find({
        product_type_id: {
          $in: productTypeIds,
        },
      })
        .select("product_type_id product_type_name")
        .lean(),
    ]);

    const categoryMap = new Map(
      categories.map((item) => [item.category_id, item.category_name]),
    );

    const brandMap = new Map(
      brands.map((item) => [item.brand_id, item.brand_name]),
    );

    const productTypeMap = new Map(
      productTypes.map((item) => [
        item.product_type_id,
        item.product_type_name,
      ]),
    );

    const excelData = products.map((product, index) => ({
      "S.No": index + 1,
      "Product ID": product.product_id,
      "Product Name": product.product_name,
      "Category ID": product.category_id,
      "Category Name": categoryMap.get(product.category_id) || "",
      "Brand ID": product.brand_id,
      "Brand Name": brandMap.get(product.brand_id) || "",
      "Product Type ID": product.product_type_id || "",
      "Product Type Name": productTypeMap.get(product.product_type_id) || "",
      "Model Number": product.model_number || "",
      Description: product.description || "",
      Status: product.status || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet["!cols"] = [
      { wch: 8 },
      { wch: 12 },
      { wch: 30 },
      { wch: 14 },
      { wch: 25 },
      { wch: 12 },
      { wch: 25 },
      { wch: 18 },
      { wch: 25 },
      { wch: 20 },
      { wch: 35 },
      { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="products.xlsx"',
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    return res.send(buffer);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to export products",
      error: error.message,
    });
  }
};


// DOWNLOAD PRODUCT SAMPLE EXCEL
export const downloadProductSample = async (req, res) => {
  try {

    // SAMPLE DATA
    const sampleData = [
      {
        "Product Name": "Washing Machine",
        Status: "ACTIVE",
      },
      {
        "Product Name": "Refrigerator",
        Status: "ACTIVE",
      },
      {
        "Product Name": "Microwave",
        Status: "ACTIVE",
      },
      {
        "Product Name": "Air Conditioner",
        Status: "INACTIVE",
      },
    ];

    // CREATE WORKSHEET
    const worksheet = XLSX.utils.json_to_sheet(sampleData);


    // COLUMN WIDTH
    worksheet["!cols"] = [
      {
        wch: 30,
      },
      {
        wch: 15,
      },
    ];

    // CREATE WORKBOOK
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Products"
    );

    // GENERATE EXCEL BUFFER
    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // RESPONSE HEADERS
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="product_import_sample.xlsx"'
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    // SEND FILE
    return res.send(buffer);

  } catch (error) {
    console.error(
      "Download product sample error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to download product sample",
      error: error.message,
    });
  }
};


export const getProductDropdown = async (req, res) => {
  try {
    const {
      search = "",
      status = "ACTIVE",
    } = req.query;

    const filter = {};

    // STATUS FILTER
    if (status) {
      const normalizedStatus = String(status)
        .trim()
        .toUpperCase();

      if (!["ACTIVE", "INACTIVE"].includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          message: "Status must be ACTIVE or INACTIVE",
        });
      }

      filter.status = normalizedStatus;
    }

    // SEARCH
    if (String(search).trim()) {
      const searchValue = String(search).trim();

      filter.product_name = {
        $regex: escapeRegex(searchValue),
        $options: "i",
      };
    }

    // GET PRODUCTS
    const products = await Product.find(filter)
      .select("_id product_id product_name status")
      .sort({
        product_name: 1,
      })
      .lean();

    // RESPONSE DATA
    const data = products.map((product) => ({
      _id: product._id,
      product_id: product.product_id,
      product_name: product.product_name,
      status: product.status,
    }));

    return res.status(200).json({
      success: true,
      message: "Product dropdown fetched successfully",
      data,
      total: data.length,
    });
  } catch (error) {
    console.error("Product dropdown error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product dropdown",
      error: error.message,
    });
  }
};