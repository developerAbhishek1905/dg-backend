import test from "node:test";
import assert from "node:assert/strict";
import { parseDealerBilling } from "./dealerBilling.js";

test("new dealers default to fixed billing without cancellation", () => {
  assert.deepEqual(parseDealerBilling({}), { billingType: "FIXED", billingPercentage: 0, cancellationBillingEnabled: false, cancellationCharge: 0 });
});
for (const billingType of ["FIXED", "PARTIAL_PAYMENT", "PROFIT_SHARING"]) {
  test(`${billingType} accepts optional cancellation and multipart numbers`, () => {
    const terms = parseDealerBilling({ billingType, billingPercentage: "12.5", cancellationBillingEnabled: "true", cancellationCharge: "50.25" });
    assert.equal(terms.billingPercentage, billingType === "FIXED" ? 0 : 12.5);
    assert.equal(terms.cancellationCharge, 50.25);
    assert.deepEqual(parseDealerBilling({}, terms), terms);
    assert.equal(parseDealerBilling({ cancellationBillingEnabled: "false" }, terms).cancellationCharge, 0);
  });
}
test("invalid percentages and cancellation amounts are rejected", () => {
  for (const billingPercentage of [undefined, "", "abc", "Infinity", -1, 0, 101]) {
    assert.throws(() => parseDealerBilling({ billingType: "PARTIAL_PAYMENT", billingPercentage }));
  }
  for (const cancellationCharge of [undefined, "", "abc", "Infinity", -1, 0]) {
    assert.throws(() => parseDealerBilling({ cancellationBillingEnabled: "true", cancellationCharge }));
  }
  assert.throws(() => parseDealerBilling({ billingType: "OTHER" }));
  assert.throws(() => parseDealerBilling({ cancellationBillingEnabled: "yes" }));
});
test("switching to fixed clears the percentage", () => {
  assert.equal(parseDealerBilling({ billingType: "FIXED" }, { billingType: "PROFIT_SHARING", billingPercentage: 20 }).billingPercentage, 0);
});
