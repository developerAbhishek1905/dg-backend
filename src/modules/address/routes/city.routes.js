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
  getCitiesByStateOrDistrict
} from "../controller/city.controller.js";

import { uploadExcel } from "../middleware/upload.middleware.js";

const router = express.Router();

// Create city
router.post("/", createCity);

// Get all cities
router.get("/", getAllCities);

// Excel import
router.post("/import", uploadExcel.single("file"), importCities);

// Excel export
router.get("/export", exportCities);
// router.get(
//   "/state/:state_id/district/:district_id",
//   getCitiesByStateAndDistrict
// );

router.get(
  "/filter",
  getCitiesByStateOrDistrict
);

// Get city by city_id
router.get("/:id", getCityById);

// Update city
router.put("/:id", updateCity);

// Delete city
router.delete("/:id", deleteCity);

export default router;
