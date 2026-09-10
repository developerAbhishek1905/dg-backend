import mongoose from "mongoose";

/*
|--------------------------------------------------------------------------
| Address Schema
|--------------------------------------------------------------------------
*/

const addressSchema = new mongoose.Schema(
  {
    addressLine: {
      type: String,
      required: true,
      trim: true,
    },

    stateId: {
      type: Number,
      default: null,
      index: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
    },

    districtId: {
      type: Number,
      default: null,
      index: true,
    },

    district: {
      type: String,
      trim: true,
      default: "",
    },

    cityId: {
      type: Number,
      default: null,
      index: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    pincodeId: {
      type: Number,
      default: null,
      index: true,
    },

    pinCode: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
  },
  {
    _id: false,
  },
);

/*
|--------------------------------------------------------------------------
| Customer Schema
|--------------------------------------------------------------------------
*/

const customerSchema = new mongoose.Schema(
  {
    customerCode: {
      type: String,
      unique: true,
      index: true,
      trim: true,
      uppercase: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    alternatePhone: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    address: {
      type: addressSchema,
      required: true,
    },

    contactInfo: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

/*
|--------------------------------------------------------------------------
| Search Index
|--------------------------------------------------------------------------
*/

customerSchema.index({
  name: "text",
  phone: "text",
  alternatePhone: "text",
  customerCode: "text",
});

export default mongoose.model(
  "Customer",
  customerSchema,
);