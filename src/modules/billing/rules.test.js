import test from "node:test";
import assert from "node:assert/strict";
import { calculateCharge, canVerify } from "./rules.js";
import { verificationRouter } from "./routes.js";
import Complaint from "../Complaint/models/complaint.model.js";

test("both percentage methods calculate charges and round to paise", () => {
  assert.deepEqual(calculateCharge("PARTIAL_PAYMENT", 10, "3000"), { baseAmount: 3000, charge: 300 });
  assert.deepEqual(calculateCharge("PROFIT_SHARING", 12.5, "1000.05"), { baseAmount: 1000.05, charge: 125.01 });
  assert.equal(calculateCharge("PROFIT_SHARING", 10, 0).charge, 0);
  for (const value of ["", " ", null, undefined, -1, "abc", Infinity, true, []]) assert.throws(() => calculateCharge("PROFIT_SHARING", 10, value));
  for (const rate of [0, -1, 101, NaN]) assert.throws(() => calculateCharge("PARTIAL_PAYMENT", rate, 100));
});
test("dealers cannot approve even if they have a verification permission", () => {
  assert.equal(canVerify({ role: { code: "DEALER" }, permissions: ["verification.verify"] }, "verification.verify"), false);
  assert.ok(canVerify({ role: { code: "DG_TEAM" }, permissions: ["verification.verify"] }, "verification.verify"));
  assert.equal(Boolean(canVerify({ role: { code: "DG_TEAM" }, permissions: [] }, "verification.verify")), false);
});
const user = { id: "507f1f77bcf86cd799439011", name: "DG reviewer", role: { code: "SUPER_ADMIN" } };
const fresh = () => ({ _id: "507f1f77bcf86cd799439012", status: "CLOSE_ON_VERIFICATION", updatedAt: new Date(), billingReview: { status: "PENDING", revision: 1, method: "PARTIAL_PAYMENT", percentage: 10, baseAmount: 3000, charge: 300, dealerId: "507f1f77bcf86cd799439013", submittedAt: new Date(), correctionCount: 0 } });
async function request(action, body) {
  const route = verificationRouter.stack.find(layer => layer.route?.path === `/:id/${action}`).route;
  const res = { code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await route.stack.at(-1).handle({ params: { id: "507f1f77bcf86cd799439012" }, body, user }, res);
  return res;
}
test("approval atomically closes and posts once; stale and rejected reviews cannot post", async (t) => {
  let c = fresh(), updates = 0;
  t.mock.method(Complaint, "findById", async () => c);
  t.mock.method(Complaint, "findOneAndUpdate", async (filter, update) => {
    assert.equal(filter["billingReview.status"], c.billingReview.status);
    assert.equal(filter["billingReview.revision"], c.billingReview.revision);
    updates++;
    for (const [key, value] of Object.entries(update.$set)) {
      if (key.startsWith("billingReview.")) c.billingReview[key.split(".")[1]] = value;
      else c[key] = value;
    }
    return c;
  });
  const approval = { revision: 1, proofVerified: true, workVerified: true };
  assert.equal((await request("verify", { ...approval, revision: 0 })).code, 409);
  assert.equal((await request("verify", { ...approval, proofVerified: false })).code, 400);
  assert.equal(updates, 0);
  assert.equal((await request("verify", approval)).code, 200);
  assert.equal(c.status, "CLOSED");
  assert.equal(c.billingReview.status, "VERIFIED");
  assert.equal(c.billingReview.charge, 300);
  assert.equal((await request("verify", approval)).code, 200);
  assert.equal(updates, 1);
  c = fresh();
  assert.equal((await request("reject", { revision: 1, reason: "Amount incorrect" })).code, 200);
  assert.equal(c.status, "CLOSE_ON_VERIFICATION");
  assert.equal(c.billingReview.status, "REJECTED");
  assert.equal((await request("verify", approval)).code, 409);
  c = fresh();
  assert.equal((await request("correction", { revision: 1, reason: "Provide amount details" })).code, 200);
  assert.equal(c.billingReview.status, "CORRECTION_REQUIRED");
  assert.equal(c.billingReview.correctionCount, 1);
});

test("ledger reads only DG approved snapshots and keeps the saved charge", async (t) => {
  const { ledgerRouter } = await import("./routes.js");
  const { default: Dealer } = await import("../dealers/models/dealer.model.js");
  const { default: mongoose } = await import("mongoose");
  const d = { _id: "507f1f77bcf86cd799439013", technicianName: "Dealer", billingPercentage: 99, createdAt: new Date() };
  const c = fresh(); c.billingReview.status = "VERIFIED"; c.billingReview.reviewedAt = new Date();
  t.mock.method(Dealer, "find", async () => [d]);
  t.mock.method(Complaint, "find", async (filter) => {
    assert.equal(filter["billingReview.status"], "VERIFIED");
    assert.deepEqual(filter["billingReview.dealerId"].$in, [d._id]);
    return [c];
  });
  t.mock.method(mongoose.model("LedgerAdjustment"), "find", async () => []);
  const route = ledgerRouter.stack.find(layer => layer.route?.path === "/").route;
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await route.stack.at(-1).handle({ user }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.data.transactions.length, 1);
  assert.equal(res.body.data.transactions[0].credit, 300);
  assert.equal(res.body.data.summaries[0].outstandingAmount, 300);
});
