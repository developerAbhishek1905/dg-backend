import mongoose from "mongoose";

const complaintActivityLogSchema = new mongoose.Schema(
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
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Activity Type
    |--------------------------------------------------------------------------
    */

    activityType: {
      type: String,
      enum: [
        "COMPLAINT_CREATED",

        "STATUS_CHANGED",

        "DEALER_ALLOCATED",
        "DEALER_CHANGED",
        "DEALER_REMOVED",

        "TECHNICIAN_ASSIGNED",
        "TECHNICIAN_CHANGED",
        "TECHNICIAN_REMOVED",

        "APPOINTMENT_SCHEDULED",
        "APPOINTMENT_RESCHEDULED",

        "PENDING",

        "WORK_STARTED",
        "WORK_COMPLETED",

        "DG_VERIFICATION",

        "COMPLAINT_CLOSED",
        "COMPLAINT_CANCELLED",

        "CUSTOMER_UPDATED",
        "COMPLAINT_UPDATED",

        "NOTE_ADDED",
      ],
      required: true,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Status Lifecycle
    |--------------------------------------------------------------------------
    */

    previousStatus: {
      type: String,
      default: null,
      index: true,
    },

    newStatus: {
      type: String,
      default: null,
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Activity Details
    |--------------------------------------------------------------------------
    */

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    reason: {
      type: String,
      trim: true,
      default: "",
    },

    /*
    |--------------------------------------------------------------------------
    | Appointment
    |--------------------------------------------------------------------------
    */

    appointmentDate: {
      type: Date,
      default: null,
    },

    appointmentTime: {
      type: String,
      trim: true,
      default: "",
    },

    /*
    |--------------------------------------------------------------------------
    | Dealer Snapshot
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | Technician Snapshot
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

    /*
    |--------------------------------------------------------------------------
    | Who Performed Activity
    |--------------------------------------------------------------------------
    */

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    performedByName: {
      type: String,
      trim: true,
      default: "",
    },

    performedByRole: {
      type: String,
      trim: true,
      default: "",
    },

    /*
    |--------------------------------------------------------------------------
    | Optional Extra Data
    |--------------------------------------------------------------------------
    */

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    /*
    |--------------------------------------------------------------------------
    | Explicit Activity Time
    |--------------------------------------------------------------------------
    */

    activityAt: {
      type: Date,
      default: Date.now,
      index: true,
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

complaintActivityLogSchema.index({
  complaintId: 1,
  activityAt: -1,
});

complaintActivityLogSchema.index({
  complaintNumber: 1,
  activityAt: -1,
});

complaintActivityLogSchema.index({
  complaintId: 1,
  activityType: 1,
});

complaintActivityLogSchema.index({
  complaintId: 1,
  newStatus: 1,
});

export default mongoose.model(
  "ComplaintActivityLog",
  complaintActivityLogSchema,
);
