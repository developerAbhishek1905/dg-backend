import XLSX from "xlsx";

import State from "../model/state.model.js";

import { getNextStateId, syncStateCounter } from "../utils/stateId.util.js";

// CREATE STATE
export const createState = async (req, res) => {
  try {
    let { state_id, state_name } = req.body;

    if (!state_name || !String(state_name).trim()) {
      return res.status(400).json({
        success: false,
        message: "State name is required",
      });
    }

    state_name = String(state_name).trim();

    const existingStateName = await State.findOne({
      state_name: {
        $regex: `^${escapeRegex(state_name)}$`,
        $options: "i",
      },
    });

    if (existingStateName) {
      return res.status(409).json({
        success: false,
        message: "State name already exists",
      });
    }

    if (state_id !== undefined && state_id !== null && state_id !== "") {
      state_id = Number(state_id);

      if (!Number.isInteger(state_id) || state_id <= 0) {
        return res.status(400).json({
          success: false,
          message: "State ID must be a positive integer",
        });
      }

      const existingStateId = await State.findOne({
        state_id,
      });

      if (existingStateId) {
        return res.status(409).json({
          success: false,
          message: `State ID ${state_id} already exists`,
        });
      }

      await syncStateCounter(state_id);
    } else {
      state_id = await getNextAvailableStateId();
    }

    const state = await State.create({
      state_id,
      state_name,
    });

    return res.status(201).json({
      success: true,
      message: "State created successfully",
      data: state,
    });
  } catch (error) {
    console.error("Create state error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "State ID already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create state",
      error: error.message,
    });
  }
};

// GET ALL STATES
export const getAllStates = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 20 } = req.query;

    const pageNumber = Math.max(Number(page) || 1, 1);

    const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const filter = {};

    if (search.trim()) {
      const numericSearch = Number(search);

      filter.$or = [
        {
          state_name: {
            $regex: escapeRegex(search.trim()),
            $options: "i",
          },
        },
      ];

      if (!Number.isNaN(numericSearch) && Number.isInteger(numericSearch)) {
        filter.$or.push({
          state_id: numericSearch,
        });
      }
    }

    const total = await State.countDocuments(filter);

    const states = await State.find(filter)
      .sort({
        state_id: 1,
      })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    return res.status(200).json({
      success: true,
      message: "States fetched successfully",

      data: states,

      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get states error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch states",
      error: error.message,
    });
  }
};

// GET STATE BY STATE ID
export const getStateById = async (req, res) => {
  try {
    const stateId = Number(req.params.id);

    if (!Number.isInteger(stateId) || stateId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid state ID",
      });
    }

    const state = await State.findOne({
      state_id: stateId,
    });

    if (!state) {
      return res.status(404).json({
        success: false,
        message: "State not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "State fetched successfully",
      data: state,
    });
  } catch (error) {
    console.error("Get state error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch state",
      error: error.message,
    });
  }
};

// UPDATE STATE
export const updateState = async (req, res) => {
  try {
    const currentStateId = Number(req.params.id);

    if (!Number.isInteger(currentStateId) || currentStateId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid state ID",
      });
    }

    const state = await State.findOne({
      state_id: currentStateId,
    });

    if (!state) {
      return res.status(404).json({
        success: false,
        message: "State not found",
      });
    }

    const { state_id, state_name } = req.body;

    if (state_name !== undefined) {
      const cleanStateName = String(state_name).trim();

      if (!cleanStateName) {
        return res.status(400).json({
          success: false,
          message: "State name cannot be empty",
        });
      }

      const duplicateName = await State.findOne({
        _id: {
          $ne: state._id,
        },

        state_name: {
          $regex: `^${escapeRegex(cleanStateName)}$`,
          $options: "i",
        },
      });

      if (duplicateName) {
        return res.status(409).json({
          success: false,
          message: "State name already exists",
        });
      }

      state.state_name = cleanStateName;
    }

    if (state_id !== undefined && state_id !== null && state_id !== "") {
      const newStateId = Number(state_id);

      if (!Number.isInteger(newStateId) || newStateId <= 0) {
        return res.status(400).json({
          success: false,
          message: "State ID must be a positive integer",
        });
      }

      if (newStateId !== currentStateId) {
        const duplicateStateId = await State.findOne({
          state_id: newStateId,
        });

        if (duplicateStateId) {
          return res.status(409).json({
            success: false,
            message: `State ID ${newStateId} already exists`,
          });
        }

        state.state_id = newStateId;

        await syncStateCounter(newStateId);
      }
    }

    await state.save();

    return res.status(200).json({
      success: true,
      message: "State updated successfully",
      data: state,
    });
  } catch (error) {
    console.error("Update state error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "State ID already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update state",
      error: error.message,
    });
  }
};

// DELETE STATE
export const deleteState = async (req, res) => {
  try {
    const stateId = Number(req.params.id);

    if (!Number.isInteger(stateId) || stateId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid state ID",
      });
    }

    const state = await State.findOneAndDelete({
      state_id: stateId,
    });

    if (!state) {
      return res.status(404).json({
        success: false,
        message: "State not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "State deleted successfully",
      data: state,
    });
  } catch (error) {
    console.error("Delete state error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete state",
      error: error.message,
    });
  }
};

// IMPORT STATES FROM EXCEL
// export const importStates = async (req, res) => {
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
//         let stateId = row.state_id ?? row["State ID"] ?? row["state id"] ?? "";

//         let stateName =
//           row.state_name ?? row["State Name"] ?? row["state name"] ?? "";
//         stateName = String(stateName).trim();

//         if (!stateName) {
//           failed.push({
//             row: index + 2,
//             data: row,
//             message: "State name is required",
//           });

//           continue;
//         }
//         const duplicateName = await State.findOne({
//           state_name: {
//             $regex: `^${escapeRegex(stateName)}$`,
//             $options: "i",
//           },
//         });

//         if (duplicateName) {
//           failed.push({
//             row: index + 2,
//             data: row,
//             message: `State "${stateName}" already exists`,
//           });

//           continue;
//         }

//         if (stateId !== undefined && stateId !== null && stateId !== "") {
//           stateId = Number(stateId);

//           if (!Number.isInteger(stateId) || stateId <= 0) {
//             failed.push({
//               row: index + 2,
//               data: row,
//               message: "State ID must be a positive integer",
//             });

//             continue;
//           }

//           const duplicateId = await State.findOne({
//             state_id: stateId,
//           });

//           if (duplicateId) {
//             failed.push({
//               row: index + 2,
//               data: row,
//               message: `State ID ${stateId} already exists`,
//             });

//             continue;
//           }

//           await syncStateCounter(stateId);
//         } else {
//           stateId = await getNextAvailableStateId();
//         }

//         const state = await State.create({
//           state_id: stateId,
//           state_name: stateName,
//         });

//         imported.push({
//           row: index + 2,
//           state_id: state.state_id,
//           state_name: state.state_name,
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
//       message: "State import completed",

//       summary: {
//         totalRows: rows.length,
//         imported: imported.length,
//         failed: failed.length,
//       },

//       imported,

//       failed,
//     });
//   } catch (error) {
//     console.error("Import states error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to import states",
//       error: error.message,
//     });
//   }
// };

export const importStates = async (req, res) => {
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
    // GET EXISTING STATES ONLY ONCE
    // ==========================================
    const existingStates = await State.find(
      {},
      {
        state_id: 1,
        state_name: 1,
      },
    ).lean();

    const existingIds = new Set(
      existingStates.map((state) => Number(state.state_id)),
    );

    const existingNames = new Set(
      existingStates.map((state) =>
        String(state.state_name).trim().toLowerCase(),
      ),
    );

    // Track duplicates inside Excel also
    const excelIds = new Set();
    const excelNames = new Set();

    // ==========================================
    // FIND CURRENT MAX STATE ID
    // ==========================================
    let maxStateId =
      existingStates.length > 0
        ? Math.max(
            ...existingStates.map((state) => Number(state.state_id) || 0),
          )
        : 0;

    // ==========================================
    // VALIDATE EXCEL IN MEMORY
    // ==========================================
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];

      let stateId = row.state_id ?? row["State ID"] ?? row["state id"] ?? "";

      let stateName =
        row.state_name ?? row["State Name"] ?? row["state name"] ?? "";

      stateName = String(stateName).trim();

      // ==========================================
      // STATE NAME REQUIRED
      // ==========================================
      if (!stateName) {
        failed.push({
          row: index + 2,
          data: row,
          message: "State name is required",
        });

        continue;
      }

      const normalizedName = stateName.toLowerCase();

      // ==========================================
      // DUPLICATE NAME IN DATABASE
      // ==========================================
      if (existingNames.has(normalizedName)) {
        failed.push({
          row: index + 2,
          data: row,
          message: `State "${stateName}" already exists`,
        });

        continue;
      }

      // ==========================================
      // DUPLICATE NAME INSIDE EXCEL
      // ==========================================
      if (excelNames.has(normalizedName)) {
        failed.push({
          row: index + 2,
          data: row,
          message: `Duplicate state "${stateName}" found in Excel`,
        });

        continue;
      }

      // ==========================================
      // STATE ID PROVIDED
      // ==========================================
      if (stateId !== undefined && stateId !== null && stateId !== "") {
        stateId = Number(stateId);

        if (!Number.isInteger(stateId) || stateId <= 0) {
          failed.push({
            row: index + 2,
            data: row,
            message: "State ID must be a positive integer",
          });

          continue;
        }

        // Duplicate ID in DB
        if (existingIds.has(stateId)) {
          failed.push({
            row: index + 2,
            data: row,
            message: `State ID ${stateId} already exists`,
          });

          continue;
        }

        // Duplicate ID inside Excel
        if (excelIds.has(stateId)) {
          failed.push({
            row: index + 2,
            data: row,
            message: `Duplicate State ID ${stateId} found in Excel`,
          });

          continue;
        }

        if (stateId > maxStateId) {
          maxStateId = stateId;
        }
      } else {
        // ==========================================
        // AUTO GENERATE ID
        // ==========================================

        do {
          maxStateId++;
        } while (existingIds.has(maxStateId) || excelIds.has(maxStateId));

        stateId = maxStateId;
      }

      excelIds.add(stateId);
      excelNames.add(normalizedName);

      validRows.push({
        row: index + 2,

        document: {
          state_id: stateId,
          state_name: stateName,
        },
      });
    }

    // ==========================================
    // BULK INSERT
    // ==========================================
    const documents = validRows.map((item) => item.document);

    let insertedDocs = [];

    if (documents.length > 0) {
      insertedDocs = await State.insertMany(documents, {
        ordered: false,
      });
    }

    // ==========================================
    // SYNC COUNTER ONLY ONCE
    // ==========================================
    if (insertedDocs.length > 0) {
      const highestInsertedId = Math.max(
        ...insertedDocs.map((state) => state.state_id),
      );

      await syncStateCounter(highestInsertedId);
    }

    // ==========================================
    // PREPARE IMPORTED RESPONSE
    // ==========================================
    const imported = insertedDocs.map((state, index) => ({
      row: validRows[index]?.row,
      state_id: state.state_id,
      state_name: state.state_name,
    }));

    return res.status(200).json({
      success: true,
      message: "State import completed",

      summary: {
        totalRows: rows.length,
        imported: imported.length,
        failed: failed.length,
      },

      imported,

      failed,
    });
  } catch (error) {
    console.error("Import states error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to import states",
      error: error.message,
    });
  }
};

// =====================================================
// EXPORT STATES TO EXCEL
// =====================================================

export const exportStates = async (req, res) => {
  try {
    const states = await State.find()
      .sort({
        state_id: 1,
      })
      .lean();

    // ==============================
    // Convert data
    // ==============================

    const excelData = states.map((state) => ({
      state_id: state.state_id,
      state_name: state.state_name,
    }));

    // ==============================
    // Create workbook
    // ==============================

    const worksheet = XLSX.utils.json_to_sheet(excelData);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "States");

    // ==============================
    // Column widths
    // ==============================

    worksheet["!cols"] = [
      {
        wch: 15,
      },
      {
        wch: 30,
      },
    ];

    // ==============================
    // Generate Excel buffer
    // ==============================

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // ==============================
    // Response
    // ==============================

    res.setHeader("Content-Disposition", 'attachment; filename="states.xlsx"');

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    return res.send(buffer);
  } catch (error) {
    console.error("Export states error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to export states",
      error: error.message,
    });
  }
};

// =====================================================
// HELPER - FIND AVAILABLE AUTO STATE ID
// =====================================================

const getNextAvailableStateId = async () => {
  let stateId = await getNextStateId();

  /*
   * Extra protection if counter and existing
   * state data ever become out of sync.
   */
  let existing = await State.exists({
    state_id: stateId,
  });

  while (existing) {
    stateId = await getNextStateId();

    existing = await State.exists({
      state_id: stateId,
    });
  }

  return stateId;
};

// =====================================================
// HELPER - ESCAPE REGEX
// =====================================================

const escapeRegex = (value) => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
