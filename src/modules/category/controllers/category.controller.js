import mongoose from "mongoose";
import XLSX from "xlsx";
import Category from "../models/category.model.js";

export const createCategory = async (req, res) => {
  try {
    const {
      groupCategoryCode,
      description = "",
      category = "",
      categoryDescription = "",
      status = "ACTIVE",
    } = req.body;

    if (!groupCategoryCode?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Group category code is required",
      });
    }

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const normalizedCode = groupCategoryCode.trim().toUpperCase();

    const existingCategory = await Category.findOne({
      groupCategoryCode: normalizedCode,
    });

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: "Group category code already exists",
      });
    }

    const newCategory = await Category.create({
      groupCategoryCode: normalizedCode,
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

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Group category code already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
};

export const getCategories = async (req, res) => {
  try {
    const { search = "", status = "" } = req.query;

    const filter = {};

    // =========================================
    // SEARCH FILTER
    // =========================================
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");

      filter.$or = [
        {
          groupCategoryCode: searchRegex,
        },
        {
          description: searchRegex,
        },
        {
          category: searchRegex,
        },
        {
          categoryDescription: searchRegex,
        },
      ];
    }

    // =========================================
    // STATUS FILTER
    // =========================================
    if (status) {
      if (!["ACTIVE", "INACTIVE"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Use ACTIVE or INACTIVE",
        });
      }

      filter.status = status;
    }

    // =========================================
    // FETCH CATEGORIES
    // =========================================
    const categories = await Category.find(filter).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: categories.length,
      data: categories.map(formatCategory),
    });
  } catch (error) {
    console.error("Get Categories Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
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

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: formatCategory(category),
    });
  } catch (error) {
    console.error("Get Category Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch category",
    });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      groupCategoryCode,
      description,
      category,
      categoryDescription,
      status,
    } = req.body;

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

    if (groupCategoryCode !== undefined) {
      if (!groupCategoryCode.trim()) {
        return res.status(400).json({
          success: false,
          message: "Group category code cannot be empty",
        });
      }

      const normalizedCode = groupCategoryCode.trim().toUpperCase();

      const duplicateCategory = await Category.findOne({
        groupCategoryCode: normalizedCode,
        _id: {
          $ne: id,
        },
      });

      if (duplicateCategory) {
        return res.status(409).json({
          success: false,
          message: "Group category code already exists",
        });
      }

      existingCategory.groupCategoryCode = normalizedCode;
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

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Group category code already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update category",
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

export const getCategoryDropdown = async (req, res) => {
  try {
    const categories = await Category.find({
      status: "ACTIVE",
    })
      .select(
        "_id groupCategoryCode category categoryDescription"
      )
      .sort({
        category: 1,
      });

    const data = categories.map((item) => ({
      id: item._id,
      groupCategoryCode: item.groupCategoryCode,
      category: item.category,
      categoryDescription: item.categoryDescription,
    }));

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Category Dropdown Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch category dropdown",
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
        // Support multiple possible Excel column names
        const groupCategoryCode = String(
          row.groupCategoryCode ??
            row["Group Category Code"] ??
            row["group_category_code"] ??
            ""
        )
          .trim()
          .toUpperCase();

        const description = String(
          row.description ??
            row["Description"] ??
            ""
        ).trim();

        const category = String(
          row.category ??
            row["Category"] ??
            ""
        ).trim();

        const categoryDescription = String(
          row.categoryDescription ??
            row["Category Description"] ??
            row["category_description"] ??
            ""
        ).trim();

        const status = String(
          row.status ??
            row["Status"] ??
            "ACTIVE"
        )
          .trim()
          .toUpperCase();

        // Required field validation
        if (!groupCategoryCode) {
          throw new Error("Group Category Code is required");
        }

        // Status validation
        if (!["ACTIVE", "INACTIVE"].includes(status)) {
          throw new Error(
            "Status must be either ACTIVE or INACTIVE"
          );
        }

        // Check duplicate
        const existingCategory = await Category.findOne({
          groupCategoryCode,
        });

        if (existingCategory) {
          throw new Error(
            `Group Category Code '${groupCategoryCode}' already exists`
          );
        }

        const newCategory = await Category.create({
          groupCategoryCode,
          description,
          category,
          categoryDescription,
          status,
        });

        imported.push({
          row: index + 2,
          groupCategoryCode: newCategory.groupCategoryCode,
          category: newCategory.category,
        });
      } catch (error) {
        failed.push({
          row: index + 2,
          groupCategoryCode:
            row.groupCategoryCode ??
            row["Group Category Code"] ??
            "",
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
    const categories = await Category.find({})
      .sort({ createdAt: -1 })
      .lean();

    if (!categories.length) {
      return res.status(404).json({
        success: false,
        message: "No categories found to export",
      });
    }

    const exportData = categories.map((item) => ({
      "Group Category Code": item.groupCategoryCode,
      Description: item.description || "",
      Category: item.category || "",
      "Category Description": item.categoryDescription || "",
      Status: item.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Set Excel column widths
    worksheet["!cols"] = [
      { wch: 22 },
      { wch: 35 },
      { wch: 25 },
      { wch: 40 },
      { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Categories"
    );

    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const fileName = `categories-${Date.now()}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );

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
        "Group Category Code": "WM",
        Description: "Washing Machine Group",
        Category: "Washing Machine",
        "Category Description": "Washing Machine Products",
        Status: "ACTIVE",
      },
      {
        "Group Category Code": "RF",
        Description: "Refrigerator Group",
        Category: "Refrigerator",
        "Category Description": "Refrigerator Products",
        Status: "ACTIVE",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);

    worksheet["!cols"] = [
      { wch: 22 },
      { wch: 35 },
      { wch: 25 },
      { wch: 40 },
      { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Category Sample"
    );

    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="category-import-sample.xlsx"'
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

const formatCategory = (category) => ({
  id: category._id,

  groupCategoryCode: category.groupCategoryCode,

  description: category.description,

  category: category.category,

  categoryDescription: category.categoryDescription,

  status: category.status,

  createdAt: category.createdAt,

  updatedAt: category.updatedAt,
});
