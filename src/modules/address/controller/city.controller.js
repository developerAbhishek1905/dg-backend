// controllers/city.controller.js

import XLSX from "xlsx";

import City from "../model/city.model.js";
import State from "../model/state.model.js";
import District from "../model/district.model.js";

import { getNextCityId, syncCityCounter } from "../utils/cityId.util.js";

// =====================================================
// CREATE CITY
// =====================================================

export const createCity = async (req, res) => {
  try {
    let { city_id, city_name, district_id, state_id } = req.body;

    // Validate city name
    if (!city_name || !String(city_name).trim()) {
      return res.status(400).json({
        success: false,
        message: "City name is required",
      });
    }

    city_name = String(city_name).trim();

    // Validate district_id
    if (
      district_id === undefined ||
      district_id === null ||
      district_id === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "District ID is required",
      });
    }

    district_id = Number(district_id);

    if (!Number.isInteger(district_id) || district_id <= 0) {
      return res.status(400).json({
        success: false,
        message: "District ID must be a positive integer",
      });
    }

    // Validate state_id
    if (state_id === undefined || state_id === null || state_id === "") {
      return res.status(400).json({
        success: false,
        message: "State ID is required",
      });
    }

    state_id = Number(state_id);

    if (!Number.isInteger(state_id) || state_id <= 0) {
      return res.status(400).json({
        success: false,
        message: "State ID must be a positive integer",
      });
    }

    // Check state exists
    const stateExists = await State.findOne({
      state_id,
    });

    if (!stateExists) {
      return res.status(404).json({
        success: false,
        message: `State with ID ${state_id} not found`,
      });
    }

    // Check district exists
    const districtExists = await District.findOne({
      district_id,
    });

    if (!districtExists) {
      return res.status(404).json({
        success: false,
        message: `District with ID ${district_id} not found`,
      });
    }

    // Check district belongs to state
    if (districtExists.state_id !== state_id) {
      return res.status(400).json({
        success: false,
        message: `District ${district_id} does not belong to State ${state_id}`,
      });
    }

    // Check duplicate city in same district/state
    const duplicateCity = await City.findOne({
      district_id,
      state_id,
      city_name: {
        $regex: `^${escapeRegex(city_name)}$`,
        $options: "i",
      },
    });

    if (duplicateCity) {
      return res.status(409).json({
        success: false,
        message: "City already exists in this district",
      });
    }

    // Manual city_id
    if (city_id !== undefined && city_id !== null && city_id !== "") {
      city_id = Number(city_id);

      if (!Number.isInteger(city_id) || city_id <= 0) {
        return res.status(400).json({
          success: false,
          message: "City ID must be a positive integer",
        });
      }

      const existingCityId = await City.findOne({
        city_id,
      });

      if (existingCityId) {
        return res.status(409).json({
          success: false,
          message: `City ID ${city_id} already exists`,
        });
      }

      await syncCityCounter(city_id);
    } else {
      city_id = await getNextAvailableCityId();
    }

    const city = await City.create({
      city_id,
      city_name,
      district_id,
      state_id,
    });

    return res.status(201).json({
      success: true,
      message: "City created successfully",
      data: city,
    });
  } catch (error) {
    console.error("Create city error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "City ID already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create city",
      error: error.message,
    });
  }
};

// =====================================================
// GET ALL CITIES
// =====================================================

export const getAllCities = async (req, res) => {
  try {
    const {
      search = "",
      state_id,
      district_id,
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
    // STATE FILTER
    // ==========================================

    if (state_id) {
      filter.state_id = Number(state_id);
    }

    // ==========================================
    // DISTRICT FILTER
    // ==========================================

    if (district_id) {
      filter.district_id = Number(district_id);
    }

    // ==========================================
    // SEARCH
    // ==========================================

    if (String(search).trim()) {
      const searchValue = String(search).trim();

      filter.city_name = {
        $regex: escapeRegex(searchValue),
        $options: "i",
      };
    }

    // ==========================================
    // TOTAL
    // ==========================================

    const total = await City.countDocuments(filter);

    // ==========================================
    // GET CITIES
    // ==========================================

    const cities = await City.find(filter)
      .sort({
        city_name: 1,
      })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .lean();

    // ==========================================
    // COLLECT STATE IDS
    // ==========================================

    const stateIds = [
      ...new Set(
        cities
          .map((city) => city.state_id)
          .filter(Boolean)
      ),
    ];

    // ==========================================
    // COLLECT DISTRICT IDS
    // ==========================================

    const districtIds = [
      ...new Set(
        cities
          .map((city) => city.district_id)
          .filter(Boolean)
      ),
    ];

    // ==========================================
    // GET STATES
    // ==========================================

    const states = await State.find({
      state_id: {
        $in: stateIds,
      },
    })
      .select("state_id state_name")
      .lean();

    // ==========================================
    // GET DISTRICTS
    // ==========================================

    const districts = await District.find({
      district_id: {
        $in: districtIds,
      },
    })
      .select("district_id district_name state_id")
      .lean();

    // ==========================================
    // CREATE STATE MAP
    // ==========================================

    const stateMap = new Map(
      states.map((state) => [
        state.state_id,
        state.state_name,
      ])
    );

    // ==========================================
    // CREATE DISTRICT MAP
    // ==========================================

    const districtMap = new Map(
      districts.map((district) => [
        district.district_id,
        district.district_name,
      ])
    );

    // ==========================================
    // MERGE NAMES INTO CITY
    // ==========================================

    const data = cities.map((city) => ({
      ...city,

      state_name:
        stateMap.get(city.state_id) || null,

      district_name:
        districtMap.get(city.district_id) || null,
    }));

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      message: "Cities fetched successfully",

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
    console.error("Get cities error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch cities",
      error: error.message,
    });
  }
};
// =====================================================
// GET CITY BY ID
// =====================================================

export const getCityById = async (req, res) => {
  try {
    const cityId = Number(req.params.id);

    if (!Number.isInteger(cityId) || cityId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid city ID",
      });
    }

    const city = await City.findOne({
      city_id: cityId,
    });

    if (!city) {
      return res.status(404).json({
        success: false,
        message: "City not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "City fetched successfully",
      data: city,
    });
  } catch (error) {
    console.error("Get city error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch city",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE CITY
// =====================================================

export const updateCity = async (req, res) => {
  try {
    const currentCityId = Number(req.params.id);

    if (!Number.isInteger(currentCityId) || currentCityId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid city ID",
      });
    }

    const city = await City.findOne({
      city_id: currentCityId,
    });

    if (!city) {
      return res.status(404).json({
        success: false,
        message: "City not found",
      });
    }

    let { city_id, city_name, district_id, state_id } = req.body;

    const finalCityName =
      city_name !== undefined ? String(city_name).trim() : city.city_name;

    const finalDistrictId =
      district_id !== undefined && district_id !== null && district_id !== ""
        ? Number(district_id)
        : city.district_id;

    const finalStateId =
      state_id !== undefined && state_id !== null && state_id !== ""
        ? Number(state_id)
        : city.state_id;

    if (!finalCityName) {
      return res.status(400).json({
        success: false,
        message: "City name cannot be empty",
      });
    }

    if (!Number.isInteger(finalDistrictId) || finalDistrictId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid district ID",
      });
    }

    if (!Number.isInteger(finalStateId) || finalStateId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid state ID",
      });
    }

    const stateExists = await State.findOne({
      state_id: finalStateId,
    });

    if (!stateExists) {
      return res.status(404).json({
        success: false,
        message: `State with ID ${finalStateId} not found`,
      });
    }

    const districtExists = await District.findOne({
      district_id: finalDistrictId,
    });

    if (!districtExists) {
      return res.status(404).json({
        success: false,
        message: `District with ID ${finalDistrictId} not found`,
      });
    }

    if (districtExists.state_id !== finalStateId) {
      return res.status(400).json({
        success: false,
        message: `District ${finalDistrictId} does not belong to State ${finalStateId}`,
      });
    }

    const duplicateCity = await City.findOne({
      _id: {
        $ne: city._id,
      },

      district_id: finalDistrictId,
      state_id: finalStateId,

      city_name: {
        $regex: `^${escapeRegex(finalCityName)}$`,
        $options: "i",
      },
    });

    if (duplicateCity) {
      return res.status(409).json({
        success: false,
        message: "City already exists in this district",
      });
    }

    city.city_name = finalCityName;
    city.district_id = finalDistrictId;
    city.state_id = finalStateId;

    // Update city_id
    if (city_id !== undefined && city_id !== null && city_id !== "") {
      const newCityId = Number(city_id);

      if (!Number.isInteger(newCityId) || newCityId <= 0) {
        return res.status(400).json({
          success: false,
          message: "City ID must be a positive integer",
        });
      }

      if (newCityId !== currentCityId) {
        const duplicateId = await City.findOne({
          city_id: newCityId,
        });

        if (duplicateId) {
          return res.status(409).json({
            success: false,
            message: `City ID ${newCityId} already exists`,
          });
        }

        city.city_id = newCityId;

        await syncCityCounter(newCityId);
      }
    }

    await city.save();

    return res.status(200).json({
      success: true,
      message: "City updated successfully",
      data: city,
    });
  } catch (error) {
    console.error("Update city error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update city",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE CITY
// =====================================================

export const deleteCity = async (req, res) => {
  try {
    const cityId = Number(req.params.id);

    if (!Number.isInteger(cityId) || cityId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid city ID",
      });
    }

    const city = await City.findOneAndDelete({
      city_id: cityId,
    });

    if (!city) {
      return res.status(404).json({
        success: false,
        message: "City not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "City deleted successfully",
      data: city,
    });
  } catch (error) {
    console.error("Delete city error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete city",
      error: error.message,
    });
  }
};

// =====================================================
// IMPORT CITY FROM EXCEL
// =====================================================

// export const importCities = async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: "Excel file is required",
//       });
//     }

//     const workbook = XLSX.read(req.file.buffer, {
//       type: "buffer",
//     });

//     const firstSheetName = workbook.SheetNames[0];

//     if (!firstSheetName) {
//       return res.status(400).json({
//         success: false,
//         message: "Excel file does not contain any sheet",
//       });
//     }

//     const worksheet = workbook.Sheets[firstSheetName];

//     const rows = XLSX.utils.sheet_to_json(worksheet, {
//       defval: "",
//     });

//     if (!rows.length) {
//       return res.status(400).json({
//         success: false,
//         message: "Excel file does not contain any data",
//       });
//     }

//     const imported = [];
//     const failed = [];

//     for (let index = 0; index < rows.length; index++) {
//       const row = rows[index];

//       try {
//         let cityId = row.city_id ?? row["City ID"] ?? row["city id"] ?? "";

//         let cityName =
//           row.city_name ?? row["City Name"] ?? row["city name"] ?? "";

//         let districtId =
//           row.district_id ?? row["District ID"] ?? row["district id"] ?? "";

//         let stateId = row.state_id ?? row["State ID"] ?? row["state id"] ?? "";

//         cityName = String(cityName).trim();

//         if (!cityName) {
//           failed.push({
//             row: index + 2,
//             data: row,
//             message: "City name is required",
//           });

//           continue;
//         }

//         if (
//           districtId === "" ||
//           districtId === null ||
//           districtId === undefined
//         ) {
//           failed.push({
//             row: index + 2,
//             data: row,
//             message: "District ID is required",
//           });

//           continue;
//         }

//         districtId = Number(districtId);

//         if (!Number.isInteger(districtId) || districtId <= 0) {
//           failed.push({
//             row: index + 2,
//             data: row,
//             message: "Invalid district ID",
//           });

//           continue;
//         }

//         if (stateId === "" || stateId === null || stateId === undefined) {
//           failed.push({
//             row: index + 2,
//             data: row,
//             message: "State ID is required",
//           });

//           continue;
//         }

//         stateId = Number(stateId);

//         if (!Number.isInteger(stateId) || stateId <= 0) {
//           failed.push({
//             row: index + 2,
//             data: row,
//             message: "Invalid state ID",
//           });

//           continue;
//         }

//         // State validation
//         const stateExists = await State.findOne({
//           state_id: stateId,
//         });

//         if (!stateExists) {
//           failed.push({
//             row: index + 2,
//             data: row,
//             message: `State ID ${stateId} does not exist`,
//           });

//           continue;
//         }

//         // District validation
//         const districtExists = await District.findOne({
//           district_id: districtId,
//         });

//         if (!districtExists) {
//           failed.push({
//             row: index + 2,
//             data: row,
//             message: `District ID ${districtId} does not exist`,
//           });

//           continue;
//         }

//         // Relation validation
//         if (districtExists.state_id !== stateId) {
//           failed.push({
//             row: index + 2,
//             data: row,
//             message: `District ${districtId} does not belong to State ${stateId}`,
//           });

//           continue;
//         }

//         // Duplicate city
//         const duplicateCity = await City.findOne({
//           district_id: districtId,
//           state_id: stateId,

//           city_name: {
//             $regex: `^${escapeRegex(cityName)}$`,
//             $options: "i",
//           },
//         });

//         if (duplicateCity) {
//           failed.push({
//             row: index + 2,
//             data: row,
//             message: `City "${cityName}" already exists in District ${districtId}`,
//           });

//           continue;
//         }

//         // Manual city ID
//         if (cityId !== "" && cityId !== null && cityId !== undefined) {
//           cityId = Number(cityId);

//           if (!Number.isInteger(cityId) || cityId <= 0) {
//             failed.push({
//               row: index + 2,
//               data: row,
//               message: "Invalid city ID",
//             });

//             continue;
//           }

//           const duplicateId = await City.findOne({
//             city_id: cityId,
//           });

//           if (duplicateId) {
//             failed.push({
//               row: index + 2,
//               data: row,
//               message: `City ID ${cityId} already exists`,
//             });

//             continue;
//           }

//           await syncCityCounter(cityId);
//         } else {
//           cityId = await getNextAvailableCityId();
//         }

//         const city = await City.create({
//           city_id: cityId,
//           city_name: cityName,
//           district_id: districtId,
//           state_id: stateId,
//         });

//         imported.push({
//           row: index + 2,
//           city_id: city.city_id,
//           city_name: city.city_name,
//           district_id: city.district_id,
//           state_id: city.state_id,
//         });
//       } catch (rowError) {
//         failed.push({
//           row: index + 2,
//           data: row,
//           message: rowError.message,
//         });
//       }
//     }

//     return res.status(200).json({
//       success: true,
//       message: "City import completed",

//       summary: {
//         totalRows: rows.length,
//         imported: imported.length,
//         failed: failed.length,
//       },

//       imported,
//       failed,
//     });
//   } catch (error) {
//     console.error("Import cities error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to import cities",
//       error: error.message,
//     });
//   }
// };

export const importCities = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required",
      });
    }

    // ==========================================
    // READ EXCEL
    // ==========================================
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

    // Optional safety limit
    if (rows.length > 10000) {
      return res.status(400).json({
        success: false,
        message: "Maximum 10,000 rows allowed per import",
      });
    }

    const failed = [];
    const validRows = [];

    // ==========================================
    // COLLECT STATE + DISTRICT IDS FROM EXCEL
    // ==========================================
    const excelStateIds = new Set();
    const excelDistrictIds = new Set();

    for (const row of rows) {
      const stateId =
        row.state_id ??
        row["State ID"] ??
        row["state id"] ??
        "";

      const districtId =
        row.district_id ??
        row["District ID"] ??
        row["district id"] ??
        "";

      if (
        stateId !== "" &&
        stateId !== null &&
        stateId !== undefined
      ) {
        const numericStateId = Number(stateId);

        if (Number.isInteger(numericStateId)) {
          excelStateIds.add(numericStateId);
        }
      }

      if (
        districtId !== "" &&
        districtId !== null &&
        districtId !== undefined
      ) {
        const numericDistrictId = Number(districtId);

        if (Number.isInteger(numericDistrictId)) {
          excelDistrictIds.add(numericDistrictId);
        }
      }
    }

    // ==========================================
    // LOAD ONLY REQUIRED STATES
    // ==========================================
    const states = await State.find(
      {
        state_id: {
          $in: [...excelStateIds],
        },
      },
      {
        state_id: 1,
      }
    ).lean();

    const validStateIds = new Set(
      states.map((state) => Number(state.state_id))
    );

    // ==========================================
    // LOAD ONLY REQUIRED DISTRICTS
    // ==========================================
    const districts = await District.find(
      {
        district_id: {
          $in: [...excelDistrictIds],
        },
      },
      {
        district_id: 1,
        state_id: 1,
      }
    ).lean();

    // districtId -> stateId
    const districtStateMap = new Map();

    districts.forEach((district) => {
      districtStateMap.set(
        Number(district.district_id),
        Number(district.state_id)
      );
    });

    // ==========================================
    // LOAD EXISTING CITIES
    // ==========================================
    const existingCities = await City.find(
      {},
      {
        city_id: 1,
        city_name: 1,
        district_id: 1,
        state_id: 1,
      }
    ).lean();

    const existingCityIds = new Set(
      existingCities.map((city) =>
        Number(city.city_id)
      )
    );

    // state + district + city name
    const existingCityKeys = new Set(
      existingCities.map((city) => {
        const normalizedName =
          String(city.city_name)
            .trim()
            .toLowerCase();

        return `${city.state_id}::${city.district_id}::${normalizedName}`;
      })
    );

    // ==========================================
    // TRACK DUPLICATES INSIDE EXCEL
    // ==========================================
    const excelCityIds = new Set();
    const excelCityKeys = new Set();

    // ==========================================
    // FIND MAX CITY ID
    // ==========================================
    let maxCityId =
      existingCities.length > 0
        ? Math.max(
            ...existingCities.map(
              (city) =>
                Number(city.city_id) || 0
            )
          )
        : 0;

    // ==========================================
    // VALIDATE ROWS IN MEMORY
    // ==========================================
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];

      let cityId =
        row.city_id ??
        row["City ID"] ??
        row["city id"] ??
        "";

      let cityName =
        row.city_name ??
        row["City Name"] ??
        row["city name"] ??
        "";

      let districtId =
        row.district_id ??
        row["District ID"] ??
        row["district id"] ??
        "";

      let stateId =
        row.state_id ??
        row["State ID"] ??
        row["state id"] ??
        "";

      cityName = String(cityName).trim();

      // ==========================================
      // CITY NAME REQUIRED
      // ==========================================
      if (!cityName) {
        failed.push({
          row: index + 2,
          data: row,
          message: "City name is required",
        });

        continue;
      }

      // ==========================================
      // DISTRICT ID REQUIRED
      // ==========================================
      if (
        districtId === "" ||
        districtId === null ||
        districtId === undefined
      ) {
        failed.push({
          row: index + 2,
          data: row,
          message: "District ID is required",
        });

        continue;
      }

      districtId = Number(districtId);

      if (
        !Number.isInteger(districtId) ||
        districtId <= 0
      ) {
        failed.push({
          row: index + 2,
          data: row,
          message: "Invalid district ID",
        });

        continue;
      }

      // ==========================================
      // STATE ID REQUIRED
      // ==========================================
      if (
        stateId === "" ||
        stateId === null ||
        stateId === undefined
      ) {
        failed.push({
          row: index + 2,
          data: row,
          message: "State ID is required",
        });

        continue;
      }

      stateId = Number(stateId);

      if (
        !Number.isInteger(stateId) ||
        stateId <= 0
      ) {
        failed.push({
          row: index + 2,
          data: row,
          message: "Invalid state ID",
        });

        continue;
      }

      // ==========================================
      // STATE EXISTS
      // ==========================================
      if (!validStateIds.has(stateId)) {
        failed.push({
          row: index + 2,
          data: row,
          message: `State ID ${stateId} does not exist`,
        });

        continue;
      }

      // ==========================================
      // DISTRICT EXISTS
      // ==========================================
      const districtStateId =
        districtStateMap.get(districtId);

      if (districtStateId === undefined) {
        failed.push({
          row: index + 2,
          data: row,
          message: `District ID ${districtId} does not exist`,
        });

        continue;
      }

      // ==========================================
      // DISTRICT → STATE RELATION
      // ==========================================
      if (districtStateId !== stateId) {
        failed.push({
          row: index + 2,
          data: row,
          message: `District ${districtId} does not belong to State ${stateId}`,
        });

        continue;
      }

      const normalizedCityName =
        cityName.toLowerCase();

      const cityKey =
        `${stateId}::${districtId}::${normalizedCityName}`;

      // ==========================================
      // DUPLICATE CITY IN DATABASE
      // ==========================================
      if (existingCityKeys.has(cityKey)) {
        failed.push({
          row: index + 2,
          data: row,
          message:
            `City "${cityName}" already exists in District ${districtId}`,
        });

        continue;
      }

      // ==========================================
      // DUPLICATE CITY INSIDE EXCEL
      // ==========================================
      if (excelCityKeys.has(cityKey)) {
        failed.push({
          row: index + 2,
          data: row,
          message:
            `Duplicate city "${cityName}" found in Excel for District ${districtId}`,
        });

        continue;
      }

      // ==========================================
      // MANUAL CITY ID
      // ==========================================
      if (
        cityId !== "" &&
        cityId !== null &&
        cityId !== undefined
      ) {
        cityId = Number(cityId);

        if (
          !Number.isInteger(cityId) ||
          cityId <= 0
        ) {
          failed.push({
            row: index + 2,
            data: row,
            message: "Invalid city ID",
          });

          continue;
        }

        // Duplicate ID in database
        if (existingCityIds.has(cityId)) {
          failed.push({
            row: index + 2,
            data: row,
            message:
              `City ID ${cityId} already exists`,
          });

          continue;
        }

        // Duplicate ID inside Excel
        if (excelCityIds.has(cityId)) {
          failed.push({
            row: index + 2,
            data: row,
            message:
              `Duplicate City ID ${cityId} found in Excel`,
          });

          continue;
        }

        if (cityId > maxCityId) {
          maxCityId = cityId;
        }
      }

      // ==========================================
      // AUTO CITY ID
      // ==========================================
      else {
        do {
          maxCityId++;
        } while (
          existingCityIds.has(maxCityId) ||
          excelCityIds.has(maxCityId)
        );

        cityId = maxCityId;
      }

      // ==========================================
      // TRACK CURRENT EXCEL ROW
      // ==========================================
      excelCityIds.add(cityId);
      excelCityKeys.add(cityKey);

      validRows.push({
        row: index + 2,

        document: {
          city_id: cityId,
          city_name: cityName,
          district_id: districtId,
          state_id: stateId,
        },
      });
    }

    // ==========================================
    // BULK INSERT
    // ==========================================
    const documents = validRows.map(
      (item) => item.document
    );

    let insertedDocs = [];

    if (documents.length > 0) {
      insertedDocs = await City.insertMany(
        documents,
        {
          ordered: false,
        }
      );
    }

    // ==========================================
    // SYNC COUNTER ONLY ONCE
    // ==========================================
    if (insertedDocs.length > 0) {
      const highestInsertedCityId =
        Math.max(
          ...insertedDocs.map(
            (city) =>
              Number(city.city_id)
          )
        );

      await syncCityCounter(
        highestInsertedCityId
      );
    }

    // ==========================================
    // PREPARE IMPORTED RESPONSE
    // ==========================================
    const imported = insertedDocs.map(
      (city, index) => ({
        row: validRows[index]?.row,

        city_id:
          city.city_id,

        city_name:
          city.city_name,

        district_id:
          city.district_id,

        state_id:
          city.state_id,
      })
    );

    return res.status(200).json({
      success: true,
      message: "City import completed",

      summary: {
        totalRows: rows.length,
        imported: imported.length,
        failed: failed.length,
      },

      imported,
      failed,
    });
  } catch (error) {
    console.error(
      "Import cities error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to import cities",
      error: error.message,
    });
  }
};

// =====================================================
// EXPORT CITIES
// =====================================================

export const exportCities = async (req, res) => {
  try {
    const cities = await City.find()
      .sort({
        city_id: 1,
      })
      .lean();

    const excelData = cities.map((city) => ({
      city_id: city.city_id,
      city_name: city.city_name,
      district_id: city.district_id,
      state_id: city.state_id,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    worksheet["!cols"] = [{ wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Cities");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader("Content-Disposition", 'attachment; filename="cities.xlsx"');

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    return res.send(buffer);
  } catch (error) {
    console.error("Export cities error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to export cities",
      error: error.message,
    });
  }
};

// =====================================================
// NEXT AVAILABLE CITY ID
// =====================================================

const getNextAvailableCityId = async () => {
  let cityId = await getNextCityId();

  let existing = await City.exists({
    city_id: cityId,
  });

  while (existing) {
    cityId = await getNextCityId();

    existing = await City.exists({
      city_id: cityId,
    });
  }

  return cityId;
};

export const getCitiesByStateAndDistrict = async (req, res) => {
  try {
    const { state_id, district_id } = req.params;

    const stateId = Number(state_id);
    const districtId = Number(district_id);

    if (!Number.isInteger(stateId) || stateId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid state_id is required",
      });
    }

    if (!Number.isInteger(districtId) || districtId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid district_id is required",
      });
    }

    const cities = await City.find({
      state_id: stateId,
      district_id: districtId,
    })
      .select("_id city_id city_name state_id district_id")
      .sort({ city_name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Cities fetched successfully",
      data: cities,
      total: cities.length,
    });
  } catch (error) {
    console.error("Get cities error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch cities",
      error: error.message,
    });
  }
};

export const getCitiesByStateOrDistrict = async (req, res) => {
  try {
    const { state_id, district_id } = req.query;

    const filter = {};

    // ==========================================
    // STATE FILTER
    // ==========================================

    if (state_id) {
      const stateId = Number(state_id);

      if (!Number.isInteger(stateId) || stateId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid state_id is required",
        });
      }

      filter.state_id = stateId;
    }

    // ==========================================
    // DISTRICT FILTER
    // ==========================================

    if (district_id) {
      const districtId = Number(district_id);

      if (!Number.isInteger(districtId) || districtId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid district_id is required",
        });
      }

      filter.district_id = districtId;
    }

    // ==========================================
    // AT LEAST ONE FILTER REQUIRED
    // ==========================================

    if (!state_id && !district_id) {
      return res.status(400).json({
        success: false,
        message: "state_id or district_id is required",
      });
    }

    // ==========================================
    // GET CITIES
    // ==========================================

    const cities = await City.find(filter)
      .select(
        "_id city_id city_name state_id district_id"
      )
      .sort({
        city_name: 1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Cities fetched successfully",
      data: cities,
      total: cities.length,
    });

  } catch (error) {
    console.error("Get cities error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch cities",
      error: error.message,
    });
  }
};

export const getCityDropdown = async (req, res) => {
  try {
    const {
      state_id,
      district_id,
      search = "",
    } = req.query;

    const filter = {};

    // ==========================================
    // STATE FILTER
    // ==========================================

    if (
      state_id !== undefined &&
      state_id !== null &&
      state_id !== ""
    ) {
      const stateId = Number(state_id);

      if (
        !Number.isInteger(stateId) ||
        stateId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Valid state_id is required",
        });
      }

      filter.state_id = stateId;
    }

    // ==========================================
    // DISTRICT FILTER
    // ==========================================

    if (
      district_id !== undefined &&
      district_id !== null &&
      district_id !== ""
    ) {
      const districtId = Number(district_id);

      if (
        !Number.isInteger(districtId) ||
        districtId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Valid district_id is required",
        });
      }

      filter.district_id = districtId;
    }

    // ==========================================
    // CITY SEARCH
    // ==========================================

    if (String(search).trim()) {
      filter.city_name = {
        $regex: escapeRegex(
          String(search).trim()
        ),
        $options: "i",
      };
    }

    // ==========================================
    // GET CITIES
    // ==========================================

    const cities = await City.find(filter)
      .select(
        "_id city_id city_name district_id state_id"
      )
      .sort({
        city_name: 1,
      })
      .limit(200)
      .lean();

    // ==========================================
    // COLLECT DISTRICT IDS
    // ==========================================

    const districtIds = [
      ...new Set(
        cities
          .map((city) => city.district_id)
          .filter(
            (value) =>
              value !== null &&
              value !== undefined
          )
      ),
    ];

    // ==========================================
    // COLLECT STATE IDS
    // ==========================================

    const stateIds = [
      ...new Set(
        cities
          .map((city) => city.state_id)
          .filter(
            (value) =>
              value !== null &&
              value !== undefined
          )
      ),
    ];

    // ==========================================
    // GET DISTRICTS + STATES
    // ==========================================

    const [districts, states] =
      await Promise.all([
        District.find({
          district_id: {
            $in: districtIds,
          },
        })
          .select(
            "district_id district_name state_id"
          )
          .lean(),

        State.find({
          state_id: {
            $in: stateIds,
          },
        })
          .select(
            "state_id state_name"
          )
          .lean(),
      ]);

    // ==========================================
    // CREATE MAPS
    // ==========================================

    const districtMap = new Map(
      districts.map((district) => [
        district.district_id,
        district,
      ])
    );

    const stateMap = new Map(
      states.map((state) => [
        state.state_id,
        state,
      ])
    );

    // ==========================================
    // RESPONSE DATA
    // ==========================================

    const data = cities.map((city) => {
      const district =
        city.district_id !== null &&
        city.district_id !== undefined
          ? districtMap.get(
              city.district_id
            )
          : null;

      const state =
        city.state_id !== null &&
        city.state_id !== undefined
          ? stateMap.get(
              city.state_id
            )
          : null;

      return {
        city_id:
          city.city_id,

        city_name:
          city.city_name,

        district_id:
          district?.district_id ??
          city.district_id ??
          null,

        district_name:
          district?.district_name ??
          null,

        state_id:
          state?.state_id ??
          city.state_id ??
          null,

        state_name:
          state?.state_name ??
          null,
      };
    });

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      message:
        "City dropdown fetched successfully",
      data,
      total: data.length,
    });

  } catch (error) {
    console.error(
      "City dropdown error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch city dropdown",
      error: error.message,
    });
  }
};
// =====================================================
// ESCAPE REGEX
// =====================================================

const escapeRegex = (value) => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
