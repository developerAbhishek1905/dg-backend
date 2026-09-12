import mongoose from "mongoose";
import XLSX from "xlsx";
import Category from "../models/category.model.js";
import Product from "../../product/models/product.model.js  ";
import { escapeRegex } from "../../../helper/escapeRegex.js";

export const createCategory = async (req, res) => {
  try {
    const {
      description = "",
      category = "",
      categoryDescription = "",
      status = "ACTIVE",
      product_id,
    } = req.body;

    console.log("REQ BODY:", req.body);
    console.log("PRODUCT ID:", product_id);
    if (product_id === undefined || product_id === null || product_id === "") {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    const parsedProductId = Number(product_id);

    if (Number.isNaN(parsedProductId)) {
      return res.status(400).json({
        success: false,
        message: "Product ID must be a valid number",
      });
    }

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const newCategory = await Category.create({
      product_id: parsedProductId,
      description: description?.trim() || "",
      category: category?.trim() || "",
      categoryDescription: categoryDescription?.trim() || "",
      status,
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: formatCategory(newCategory),
    });
  } catch (error) {
    console.error("Create Category Error:", error);

    if (error.code === 11000 && error.keyPattern?.newCategory) {
      return res.status(409).json({
        success: false,
        message: "Category already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create category",
      error: error.message,
    });
  }
};

export const getCategories = async (req, res) => {
  try {
    const { search = "", status = "" } = req.query;

    const match = {};

    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");

      match.$or = [
        { description: searchRegex },
        { category: searchRegex },
        { categoryDescription: searchRegex },
      ];
    }

    if (status) {
      if (!["ACTIVE", "INACTIVE"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Use ACTIVE or INACTIVE",
        });
      }

      match.status = status;
    }

    const categories = await Category.aggregate([
      {
        $match: match,
      },

      {
        $lookup: {
          from: "products",
          localField: "product_id",
          foreignField: "product_id",
          as: "product",
        },
      },

      {
        $unwind: {
          path: "$product",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          id: "$_id",
          product_id: 1,
          product_name: {
            $ifNull: ["$product.product_name", ""],
          },
          description: 1,
          category: 1,
          categoryDescription: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },

      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    console.error("Get Categories Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message,
    });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const categories = await Category.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
        },
      },

      {
        $lookup: {
          from: "products",
          localField: "product_id",
          foreignField: "product_id",
          as: "product",
        },
      },

      {
        $unwind: {
          path: "$product",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          id: "$_id",
          product_id: 1,
          product_name: {
            $ifNull: ["$product.product_name", ""],
          },
          description: 1,
          category: 1,
          categoryDescription: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    if (!categories.length) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: categories[0],
    });
  } catch (error) {
    console.error("Get Category Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch category",
      error: error.message,
    });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const { product_id, description, category, categoryDescription, status } =
      req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const existingCategory = await Category.findById(id);

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (product_id !== undefined) {
      const parsedProductId = Number(product_id);

      if (Number.isNaN(parsedProductId)) {
        return res.status(400).json({
          success: false,
          message: "Product ID must be a valid number",
        });
      }

      existingCategory.product_id = parsedProductId;
    }

    if (description !== undefined) {
      existingCategory.description = description?.trim() || "";
    }

    if (category !== undefined) {
      existingCategory.category = category?.trim() || "";
    }

    if (categoryDescription !== undefined) {
      existingCategory.categoryDescription = categoryDescription?.trim() || "";
    }

    if (status !== undefined) {
      if (!["ACTIVE", "INACTIVE"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status",
        });
      }

      existingCategory.status = status;
    }

    await existingCategory.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: formatCategory(existingCategory),
    });
  } catch (error) {
    console.error("Update Category Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update category",
      error: error.message,
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID",
      });
    }

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    await category.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Delete Category Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete category",
    });
  }
};

export const importCategories = async (req, res) => {
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

    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return res.status(400).json({
        success: false,
        message: "Excel file does not contain any sheet",
      });
    }

    const worksheet = workbook.Sheets[firstSheetName];

    const rows = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
    });

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: "Excel file does not contain any data",
      });
    }

    const imported = [];
    const failed = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];

      try {
        // const groupCategoryCode = String(
        //   row.groupCategoryCode ??
        //     row["Group Category Code"] ??
        //     row["group_category_code"] ??
        //     "",
        // )
        //   .trim()
        //   .toUpperCase();

        const productIdRaw =
          row.product_id ??
          row["Product ID"] ??
          row["product id"] ??
          row["productId"] ??
          "";

        const product_id = Number(productIdRaw);

        const description = String(
          row.description ?? row["Description"] ?? "",
        ).trim();

        const category = String(row.category ?? row["Category"] ?? "").trim();

        const categoryDescription = String(
          row.categoryDescription ??
            row["Category Description"] ??
            row["category_description"] ??
            "",
        ).trim();

        const status = String(row.status ?? row["Status"] ?? "ACTIVE")
          .trim()
          .toUpperCase();

        // Group Category Code validation removed
        // if (!groupCategoryCode) {
        //   throw new Error("Group Category Code is required");
        // }

        if (
          productIdRaw === "" ||
          productIdRaw === null ||
          productIdRaw === undefined
        ) {
          throw new Error("Product ID is required");
        }

        if (Number.isNaN(product_id)) {
          throw new Error("Product ID must be a valid number");
        }

        if (!["ACTIVE", "INACTIVE"].includes(status)) {
          throw new Error("Status must be either ACTIVE or INACTIVE");
        }

        // Duplicate Group Category Code check removed
        // const existingCategory = await Category.findOne({
        //   groupCategoryCode,
        // });

        // if (existingCategory) {
        //   throw new Error(
        //     `Group Category Code '${groupCategoryCode}' already exists`,
        //   );
        // }

        const newCategory = await Category.create({
          // groupCategoryCode,
          product_id,
          description,
          category,
          categoryDescription,
          status,
        });

        imported.push({
          row: index + 2,
          product_id: newCategory.product_id,
          category: newCategory.category,
        });
      } catch (error) {
        failed.push({
          row: index + 2,
          product_id:
            row.product_id ?? row["Product ID"] ?? row["productId"] ?? "",
          category: row.category ?? row["Category"] ?? "",
          message: error.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Category import completed",
      summary: {
        total: rows.length,
        imported: imported.length,
        failed: failed.length,
      },
      imported,
      failed,
    });
  } catch (error) {
    console.error("Import Categories Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to import categories",
      error: error.message,
    });
  }
};

export const exportCategories = async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ createdAt: -1 }).lean();

    if (!categories.length) {
      return res.status(404).json({
        success: false,
        message: "No categories found to export",
      });
    }

    const exportData = categories.map((item) => ({
      // "Group Category Code": item.groupCategoryCode,

      "Product ID": item.product_id,
      Description: item.description || "",
      Category: item.category || "",
      "Category Description": item.categoryDescription || "",
      Status: item.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    worksheet["!cols"] = [
      // { wch: 22 }, // Group Category Code
      { wch: 15 }, // Product ID
      { wch: 35 },
      { wch: 25 },
      { wch: 40 },
      { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Categories");

    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const fileName = `categories-${Date.now()}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    return res.send(excelBuffer);
  } catch (error) {
    console.error("Export Categories Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to export categories",
      error: error.message,
    });
  }
};

export const downloadCategorySample = async (req, res) => {
  try {
    const sampleData = [
      {
        // "Group Category Code": "WM",

        "Product ID": 1,
        Description: "Washing Machine Group",
        Category: "Washing Machine",
        "Category Description": "Washing Machine Products",
        Status: "ACTIVE",
      },
      {
        // "Group Category Code": "RF",

        "Product ID": 2,
        Description: "Refrigerator Group",
        Category: "Refrigerator",
        "Category Description": "Refrigerator Products",
        Status: "ACTIVE",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);

    worksheet["!cols"] = [
      // { wch: 22 }, // Group Category Code
      { wch: 15 }, // Product ID
      { wch: 35 },
      { wch: 25 },
      { wch: 40 },
      { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Category Sample");

    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="category-import-sample.xlsx"',
    );

    return res.send(excelBuffer);
  } catch (error) {
    console.error("Category Sample Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to download sample file",
      error: error.message,
    });
  }
};

export const getCategoryDropdown = async (req, res) => {
  try {
    const { product_id, search = "" } = req.query;

    const filter = {};

    // ==========================================
    // PRODUCT ID - OPTIONAL
    // ==========================================

    if (
      product_id !== undefined &&
      product_id !== null &&
      String(product_id).trim() !== ""
    ) {
      const productId = Number(product_id);

      if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid product_id is required",
        });
      }

      // Check product exists
      const productExists = await Product.exists({
        product_id: productId,
      });

      if (!productExists) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${productId} not found`,
        });
      }

      // Filter categories by product
      filter.product_id = productId;
    }

    // ==========================================
    // SEARCH - OPTIONAL
    // ==========================================

    if (String(search).trim()) {
      const searchValue = String(search).trim();

      const regex = {
        $regex: escapeRegex(searchValue),
        $options: "i",
      };

      filter.$or = [
        {
          category: regex,
        },
        {
          description: regex,
        },
        {
          categoryDescription: regex,
        },
      ];
    }

    // ==========================================
    // GET CATEGORIES
    // ==========================================

    const categories = await Category.find(filter)
      .select("_id product_id category description categoryDescription status")
      .sort({
        category: 1,
      })
      .lean();

    // ==========================================
    // GET PRODUCT IDS
    // ==========================================

    const productIds = [
      ...new Set(
        categories
          .map((item) => item.product_id)
          .filter((id) => id !== null && id !== undefined),
      ),
    ];

    // ==========================================
    // GET PRODUCT NAMES
    // ==========================================

    const products = await Product.find({
      product_id: {
        $in: productIds,
      },
    })
      .select("product_id product_name")
      .lean();

    // ==========================================
    // CREATE PRODUCT MAP
    // ==========================================

    const productMap = new Map(
      products.map((product) => [product.product_id, product.product_name]),
    );

    // ==========================================
    // FORMAT RESPONSE
    // ==========================================

    const data = categories.map((category) => ({
      _id: category._id,

      product_id: category.product_id,

      product_name: productMap.get(category.product_id) || null,

      category: category.category,

      description: category.description,

      categoryDescription: category.categoryDescription,

      status: category.status,
    }));

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      data,
      total: data.length,
    });
  } catch (error) {
    console.error("Category dropdown error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
      error: error.message,
    });
  }
};

const formatCategory = (category) => ({
  id: category._id,
  groupCategoryCode: category.groupCategoryCode,
  product_id: category.product_id,
  description: category.description,
  category: category.category,
  categoryDescription: category.categoryDescription,
  status: category.status,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
});