import mongoose from "mongoose";
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
