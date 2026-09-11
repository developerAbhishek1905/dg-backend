import mongoose from "mongoose";

/*
|--------------------------------------------------------------------------
| Address Snapshot Schema
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
    },
  },
  {
    _id: false,
  },
);

/*
|--------------------------------------------------------------------------
| Complaint Schema
|--------------------------------------------------------------------------
*/

const complaintSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | Complaint Identity
    |--------------------------------------------------------------------------
    */

    complaintNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    complaintDateTime: {
      type: Date,
      default: Date.now,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Customer Relation
    |--------------------------------------------------------------------------
    */

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Customer Snapshot
    |--------------------------------------------------------------------------
    */

    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
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

    /*
    |--------------------------------------------------------------------------
    | Brand
    |--------------------------------------------------------------------------
    */

    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      default: null,
      index: true,
    },

    brand: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Product
    |--------------------------------------------------------------------------
    */

    productId: {
      type: Number,
      default: null,
      index: true,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Product Type
    |--------------------------------------------------------------------------
    */

    productTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductType",
      default: null,
      index: true,
    },

    productType: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    productCode: {
      type: String,
      trim: true,
      default: "",
    },

    productDescription: {
      type: String,
      trim: true,
      default: "",
    },

    units: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    quoteAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    /*
    |--------------------------------------------------------------------------
    | Complaint Information
    |--------------------------------------------------------------------------
    */

    faultReported: {
      type: String,
      required: true,
      trim: true,
    },

    categoryId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Category",
  default: null,
  index: true,
},

    category: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
      index: true,
    },

    complaintType: {
      type: String,
      enum: ["REGULAR", "REPEAT", "WARRANTY", "INQUIRY"],
      default: "REGULAR",
      required: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Repeat / Warranty
    |--------------------------------------------------------------------------
    */

    parentComplaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      default: null,
      index: true,
    },

    repeatComplaintNumber: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Other Information
    |--------------------------------------------------------------------------
    */

    adName: {
      type: String,
      trim: true,
      default: "",
    },

    subject: {
      type: String,
      trim: true,
      default: "",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    /*
    |--------------------------------------------------------------------------
    | Status
    |--------------------------------------------------------------------------
    */

    status: {
      type: String,
      enum: [
        "REGISTERED",
        "ALLOCATED",
        "APPOINTMENT_SCHEDULED",
        "PENDING",
        "WORK_IN_PROGRESS",
        "WORK_COMPLETED",
        "DG_VERIFICATION",
        "CLOSED",
        "CANCELLED",
      ],
      default: "REGISTERED",
      required: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Technician / Dealer
    |--------------------------------------------------------------------------
    */

    technicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Technician",
      default: null,
      index: true,
    },

    technicianName: {
      type: String,
      trim: true,
      default: "",
    },

    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      default: null,
      index: true,
    },

    dealerName: {
      type: String,
      trim: true,
      default: "",
    },

    allocatedDealerId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Dealer",
  default: null,
},

allocationId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Allocation",
  default: null,
},

allocationRuleId: {
  type: mongoose.Schema.Types.ObjectId,
  default: null,
},

allocatedAt: {
  type: Date,
  default: null,
},

appointmentDate: {
  type: Date,
  default: null,
  index: true,
},

appointmentTime: {
  type: String,
  trim: true,
  default: "",
},

pendingReason: {
  type: String,
  trim: true,
  default: "",
},

    /*
    |--------------------------------------------------------------------------
    | Closure
    |--------------------------------------------------------------------------
    */

    closedAt: {
      type: Date,
      default: null,
    },

    warrantyStartDate: {
  type: Date,
  default: null,
  index: true,
},

warrantyEndDate: {
  type: Date,
  default: null,
  index: true,
},

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancellationReason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

complaintSchema.index({
  customerId: 1,
  createdAt: -1,
});

complaintSchema.index({
  phone: 1,
  createdAt: -1,
});

complaintSchema.index({
  alternatePhone: 1,
  createdAt: -1,
});

complaintSchema.index({
  productId: 1,
  createdAt: -1,
});

complaintSchema.index({
  complaintType: 1,
  status: 1,
});

complaintSchema.index({
  technicianId: 1,
  status: 1,
});

complaintSchema.index({
  dealerId: 1,
  status: 1,
});

export default mongoose.model("Complaint", complaintSchema);
