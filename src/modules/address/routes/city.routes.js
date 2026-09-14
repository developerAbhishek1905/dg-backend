// routes/city.routes.js

import express from "express";

import {
  createCity,
  getAllCities,
  getCityById,
  updateCity,
  deleteCity,
  importCities,
  exportCities,
  getCitiesByStateOrDistrict,
  getCityDropdown,
} from "../controller/city.controller.js";

import { uploadExcel } from "../middleware/upload.middleware.js";
import { protect } from "../../auth/middleware/auth.middleware.js";

const router = express.Router();

// Create city
router.post("/",protect, createCity);

// Get all cities
router.get("/",protect, getAllCities);

// Excel import
router.post("/import",protect, uploadExcel.single("file"), importCities);

// Excel export
router.get("/export",protect, exportCities);
router.get("/dropdown",protect, getCityDropdown);
// router.get(
//   "/state/:state_id/district/:district_id",protect,
//   getCitiesByStateAndDistrict
// );

router.get("/filter",protect, getCitiesByStateOrDistrict);

// Get city by city_id
router.get("/:id",protect, getCityById);

// Update city
router.put("/:id",protect, updateCity);

// Delete city
router.delete("/:id",protect, deleteCity);

export default router;
