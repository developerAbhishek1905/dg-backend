export const percentageMethods = ["PARTIAL_PAYMENT", "PROFIT_SHARING"];
export const closingStatuses = ["CLOSED", "CLOSE_ON_BILLING", "CLOSE_ON_VERIFICATION"];
export function calculateCharge(method, percentage, amount) {
  if (!percentageMethods.includes(method)) throw new Error("A percentage billing method is required");
  if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) throw new Error("Dealer billing percentage must be greater than 0 and up to 100");
  if (!["string", "number"].includes(typeof amount) || String(amount).trim() === "" || amount == null || !Number.isFinite(Number(amount)) || Number(amount) < 0) throw new Error("Enter a valid non-negative amount");
  const baseAmount = Math.round(Number(amount) * 100) / 100;
  const charge = Math.round(baseAmount * percentage) / 100;
  if (!Number.isSafeInteger(Math.round(baseAmount * 100)) || !Number.isSafeInteger(Math.round(charge * 100))) throw new Error("Amount is too large");
  return { baseAmount, charge };
}
export function canVerify(user, permission) {
  return user?.role?.code !== "DEALER" && (user?.role?.code === "SUPER_ADMIN" || user?.permissions?.includes(permission) || user?.permissions?.includes("*"));
}
