
import mongoose from "mongoose";
import Complaint from "../../Complaint/models/complaint.model.js";

/*
|--------------------------------------------------------------------------
| Get Appointment Complaints
|--------------------------------------------------------------------------
| ADMIN / other roles:
|   -> All complaints
|
| DEALER:
|   -> Only complaints allocated to logged-in dealer
|--------------------------------------------------------------------------
*/

export const getAppointmentComplaints = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      priority = "",
      complaintType = "",
      fromDate = "",
      toDate = "",
    } = req.query;

    const user = req.user;

    console.log(user);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const filter = {};

    /*
    |--------------------------------------------------------------------------
    | Dealer Role Filter
    |--------------------------------------------------------------------------
    */

    const roleCode = user?.role?.code;
    console.log("jfhdkfkdnfkdfkdfkdbfkdbfkdjb", roleCode);

    if (roleCode === "DEALER") {
      if (!user.id) {
        return res.status(403).json({
          success: false,
          message: "Dealer account is not linked with any dealer",
        });
      }

      filter.allocatedDealerId = user.dealerId;
    }

    /*
    |--------------------------------------------------------------------------
    | Search
    |--------------------------------------------------------------------------
    */

    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");

      filter.$or = [
        { complaintNumber: regex },
        { customerName: regex },
        { phone: regex },
        { alternatePhone: regex },
        { productName: regex },
        { productType: regex },
        { category: regex },
        { faultReported: regex },
        { dealerName: regex },
        { technicianName: regex },
      ];
    }

    /*
    |--------------------------------------------------------------------------
    | Status
    |--------------------------------------------------------------------------
    */

    if (status) {
      filter.status = status;
    }

    /*
    |--------------------------------------------------------------------------
    | Priority
    |--------------------------------------------------------------------------
    */

    if (priority) {
      filter.priority = priority;
    }

    /*
    |--------------------------------------------------------------------------
    | Complaint Type
    |--------------------------------------------------------------------------
    */

    if (complaintType) {
      filter.complaintType = complaintType;
    }

    /*
    |--------------------------------------------------------------------------
    | Date Filter
    |--------------------------------------------------------------------------
    */

    if (fromDate || toDate) {
      filter.complaintDateTime = {};

      if (fromDate) {
        filter.complaintDateTime.$gte = new Date(`${fromDate}T00:00:00.000Z`);
      }

      if (toDate) {
        filter.complaintDateTime.$lte = new Date(`${toDate}T23:59:59.999Z`);
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Pagination
    |--------------------------------------------------------------------------
    */

    const currentPage = Math.max(Number(page) || 1, 1);
    const pageLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const skip = (currentPage - 1) * pageLimit;

    /*
    |--------------------------------------------------------------------------
    | Query
    |--------------------------------------------------------------------------
    */

    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .populate({
          path: "customerId",
          select: "name phone alternatePhone email",
        })
        .populate({
          path: "brandId",
          select: "brandName",
        })
        .populate({
          path: "productTypeId",
          select: "product_id product_code product_type",
        })
        .populate({
          path: "categoryId",
          select: "category description product_id",
        })
        .populate({
          path: "allocatedDealerId",
          select: "headCode technicianName technicianFirmName mobileNumber alternativeNumber email status",
        })
        // .populate({
        //   path: "technicianId",
        //   select:
        //     "technicianCode technicianName phone status",
        // })
        .sort({
          complaintDateTime: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(pageLimit)
        .lean(),

      Complaint.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: "Appointment complaints fetched successfully",

      data: complaints,

      pagination: {
        total,
        page: currentPage,
        limit: pageLimit,
        totalPages: Math.ceil(total / pageLimit),
      },
    });
  } catch (error) {
    console.error("GET APPOINTMENT COMPLAINTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch appointment complaints",
      error: error.message,
    });
  }
};

export const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      status,
      appointmentDate,
      appointmentTime,
      pendingReason,
      cancellationReason,
    } = req.body;

    const allowedStatuses = [
      "APPOINTMENT_SCHEDULED",
      "PENDING",
      "CANCELLED",
      "CLOSED",
    ];

    const allowedPendingReasons = [
      "WAITING_FOR_CUSTOMER",
      "PRODUCT_INSPECTION_PENDING",
      "SPARE_PARTS_NOT_AVAILABLE",
    ];

    const allowedCancellationReasons = [
      "CUSTOMER_NOT_AVAILABLE",
      "PHONE_NOT_PICKED",
      "CUSTOMER_REQUESTED_CALLBACK",
      "CUSTOMER_BOUGHT_ANOTHER_PRODUCT",
      "WRONG_LOCATION_SHARED",
      "ADDRESS_NOT_AVAILABLE",
      "NOT_INTERESTED",

      "ISSUE_ALREADY_RESOLVED",
      "WRONG_PRODUCT",
      "PRODUCT_REPLACED",
      "LOCAL_TECHNICIAN_ATTENDED",
      "DUPLICATE_COMPLAINT",
      "SERVICE_NOT_REQUIRED",
      "HIGH_REPAIR_COST",
    ];

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint ID",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const roleCode =
      user?.role?.code ||
      user?.roleCode ||
      user?.role;

    const filter = {
      _id: id,
    };

    if (roleCode === "DEALER") {
      if (!user.dealerId) {
        return res.status(403).json({
          success: false,
          message: "Dealer account is not linked with any dealer",
        });
      }

      filter.allocatedDealerId = user.dealerId;
    }

    const complaint = await Complaint.findOne(filter);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message:
          roleCode === "DEALER"
            ? "Complaint not found or not allocated to this dealer"
            : "Complaint not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | APPOINTMENT SCHEDULED
    |--------------------------------------------------------------------------
    */

    if (status === "APPOINTMENT_SCHEDULED") {
      if (!appointmentDate || !appointmentTime) {
        return res.status(400).json({
          success: false,
          message: "Appointment date and time are required",
        });
      }

      const selectedDate = new Date(appointmentDate);

      selectedDate.setHours(0, 0, 0, 0);

      const today = new Date();

      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);

      tomorrow.setDate(tomorrow.getDate() + 1);

      const isToday =
        selectedDate.getTime() ===
        today.getTime();

      const isTomorrow =
        selectedDate.getTime() ===
        tomorrow.getTime();

      if (!isToday && !isTomorrow) {
        return res.status(400).json({
          success: false,
          message:
            "Appointment can only be scheduled for today or tomorrow",
        });
      }

      complaint.appointmentDate =
        selectedDate;

      complaint.appointmentTime =
        appointmentTime;

      complaint.pendingReason = "";

      complaint.cancellationReason = "";

      complaint.cancelledAt = null;
    }

    /*
    |--------------------------------------------------------------------------
    | PENDING
    |--------------------------------------------------------------------------
    */

    if (status === "PENDING") {
      if (!pendingReason) {
        return res.status(400).json({
          success: false,
          message: "Pending reason is required",
        });
      }

      if (
        !allowedPendingReasons.includes(
          pendingReason,
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid pending reason",
        });
      }

      complaint.pendingReason =
        pendingReason;

      complaint.cancellationReason = "";

      complaint.cancelledAt = null;
    }

    /*
    |--------------------------------------------------------------------------
    | CANCELLED
    |--------------------------------------------------------------------------
    */

    if (status === "CANCELLED") {
      if (!cancellationReason) {
        return res.status(400).json({
          success: false,
          message:
            "Cancellation reason is required",
        });
      }

      if (
        !allowedCancellationReasons.includes(
          cancellationReason,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid cancellation reason",
        });
      }

      complaint.cancellationReason =
        cancellationReason;

      complaint.cancelledAt =
        new Date();

      complaint.pendingReason = "";
    }

    /*
    |--------------------------------------------------------------------------
    | CLOSED
    |--------------------------------------------------------------------------
    */

    if (status === "CLOSED") {
      complaint.closedAt =
        new Date();

      complaint.pendingReason = "";

      complaint.cancellationReason = "";
    }

    complaint.status = status;

    await complaint.save();

    return res.status(200).json({
      success: true,
      message:
        "Complaint status updated successfully",
      data: complaint,
    });
  } catch (error) {
    console.error(
      "UPDATE STATUS ERROR:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update complaint status",
      error: error.message,
    });
  }
};
