/**
 * One-time helper: gives existing roles the new sidebar permissions.
 *   dealers.activity.access  <- roles that have dealers.access
 *   allocation.access        <- roles that have complaints.access
 *   verification.access      <- roles that have complaints.access
 *
 * Run from the backend folder:  node scripts/grantNewSidebarPermissions.js
 * Log in again after running it (permissions are cached at login).
 */
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const RULES = [
  { has: "dealers.access", add: "dealers.activity.access" },
  { has: "complaints.access", add: "allocation.access" },
  { has: "complaints.access", add: "verification.access" },
];

await mongoose.connect(process.env.MONGO_URI);
const roles = mongoose.connection.db.collection("roles");

for (const { has, add } of RULES) {
  const res = await roles.updateMany(
    { permissions: has },
    { $addToSet: { permissions: add } },
  );
  console.log(`${add}: added to ${res.modifiedCount} role(s) that have ${has}`);
}

await mongoose.disconnect();
