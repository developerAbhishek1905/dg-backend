// utils/dealerAvailability.js

export const getDealerEffectiveStatus = (dealer, now = new Date()) => {
  /*
   * SUSPENDED always wins.
   */
  if (dealer.status === "SUSPENDED") {
    return "SUSPENDED";
  }

  /*
   * Scheduled/registered leave.
   */
  if (dealer.leaveFrom) {
    const leaveFrom = new Date(dealer.leaveFrom);

    const leaveTo = dealer.leaveTo
      ? new Date(dealer.leaveTo)
      : null;

    if (
      now >= leaveFrom &&
      (!leaveTo || now <= leaveTo)
    ) {
      return "LEAVE";
    }
  }

  /*
   * Dealer has left.
   */
  if (dealer.dateOfLeaving) {
    const leavingDate = new Date(dealer.dateOfLeaving);

    if (now >= leavingDate) {
      /*
       * Find latest rejoining date that has already arrived.
       */
      const latestRejoiningDate = (dealer.rejoiningDates ?? [])
        .map((date) => new Date(date))
        .filter((date) => date <= now)
        .sort((a, b) => b - a)[0];

      /*
       * No rejoining after leaving.
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
   * Future joining date.
   */
  if (
    dealer.dateOfJoining &&
    now < new Date(dealer.dateOfJoining)
  ) {
    return "INACTIVE";
  }

  return "ACTIVE";
};

export const canDealerReceiveComplaint = (
  dealer,
  now = new Date(),
) => {
  return getDealerEffectiveStatus(dealer, now) === "ACTIVE";
};