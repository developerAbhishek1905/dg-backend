import XLSX from "xlsx";

import District from "../model/district.model.js";
import State from "../model/state.model.js";

import {
  getNextDistrictId,
  syncDistrictCounter,
} from "../utils/districtId.util.js";


// =====================================================
// CREATE DISTRICT
// =====================================================

export const createDistrict = async (req, res) => {
  try {
    let {
      district_id,
      district_name,
      state_id,
    } = req.body;

    // ==============================
    // Validate district name
    // ==============================

    if (
      !district_name ||
      !String(district_name).trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "District name is required",
      });
    }

    district_name = String(district_name).trim();


    // ==============================
    // Validate state ID
    // ==============================

    if (
      state_id === undefined ||
      state_id === null ||
      state_id === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "State ID is required",
      });
    }

    state_id = Number(state_id);

    if (
      !Number.isInteger(state_id) ||
      state_id <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "State ID must be a positive integer",
      });
    }


    // ==============================
    // Check state exists
    // ==============================

    const stateExists = await State.findOne({
      state_id,
    });

    if (!stateExists) {
      return res.status(404).json({
        success: false,
        message: `State with ID ${state_id} not found`,
      });
    }


    // ==============================
    // Duplicate district in same state
    // ==============================

    const duplicateDistrict = await District.findOne({
      state_id,

      district_name: {
        $regex: `^${escapeRegex(district_name)}$`,
        $options: "i",
      },
    });

    if (duplicateDistrict) {
      return res.status(409).json({
        success: false,
        message:
          "District already exists in this state",
      });
    }


    // ==============================
    // Manual district ID
    // ==============================

    if (
      district_id !== undefined &&
      district_id !== null &&
      district_id !== ""
    ) {
      district_id = Number(district_id);

      if (
        !Number.isInteger(district_id) ||
        district_id <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "District ID must be a positive integer",
        });
      }

      const existingId = await District.findOne({
        district_id,
      });

      if (existingId) {
        return res.status(409).json({
          success: false,
          message:
            `District ID ${district_id} already exists`,
        });
      }

      await syncDistrictCounter(district_id);
    }

    // ==============================
    // Auto generate district ID
    // ==============================

    else {
      district_id =
        await getNextAvailableDistrictId();
    }


    // ==============================
    // Create
    // ==============================

    const district = await District.create({
      district_id,
      district_name,
      state_id,
    });

    return res.status(201).json({
      success: true,
      message: "District created successfully",
      data: district,
    });

  } catch (error) {
    console.error("Create district error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "District ID or district already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create district",
      error: error.message,
    });
  }
};


// =====================================================
// GET ALL DISTRICTS
// =====================================================

export const getAllDistricts = async (req, res) => {
  try {
    const {
      search = "",
      state_id,
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
    // SEARCH
    // ==========================================

    if (String(search).trim()) {
      const searchValue = String(search).trim();

      filter.district_name = {
        $regex: escapeRegex(searchValue),
        $options: "i",
      };
    }

    // ==========================================
    // TOTAL
    // ==========================================

    const total = await District.countDocuments(filter);

    // ==========================================
    // GET DISTRICTS
    // ==========================================

    const districts = await District.find(filter)
      .sort({
        district_name: 1,
      })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .lean();

    // ==========================================
    // GET STATE NAMES
    // ==========================================

    const stateIds = [
      ...new Set(
        districts.map((district) => district.state_id)
      ),
    ];

    const states = await State.find({
      state_id: {
        $in: stateIds,
      },
    })
      .select("state_id state_name")
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
    // MERGE STATE NAME
    // ==========================================

    const data = districts.map((district) => ({
      ...district,

      state_name:
        stateMap.get(district.state_id) || null,
    }));

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      message: "Districts fetched successfully",

      data,

      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    });

  } catch (error) {
    console.error("Get districts error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch districts",
      error: error.message,
    });
  }
};


// =====================================================
// GET DISTRICT BY ID
// =====================================================

export const getDistrictById = async (
  req,
  res
) => {
  try {
    const districtId =
      Number(req.params.id);

    if (
      !Number.isInteger(districtId) ||
      districtId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid district ID",
      });
    }

    const district =
      await District.findOne({
        district_id: districtId,
      });

    if (!district) {
      return res.status(404).json({
        success: false,
        message: "District not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "District fetched successfully",
      data: district,
    });

  } catch (error) {
    console.error(
      "Get district error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch district",
      error: error.message,
    });
  }
};


// =====================================================
// UPDATE DISTRICT
// =====================================================

export const updateDistrict = async (
  req,
  res
) => {
  try {
    const currentDistrictId =
      Number(req.params.id);

    if (
      !Number.isInteger(
        currentDistrictId
      ) ||
      currentDistrictId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid district ID",
      });
    }


    const district =
      await District.findOne({
        district_id:
          currentDistrictId,
      });

    if (!district) {
      return res.status(404).json({
        success: false,
        message: "District not found",
      });
    }


    let {
      district_id,
      district_name,
      state_id,
    } = req.body;


    // ==============================
    // Determine final values
    // ==============================

    const finalDistrictName =
      district_name !== undefined
        ? String(
            district_name
          ).trim()
        : district.district_name;

    const finalStateId =
      state_id !== undefined &&
      state_id !== null &&
      state_id !== ""
        ? Number(state_id)
        : district.state_id;


    if (!finalDistrictName) {
      return res.status(400).json({
        success: false,
        message:
          "District name cannot be empty",
      });
    }


    // ==============================
    // Validate state
    // ==============================

    if (
      !Number.isInteger(finalStateId) ||
      finalStateId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "State ID must be a positive integer",
      });
    }


    const stateExists =
      await State.findOne({
        state_id: finalStateId,
      });

    if (!stateExists) {
      return res.status(404).json({
        success: false,
        message:
          `State with ID ${finalStateId} not found`,
      });
    }


    // ==============================
    // Check duplicate district
    // ==============================

    const duplicateDistrict =
      await District.findOne({
        _id: {
          $ne: district._id,
        },

        state_id: finalStateId,

        district_name: {
          $regex:
            `^${escapeRegex(
              finalDistrictName
            )}$`,
          $options: "i",
        },
      });

    if (duplicateDistrict) {
      return res.status(409).json({
        success: false,
        message:
          "District already exists in this state",
      });
    }


    district.district_name =
      finalDistrictName;

    district.state_id =
      finalStateId;


    // ==============================
    // Update district ID
    // ==============================

    if (
      district_id !== undefined &&
      district_id !== null &&
      district_id !== ""
    ) {
      const newDistrictId =
        Number(district_id);

      if (
        !Number.isInteger(
          newDistrictId
        ) ||
        newDistrictId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "District ID must be a positive integer",
        });
      }

      if (
        newDistrictId !==
        currentDistrictId
      ) {
        const duplicateId =
          await District.findOne({
            district_id:
              newDistrictId,
          });

        if (duplicateId) {
          return res.status(409).json({
            success: false,
            message:
              `District ID ${newDistrictId} already exists`,
          });
        }

        district.district_id =
          newDistrictId;

        await syncDistrictCounter(
          newDistrictId
        );
      }
    }


    await district.save();

    return res.status(200).json({
      success: true,
      message:
        "District updated successfully",
      data: district,
    });

  } catch (error) {
    console.error(
      "Update district error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update district",
      error: error.message,
    });
  }
};


// =====================================================
// DELETE DISTRICT
// =====================================================

export const deleteDistrict = async (
  req,
  res
) => {
  try {
    const districtId =
      Number(req.params.id);

    if (
      !Number.isInteger(districtId) ||
      districtId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid district ID",
      });
    }


    const district =
      await District.findOneAndDelete({
        district_id: districtId,
      });

    if (!district) {
      return res.status(404).json({
        success: false,
        message: "District not found",
      });
    }


    return res.status(200).json({
      success: true,
      message:
        "District deleted successfully",
      data: district,
    });

  } catch (error) {
    console.error(
      "Delete district error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete district",
      error: error.message,
    });
  }
};


// =====================================================
// IMPORT DISTRICTS FROM EXCEL
// =====================================================

// export const importDistricts = async (
//   req,
//   res
// ) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Excel file is required",
//       });
//     }


//     const workbook = XLSX.read(
//       req.file.buffer,
//       {
//         type: "buffer",
//       }
//     );

//     const firstSheetName =
//       workbook.SheetNames[0];

//     if (!firstSheetName) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Excel file does not contain any sheet",
//       });
//     }


//     const worksheet =
//       workbook.Sheets[
//         firstSheetName
//       ];

//     const rows =
//       XLSX.utils.sheet_to_json(
//         worksheet,
//         {
//           defval: "",
//         }
//       );


//     if (!rows.length) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "Excel file does not contain any data",
//       });
//     }


//     const imported = [];
//     const failed = [];


//     for (
//       let index = 0;
//       index < rows.length;
//       index++
//     ) {
//       const row = rows[index];

//       try {
//         let districtId =
//           row.district_id ??
//           row["District ID"] ??
//           row["district id"] ??
//           "";

//         let districtName =
//           row.district_name ??
//           row["District Name"] ??
//           row["district name"] ??
//           "";

//         let stateId =
//           row.state_id ??
//           row["State ID"] ??
//           row["state id"] ??
//           "";


//         // ==============================
//         // District name required
//         // ==============================

//         districtName =
//           String(
//             districtName
//           ).trim();

//         if (!districtName) {
//           failed.push({
//             row: index + 2,
//             data: row,
//             message:
//               "District name is required",
//           });

//           continue;
//         }


//         // ==============================
//         // State ID required
//         // ==============================

//         if (
//           stateId === "" ||
//           stateId === null ||
//           stateId === undefined
//         ) {
//           failed.push({
//             row: index + 2,
//             data: row,
//             message:
//               "State ID is required",
//           });

//           continue;
//         }


//         stateId = Number(stateId);

//         if (
//           !Number.isInteger(
//             stateId
//           ) ||
//           stateId <= 0
//         ) {
//           failed.push({
//             row: index + 2,
//             data: row,
//             message:
//               "State ID must be a positive integer",
//           });

//           continue;
//         }


//         // ==============================
//         // Check state exists
//         // ==============================

//         const stateExists =
//           await State.findOne({
//             state_id: stateId,
//           });

//         if (!stateExists) {
//           failed.push({
//             row: index + 2,
//             data: row,
//             message:
//               `State ID ${stateId} does not exist`,
//           });

//           continue;
//         }


//         // ==============================
//         // Duplicate district name
//         // in same state
//         // ==============================

//         const duplicateDistrict =
//           await District.findOne({
//             state_id: stateId,

//             district_name: {
//               $regex:
//                 `^${escapeRegex(
//                   districtName
//                 )}$`,
//               $options: "i",
//             },
//           });

//         if (duplicateDistrict) {
//           failed.push({
//             row: index + 2,
//             data: row,
//             message:
//               `District "${districtName}" already exists in state ${stateId}`,
//           });

//           continue;
//         }


//         // ==============================
//         // Manual district ID
//         // ==============================

//         if (
//           districtId !== "" &&
//           districtId !== null &&
//           districtId !== undefined
//         ) {
//           districtId =
//             Number(districtId);

//           if (
//             !Number.isInteger(
//               districtId
//             ) ||
//             districtId <= 0
//           ) {
//             failed.push({
//               row: index + 2,
//               data: row,
//               message:
//                 "District ID must be a positive integer",
//             });

//             continue;
//           }


//           const duplicateId =
//             await District.findOne({
//               district_id:
//                 districtId,
//             });

//           if (duplicateId) {
//             failed.push({
//               row: index + 2,
//               data: row,
//               message:
//                 `District ID ${districtId} already exists`,
//             });

//             continue;
//           }

//           await syncDistrictCounter(
//             districtId
//           );
//         }

//         // ==============================
//         // Auto ID
//         // ==============================

//         else {
//           districtId =
//             await getNextAvailableDistrictId();
//         }


//         // ==============================
//         // Save
//         // ==============================

//         const district =
//           await District.create({
//             district_id:
//               districtId,

//             district_name:
//               districtName,

//             state_id:
//               stateId,
//           });


//         imported.push({
//           row: index + 2,

//           district_id:
//             district.district_id,

//           district_name:
//             district.district_name,

//           state_id:
//             district.state_id,
//         });

//       } catch (rowError) {
//         failed.push({
//           row: index + 2,
//           data: row,
//           message:
//             rowError.message,
//         });
//       }
//     }


//     return res.status(200).json({
//       success: true,
//       message:
//         "District import completed",

//       summary: {
//         totalRows: rows.length,
//         imported:
//           imported.length,
//         failed:
//           failed.length,
//       },

//       imported,
//       failed,
//     });

//   } catch (error) {
//     console.error(
//       "Import districts error:",
//       error
//     );

//     return res.status(500).json({
//       success: false,
//       message:
//         "Failed to import districts",
//       error: error.message,
//     });
//   }
// };
export const importDistricts = async (req, res) => {
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
    // LOAD ALL STATES ONCE
    // ==========================================
    const states = await State.find(
      {},
      {
        state_id: 1,
      }
    ).lean();

    const validStateIds = new Set(
      states.map((state) => Number(state.state_id))
    );

    // ==========================================
    // LOAD EXISTING DISTRICTS ONCE
    // ==========================================
    const existingDistricts = await District.find(
      {},
      {
        district_id: 1,
        district_name: 1,
        state_id: 1,
      }
    ).lean();

    // Existing district IDs
    const existingDistrictIds = new Set(
      existingDistricts.map((district) =>
        Number(district.district_id)
      )
    );

    // Existing district name + state combination
    const existingDistrictKeys = new Set(
      existingDistricts.map((district) => {
        const name = String(district.district_name)
          .trim()
          .toLowerCase();

        return `${district.state_id}::${name}`;
      })
    );

    // ==========================================
    // TRACK DUPLICATES INSIDE EXCEL
    // ==========================================
    const excelDistrictIds = new Set();
    const excelDistrictKeys = new Set();

    // ==========================================
    // FIND CURRENT MAX DISTRICT ID
    // ==========================================
    let maxDistrictId =
      existingDistricts.length > 0
        ? Math.max(
            ...existingDistricts.map(
              (district) =>
                Number(district.district_id) || 0
            )
          )
        : 0;

    // ==========================================
    // VALIDATE ROWS IN MEMORY
    // ==========================================
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];

      let districtId =
        row.district_id ??
        row["District ID"] ??
        row["district id"] ??
        "";

      let districtName =
        row.district_name ??
        row["District Name"] ??
        row["district name"] ??
        "";

      let stateId =
        row.state_id ??
        row["State ID"] ??
        row["state id"] ??
        "";

      districtName = String(districtName).trim();

      // ==========================================
      // DISTRICT NAME REQUIRED
      // ==========================================
      if (!districtName) {
        failed.push({
          row: index + 2,
          data: row,
          message: "District name is required",
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

      if (!Number.isInteger(stateId) || stateId <= 0) {
        failed.push({
          row: index + 2,
          data: row,
          message: "State ID must be a positive integer",
        });

        continue;
      }

      // ==========================================
      // CHECK STATE EXISTS
      // ==========================================
      if (!validStateIds.has(stateId)) {
        failed.push({
          row: index + 2,
          data: row,
          message: `State ID ${stateId} does not exist`,
        });

        continue;
      }

      const normalizedDistrictName =
        districtName.toLowerCase();

      const districtKey =
        `${stateId}::${normalizedDistrictName}`;

      // ==========================================
      // DUPLICATE DISTRICT IN DATABASE
      // ==========================================
      if (existingDistrictKeys.has(districtKey)) {
        failed.push({
          row: index + 2,
          data: row,
          message: `District "${districtName}" already exists in state ${stateId}`,
        });

        continue;
      }

      // ==========================================
      // DUPLICATE DISTRICT INSIDE EXCEL
      // ==========================================
      if (excelDistrictKeys.has(districtKey)) {
        failed.push({
          row: index + 2,
          data: row,
          message: `Duplicate district "${districtName}" found in Excel for state ${stateId}`,
        });

        continue;
      }

      // ==========================================
      // MANUAL DISTRICT ID
      // ==========================================
      if (
        districtId !== "" &&
        districtId !== null &&
        districtId !== undefined
      ) {
        districtId = Number(districtId);

        if (
          !Number.isInteger(districtId) ||
          districtId <= 0
        ) {
          failed.push({
            row: index + 2,
            data: row,
            message:
              "District ID must be a positive integer",
          });

          continue;
        }

        // Duplicate ID in database
        if (existingDistrictIds.has(districtId)) {
          failed.push({
            row: index + 2,
            data: row,
            message: `District ID ${districtId} already exists`,
          });

          continue;
        }

        // Duplicate ID inside Excel
        if (excelDistrictIds.has(districtId)) {
          failed.push({
            row: index + 2,
            data: row,
            message: `Duplicate District ID ${districtId} found in Excel`,
          });

          continue;
        }

        if (districtId > maxDistrictId) {
          maxDistrictId = districtId;
        }
      }

      // ==========================================
      // AUTO GENERATE DISTRICT ID
      // ==========================================
      else {
        do {
          maxDistrictId++;
        } while (
          existingDistrictIds.has(maxDistrictId) ||
          excelDistrictIds.has(maxDistrictId)
        );

        districtId = maxDistrictId;
      }

      // ==========================================
      // ADD TO IN-MEMORY TRACKERS
      // ==========================================
      excelDistrictIds.add(districtId);
      excelDistrictKeys.add(districtKey);

      validRows.push({
        row: index + 2,

        document: {
          district_id: districtId,
          district_name: districtName,
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
      insertedDocs = await District.insertMany(
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
      const highestInsertedDistrictId =
        Math.max(
          ...insertedDocs.map(
            (district) =>
              Number(district.district_id)
          )
        );

      await syncDistrictCounter(
        highestInsertedDistrictId
      );
    }

    // ==========================================
    // PREPARE RESPONSE
    // ==========================================
    const imported = insertedDocs.map(
      (district, index) => ({
        row: validRows[index]?.row,

        district_id:
          district.district_id,

        district_name:
          district.district_name,

        state_id:
          district.state_id,
      })
    );

    return res.status(200).json({
      success: true,
      message: "District import completed",

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
      "Import districts error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to import districts",
      error: error.message,
    });
  }
};


// =====================================================
// EXPORT DISTRICTS TO EXCEL
// =====================================================

export const exportDistricts = async (
  req,
  res
) => {
  try {
    const districts =
      await District.find()
        .sort({
          district_id: 1,
        })
        .lean();


    const excelData =
      districts.map(
        (district) => ({
          district_id:
            district.district_id,

          district_name:
            district.district_name,

          state_id:
            district.state_id,
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
        wch: 30,
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
      "Districts"
    );


    const buffer = XLSX.write(
      workbook,
      {
        type: "buffer",
        bookType: "xlsx",
      }
    );


    res.setHeader(
      "Content-Disposition",
      'attachment; filename="districts.xlsx"'
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );


    return res.send(buffer);

  } catch (error) {
    console.error(
      "Export districts error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to export districts",
      error: error.message,
    });
  }
};

export const getDistrictsDropdown = async (req, res) => {
  try {
    const {
      state_id,
      search = "",
    } = req.query;

    const filter = {};

    let selectedState = null;

    // ==========================================
    // STATE FILTER - OPTIONAL
    // ==========================================

    if (
      state_id !== undefined &&
      state_id !== null &&
      String(state_id).trim() !== ""
    ) {
      const stateId = Number(state_id);

      // Validate state id
      if (
        !Number.isInteger(stateId) ||
        stateId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Valid state_id is required",
        });
      }

      // Check state exists
      selectedState = await State.findOne({
        state_id: stateId,
      })
        .select("state_id state_name")
        .lean();

      if (!selectedState) {
        return res.status(404).json({
          success: false,
          message: `State with ID ${stateId} not found`,
        });
      }

      // Apply state filter
      filter.state_id = stateId;
    }

    // ==========================================
    // SEARCH BY DISTRICT NAME - OPTIONAL
    // ==========================================

    if (String(search).trim()) {
      const searchValue = String(search).trim();

      filter.district_name = {
        $regex: escapeRegex(searchValue),
        $options: "i",
      };
    }

    // ==========================================
    // GET DISTRICTS
    // ==========================================

    const districts = await District.find(filter)
      .select(
        "_id district_id district_name state_id"
      )
      .sort({
        district_name: 1,
      })
      .lean();

    // ==========================================
    // GET STATE NAMES
    // ==========================================

    const stateIds = [
      ...new Set(
        districts
          .map((district) => district.state_id)
          .filter(
            (id) =>
              id !== null &&
              id !== undefined
          )
      ),
    ];

    const states = await State.find({
      state_id: {
        $in: stateIds,
      },
    })
      .select("state_id state_name")
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
    // ADD STATE NAME
    // ==========================================

    const data = districts.map((district) => ({
      ...district,

      state_name:
        stateMap.get(district.state_id) || null,
    }));

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,
      message: "Districts fetched successfully",

      data,

      total: data.length,
    });
  } catch (error) {
    console.error(
      "Get districts dropdown error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch districts",
      error: error.message,
    });
  }
};


// =====================================================
// NEXT AVAILABLE DISTRICT ID
// =====================================================

const getNextAvailableDistrictId =
  async () => {
    let districtId =
      await getNextDistrictId();

    let existing =
      await District.exists({
        district_id:
          districtId,
      });

    while (existing) {
      districtId =
        await getNextDistrictId();

      existing =
        await District.exists({
          district_id:
            districtId,
        });
    }

    return districtId;
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