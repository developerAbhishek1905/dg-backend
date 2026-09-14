import ComplaintActivityLog from "../models/complaintActivityLog.model.js";

export const createComplaintActivity = async ({
  complaint,

  activityType,

  previousStatus = null,
  newStatus = null,

  title,
  description = "",
  reason = "",

  dealerId = null,
  dealerName = "",

  technicianId = null,
  technicianName = "",

  appointmentDate = null,
  appointmentTime = "",

  user = null,

  metadata = {},
}) => {
  if (!complaint?._id) {
    throw new Error(
      "Complaint is required to create activity log",
    );
  }

  try {
    const activity =
      await ComplaintActivityLog.create({
        complaintId: complaint._id,

        complaintNumber:
          complaint.complaintNumber,

        activityType,

        previousStatus,

        newStatus,

        title,

        description,

        reason,

        dealerId:
          dealerId ||
          complaint.allocatedDealerId ||
          complaint.dealerId ||
          null,

        dealerName:
          dealerName ||
          complaint.dealerName ||
          "",

        technicianId:
          technicianId ||
          complaint.technicianId ||
          null,

        technicianName:
          technicianName ||
          complaint.technicianName ||
          "",

        appointmentDate,

        appointmentTime,

        performedBy:
          user?._id ||
          user?.id ||
          null,

        performedByName:
          user?.name ||
          user?.fullName ||
          user?.username ||
          "",

        performedByRole:
          user?.role?.code ||
          "",

        metadata,

        activityAt: new Date(),
      });

    return activity;
  } catch (error) {
    console.error(
      "Complaint activity creation error:",
      error,
    );

    throw error;
  }
};