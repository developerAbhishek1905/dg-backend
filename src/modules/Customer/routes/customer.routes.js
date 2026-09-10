import express from "express";

import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  lookupCustomerByPhone,
} from "../controllers/customer.controller.js";

const router = express.Router();


/*
|--------------------------------------------------------------------------
| Customer Routes
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  createCustomer,
);

router.get(
  "/",
  getCustomers,
);


/*
|--------------------------------------------------------------------------
| Phone lookup MUST come before /:id
|--------------------------------------------------------------------------
*/

router.get(
  "/lookup/:phone",
  lookupCustomerByPhone,
);


router.get(
  "/:id",
  getCustomerById,
);

router.put(
  "/:id",
  updateCustomer,
);

router.delete(
  "/:id",
  deleteCustomer,
);


export default router;