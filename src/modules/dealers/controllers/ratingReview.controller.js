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

export const createRatingReview = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { complaintId, rating, review = "" } = req.body;

    if (!complaintId) {
      return res.status(400).json({
        success: false,
        message: "Complaint ID is required",
      });
    }

    const numericRating = Number(rating);

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    const complaint = await Complaint.findById(complaintId);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
      });
    }

    if (!complaint.allocatedDealerId) {
      return res.status(400).json({
        success: false,
        message: "No dealer assigned to this complaint",
      });
    }

    // Prevent duplicate review
    const existingReview = await RatingReview.findOne({
      complaintId: complaint._id,
    });

    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: "Review already submitted for this complaint",
      });
    }

    session.startTransaction();

    const [ratingReview] = await RatingReview.create(
      [
        {
          complaintId: complaint._id,
          complaintNumber: complaint.complaintNumber,

          dealerId: complaint.allocatedDealerId,

          customerId: complaint.customerId,

          rating: numericRating,

          review: review?.trim() || "",

          createdBy: req.user?._id || null,
        },
      ],
      { session },
    );

    /*
    |--------------------------------------------------------------------------
    | Calculate dealer rating from actual RatingReview records
    |--------------------------------------------------------------------------
    */

    const ratingStats = await RatingReview.aggregate([
      {
        $match: {
          dealerId: new mongoose.Types.ObjectId(
            complaint.allocatedDealerId,
          ),
        },
      },
      {
        $group: {
          _id: "$dealerId",
          averageRating: {
            $avg: "$rating",
          },
          ratingCount: {
            $sum: 1,
          },
        },
      },
    ]).session(session);

    const averageRating =
      ratingStats.length > 0
        ? Number(ratingStats[0].averageRating.toFixed(2))
        : 0;

    const ratingCount =
      ratingStats.length > 0
        ? ratingStats[0].ratingCount
        : 0;

    /*
    |--------------------------------------------------------------------------
    | Update Dealer
    |--------------------------------------------------------------------------
    */

    await Dealer.findByIdAndUpdate(
      complaint.allocatedDealerId,
      {
        $set: {
          rating: averageRating,
          ratingCount,
        },
      },
      {
        session,
      },
    );

    /*
    |--------------------------------------------------------------------------
    | Store rating on complaint
    |--------------------------------------------------------------------------
    */

    await Complaint.findByIdAndUpdate(
      complaint._id,
      {
        $set: {
          rating: numericRating,
        },
      },
      {
        session,
      },
    );

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: "Rating submitted successfully",
      data: {
        review: ratingReview,
        dealerRating: averageRating,
        dealerRatingCount: ratingCount,
      },
    });
  } catch (error) {
    await session.abortTransaction();

    console.error("Create rating review error:", error);

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Review already submitted for this complaint",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to submit rating",
    });
  } finally {
    await session.endSession();
  }
};