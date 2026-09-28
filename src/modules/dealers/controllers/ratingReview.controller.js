import mongoose from "mongoose";

import RatingReview from "../models/ratingReview.model.js"
import Complaint from "../../Complaint/models/complaint.model.js";
import Dealer from "../models/dealer.model.js";

/*
|--------------------------------------------------------------------------
| GET ALL RATINGS / REVIEWS
|--------------------------------------------------------------------------
|
| Filters supported:
|
| ?dealerId=
| ?customerId=
| ?complaintId=
|
| They can also be combined.
|
*/

export const getRatings = async (req, res) => {
  try {
    const {
      dealerId,
      customerId,
      complaintId,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    /*
    |--------------------------------------------------------------------------
    | Dealer Filter
    |--------------------------------------------------------------------------
    */

    if (dealerId) {
      if (!mongoose.Types.ObjectId.isValid(dealerId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid dealer ID",
        });
      }

      filter.dealerId = dealerId;
    }

    /*
    |--------------------------------------------------------------------------
    | Customer Filter
    |--------------------------------------------------------------------------
    */

    if (customerId) {
      if (!mongoose.Types.ObjectId.isValid(customerId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID",
        });
      }

      filter.customerId = customerId;
    }

    /*
    |--------------------------------------------------------------------------
    | Complaint Filter
    |--------------------------------------------------------------------------
    */

    if (complaintId) {
      if (!mongoose.Types.ObjectId.isValid(complaintId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid complaint ID",
        });
      }

      filter.complaintId = complaintId;
    }

    /*
    |--------------------------------------------------------------------------
    | Pagination
    |--------------------------------------------------------------------------
    */

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const skip = (pageNumber - 1) * limitNumber;

    /*
    |--------------------------------------------------------------------------
    | Fetch Ratings
    |--------------------------------------------------------------------------
    */

    const [ratings, total] = await Promise.all([
      RatingReview.find(filter)
        .populate(
          "dealerId",
          "dealerCode technicianFirmName technicianName rating ratingCount",
        )
        .populate(
          "customerId",
          "customerName phone email",
        )
        .populate(
          "complaintId",
          "complaintNumber productName category status",
        )
        .populate(
          "createdBy",
          "name email",
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber)
        .lean(),

      RatingReview.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,

      data: ratings,

      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get ratings error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch ratings",
      error: error.message,
    });
  }
};