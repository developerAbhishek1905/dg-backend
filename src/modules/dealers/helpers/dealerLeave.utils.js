export const getLeaveStatus = (leave, now = new Date()) => {
  if (leave.status === "CANCELLED") {
    return "CANCELLED";
  }

  const today = new Date(now);
  const from = new Date(leave.from);
  const to = new Date(leave.to);

  today.setHours(0, 0, 0, 0);
  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);

  if (today < from) {
    return "SCHEDULED";
  }

  if (today > to) {
    return "COMPLETED";
  }

  return "ACTIVE";
};

export const isDealerOnLeave = (
  dealer,
  now = new Date(),
) => {
  return (dealer.leaves ?? []).some((leave) => {
    return getLeaveStatus(leave, now) === "ACTIVE";
  });
};