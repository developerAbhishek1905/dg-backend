// export const getLeaveStatus = (leave, now = new Date()) => {
//   if (leave.status === "CANCELLED") {
//     return "CANCELLED";
//   }

//   const today = new Date(now);
//   const from = new Date(leave.from);
//   const to = new Date(leave.to);

//   today.setHours(0, 0, 0, 0);
//   from.setHours(0, 0, 0, 0);
//   to.setHours(0, 0, 0, 0);

//   if (today < from) {
//     return "SCHEDULED";
//   }

//   if (today > to) {
//     return "COMPLETED";
//   }

//   return "ACTIVE";
// };

// export const isDealerOnLeave = (
//   dealer,
//   now = new Date(),
// ) => {
//   return (dealer.leaves ?? []).some((leave) => {
//     return getLeaveStatus(leave, now) === "ACTIVE";
//   });
// };


export const getLeaveStatus = (
  leave,
  now = new Date(),
) => {
  /*
  |--------------------------------------------------------------------------
  | FINAL STATUSES
  |--------------------------------------------------------------------------
  */

  if (leave.status === "CANCELLED") {
    return "CANCELLED";
  }

  if (leave.status === "COMPLETED") {
    return "COMPLETED";
  }

  const today = new Date(now);
  const from = new Date(leave.from);
  const to = new Date(leave.to);

  if (
    Number.isNaN(from.getTime()) ||
    Number.isNaN(to.getTime())
  ) {
    return leave.status || "SCHEDULED";
  }

  /*
  |--------------------------------------------------------------------------
  | Compare leave by DATE
  |--------------------------------------------------------------------------
  */

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

// export const isDealerOnLeave = (

//   dealer,
//   now = new Date(),
// ) => {
//   if (!dealer?.leaves?.length) {
//     return false;
//   }

//   const today = new Date(now);
//   today.setHours(0, 0, 0, 0);

//   return dealer.leaves.some((leave) => {
//     // Cancelled leave should not block allocation
//     if (leave.status === "CANCELLED") {
//       return false;
//     }

//     const from = new Date(leave.from);
//     const to = new Date(leave.to);

//     if (
//       Number.isNaN(from.getTime()) ||
//       Number.isNaN(to.getTime())
//     ) {
//       return false;
//     }

//     from.setHours(0, 0, 0, 0);
//     to.setHours(23, 59, 59, 999);

//     return today >= from && today <= to;
//   });
// };


export const isDealerOnLeave = (
  dealer,
  now = new Date(),
) => {
  if (!dealer?.leaves?.length) {
    return false;
  }

  return dealer.leaves.some((leave) => {
    return getLeaveStatus(leave, now) === "ACTIVE";
  });
};