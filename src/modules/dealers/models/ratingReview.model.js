import mongoose from "mongoose";

const ratingReviewSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | Complaint
    |--------------------------------------------------------------------------
    */

    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Complaint",
      required: true,
      index: true,
    },

    complaintNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Dealer
    |--------------------------------------------------------------------------
    */

    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Dealer",
      required: true,
      index: true,
    },


    /*
    |--------------------------------------------------------------------------
    | Customer
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
    | Rating
    |--------------------------------------------------------------------------
    */

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    /*
    |--------------------------------------------------------------------------
    | Review
    |--------------------------------------------------------------------------
    */

    review: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    /*
    |--------------------------------------------------------------------------
    | Created By
    |--------------------------------------------------------------------------
    */

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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

// One rating/review per complaint
ratingReviewSchema.index(
  { complaintId: 1 },
  { unique: true },
);

// Dealer rating listing
ratingReviewSchema.index({
  dealerId: 1,
  createdAt: -1,
});

// Customer review history
ratingReviewSchema.index({
  customerId: 1,
  createdAt: -1,
});

export default mongoose.model("RatingReview", ratingReviewSchema);