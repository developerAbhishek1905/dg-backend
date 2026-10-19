const baseUrl = () =>
  (process.env.FRONTEND_URL || "https://dg-iota-tawny.vercel.app").replace(
    /\/+$/,
    "",
  );

// Direct link to one complaint (opens its details page)
export const complaintLink = (complaintId) =>
  `${baseUrl()}/appointments/${complaintId}`;
