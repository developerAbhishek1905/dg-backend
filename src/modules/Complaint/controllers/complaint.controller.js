import mongoose from "mongoose";

import Complaint from "../models/complaint.model.js";
import Customer from "../../Customer/models/customer.model.js";
import { getIsWarranty } from "../../../helper/warranty.util.js";
import { allocateDealerForComplaint } from "../../allocation/services/allocateDealer.service.js";
import { sendComplaintAllocationNotifications } from "../../../services/complaintWhatsapp.service.js";
// import { sendComplaintAllocationNotifications } from "../../../services/complaintNotification.service.js";
// import { sendComplaintWhatsAppNotifications } from "../../../services/complaintWhatsapp.service.js";

/*
|--------------------------------------------------------------------------
| Complaint Number Generator
|--------------------------------------------------------------------------
*/

export const generateCustomerCode = async () => {
  const lastCustomer = await Customer.findOne({
    customerCode: { $regex: /^CUST\d+$/ },
  })
    .sort({ createdAt: -1 })
    .select("customerCode")
    .lean();

  let nextNumber = 1;

  if (lastCustomer?.customerCode) {
    const lastNumber = Number(
      lastCustomer.customerCode.replace("CUST", ""),
    );

    nextNumber = lastNumber + 1;
  }

  return `CUST${String(nextNumber).padStart(6, "0")}`;
};

const generateComplaintNumber = async () => {
  const now = new Date();

  const day = String(now.getDate()).padStart(2, "0");

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const year = String(now.getFullYear()).slice(-2);

  const datePart = `${day}${month}${year}`;

  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );

  const count = await Complaint.countDocuments({
    createdAt: {
      $gte: startOfDay,
      $lt: endOfDay,
    },
  });

  const sequence = String(count + 1).padStart(4, "0");

  return `CMP${datePart}/${sequence}`;
};

/*
|--------------------------------------------------------------------------
| Create Complaint
|--------------------------------------------------------------------------
*/

export const createComplaint = async (req, res) => {
  try {
    const {
      customerId,

      customerName,
      phone,
      alternatePhone,
      email,

      address,
      contactInfo,

      brandId,
      brand,

      productId,
      productName,

      productTypeId,
      productType,
      productCode,

      productDescription,

      units,
      quoteAmount,

      faultReported,

      categoryId,
      category,

      priority,

      complaintType,

      repeatComplaintNumber,

      adName,

      subject,
      description,
    } = req.body;

    if (!phone?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer phone number is required",
      });
    }

    if (!customerName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required",
      });
    }

    if (!address?.addressLine?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer address is required",
      });
    }

    if (!address?.state?.trim()) {
      return res.status(400).json({
        success: false,
        message: "State is required",
      });
    }

    if (!address?.city?.trim()) {
      return res.status(400).json({
        success: false,
        message: "City is required",
      });
    }

    if (!productName?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product is required",
      });
    }

    if (!faultReported?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Fault reported is required",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find Customer
    |--------------------------------------------------------------------------
    */

    let customer = null;

    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
      customer = await Customer.findById(customerId);
    }

    if (!customer) {
      customer = await Customer.findOne({
        $or: [
          {
            phone: phone.trim(),
          },
          {
            alternatePhone: phone.trim(),
          },
        ],
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Create Customer only if customer doesn't exist
    |--------------------------------------------------------------------------
    */

if (!customer) {
  const customerCode = await generateCustomerCode();

  customer = await Customer.create({
    customerCode,

    name: customerName.trim(),

    phone: phone.trim(),

    alternatePhone: alternatePhone?.trim() || "",

    email: email?.trim()?.toLowerCase() || "",

    address: {
      addressLine: address?.addressLine?.trim() || "",

      stateId:
        address?.stateId !== undefined &&
        address?.stateId !== null
          ? Number(address.stateId)
          : null,

      state: address?.state?.trim() || "",

      districtId:
        address?.districtId !== undefined &&
        address?.districtId !== null
          ? Number(address.districtId)
          : null,

      district: address?.district?.trim() || "",

      cityId:
        address?.cityId !== undefined &&
        address?.cityId !== null
          ? Number(address.cityId)
          : null,

      city: address?.city?.trim() || "",

      pincodeId:
        address?.pincodeId !== undefined &&
        address?.pincodeId !== null
          ? Number(address.pincodeId)
          : null,

      pinCode: address?.pinCode?.trim() || "",
    },

    contactInfo: contactInfo?.trim() || "",

    status: "ACTIVE",
  });
}

    /*
    |--------------------------------------------------------------------------
    | Parent Complaint
    |--------------------------------------------------------------------------
    */

    let parentComplaint = null;

    if (repeatComplaintNumber?.trim()) {
      parentComplaint = await Complaint.findOne({
        complaintNumber: repeatComplaintNumber.trim(),
      });

      if (!parentComplaint) {
        return res.status(404).json({
          success: false,
          message: "Previous complaint not found",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Complaint Number
    |--------------------------------------------------------------------------
    */

    let complaintNumber;

    if (complaintType === "WARRANTY" && parentComplaint) {
      const childCount = await Complaint.countDocuments({
        parentComplaintId: parentComplaint._id,
      });

      const sequence = String(childCount + 1).padStart(2, "0");

      complaintNumber = `${parentComplaint.complaintNumber}/${sequence}`;
    } else {
      complaintNumber = await generateComplaintNumber();
    }

    /*
|--------------------------------------------------------------------------
| Auto Allocate Dealer
|--------------------------------------------------------------------------
*/

    let dealerAllocation = null;

    if (address?.cityId && productId && (categoryId || category)) {
      dealerAllocation = await allocateDealerForComplaint({
        cityId: Number(address.cityId),

        productId: Number(productId),

        categoryId,

        category,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Create Complaint
    |--------------------------------------------------------------------------
    */

    const complaint = await Complaint.create({
      complaintNumber,

      complaintDateTime: new Date(),

      customerId: customer._id,

      /*
        |--------------------------------------------------------------------------
        | Customer Snapshot
        |--------------------------------------------------------------------------
        */

      customerName: customerName.trim(),

      phone: phone.trim(),

      alternatePhone: alternatePhone?.trim() || "",

      email: email?.trim()?.toLowerCase() || "",

      address: {
        addressLine: address?.addressLine?.trim() || "",

        stateId:
          address?.stateId !== undefined && address?.stateId !== null
            ? Number(address.stateId)
            : null,

        state: address?.state?.trim() || "",

        districtId:
          address?.districtId !== undefined && address?.districtId !== null
            ? Number(address.districtId)
            : null,

        district: address?.district?.trim() || "",

        cityId:
          address?.cityId !== undefined && address?.cityId !== null
            ? Number(address.cityId)
            : null,

        city: address?.city?.trim() || "",

        pincodeId:
          address?.pincodeId !== undefined && address?.pincodeId !== null
            ? Number(address.pincodeId)
            : null,

        pinCode: address?.pinCode?.trim() || "",
      },

      contactInfo: contactInfo?.trim() || "",

      /*
        |--------------------------------------------------------------------------
        | Brand
        |--------------------------------------------------------------------------
        */

      brandId:
        brandId && mongoose.Types.ObjectId.isValid(brandId) ? brandId : null,

      brand: brand?.trim() || "",

      /*
        |--------------------------------------------------------------------------
        | Product
        |--------------------------------------------------------------------------
        */

      productId:
        productId !== undefined && productId !== null && productId !== ""
          ? Number(productId)
          : null,

      productName: productName.trim(),

      /*
        |--------------------------------------------------------------------------
        | Product Type
        |--------------------------------------------------------------------------
        */

      productTypeId:
        productTypeId && mongoose.Types.ObjectId.isValid(productTypeId)
          ? productTypeId
          : null,

      productType: productType?.trim() || "",

      productCode: productCode?.trim() || "",

      productDescription: productDescription?.trim() || "",

      units: Number(units) || 1,

      quoteAmount: Number(quoteAmount) || 0,

      /*
        |--------------------------------------------------------------------------
        | Complaint
        |--------------------------------------------------------------------------
        */

      faultReported: faultReported.trim(),

      categoryId:
        categoryId && mongoose.Types.ObjectId.isValid(categoryId)
          ? categoryId
          : null,
      category: category?.trim() || "",

      priority: priority || "MEDIUM",

      complaintType: complaintType || "REGULAR",

      parentComplaintId: parentComplaint?._id || null,

      repeatComplaintNumber: parentComplaint?.complaintNumber || "",

      adName: adName?.trim() || "",

      subject: subject?.trim() || "",

      description: description?.trim() || "",

      allocatedDealerId: dealerAllocation?.dealerId ?? null,

      allocationId: dealerAllocation?.allocationId ?? null,

      allocationRuleId: dealerAllocation?.capacityRuleId ?? null,

      allocatedAt: dealerAllocation ? new Date() : null,

      status: dealerAllocation ? "ALLOCATED" : "REGISTERED",

      // status: "REGISTERED",
    });

    /*
|--------------------------------------------------------------------------
| SEND WHATSAPP NOTIFICATIONS
|--------------------------------------------------------------------------
*/

// if (dealerAllocation?.dealerId) {
//   try {
//     await sendComplaintAllocationNotifications({
//       complaint,
//       dealerId:
//         dealerAllocation.dealerId,
//     });
//   } catch (error) {
//     /*
//      * Do NOT fail complaint creation
//      * because WhatsApp failed.
//      */
//     console.error(
//       "WhatsApp notification failed:",
//       error,
//     );
//   }
// }

/*
|--------------------------------------------------------------------------
| WHATSAPP NOTIFICATIONS
|--------------------------------------------------------------------------
*/

if (dealerAllocation?.dealerId) {
  sendComplaintAllocationNotifications({
    complaint,
    dealerId:
      dealerAllocation.dealerId,
  }).catch((error) => {
    console.error(
      "WhatsApp notification error:",
      error,
    );
  });
}

    const populatedComplaint = await Complaint.findById(complaint._id)
      .populate(
        "customerId",
        "customerCode name phone alternatePhone email address contactInfo status",
      )
      .populate("brandId", "brandName")
      .populate("productTypeId", "product_id product_code product_type")
      .populate(
        "categoryId",
        "product_id category description categoryDescription status",
      )
      .populate("parentComplaintId", "complaintNumber complaintType status")
      .populate(
        "allocatedDealerId",
        "technicianCode technicianFirmName technicianName mobileNumber rating status",
      );

    return res.status(201).json({
      success: true,
      message: "Complaint created successfully",
      data: populatedComplaint,
    });
  } catch (error) {
    console.error("Create complaint error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate complaint/customer data",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create complaint",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Get All Complaints
|--------------------------------------------------------------------------
*/

export const getComplaints = async (req, res) => {
  try {
    const {
      search = "",
      status,
      complaintType,
      priority,
      customerId,
      technicianId,
      dealerId,
      fromDate,
      toDate,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    /*
    |--------------------------------------------------------------------------
    | Status Filters
    |--------------------------------------------------------------------------
    */

    if (status) {
      filter.status = status.toUpperCase();
    }

    if (complaintType) {
      filter.complaintType = complaintType.toUpperCase();
    }

    if (priority) {
      filter.priority = priority.toUpperCase();
    }

    /*
    |--------------------------------------------------------------------------
    | Relation Filters
    |--------------------------------------------------------------------------
    */

    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
      filter.customerId = customerId;
    }

    if (technicianId && mongoose.Types.ObjectId.isValid(technicianId)) {
      filter.technicianId = technicianId;
    }

    if (dealerId && mongoose.Types.ObjectId.isValid(dealerId)) {
      filter.dealerId = dealerId;
    }

    /*
    |--------------------------------------------------------------------------
    | Date Filters
    |--------------------------------------------------------------------------
    */

    if (fromDate || toDate) {
      filter.complaintDateTime = {};

      if (fromDate) {
        const startDate = new Date(fromDate);

        if (isNaN(startDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid fromDate",
          });
        }

        startDate.setHours(0, 0, 0, 0);

        filter.complaintDateTime.$gte = startDate;
      }

      if (toDate) {
        const endDate = new Date(toDate);

        if (isNaN(endDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid toDate",
          });
        }

        endDate.setHours(23, 59, 59, 999);

        filter.complaintDateTime.$lte = endDate;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Search
    |--------------------------------------------------------------------------
    */

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");

      filter.$or = [
        {
          complaintNumber: regex,
        },
        {
          customerName: regex,
        },
        {
          phone: regex,
        },
        {
          alternatePhone: regex,
        },
        {
          brand: regex,
        },
        {
          productName: regex,
        },
        {
          productType: regex,
        },
        {
          faultReported: regex,
        },
        {
          category: regex,
        },
      ];
    }

    /*
    |--------------------------------------------------------------------------
    | Pagination
    |--------------------------------------------------------------------------
    */

    const pageNumber = Math.max(Number(page), 1);

    const limitNumber = Math.min(Math.max(Number(limit), 1), 100);

    const skip = (pageNumber - 1) * limitNumber;

    /*
    |--------------------------------------------------------------------------
    | Query
    |--------------------------------------------------------------------------
    */

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)

        .populate(
          "customerId",
          "customerCode name phone alternatePhone email address",
        )

        .populate("parentComplaintId", "complaintNumber complaintType status")

        .populate("brandId", "brandName")

        .populate("productTypeId", "product_id product_code product_type")

        .sort({
          complaintDateTime: -1,
        })

        .skip(skip)

        .limit(limitNumber)

        .lean(),

      Complaint.countDocuments(filter),
    ]);

    /*
    |--------------------------------------------------------------------------
    | Add Warranty Status
    |--------------------------------------------------------------------------
    */

    const complaintsWithWarranty = complaints.map((complaint) => ({
      ...complaint,

      isWarranty: getIsWarranty(complaint),
    }));

    return res.status(200).json({
      success: true,

      data: complaintsWithWarranty,

      pagination: {
        total,

        page: pageNumber,

        limit: limitNumber,

        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get complaints error:", error);

    return res.status(500).json({
      success: false,

      message: "Failed to fetch complaints",

      error: error.message,
    });
  }
};
/*
|--------------------------------------------------------------------------
| Get Complaint By ID
|--------------------------------------------------------------------------
*/

export const getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint ID",
      });
    }

    const complaint = await Complaint.findById(id)

      .populate("customerId")

      .populate(
        "parentComplaintId",
        "complaintNumber complaintType status createdAt warrantyStartDate warrantyEndDate",
      )

      .populate("technicianId")

      .populate("dealerId")

      .populate("brandId", "brandName")

      .populate("productTypeId", "product_id product_code product_type")

      .lean();

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    const data = {
      ...complaint,

      isWarranty: getIsWarranty(complaint),
    };

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get complaint by ID error:", error);

    return res.status(500).json({
      success: false,

      message: "Failed to fetch complaint",

      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Update Complaint
|--------------------------------------------------------------------------
*/

export const updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint ID",
      });
    }

    const complaint = await Complaint.findById(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    const previousStatus = complaint.status;

    /*
    |--------------------------------------------------------------------------
    | Normal Fields
    |--------------------------------------------------------------------------
    */

    const allowedFields = [
      "customerName",
      "phone",
      "alternatePhone",
      "email",
      "contactInfo",

      "brandId",
      "brand",

      "productId",
      "productName",

      "productTypeId",
      "productType",
      "productCode",

      "productDescription",

      "units",
      "quoteAmount",

      "faultReported",

      "categoryId",
      "category",
      "priority",

      "complaintType",

      "adName",
      "subject",
      "description",

      "status",

      "technicianId",
      "technicianName",

      "dealerId",
      "dealerName",

      "cancellationReason",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        complaint[field] = req.body[field];
      }
    });

    /*
    |--------------------------------------------------------------------------
    | Nested Address
    |--------------------------------------------------------------------------
    */

    if (req.body.address !== undefined) {
      const address = req.body.address;

      complaint.address = {
        addressLine: address?.addressLine?.trim() || "",

        stateId:
          address?.stateId !== undefined && address?.stateId !== null
            ? Number(address.stateId)
            : null,

        state: address?.state?.trim() || "",

        districtId:
          address?.districtId !== undefined && address?.districtId !== null
            ? Number(address.districtId)
            : null,

        district: address?.district?.trim() || "",

        cityId:
          address?.cityId !== undefined && address?.cityId !== null
            ? Number(address.cityId)
            : null,

        city: address?.city?.trim() || "",

        pincodeId:
          address?.pincodeId !== undefined && address?.pincodeId !== null
            ? Number(address.pincodeId)
            : null,

        pinCode: address?.pinCode?.trim() || "",
      };
    }

    /*
    |--------------------------------------------------------------------------
    | Normalize numeric fields
    |--------------------------------------------------------------------------
    */

    if (req.body.productId !== undefined) {
      complaint.productId =
        req.body.productId !== null && req.body.productId !== ""
          ? Number(req.body.productId)
          : null;
    }

    if (req.body.categoryId !== undefined) {
      complaint.categoryId =
        req.body.categoryId &&
        mongoose.Types.ObjectId.isValid(req.body.categoryId)
          ? req.body.categoryId
          : null;
    }
    if (req.body.units !== undefined) {
      complaint.units = Number(req.body.units);
    }

    if (req.body.quoteAmount !== undefined) {
      complaint.quoteAmount = Number(req.body.quoteAmount);
    }

    /*
    |--------------------------------------------------------------------------
    | Normalize ObjectIds
    |--------------------------------------------------------------------------
    */

    if (req.body.brandId !== undefined) {
      complaint.brandId =
        req.body.brandId && mongoose.Types.ObjectId.isValid(req.body.brandId)
          ? req.body.brandId
          : null;
    }

    if (req.body.productTypeId !== undefined) {
      complaint.productTypeId =
        req.body.productTypeId &&
        mongoose.Types.ObjectId.isValid(req.body.productTypeId)
          ? req.body.productTypeId
          : null;
    }

    /*
    |--------------------------------------------------------------------------
    | Automatic Status Dates
    |--------------------------------------------------------------------------
    */

    if (req.body.status === "CLOSED") {
      const closeDate = new Date();

      complaint.closedAt = closeDate;

      complaint.warrantyStartDate = closeDate;

      const warrantyEndDate = new Date(closeDate);

      warrantyEndDate.setMonth(warrantyEndDate.getMonth() + 1);

      complaint.warrantyEndDate = warrantyEndDate;
    }

    if (req.body.status === "CANCELLED") {
      complaint.cancelledAt = new Date();
    }

    if (req.body.status !== "CLOSED" && req.body.status !== undefined) {
      complaint.closedAt = null;
    }

    if (req.body.status !== "CANCELLED" && req.body.status !== undefined) {
      complaint.cancelledAt = null;
    }

    await complaint.save();

    const updatedComplaint = await Complaint.findById(complaint._id)
      .populate(
        "customerId",
        "customerCode name phone alternatePhone email address contactInfo status",
      )
      .populate("brandId", "brandName")
      .populate("productTypeId", "product_id product_code product_type")
      .populate(
        "categoryId",
        "product_id category description categoryDescription status",
      )
      .populate("parentComplaintId", "complaintNumber complaintType status");

    return res.status(200).json({
      success: true,
      message: "Complaint updated successfully",
      data: updatedComplaint,
    });
  } catch (error) {
    console.error("Update complaint error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update complaint",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Delete Complaint
|--------------------------------------------------------------------------
*/

export const deleteComplaint = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint ID",
      });
    }

    const complaint = await Complaint.findById(id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check child complaints
    |--------------------------------------------------------------------------
    */

    const childCount = await Complaint.countDocuments({
      parentComplaintId: id,
    });

    if (childCount > 0) {
      return res.status(409).json({
        success: false,

        message:
          "Complaint cannot be deleted because repeat/warranty complaints are linked with it",

        childComplaints: childCount,
      });
    }

    await Complaint.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,

      message: "Complaint deleted successfully",
    });
  } catch (error) {
    console.error("Delete complaint error:", error);

    return res.status(500).json({
      success: false,

      message: "Failed to delete complaint",

      error: error.message,
    });
  }
};
