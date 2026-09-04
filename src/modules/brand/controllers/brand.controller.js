import XLSX from "xlsx";
import Brand from "../models/brand.model.js";

// ============================================
// CREATE BRAND
// ============================================

export const createBrand = async (req, res) => {
  try {
    const { brandName } = req.body;

    if (!brandName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Brand name is required",
      });
    }

    const existingBrand = await Brand.findOne({
      brandName: {
        $regex: `^${brandName.trim()}$`,
        $options: "i",
      },
    });

    if (existingBrand) {
      return res.status(409).json({
        success: false,
        message: "Brand already exists",
      });
    }

    const brand = await Brand.create({
      brandName: brandName.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Brand created successfully",
      data: brand,
    });
  } catch (error) {
    console.error("Create brand error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create brand",
      error: error.message,
    });
  }
};

// ============================================
// GET ALL BRANDS
// ============================================

export const getAllBrands = async (req, res) => {
  try {
    const { search = "", status } = req.query;

    const filter = {};

    if (search) {
      filter.brandName = {
        $regex: search,
        $options: "i",
      };
    }

    if (status === "active") {
      filter.isActive = true;
    }

    if (status === "inactive") {
      filter.isActive = false;
    }

    const brands = await Brand.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: brands.length,
      data: brands,
    });
  } catch (error) {
    console.error("Get brands error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch brands",
      error: error.message,
    });
  }
};

// ============================================
// GET BRAND BY ID
// ============================================

export const getBrandById = async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await Brand.findById(id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: brand,
    });
  } catch (error) {
    console.error("Get brand error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch brand",
      error: error.message,
    });
  }
};

// ============================================
// UPDATE BRAND
// ============================================

export const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;

    const { brandName } = req.body;

    if (!brandName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Brand name is required",
      });
    }

    const brand = await Brand.findById(id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    const duplicateBrand = await Brand.findOne({
      _id: {
        $ne: id,
      },

      brandName: {
        $regex: `^${brandName.trim()}$`,
        $options: "i",
      },
    });

    if (duplicateBrand) {
      return res.status(409).json({
        success: false,
        message: "Another brand with this name already exists",
      });
    }

    brand.brandName = brandName.trim();

    await brand.save();

    return res.status(200).json({
      success: true,
      message: "Brand updated successfully",
      data: brand,
    });
  } catch (error) {
    console.error("Update brand error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update brand",
      error: error.message,
    });
  }
};

// ============================================
// DELETE BRAND
// ============================================

export const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await Brand.findByIdAndDelete(id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Brand deleted successfully",
    });
  } catch (error) {
    console.error("Delete brand error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete brand",
      error: error.message,
    });
  }
};

// ============================================
// TOGGLE BRAND STATUS
// ============================================

export const toggleBrandStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await Brand.findById(id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    brand.isActive = !brand.isActive;

    await brand.save();

    return res.status(200).json({
      success: true,
      message: brand.isActive
        ? "Brand activated successfully"
        : "Brand deactivated successfully",
      data: brand,
    });
  } catch (error) {
    console.error("Toggle brand status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update brand status",
      error: error.message,
    });
  }
};

// ============================================
// IMPORT BRANDS FROM EXCEL
// ============================================

export const importBrands = async (req, res) => {
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
        const brandName =
          row.brandName ??
          row["Brand Name"] ??
          row["brand name"] ??
          row["Brand"] ??
          "";

        if (!String(brandName).trim()) {
          failed.push({
            row: index + 2,
            data: row,
            reason: "Brand name is required",
          });

          continue;
        }

        const cleanBrandName = String(brandName).trim();

        const existingBrand = await Brand.findOne({
          brandName: {
            $regex: `^${escapeRegex(cleanBrandName)}$`,
            $options: "i",
          },
        });

        if (existingBrand) {
          failed.push({
            row: index + 2,
            data: row,
            reason: "Brand already exists",
          });

          continue;
        }

        const brand = await Brand.create({
          brandName: cleanBrandName,
          isActive: true,
        });

        imported.push(brand);
      } catch (error) {
        failed.push({
          row: index + 2,
          data: row,
          reason: error.message || "Failed to import row",
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Brand import completed",
      summary: {
        total: rows.length,
        imported: imported.length,
        failed: failed.length,
      },
      imported,
      failed,
    });
  } catch (error) {
    console.error("Import brands error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to import brands",
      error: error.message,
    });
  }
};

// ============================================
// EXPORT BRANDS TO EXCEL
// ============================================

export const exportBrands = async (req, res) => {
  try {
    const brands = await Brand.find({})
      .sort({
        createdAt: -1,
      })
      .lean();

    const exportData = brands.map((brand, index) => ({
      "S.No": index + 1,

      "Brand Name": brand.brandName,

      Status: brand.isActive ? "Active" : "Inactive",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Brands");

    // Column widths
    worksheet["!cols"] = [{ wch: 10 }, { wch: 30 }, { wch: 15 }];

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    const fileName = `brands-${Date.now()}.xlsx`;

    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    return res.send(buffer);
  } catch (error) {
    console.error("Export brands error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to export brands",
      error: error.message,
    });
  }
};

// ============================================
// DOWNLOAD SAMPLE EXCEL
// ============================================

export const downloadBrandSample = async (req, res) => {
  try {
    const sampleData = [
      {
        "Brand Name": "LG",
      },
      {
        "Brand Name": "Samsung",
      },
      {
        "Brand Name": "Whirlpool",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);

    worksheet["!cols"] = [
      {
        wch: 30,
      },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Brands");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="brand-import-sample.xlsx"',
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    return res.send(buffer);
  } catch (error) {
    console.error("Brand sample download error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to download sample file",
      error: error.message,
    });
  }
};

// ============================================
// HELPER
// ============================================

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
