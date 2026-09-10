import mongoose from "mongoose";
import Customer from "../models/customer.model.js";
import Complaint from "../../Complaint/models/complaint.model.js";
import { getIsWarranty } from "../../../helper/warranty.util.js";


/*
|--------------------------------------------------------------------------
| Generate Customer Code
|--------------------------------------------------------------------------
*/

const generateCustomerCode = async () => {
  const lastCustomer = await Customer.findOne({
    customerCode: /^CUS\d+$/,
  })
    .sort({
      createdAt: -1,
    })
    .select("customerCode");

  let nextNumber = 1;

  if (lastCustomer?.customerCode) {
    const currentNumber = Number(lastCustomer.customerCode.replace("CUS", ""));

    if (!Number.isNaN(currentNumber)) {
      nextNumber = currentNumber + 1;
    }
  }

  return `CUS${String(nextNumber).padStart(6, "0")}`;
};

/*
|--------------------------------------------------------------------------
| Create Customer
|--------------------------------------------------------------------------
*/

export const createCustomer = async (req, res) => {
  try {
    const { name, phone, alternatePhone, email, address, contactInfo, status } =
      req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required",
      });
    }

    if (!phone?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    if (!/^[0-9]{10}$/.test(phone.trim())) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be 10 digits",
      });
    }

    if (alternatePhone && !/^[0-9]{10}$/.test(alternatePhone.trim())) {
      return res.status(400).json({
        success: false,
        message: "Alternate phone number must be 10 digits",
      });
    }

    if (!address?.addressLine?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Address is required",
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

    const existingCustomer = await Customer.findOne({
      phone: phone.trim(),
    });

    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        message: "Customer already exists with this phone number",
        data: existingCustomer,
      });
    }

    const customerCode = await generateCustomerCode();

    const customer = await Customer.create({
      customerCode,

      name: name.trim(),

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

      status: status || "ACTIVE",
    });

    return res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Create customer error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Customer already exists with duplicate unique data",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create customer",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Get All Customers
|--------------------------------------------------------------------------
*/

export const getCustomers = async (req, res) => {
  try {
    const { search = "", status, page = 1, limit = 10 } = req.query;

    const filter = {};

    if (status) {
      filter.status = status.toUpperCase();
    }

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");

      filter.$or = [
        {
          customerCode: regex,
        },
        {
          name: regex,
        },
        {
          phone: regex,
        },
        {
          alternatePhone: regex,
        },
        {
          email: regex,
        },
        {
          city: regex,
        },
        {
          district: regex,
        },
        {
          state: regex,
        },
        {
          pincode: regex,
        },
      ];
    }

    const pageNumber = Math.max(Number(page), 1);

    const limitNumber = Math.min(Math.max(Number(limit), 1), 100);

    const skip = (pageNumber - 1) * limitNumber;

    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber),

      Customer.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,

      data: customers,

      pagination: {
        total,

        page: pageNumber,

        limit: limitNumber,

        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get customers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customers",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Get Customer By ID
|--------------------------------------------------------------------------
*/

export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("Get customer by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Update Customer
|--------------------------------------------------------------------------
*/

export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const { name, phone, alternatePhone, email, address, contactInfo, status } =
      req.body;

    if (phone !== undefined) {
      if (!/^[0-9]{10}$/.test(phone.trim())) {
        return res.status(400).json({
          success: false,
          message: "Phone number must be 10 digits",
        });
      }

      if (phone.trim() !== customer.phone) {
        const duplicatePhone = await Customer.findOne({
          phone: phone.trim(),
          _id: {
            $ne: id,
          },
        });

        if (duplicatePhone) {
          return res.status(409).json({
            success: false,
            message: "Another customer already exists with this phone number",
          });
        }
      }
    }

    if (
      alternatePhone !== undefined &&
      alternatePhone &&
      !/^[0-9]{10}$/.test(alternatePhone.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Alternate phone number must be 10 digits",
      });
    }

    if (name !== undefined) {
      customer.name = name.trim();
    }

    if (phone !== undefined) {
      customer.phone = phone.trim();
    }

    if (alternatePhone !== undefined) {
      customer.alternatePhone = alternatePhone?.trim() || "";
    }

    if (email !== undefined) {
      customer.email = email?.trim()?.toLowerCase() || "";
    }

    if (address !== undefined) {
      customer.address = {
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

    if (contactInfo !== undefined) {
      customer.contactInfo = contactInfo?.trim() || "";
    }

    if (status !== undefined) {
      customer.status = status;
    }

    await customer.save();

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      data: customer,
    });
  } catch (error) {
    console.error("Update customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update customer",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Delete Customer
|--------------------------------------------------------------------------
*/

export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID",
      });
    }

    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent deleting customer having complaints
    |--------------------------------------------------------------------------
    */

    const complaintCount = await Complaint.countDocuments({
      customerId: id,
    });

    if (complaintCount > 0) {
      return res.status(409).json({
        success: false,

        message:
          "Customer cannot be deleted because complaints are linked with this customer",

        complaintCount,
      });
    }

    await Customer.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Delete customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete customer",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Lookup Customer By Phone
|--------------------------------------------------------------------------
*/

export const lookupCustomerByPhone = async (req, res) => {
  try {
    const { phone } = req.params;

    if (!/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,

        message: "Please provide a valid 10 digit phone number",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find Customer
    |--------------------------------------------------------------------------
    */

    const customer = await Customer.findOne({
      $or: [
        {
          phone,
        },
        {
          alternatePhone: phone,
        },
      ],
    }).lean();

    if (!customer) {
      return res.status(200).json({
        success: true,

        customer: null,

        complaintHistory: [],

        message: "Customer not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Complaint History
    |--------------------------------------------------------------------------
    */

    const complaintHistory = await Complaint.find({
      customerId: customer._id,
    })

      .populate("brandId", "brandName")

      .populate("productTypeId", "product_id product_code product_type")

      .sort({
        createdAt: -1,
      })

      .lean();

    /*
    |--------------------------------------------------------------------------
    | Add Warranty Status
    |--------------------------------------------------------------------------
    */

    const complaintHistoryWithWarranty = complaintHistory.map((complaint) => ({
      ...complaint,

      isWarranty: getIsWarranty(complaint),
    }));

    return res.status(200).json({
      success: true,

      customer,

      complaintHistory: complaintHistoryWithWarranty,
    });
  } catch (error) {
    console.error("Customer lookup error:", error);

    return res.status(500).json({
      success: false,

      message: "Unable to search customer",

      error: error.message,
    });
  }
};
