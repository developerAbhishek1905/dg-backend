export const getIsWarranty = (complaint) => {
  if (
    !complaint?.warrantyStartDate ||
    !complaint?.warrantyEndDate
  ) {
    return false;
  }

  const now = new Date();

  const startDate = new Date(
    complaint.warrantyStartDate,
  );

  const endDate = new Date(
    complaint.warrantyEndDate,
  );

  return (
    now >= startDate &&
    now <= endDate
  );
};