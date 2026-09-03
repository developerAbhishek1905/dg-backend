import express from "express";
import cors from "cors";

import roleRoutes from "./modules/accessControl/routes/role.routes.js";
import permissionRoutes from "./modules/accessControl/routes/permission.routes.js";
import userRoutes from "./modules/users/routes/user.routes.js";
import authRoutes from "./modules/auth/routes/auth.routes.js";
import categoryRoutes from "./modules/category/routes/category.routes.js";
import dealerRoutes from "./modules/dealers/routes/dealer.routes.js";
import stateRoutes from "./modules/address/routes/state.routes.js";
import districtRoutes from "./modules/address/routes/district.routes.js";
import cityRoutes from "./modules/address/routes/city.routes.js";
import pincodeRoutes from "./modules/address/routes/pincode.routes.js";
import areaRoutes from "./modules/address/routes/area.routes.js";


const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
  });
});
app.use("/uploads", express.static("uploads"));
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/roles", roleRoutes);
app.use("/api/v1/permissions", permissionRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/dealers", dealerRoutes);
app.use("/api/v1/states", stateRoutes);
app.use("/api/v1/districts", districtRoutes);
app.use("/api/v1/cities", cityRoutes);
app.use("/api/v1/pincodes", pincodeRoutes);
app.use("/api/v1/areas", areaRoutes);

export default app;

