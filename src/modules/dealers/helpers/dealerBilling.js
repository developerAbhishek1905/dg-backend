// Accept multipart form values while preserving omitted fields on updates.
export function parseDealerBilling(body, existing = {}) {
  const billingType = body.billingType ?? existing.billingType ?? "FIXED";
  if (!["FIXED", "PARTIAL_PAYMENT", "PROFIT_SHARING"].includes(billingType)) {
    throw new Error("Choose a valid billing method");
  }
  const enabled = body.cancellationBillingEnabled ?? existing.cancellationBillingEnabled ?? false;
  if (![true, false, "true", "false"].includes(enabled)) {
    throw new Error("Cancellation billing must be enabled or disabled");
  }
  const cancellationBillingEnabled = enabled === true || enabled === "true";
  const billingPercentage = billingType === "FIXED" ? 0 : Number(body.billingPercentage ?? existing.billingPercentage);
  const cancellationCharge = cancellationBillingEnabled ? Number(body.cancellationCharge ?? existing.cancellationCharge) : 0;
  if (!Number.isFinite(billingPercentage) || (billingType !== "FIXED" && (billingPercentage <= 0 || billingPercentage > 100))) {
    throw new Error("Billing percentage must be greater than 0 and up to 100");
  }
  if (!Number.isFinite(cancellationCharge) || (cancellationBillingEnabled && cancellationCharge <= 0)) {
    throw new Error("Cancellation charge must be greater than 0");
  }
  return { billingType, billingPercentage, cancellationBillingEnabled, cancellationCharge };
}
