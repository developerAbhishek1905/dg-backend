// utils/dealerAvailability.js

// export const getDealerEffectiveStatus = (dealer, now = new Date()) => {
//   /*
//    * SUSPENDED always wins.
//    */
//   if (dealer.status === "SUSPENDED") {
//     return "SUSPENDED";
//   }

//   /*
//    * Scheduled/registered leave.
//    */
//   if (dealer.leaveFrom) {
//     const leaveFrom = new Date(dealer.leaveFrom);

//     const leaveTo = dealer.leaveTo
//       ? new Date(dealer.leaveTo)
//       : null;

//     if (
//       now >= leaveFrom &&
//       (!leaveTo || now <= leaveTo)
//     ) {
//       return "LEAVE";
//     }
//   }

//   /*
//    * Dealer has left.
//    */
//   if (dealer.dateOfLeaving) {
//     const leavingDate = new Date(dealer.dateOfLeaving);

//     if (now >= leavingDate) {
//       /*
//        * Find latest rejoining date that has already arrived.
//        */
//       const latestRejoiningDate = (dealer.rejoiningDates ?? [])
//         .map((date) => new Date(date))
//         .filter((date) => date <= now)
//         .sort((a, b) => b - a)[0];

//       /*
//        * No rejoining after leaving.
//        */
//       if (
//         !latestRejoiningDate ||
//         latestRejoiningDate <= leavingDate
//       ) {
//         return "INACTIVE";
//       }
//     }
//   }

//   /*
//    * Future joining date.
//    */
//   if (
//     dealer.dateOfJoining &&
//     now < new Date(dealer.dateOfJoining)
//   ) {
//     return "INACTIVE";
//   }

//   return "ACTIVE";
// };

export const getDealerEffectiveStatus = (
  dealer,
  now = new Date(),
) => {
  /*
  |--------------------------------------------------------------------------
  | 1. SUSPENDED
  |--------------------------------------------------------------------------
  */

  if (dealer.status === "SUSPENDED") {
    return "SUSPENDED";
  }

  /*
  |--------------------------------------------------------------------------
  | 2. FUTURE JOINING DATE
  |--------------------------------------------------------------------------
  */

  if (dealer.dateOfJoining) {
    const joiningDate = new Date(
      dealer.dateOfJoining,
    );

    if (now < joiningDate) {
      return "INACTIVE";
    }
  }

  /*
  |--------------------------------------------------------------------------
  | 3. LEAVE CHECK
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  | Don't depend on leave.status === "ACTIVE".
  |
  | Mongo may still contain:
  | status: "SCHEDULED"
  |
  | We calculate leave using from/to dates.
  |--------------------------------------------------------------------------
  */

  const isOnLeave = (dealer.leaves ?? []).some(
    (leave) => {
      /*
       * Cancelled leave does not block dealer.
       */
      if (leave.status === "CANCELLED") {
        return false;
      }

      if (!leave.from || !leave.to) {
        return false;
      }

      const leaveFrom = new Date(leave.from);
      const leaveTo = new Date(leave.to);

      if (
        Number.isNaN(leaveFrom.getTime()) ||
        Number.isNaN(leaveTo.getTime())
      ) {
        return false;
      }

      /*
       * Leave should apply for the complete day.
       */

      leaveFrom.setHours(0, 0, 0, 0);

      leaveTo.setHours(23, 59, 59, 999);

      return (
        now >= leaveFrom &&
        now <= leaveTo
      );
    },
  );

  if (isOnLeave) {
    return "LEAVE";
  }

  /*
  |--------------------------------------------------------------------------
  | 4. DEALER LEAVING / REJOINING
  |--------------------------------------------------------------------------
  */

  if (dealer.dateOfLeaving) {
    const leavingDate = new Date(
      dealer.dateOfLeaving,
    );

    /*
     * Leaving applies for the whole date.
     */
    leavingDate.setHours(0, 0, 0, 0);

    if (now >= leavingDate) {
      /*
       * Find latest rejoining date
       * that has already arrived.
       */

      const latestRejoiningDate = (
        dealer.rejoiningDates ?? []
      )
        .map((date) => new Date(date))
        .filter(
          (date) =>
            !Number.isNaN(date.getTime()) &&
            date <= now,
        )
        .sort(
          (a, b) =>
            b.getTime() - a.getTime(),
        )[0];

      /*
       * No valid rejoining after leaving.
       */

      if (
        !latestRejoiningDate ||
        latestRejoiningDate <= leavingDate
      ) {
        return "INACTIVE";
      }
    }
  }

  /*
  |--------------------------------------------------------------------------
  | 5. ACTIVE
  |--------------------------------------------------------------------------
  */

  return "ACTIVE";
};

export const canDealerReceiveComplaint = (
  dealer,
  now = new Date(),
) => {
  return getDealerEffectiveStatus(dealer, now) === "ACTIVE";
};