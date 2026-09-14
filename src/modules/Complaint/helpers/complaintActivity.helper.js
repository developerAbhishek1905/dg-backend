export const getStatusActivityData = ({
  status,
  previousStatus,
  pendingReason = "",
  cancellationReason = "",
}) => {
  const activities = {
    APPOINTMENT_SCHEDULED: {
      activityType:
        "APPOINTMENT_SCHEDULED",

      title:
        "Appointment Scheduled",

      description:
        "Appointment has been scheduled for the complaint.",
    },

    RESCHEDULED: {
      activityType:
        "APPOINTMENT_RESCHEDULED",

      title:
        "Appointment Rescheduled",

      description:
        "Appointment date/time has been rescheduled.",
    },

    PENDING_ON_CALL: {
      activityType: "PENDING",

      title:
        "Complaint Pending On Call",

      description:
        pendingReason
          ? `Complaint marked pending on call: ${pendingReason}`
          : "Complaint marked pending on call.",
    },

    VISITED: {
      activityType:
        "STATUS_CHANGED",

      title:
        "Customer Visit Completed",

      description:
        "Dealer/technician visited the customer.",
    },

    PENDING_ON_VISIT: {
      activityType: "PENDING",

      title:
        "Complaint Pending On Visit",

      description:
        pendingReason
          ? `Complaint marked pending after visit: ${pendingReason}`
          : "Complaint marked pending after visit.",
    },

    CANCEL_ON_CALL: {
      activityType:
        "COMPLAINT_CANCELLED",

      title:
        "Complaint Cancelled On Call",

      description:
        cancellationReason
          ? `Complaint cancelled on call: ${cancellationReason}`
          : "Complaint cancelled on call.",
    },

    CANCEL_ON_VISIT: {
      activityType:
        "COMPLAINT_CANCELLED",

      title:
        "Complaint Cancelled On Visit",

      description:
        cancellationReason
          ? `Complaint cancelled after visit: ${cancellationReason}`
          : "Complaint cancelled after visit.",
    },

    CLOSE_ON_BILLING: {
      activityType:
        "COMPLAINT_CLOSED",

      title:
        "Complaint Sent For Billing",

      description:
        "Complaint work completed and sent for billing.",
    },

    WORK_IN_PROGRESS: {
      activityType:
        "WORK_STARTED",

      title:
        "Work Started",

      description:
        "Work has been started on the complaint.",
    },

    COMPLETED: {
      activityType:
        "WORK_COMPLETED",

      title:
        "Work Completed",

      description:
        "Complaint work has been completed.",
    },

    CLOSED: {
      activityType:
        "COMPLAINT_CLOSED",

      title:
        "Complaint Closed",

      description:
        "Complaint has been closed.",
    },
  };

  return (
    activities[status] || {
      activityType:
        "STATUS_CHANGED",

      title: "Status Changed",

      description:
        `Complaint status changed from ${previousStatus || "-"} to ${status}.`,
    }
  );
};