import XLSX from "xlsx";

import Pincode from "../model/pincode.model.js";
import City from "../model/city.model.js";

import {
  getNextPincodeId,
  syncPincodeCounter,
} from "../utils/pincodeId.util.js";


// =====================================================
// CREATE PINCODE
// =====================================================

export const createPincode = async (req, res) => {
  try {
    let {
      pincode_id,
      pincode_name,
      city_id,
    } = req.body;


    // =====================================
    // Validate pincode name
    // =====================================

    if (
      !pincode_name ||
      !String(pincode_name).trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Pincode name is required",
      });
    }

    pincode_name = String(pincode_name).trim();


    // =====================================
    // Validate city_id
    // =====================================

    if (
      city_id === undefined ||
      city_id === null ||
      city_id === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "City ID is required",
      });
    }

    city_id = Number(city_id);

    if (
      !Number.isInteger(city_id) ||
      city_id <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "City ID must be a positive integer",
      });
    }


    // =====================================
    // Check city exists
    // =====================================

    const cityExists = await City.findOne({
      city_id,
    });

    if (!cityExists) {
      return res.status(404).json({
        success: false,
        message: `City with ID ${city_id} not found`,
      });
    }


    // =====================================
    // Check duplicate pincode
    // =====================================

    const duplicatePincode = await Pincode.findOne({
      city_id,

      pincode_name: {
        $regex: `^${escapeRegex(pincode_name)}$`,
        $options: "i",
      },
    });

    if (duplicatePincode) {
      return res.status(409).json({
        success: false,
        message: "Pincode already exists for this city",
      });
    }


    // =====================================
    // Manual pincode_id
    // =====================================

    if (
      pincode_id !== undefined &&
      pincode_id !== null &&
      pincode_id !== ""
    ) {
      pincode_id = Number(pincode_id);

      if (
        !Number.isInteger(pincode_id) ||
        pincode_id <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Pincode ID must be a positive integer",
        });
      }


      const existingPincodeId =
        await Pincode.findOne({
          pincode_id,
        });

      if (existingPincodeId) {
        return res.status(409).json({
          success: false,
          message:
            `Pincode ID ${pincode_id} already exists`,
        });
      }


      await syncPincodeCounter(pincode_id);
    }

    // =====================================
    // Auto generate pincode_id
    // =====================================

    else {
      pincode_id =
        await getNextAvailablePincodeId();
    }


    // =====================================
    // Create
    // =====================================

    const pincode = await Pincode.create({
      pincode_id,
      pincode_name,
      city_id,
    });


    return res.status(201).json({
      success: true,
      message: "Pincode created successfully",
      data: pincode,
    });

  } catch (error) {
    console.error("Create pincode error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Pincode ID already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create pincode",
      error: error.message,
    });
  }
};


// =====================================================
// GET ALL PINCODES
// =====================================================

export const getAllPincodes = async (req, res) => {
  try {
    const {
      search = "",
      city_id,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNumber = Math.max(Number(page) || 1, 1);

    const limitNumber = Math.min(
      Math.max(Number(limit) || 20, 1),
      100
    );

    const filter = {};

    // ==========================================
    // CITY FILTER
    // ==========================================

    if (city_id) {
      filter.city_id = Number(city_id);
    }

    // ==========================================
    // SEARCH
    // ==========================================

    if (String(search).trim()) {
      const searchValue = String(search).trim();

      filter.pincode_name = {
        $regex: escapeRegex(searchValue),
        $options: "i",
      };
    }

    // ==========================================
    // TOTAL
    // ==========================================

    const total = await Pincode.countDocuments(filter);

    // ==========================================
    // GET PINCODES
    // ==========================================

    const pincodes = await Pincode.find(filter)
      .sort({
        pincode_name: 1,
      })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .lean();

    // ==========================================
    // COLLECT CITY IDS
    // ==========================================

    const cityIds = [
      ...new Set(
        pincodes
          .map((pincode) => pincode.city_id)
          .filter(Boolean)
      ),
    ];

    // ==========================================
    // GET CITIES
    // ==========================================

    const cities = await City.find({
      city_id: {
        $in: cityIds,
      },
    })
      .select("city_id city_name")
      .lean();

    // ==========================================
    // CREATE CITY MAP
    // ==========================================

    const cityMap = new Map(
      cities.map((city) => [
        city.city_id,
        city.city_name,
      ])
    );

    // ==========================================
    // MERGE CITY NAME
    // ==========================================

    const data = pincodes.map((pincode) => ({
      ...pincode,

      city_name:
        cityMap.get(pincode.city_id) || null,
    }));

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      message: "Pincodes fetched successfully",

      data,

      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(
          total / limitNumber
        ),
      },
    });

  } catch (error) {
    console.error("Get pincodes error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch pincodes",
      error: error.message,
    });
  }
};

// =====================================================
// GET PINCODE BY ID
// =====================================================

export const getPincodeById = async (
  req,
  res
) => {
  try {
    const pincodeId =
      Number(req.params.id);


    if (
      !Number.isInteger(pincodeId) ||
      pincodeId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid pincode ID",
      });
    }


    const pincode =
      await Pincode.findOne({
        pincode_id: pincodeId,
      });


    if (!pincode) {
      return res.status(404).json({
        success: false,
        message: "Pincode not found",
      });
    }


    return res.status(200).json({
      success: true,
      message:
        "Pincode fetched successfully",
      data: pincode,
    });

  } catch (error) {
    console.error(
      "Get pincode error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch pincode",
      error: error.message,
    });
  }
};


// =====================================================
// UPDATE PINCODE
// =====================================================

export const updatePincode = async (
  req,
  res
) => {
  try {
    const currentPincodeId =
      Number(req.params.id);


    if (
      !Number.isInteger(
        currentPincodeId
      ) ||
      currentPincodeId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid pincode ID",
      });
    }


    const pincode =
      await Pincode.findOne({
        pincode_id:
          currentPincodeId,
      });


    if (!pincode) {
      return res.status(404).json({
        success: false,
        message: "Pincode not found",
      });
    }


    let {
      pincode_id,
      pincode_name,
      city_id,
    } = req.body;


    // =====================================
    // Final values
    // =====================================

    const finalPincodeName =
      pincode_name !== undefined
        ? String(pincode_name).trim()
        : pincode.pincode_name;


    const finalCityId =
      city_id !== undefined &&
      city_id !== null &&
      city_id !== ""
        ? Number(city_id)
        : pincode.city_id;


    if (!finalPincodeName) {
      return res.status(400).json({
        success: false,
        message:
          "Pincode name cannot be empty",
      });
    }


    if (
      !Number.isInteger(finalCityId) ||
      finalCityId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "City ID must be a positive integer",
      });
    }


    // =====================================
    // Check city
    // =====================================

    const cityExists =
      await City.findOne({
        city_id: finalCityId,
      });


    if (!cityExists) {
      return res.status(404).json({
        success: false,
        message:
          `City with ID ${finalCityId} not found`,
      });
    }


    // =====================================
    // Duplicate pincode
    // =====================================

    const duplicatePincode =
      await Pincode.findOne({
        _id: {
          $ne: pincode._id,
        },

        city_id: finalCityId,

        pincode_name: {
          $regex:
            `^${escapeRegex(
              finalPincodeName
            )}$`,
          $options: "i",
        },
      });


    if (duplicatePincode) {
      return res.status(409).json({
        success: false,
        message:
          "Pincode already exists for this city",
      });
    }


    pincode.pincode_name =
      finalPincodeName;

    pincode.city_id =
      finalCityId;


    // =====================================
    // Update pincode_id
    // =====================================

    if (
      pincode_id !== undefined &&
      pincode_id !== null &&
      pincode_id !== ""
    ) {
      const newPincodeId =
        Number(pincode_id);


      if (
        !Number.isInteger(
          newPincodeId
        ) ||
        newPincodeId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Pincode ID must be a positive integer",
        });
      }


      if (
        newPincodeId !==
        currentPincodeId
      ) {
        const duplicateId =
          await Pincode.findOne({
            pincode_id:
              newPincodeId,
          });


        if (duplicateId) {
          return res.status(409).json({
            success: false,
            message:
              `Pincode ID ${newPincodeId} already exists`,
          });
        }


        pincode.pincode_id =
          newPincodeId;


        await syncPincodeCounter(
          newPincodeId
        );
      }
    }


    await pincode.save();


    return res.status(200).json({
      success: true,
      message:
        "Pincode updated successfully",
      data: pincode,
    });

  } catch (error) {
    console.error(
      "Update pincode error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update pincode",
      error: error.message,
    });
  }
};


// =====================================================
// DELETE PINCODE
// =====================================================

export const deletePincode = async (
  req,
  res
) => {
  try {
    const pincodeId =
      Number(req.params.id);


    if (
      !Number.isInteger(pincodeId) ||
      pincodeId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid pincode ID",
      });
    }


    const pincode =
      await Pincode.findOneAndDelete({
        pincode_id: pincodeId,
      });


    if (!pincode) {
      return res.status(404).json({
        success: false,
        message: "Pincode not found",
      });
    }


    return res.status(200).json({
      success: true,
      message:
        "Pincode deleted successfully",
      data: pincode,
    });

  } catch (error) {
    console.error(
      "Delete pincode error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete pincode",
      error: error.message,
    });
  }
};


// =====================================================
// IMPORT PINCODES FROM EXCEL
// =====================================================

export const importPincodes = async (
  req,
  res
) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Excel file is required",
      });
    }


    const workbook = XLSX.read(
      req.file.buffer,
      {
        type: "buffer",
      }
    );


    const firstSheetName =
      workbook.SheetNames[0];


    if (!firstSheetName) {
      return res.status(400).json({
        success: false,
        message:
          "Excel file does not contain any sheet",
      });
    }


    const worksheet =
      workbook.Sheets[
        firstSheetName
      ];


    const rows =
      XLSX.utils.sheet_to_json(
        worksheet,
        {
          defval: "",
        }
      );


    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message:
          "Excel file does not contain any data",
      });
    }


    const imported = [];
    const failed = [];


    for (
      let index = 0;
      index < rows.length;
      index++
    ) {
      const row = rows[index];

      try {
        let pincodeId =
          row.pincode_id ??
          row["Pincode ID"] ??
          row["pincode id"] ??
          "";

        let pincodeName =
          row.pincode_name ??
          row["Pincode Name"] ??
          row["pincode name"] ??
          "";

        let cityId =
          row.city_id ??
          row["City ID"] ??
          row["city id"] ??
          "";


        // =====================================
        // Pincode required
        // =====================================

        pincodeName =
          String(
            pincodeName
          ).trim();


        if (!pincodeName) {
          failed.push({
            row: index + 2,
            data: row,
            message:
              "Pincode name is required",
          });

          continue;
        }


        // =====================================
        // City ID required
        // =====================================

        if (
          cityId === "" ||
          cityId === null ||
          cityId === undefined
        ) {
          failed.push({
            row: index + 2,
            data: row,
            message:
              "City ID is required",
          });

          continue;
        }


        cityId = Number(cityId);


        if (
          !Number.isInteger(cityId) ||
          cityId <= 0
        ) {
          failed.push({
            row: index + 2,
            data: row,
            message:
              "City ID must be a positive integer",
          });

          continue;
        }


        // =====================================
        // Check city
        // =====================================

        const cityExists =
          await City.findOne({
            city_id: cityId,
          });


        if (!cityExists) {
          failed.push({
            row: index + 2,
            data: row,
            message:
              `City ID ${cityId} does not exist`,
          });

          continue;
        }


        // =====================================
        // Duplicate pincode
        // =====================================

        const duplicatePincode =
          await Pincode.findOne({
            city_id: cityId,

            pincode_name: {
              $regex:
                `^${escapeRegex(
                  pincodeName
                )}$`,
              $options: "i",
            },
          });


        if (duplicatePincode) {
          failed.push({
            row: index + 2,
            data: row,
            message:
              `Pincode "${pincodeName}" already exists for City ${cityId}`,
          });

          continue;
        }


        // =====================================
        // Manual pincode ID
        // =====================================

        if (
          pincodeId !== "" &&
          pincodeId !== null &&
          pincodeId !== undefined
        ) {
          pincodeId =
            Number(pincodeId);


          if (
            !Number.isInteger(
              pincodeId
            ) ||
            pincodeId <= 0
          ) {
            failed.push({
              row: index + 2,
              data: row,
              message:
                "Pincode ID must be a positive integer",
            });

            continue;
          }


          const duplicateId =
            await Pincode.findOne({
              pincode_id:
                pincodeId,
            });


          if (duplicateId) {
            failed.push({
              row: index + 2,
              data: row,
              message:
                `Pincode ID ${pincodeId} already exists`,
            });

            continue;
          }


          await syncPincodeCounter(
            pincodeId
          );
        }

        // =====================================
        // Auto generate ID
        // =====================================

        else {
          pincodeId =
            await getNextAvailablePincodeId();
        }


        // =====================================
        // Save
        // =====================================

        const pincode =
          await Pincode.create({
            pincode_id:
              pincodeId,

            pincode_name:
              pincodeName,

            city_id:
              cityId,
          });


        imported.push({
          row: index + 2,

          pincode_id:
            pincode.pincode_id,

          pincode_name:
            pincode.pincode_name,

          city_id:
            pincode.city_id,
        });

      } catch (rowError) {
        failed.push({
          row: index + 2,
          data: row,
          message:
            rowError.message,
        });
      }
    }


    return res.status(200).json({
      success: true,
      message:
        "Pincode import completed",

      summary: {
        totalRows: rows.length,
        imported:
          imported.length,
        failed:
          failed.length,
      },

      imported,
      failed,
    });

  } catch (error) {
    console.error(
      "Import pincodes error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to import pincodes",
      error: error.message,
    });
  }
};


// =====================================================
// EXPORT PINCODES
// =====================================================

export const exportPincodes = async (
  req,
  res
) => {
  try {
    const pincodes =
      await Pincode.find()
        .sort({
          pincode_id: 1,
        })
        .lean();


    const excelData =
      pincodes.map(
        (pincode) => ({
          pincode_id:
            pincode.pincode_id,

          pincode_name:
            pincode.pincode_name,

          city_id:
            pincode.city_id,
        })
      );


    const worksheet =
      XLSX.utils.json_to_sheet(
        excelData
      );


    worksheet["!cols"] = [
      {
        wch: 15,
      },
      {
        wch: 20,
      },
      {
        wch: 15,
      },
    ];


    const workbook =
      XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Pincodes"
    );


    const buffer =
      XLSX.write(
        workbook,
        {
          type: "buffer",
          bookType: "xlsx",
        }
      );


    res.setHeader(
      "Content-Disposition",
      'attachment; filename="pincodes.xlsx"'
    );


    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );


    return res.send(buffer);

  } catch (error) {
    console.error(
      "Export pincodes error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to export pincodes",
      error: error.message,
    });
  }
};

export const getPincodesByCityId = async (req, res) => {
  try {
    const { city_id } = req.params;

    const cityId = Number(city_id);

    if (!Number.isInteger(cityId) || cityId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid city_id is required",
      });
    }

    const pincodes = await Pincode.find({
      city_id: cityId,
    })
      .select("_id pincode_id pincode_name city_id")
      .sort({ pincode_name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Pincodes fetched successfully",
      data: pincodes,
      total: pincodes.length,
    });
  } catch (error) {
    console.error("Get pincodes error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch pincodes",
      error: error.message,
    });
  }
};

// =====================================================
// NEXT AVAILABLE PINCODE ID
// =====================================================

const getNextAvailablePincodeId =
  async () => {

    let pincodeId =
      await getNextPincodeId();


    let existing =
      await Pincode.exists({
        pincode_id:
          pincodeId,
      });


    while (existing) {
      pincodeId =
        await getNextPincodeId();


      existing =
        await Pincode.exists({
          pincode_id:
            pincodeId,
        });
    }


    return pincodeId;
  };


// =====================================================
// ESCAPE REGEX
// =====================================================

const escapeRegex = (value) => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};