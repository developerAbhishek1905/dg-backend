import mongoose from "mongoose";
import XLSX from "xlsx";
import Area from "../model/area.model.js";
import State from "../model/state.model.js";
import District from "../model/district.model.js";
import City from "../model/city.model.js";
import Pincode from "../model/pincode.model.js";

// CREATE AREA
export const createArea = async (req, res) => {
  try {
    let {
      areaCode,
      areaName,

      state_id,
      district_id,
      city_id,
      pincode_id,

      zone,
      latitude,
      longitude,
      status,
    } = req.body;

    // =====================================================
    // REQUIRED FIELDS
    // =====================================================

    if (!areaCode || !String(areaCode).trim()) {
      return res.status(400).json({
        success: false,
        message: "Area code is required",
      });
    }

    if (!areaName || !String(areaName).trim()) {
      return res.status(400).json({
        success: false,
        message: "Area name is required",
      });
    }

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

    if (
      pincode_id === undefined ||
      pincode_id === null ||
      pincode_id === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Pincode ID is required",
      });
    }

    // =====================================================
    // FORMAT VALUES
    // =====================================================

    areaCode = String(areaCode)
      .trim()
      .toUpperCase();

    areaName = String(areaName).trim();

    zone = zone
      ? String(zone).trim()
      : "";

    state_id = Number(state_id);
    district_id = Number(district_id);
    city_id = Number(city_id);
    pincode_id = Number(pincode_id);

    // =====================================================
    // ID VALIDATION
    // =====================================================

    if (
      !Number.isInteger(state_id) ||
      state_id <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "State ID must be a positive integer",
      });
    }

    if (
      !Number.isInteger(district_id) ||
      district_id <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "District ID must be a positive integer",
      });
    }

    if (
      !Number.isInteger(city_id) ||
      city_id <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "City ID must be a positive integer",
      });
    }

    if (
      !Number.isInteger(pincode_id) ||
      pincode_id <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Pincode ID must be a positive integer",
      });
    }

    // =====================================================
    // FIND STATE
    // =====================================================

    const state = await State.findOne({
      state_id,
    });

    if (!state) {
      return res.status(404).json({
        success: false,
        message: `State with ID ${state_id} not found`,
      });
    }

    // =====================================================
    // FIND DISTRICT
    // =====================================================

    const district = await District.findOne({
      district_id,
    });

    if (!district) {
      return res.status(404).json({
        success: false,
        message: `District with ID ${district_id} not found`,
      });
    }

    // =====================================================
    // CHECK DISTRICT BELONGS TO STATE
    // =====================================================

    if (
      Number(district.state_id) !==
      Number(state_id)
    ) {
      return res.status(400).json({
        success: false,
        message: `District ${district_id} does not belong to State ${state_id}`,
      });
    }

    // =====================================================
    // FIND CITY
    // =====================================================

    const city = await City.findOne({
      city_id,
    });

    if (!city) {
      return res.status(404).json({
        success: false,
        message: `City with ID ${city_id} not found`,
      });
    }

    // =====================================================
    // CHECK CITY BELONGS TO DISTRICT
    // =====================================================

    if (
      Number(city.district_id) !==
      Number(district_id)
    ) {
      return res.status(400).json({
        success: false,
        message: `City ${city_id} does not belong to District ${district_id}`,
      });
    }

    // =====================================================
    // CHECK CITY BELONGS TO STATE
    // =====================================================

    if (
      Number(city.state_id) !==
      Number(state_id)
    ) {
      return res.status(400).json({
        success: false,
        message: `City ${city_id} does not belong to State ${state_id}`,
      });
    }

    // =====================================================
    // FIND PINCODE
    // =====================================================

    const pincode = await Pincode.findOne({
      pincode_id,
    });

    if (!pincode) {
      return res.status(404).json({
        success: false,
        message: `Pincode with ID ${pincode_id} not found`,
      });
    }

    // =====================================================
    // CHECK PINCODE BELONGS TO CITY
    // =====================================================

    if (
      Number(pincode.city_id) !==
      Number(city_id)
    ) {
      return res.status(400).json({
        success: false,
        message: `Pincode ${pincode_id} does not belong to City ${city_id}`,
      });
    }

    // =====================================================
    // LATITUDE
    // =====================================================

    if (
      latitude !== undefined &&
      latitude !== null &&
      latitude !== ""
    ) {
      latitude = Number(latitude);

      if (
        Number.isNaN(latitude) ||
        latitude < -90 ||
        latitude > 90
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Latitude must be between -90 and 90",
        });
      }
    } else {
      latitude = null;
    }

    // =====================================================
    // LONGITUDE
    // =====================================================

    if (
      longitude !== undefined &&
      longitude !== null &&
      longitude !== ""
    ) {
      longitude = Number(longitude);

      if (
        Number.isNaN(longitude) ||
        longitude < -180 ||
        longitude > 180
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Longitude must be between -180 and 180",
        });
      }
    } else {
      longitude = null;
    }

    // =====================================================
    // STATUS
    // =====================================================

    status = status
      ? String(status).toUpperCase()
      : "ACTIVE";

    if (
      !["ACTIVE", "INACTIVE"].includes(
        status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Status must be ACTIVE or INACTIVE",
      });
    }

    // =====================================================
    // DUPLICATE AREA CODE
    // =====================================================

    const existingAreaCode =
      await Area.findOne({
        areaCode,
      });

    if (existingAreaCode) {
      return res.status(409).json({
        success: false,
        message:
          `Area code ${areaCode} already exists`,
      });
    }

    // =====================================================
    // DUPLICATE AREA NAME IN SAME CITY
    // =====================================================

    const duplicateArea =
      await Area.findOne({
        city: city._id,

        areaName: {
          $regex:
            `^${escapeRegex(areaName)}$`,
          $options: "i",
        },
      });

    if (duplicateArea) {
      return res.status(409).json({
        success: false,
        message:
          "Area already exists in this city",
      });
    }

    // =====================================================
    // CREATE
    //
    // IMPORTANT:
    // Area model stores Mongo ObjectIds,
    // not state_id/district_id/city_id/pincode_id
    // =====================================================

    const area = await Area.create({
      areaCode,
      areaName,

      state: state._id,
      district: district._id,
      city: city._id,
      pincode: pincode._id,

      zone,
      latitude,
      longitude,
      status,
    });

    // =====================================================
    // POPULATE RESPONSE
    // =====================================================

    const populatedArea =
      await Area.findById(area._id)
        .populate(
          "state",
          "state_id state_name"
        )
        .populate(
          "district",
          "district_id district_name state_id"
        )
        .populate(
          "city",
          "city_id city_name district_id state_id"
        )
        .populate(
          "pincode",
          "pincode_id pincode_name city_id"
        );

    return res.status(201).json({
      success: true,
      message:
        "Area created successfully",
      data: populatedArea,
    });

  } catch (error) {
    console.error(
      "Create area error:",
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Area code already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to create area",
      error: error.message,
    });
  }
};

// GET ALL AREAS
export const getAllAreas = async (req, res) => {
  try {
    const {
      search = "",
      state_id,
      district_id,
      city_id,
      pincode_id,
      zone,
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

    // =====================================================
    // STATE FILTER
    // =====================================================

    if (state_id) {
      const state = await State.findOne({
        state_id: Number(state_id),
      });

      if (!state) {
        return res.status(404).json({
          success: false,
          message: "State not found",
        });
      }

      filter.state = state._id;
    }

    // =====================================================
    // DISTRICT FILTER
    // =====================================================

    if (district_id) {
      const district = await District.findOne({
        district_id: Number(district_id),
      });

      if (!district) {
        return res.status(404).json({
          success: false,
          message: "District not found",
        });
      }

      filter.district = district._id;
    }

    // =====================================================
    // CITY FILTER
    // =====================================================

    if (city_id) {
      const city = await City.findOne({
        city_id: Number(city_id),
      });

      if (!city) {
        return res.status(404).json({
          success: false,
          message: "City not found",
        });
      }

      filter.city = city._id;
    }

    // =====================================================
    // PINCODE FILTER
    // =====================================================

    if (pincode_id) {
      const pincode = await Pincode.findOne({
        pincode_id: Number(pincode_id),
      });

      if (!pincode) {
        return res.status(404).json({
          success: false,
          message: "Pincode not found",
        });
      }

      filter.pincode = pincode._id;
    }

    // =====================================================
    // ZONE FILTER
    // =====================================================

    if (zone) {
      filter.zone = {
        $regex: `^${escapeRegex(zone)}$`,
        $options: "i",
      };
    }

    // =====================================================
    // STATUS FILTER
    // =====================================================

    if (status) {
      const statusValue = String(status).toUpperCase();

      if (!["ACTIVE", "INACTIVE"].includes(statusValue)) {
        return res.status(400).json({
          success: false,
          message: "Status must be ACTIVE or INACTIVE",
        });
      }

      filter.status = statusValue;
    }

    // =====================================================
    // GLOBAL SEARCH
    // =====================================================

    if (String(search).trim()) {
      const searchValue = String(search).trim();

      const regex = new RegExp(
        escapeRegex(searchValue),
        "i"
      );

      // Search State Master
      const states = await State.find({
        $or: [
          { state_name: regex },
          ...(Number.isNaN(Number(searchValue))
            ? []
            : [{ state_id: Number(searchValue) }]),
        ],
      }).select("_id");

      // Search District Master
      const districts = await District.find({
        $or: [
          { district_name: regex },
          ...(Number.isNaN(Number(searchValue))
            ? []
            : [{ district_id: Number(searchValue) }]),
        ],
      }).select("_id");

      // Search City Master
      const cities = await City.find({
        $or: [
          { city_name: regex },
          ...(Number.isNaN(Number(searchValue))
            ? []
            : [{ city_id: Number(searchValue) }]),
        ],
      }).select("_id");

      // Search Pincode Master
      const pincodes = await Pincode.find({
        $or: [
          { pincode_name: regex },
          ...(Number.isNaN(Number(searchValue))
            ? []
            : [{ pincode_id: Number(searchValue) }]),
        ],
      }).select("_id");

      // Convert documents to ObjectId arrays
      const stateIds = states.map((item) => item._id);
      const districtIds = districts.map((item) => item._id);
      const cityIds = cities.map((item) => item._id);
      const pincodeIds = pincodes.map((item) => item._id);

      filter.$or = [
        // Area Code
        {
          areaCode: {
            $regex: escapeRegex(searchValue),
            $options: "i",
          },
        },

        // Area Name
        {
          areaName: {
            $regex: escapeRegex(searchValue),
            $options: "i",
          },
        },

        // Zone
        {
          zone: {
            $regex: escapeRegex(searchValue),
            $options: "i",
          },
        },

        // State
        {
          state: {
            $in: stateIds,
          },
        },

        // District
        {
          district: {
            $in: districtIds,
          },
        },

        // City
        {
          city: {
            $in: cityIds,
          },
        },

        // Pincode
        {
          pincode: {
            $in: pincodeIds,
          },
        },
      ];
    }

    // =====================================================
    // TOTAL
    // =====================================================

    const total = await Area.countDocuments(filter);

    // =====================================================
    // GET AREAS
    // =====================================================

    const areas = await Area.find(filter)
      .populate(
        "state",
        "_id state_id state_name"
      )
      .populate(
        "district",
        "_id district_id district_name state_id"
      )
      .populate(
        "city",
        "_id city_id city_name district_id state_id"
      )
      .populate(
        "pincode",
        "_id pincode_id pincode_name city_id"
      )
      .sort({
        createdAt: -1,
      })
      .skip(
        (pageNumber - 1) * limitNumber
      )
      .limit(limitNumber);

    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(200).json({
      success: true,
      message: "Areas fetched successfully",

      data: areas,

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
    console.error("Get areas error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch areas",
      error: error.message,
    });
  }
};

// GET AREA BY ID
export const getAreaById = async (req, res) => {
  try {
    const { id } = req.params;

    // ==========================================
    // VALIDATE MONGODB OBJECT ID
    // ==========================================

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid area ObjectId",
      });
    }

    // ==========================================
    // GET AREA
    // ==========================================

    const area = await Area.findById(id)
      .populate(
        "state",
        "_id state_id state_name"
      )
      .populate(
        "district",
        "_id district_id district_name state_id"
      )
      .populate(
        "city",
        "_id city_id city_name district_id state_id"
      )
      .populate(
        "pincode",
        "_id pincode_id pincode_name city_id"
      );

    // ==========================================
    // AREA NOT FOUND
    // ==========================================

    if (!area) {
      return res.status(404).json({
        success: false,
        message: "Area not found",
      });
    }

    // ==========================================
    // SUCCESS
    // ==========================================

    return res.status(200).json({
      success: true,
      message: "Area fetched successfully",
      data: area,
    });

  } catch (error) {
    console.error("Get area by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch area",
      error: error.message,
    });
  }
};


// =====================================================
// GET AREA BY AREA CODE
// =====================================================

export const getAreaByCode = async (req, res) => {
  try {
    const areaCode = String(
      req.params.areaCode
    )
      .trim()
      .toUpperCase();


    const area = await Area.findOne({
      areaCode,
    });


    if (!area) {
      return res.status(404).json({
        success: false,
        message: "Area not found",
      });
    }


    return res.status(200).json({
      success: true,
      message: "Area fetched successfully",
      data: area,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch area",
      error: error.message,
    });
  }
};


// =====================================================
// UPDATE AREA
// =====================================================

export const updateArea = async (req, res) => {
  try {
    const { id } = req.params;

    const area = await Area.findById(id);

    if (!area) {
      return res.status(404).json({
        success: false,
        message: "Area not found",
      });
    }

    let {
      areaCode,
      areaName,

      state_id,
      district_id,
      city_id,
      pincode_id,

      zone,
      latitude,
      longitude,
      status,
    } = req.body;

    // ==========================================
    // AREA CODE
    // ==========================================

    if (areaCode !== undefined) {
      areaCode = String(areaCode).trim().toUpperCase();

      if (!areaCode) {
        return res.status(400).json({
          success: false,
          message: "Area code cannot be empty",
        });
      }

      const duplicateCode = await Area.findOne({
        _id: { $ne: area._id },
        areaCode,
      });

      if (duplicateCode) {
        return res.status(409).json({
          success: false,
          message: `Area code ${areaCode} already exists`,
        });
      }

      area.areaCode = areaCode;
    }

    // ==========================================
    // AREA NAME
    // ==========================================

    if (areaName !== undefined) {
      areaName = String(areaName).trim();

      if (!areaName) {
        return res.status(400).json({
          success: false,
          message: "Area name cannot be empty",
        });
      }

      area.areaName = areaName;
    }

    // ==========================================
    // STATE
    // ==========================================

    let selectedState = null;

    if (state_id !== undefined) {
      state_id = Number(state_id);

      if (!Number.isInteger(state_id) || state_id <= 0) {
        return res.status(400).json({
          success: false,
          message: "State ID must be a positive integer",
        });
      }

      selectedState = await State.findOne({ state_id });

      if (!selectedState) {
        return res.status(404).json({
          success: false,
          message: `State with ID ${state_id} not found`,
        });
      }

      area.state = selectedState._id;
    }

    // ==========================================
    // DISTRICT
    // ==========================================

    let selectedDistrict = null;

    if (district_id !== undefined) {
      district_id = Number(district_id);

      if (!Number.isInteger(district_id) || district_id <= 0) {
        return res.status(400).json({
          success: false,
          message: "District ID must be a positive integer",
        });
      }

      selectedDistrict = await District.findOne({
        district_id,
      });

      if (!selectedDistrict) {
        return res.status(404).json({
          success: false,
          message: `District with ID ${district_id} not found`,
        });
      }

      area.district = selectedDistrict._id;
    }

    // ==========================================
    // CITY
    // ==========================================

    let selectedCity = null;

    if (city_id !== undefined) {
      city_id = Number(city_id);

      if (!Number.isInteger(city_id) || city_id <= 0) {
        return res.status(400).json({
          success: false,
          message: "City ID must be a positive integer",
        });
      }

      selectedCity = await City.findOne({
        city_id,
      });

      if (!selectedCity) {
        return res.status(404).json({
          success: false,
          message: `City with ID ${city_id} not found`,
        });
      }

      area.city = selectedCity._id;
    }

    // ==========================================
    // PINCODE
    // ==========================================

    let selectedPincode = null;

    if (pincode_id !== undefined) {
      pincode_id = Number(pincode_id);

      if (!Number.isInteger(pincode_id) || pincode_id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Pincode ID must be a positive integer",
        });
      }

      selectedPincode = await Pincode.findOne({
        pincode_id,
      });

      if (!selectedPincode) {
        return res.status(404).json({
          success: false,
          message: `Pincode with ID ${pincode_id} not found`,
        });
      }

      area.pincode = selectedPincode._id;
    }

    // ==========================================
    // VALIDATE FINAL RELATIONSHIP
    // ==========================================

    const finalState =
      selectedState ||
      (await State.findById(area.state));

    const finalDistrict =
      selectedDistrict ||
      (await District.findById(area.district));

    const finalCity =
      selectedCity ||
      (await City.findById(area.city));

    const finalPincode =
      selectedPincode ||
      (await Pincode.findById(area.pincode));

    if (!finalState) {
      return res.status(400).json({
        success: false,
        message: "Selected state is invalid",
      });
    }

    if (!finalDistrict) {
      return res.status(400).json({
        success: false,
        message: "Selected district is invalid",
      });
    }

    if (!finalCity) {
      return res.status(400).json({
        success: false,
        message: "Selected city is invalid",
      });
    }

    if (!finalPincode) {
      return res.status(400).json({
        success: false,
        message: "Selected pincode is invalid",
      });
    }

    // ==========================================
    // DISTRICT -> STATE VALIDATION
    // ==========================================

    if (
      Number(finalDistrict.state_id) !==
      Number(finalState.state_id)
    ) {
      return res.status(400).json({
        success: false,
        message: `District ${finalDistrict.district_id} does not belong to State ${finalState.state_id}`,
      });
    }

    // ==========================================
    // CITY -> DISTRICT VALIDATION
    // ==========================================

    if (
      Number(finalCity.district_id) !==
      Number(finalDistrict.district_id)
    ) {
      return res.status(400).json({
        success: false,
        message: `City ${finalCity.city_id} does not belong to District ${finalDistrict.district_id}`,
      });
    }

    // ==========================================
    // CITY -> STATE VALIDATION
    // ==========================================

    if (
      Number(finalCity.state_id) !==
      Number(finalState.state_id)
    ) {
      return res.status(400).json({
        success: false,
        message: `City ${finalCity.city_id} does not belong to State ${finalState.state_id}`,
      });
    }

    // ==========================================
    // PINCODE -> CITY VALIDATION
    // ==========================================

    if (
      Number(finalPincode.city_id) !==
      Number(finalCity.city_id)
    ) {
      return res.status(400).json({
        success: false,
        message: `Pincode ${finalPincode.pincode_id} does not belong to City ${finalCity.city_id}`,
      });
    }

    // ==========================================
    // ZONE
    // ==========================================

    if (zone !== undefined) {
      area.zone = String(zone).trim();
    }

    // ==========================================
    // LATITUDE
    // ==========================================

    if (latitude !== undefined) {
      if (latitude === "" || latitude === null) {
        area.latitude = null;
      } else {
        latitude = Number(latitude);

        if (
          Number.isNaN(latitude) ||
          latitude < -90 ||
          latitude > 90
        ) {
          return res.status(400).json({
            success: false,
            message: "Latitude must be between -90 and 90",
          });
        }

        area.latitude = latitude;
      }
    }

    // ==========================================
    // LONGITUDE
    // ==========================================

    if (longitude !== undefined) {
      if (longitude === "" || longitude === null) {
        area.longitude = null;
      } else {
        longitude = Number(longitude);

        if (
          Number.isNaN(longitude) ||
          longitude < -180 ||
          longitude > 180
        ) {
          return res.status(400).json({
            success: false,
            message: "Longitude must be between -180 and 180",
          });
        }

        area.longitude = longitude;
      }
    }

    // ==========================================
    // STATUS
    // ==========================================

    if (status !== undefined) {
      status = String(status).toUpperCase();

      if (!["ACTIVE", "INACTIVE"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Status must be ACTIVE or INACTIVE",
        });
      }

      area.status = status;
    }

    // ==========================================
    // DUPLICATE AREA NAME IN SAME CITY
    // ==========================================

    const duplicateArea = await Area.findOne({
      _id: {
        $ne: area._id,
      },

      city: area.city,

      areaName: {
        $regex: `^${escapeRegex(area.areaName)}$`,
        $options: "i",
      },
    });

    if (duplicateArea) {
      return res.status(409).json({
        success: false,
        message: "Area already exists in this city",
      });
    }

    // ==========================================
    // SAVE
    // ==========================================

    await area.save();

    // ==========================================
    // POPULATE RESPONSE
    // ==========================================

    const updatedArea = await Area.findById(area._id)
      .populate(
        "state",
        "_id state_id state_name"
      )
      .populate(
        "district",
        "_id district_id district_name state_id"
      )
      .populate(
        "city",
        "_id city_id city_name district_id state_id"
      )
      .populate(
        "pincode",
        "_id pincode_id pincode_name city_id"
      );

    return res.status(200).json({
      success: true,
      message: "Area updated successfully",
      data: updatedArea,
    });

  } catch (error) {
    console.error("Update area error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update area",
      error: error.message,
    });
  }
};


// =====================================================
// DELETE AREA
// =====================================================

export const deleteArea = async (req, res) => {
  try {
    const { id } = req.params;


    const area =
      await Area.findByIdAndDelete(id);


    if (!area) {
      return res.status(404).json({
        success: false,
        message: "Area not found",
      });
    }


    return res.status(200).json({
      success: true,
      message: "Area deleted successfully",
      data: area,
    });

  } catch (error) {
    console.error("Delete area error:", error);

    return res.status(400).json({
      success: false,
      message: "Invalid area ID",
      error: error.message,
    });
  }
};


// =====================================================
// IMPORT AREAS FROM EXCEL
// =====================================================

export const importAreas = async (req, res) => {
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
        // =====================================================
        // READ EXCEL VALUES
        // =====================================================

        let areaCode =
          row.areaCode ??
          row["Area Code"] ??
          row.area_code ??
          "";

        let areaName =
          row.areaName ??
          row["Area Name"] ??
          row.area_name ??
          "";

        let state_id =
          row.state_id ??
          row["State ID"] ??
          row.stateId ??
          "";

        let district_id =
          row.district_id ??
          row["District ID"] ??
          row.districtId ??
          "";

        let city_id =
          row.city_id ??
          row["City ID"] ??
          row.cityId ??
          "";

        let pincode_id =
          row.pincode_id ??
          row["Pincode ID"] ??
          row.pincodeId ??
          "";

        let zone =
          row.zone ??
          row.Zone ??
          "";

        let latitude =
          row.latitude ??
          row.Latitude ??
          "";

        let longitude =
          row.longitude ??
          row.Longitude ??
          "";

        let status =
          row.status ??
          row.Status ??
          "ACTIVE";

        // =====================================================
        // FORMAT VALUES
        // =====================================================

        areaCode = String(areaCode)
          .trim()
          .toUpperCase();

        areaName = String(areaName).trim();

        zone = String(zone).trim();

        status = String(status)
          .trim()
          .toUpperCase();

        // =====================================================
        // REQUIRED VALIDATION
        // =====================================================

        if (!areaCode) {
          failed.push({
            row: index + 2,
            data: row,
            message: "Area code is required",
          });

          continue;
        }

        if (!areaName) {
          failed.push({
            row: index + 2,
            data: row,
            message: "Area name is required",
          });

          continue;
        }

        if (
          state_id === "" ||
          state_id === null ||
          state_id === undefined
        ) {
          failed.push({
            row: index + 2,
            data: row,
            message: "State ID is required",
          });

          continue;
        }

        if (
          district_id === "" ||
          district_id === null ||
          district_id === undefined
        ) {
          failed.push({
            row: index + 2,
            data: row,
            message: "District ID is required",
          });

          continue;
        }

        if (
          city_id === "" ||
          city_id === null ||
          city_id === undefined
        ) {
          failed.push({
            row: index + 2,
            data: row,
            message: "City ID is required",
          });

          continue;
        }

        if (
          pincode_id === "" ||
          pincode_id === null ||
          pincode_id === undefined
        ) {
          failed.push({
            row: index + 2,
            data: row,
            message: "Pincode ID is required",
          });

          continue;
        }

        // =====================================================
        // CONVERT IDS TO NUMBER
        // =====================================================

        state_id = Number(state_id);
        district_id = Number(district_id);
        city_id = Number(city_id);
        pincode_id = Number(pincode_id);

        if (!Number.isInteger(state_id) || state_id <= 0) {
          failed.push({
            row: index + 2,
            data: row,
            message: "State ID must be a positive integer",
          });

          continue;
        }

        if (!Number.isInteger(district_id) || district_id <= 0) {
          failed.push({
            row: index + 2,
            data: row,
            message: "District ID must be a positive integer",
          });

          continue;
        }

        if (!Number.isInteger(city_id) || city_id <= 0) {
          failed.push({
            row: index + 2,
            data: row,
            message: "City ID must be a positive integer",
          });

          continue;
        }

        if (!Number.isInteger(pincode_id) || pincode_id <= 0) {
          failed.push({
            row: index + 2,
            data: row,
            message: "Pincode ID must be a positive integer",
          });

          continue;
        }

        // =====================================================
        // VALIDATE STATE
        // =====================================================

        const state = await State.findOne({
          state_id,
        });

        if (!state) {
          failed.push({
            row: index + 2,
            data: row,
            message: `State with ID ${state_id} not found`,
          });

          continue;
        }

        // =====================================================
        // VALIDATE DISTRICT
        // =====================================================

        const district = await District.findOne({
          district_id,
        });

        if (!district) {
          failed.push({
            row: index + 2,
            data: row,
            message: `District with ID ${district_id} not found`,
          });

          continue;
        }

        // =====================================================
        // DISTRICT -> STATE RELATION
        // =====================================================

        if (
          Number(district.state_id) !==
          Number(state_id)
        ) {
          failed.push({
            row: index + 2,
            data: row,
            message:
              `District ${district_id} does not belong to State ${state_id}`,
          });

          continue;
        }

        // =====================================================
        // VALIDATE CITY
        // =====================================================

        const city = await City.findOne({
          city_id,
        });

        if (!city) {
          failed.push({
            row: index + 2,
            data: row,
            message: `City with ID ${city_id} not found`,
          });

          continue;
        }

        // =====================================================
        // CITY -> DISTRICT RELATION
        // =====================================================

        if (
          Number(city.district_id) !==
          Number(district_id)
        ) {
          failed.push({
            row: index + 2,
            data: row,
            message:
              `City ${city_id} does not belong to District ${district_id}`,
          });

          continue;
        }

        // =====================================================
        // CITY -> STATE RELATION
        // =====================================================

        if (
          Number(city.state_id) !==
          Number(state_id)
        ) {
          failed.push({
            row: index + 2,
            data: row,
            message:
              `City ${city_id} does not belong to State ${state_id}`,
          });

          continue;
        }

        // =====================================================
        // VALIDATE PINCODE
        // =====================================================

        const pincode = await Pincode.findOne({
          pincode_id,
        });

        if (!pincode) {
          failed.push({
            row: index + 2,
            data: row,
            message: `Pincode with ID ${pincode_id} not found`,
          });

          continue;
        }

        // =====================================================
        // PINCODE -> CITY RELATION
        // =====================================================

        if (
          Number(pincode.city_id) !==
          Number(city_id)
        ) {
          failed.push({
            row: index + 2,
            data: row,
            message:
              `Pincode ${pincode_id} does not belong to City ${city_id}`,
          });

          continue;
        }

        // =====================================================
        // STATUS VALIDATION
        // =====================================================

        if (!["ACTIVE", "INACTIVE"].includes(status)) {
          failed.push({
            row: index + 2,
            data: row,
            message: "Status must be ACTIVE or INACTIVE",
          });

          continue;
        }

        // =====================================================
        // LATITUDE
        // =====================================================

        if (
          latitude !== "" &&
          latitude !== null &&
          latitude !== undefined
        ) {
          latitude = Number(latitude);

          if (
            Number.isNaN(latitude) ||
            latitude < -90 ||
            latitude > 90
          ) {
            failed.push({
              row: index + 2,
              data: row,
              message: "Latitude must be between -90 and 90",
            });

            continue;
          }
        } else {
          latitude = null;
        }

        // =====================================================
        // LONGITUDE
        // =====================================================

        if (
          longitude !== "" &&
          longitude !== null &&
          longitude !== undefined
        ) {
          longitude = Number(longitude);

          if (
            Number.isNaN(longitude) ||
            longitude < -180 ||
            longitude > 180
          ) {
            failed.push({
              row: index + 2,
              data: row,
              message: "Longitude must be between -180 and 180",
            });

            continue;
          }
        } else {
          longitude = null;
        }

        // =====================================================
        // DUPLICATE AREA CODE
        // =====================================================

        const duplicateCode = await Area.findOne({
          areaCode,
        });

        if (duplicateCode) {
          failed.push({
            row: index + 2,
            data: row,
            message: `Area code ${areaCode} already exists`,
          });

          continue;
        }

        // =====================================================
        // DUPLICATE AREA NAME IN SAME CITY
        // =====================================================

        const duplicateArea = await Area.findOne({
          city: city._id,

          areaName: {
            $regex: `^${escapeRegex(areaName)}$`,
            $options: "i",
          },
        });

        if (duplicateArea) {
          failed.push({
            row: index + 2,
            data: row,
            message:
              `Area "${areaName}" already exists in city ${city.city_name}`,
          });

          continue;
        }

        // =====================================================
        // CREATE AREA
        // =====================================================

        const area = await Area.create({
          areaCode,
          areaName,

          state: state._id,
          district: district._id,
          city: city._id,
          pincode: pincode._id,

          zone,
          latitude,
          longitude,
          status,
        });

        imported.push({
          row: index + 2,
          _id: area._id,

          areaCode: area.areaCode,
          areaName: area.areaName,

          state_id: state.state_id,
          state_name: state.state_name,

          district_id: district.district_id,
          district_name: district.district_name,

          city_id: city.city_id,
          city_name: city.city_name,

          pincode_id: pincode.pincode_id,
          pincode: pincode.pincode_name,

          status: area.status,
        });

      } catch (rowError) {
        failed.push({
          row: index + 2,
          data: row,
          message: rowError.message,
        });
      }
    }

    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(200).json({
      success: true,
      message: "Area import completed",

      summary: {
        totalRows: rows.length,
        imported: imported.length,
        failed: failed.length,
      },

      imported,
      failed,
    });

  } catch (error) {
    console.error("Import area error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to import areas",
      error: error.message,
    });
  }
};


// =====================================================
// EXPORT AREAS TO EXCEL
// =====================================================

export const exportAreas = async (req, res) => {
  try {
    const areas = await Area.find()
      .sort({
        areaName: 1,
      })
      .lean();


    const excelData = areas.map(
      (area) => ({
        areaCode: area.areaCode,
        areaName: area.areaName,
        city: area.city,
        district: area.district,
        state: area.state,
        pincode: area.pincode,
        zone: area.zone,
        latitude: area.latitude ?? "",
        longitude: area.longitude ?? "",
        status: area.status,
      })
    );


    const worksheet =
      XLSX.utils.json_to_sheet(
        excelData
      );


    worksheet["!cols"] = [
      { wch: 20 },
      { wch: 25 },
      { wch: 20 },
      { wch: 20 },
      { wch: 25 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
    ];


    const workbook =
      XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Areas"
    );


    const buffer =
      XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });


    res.setHeader(
      "Content-Disposition",
      'attachment; filename="areas.xlsx"'
    );


    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );


    return res.send(buffer);

  } catch (error) {
    console.error("Export areas error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to export areas",
      error: error.message,
    });
  }
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