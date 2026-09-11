import express from "express";
import cors from "cors";
import path from "path";

import roleRoutes from "./modules/accessControl/routes/role.routes.js";
import permissionRoutes from "./modules/accessControl/routes/permission.routes.js";
import userRoutes from "./modules/users/routes/user.routes.js";
import authRoutes from "./modules/auth/router/auth.routes.js";
import categoryRoutes from "./modules/category/routes/category.routes.js";
import dealerRoutes from "./modules/dealers/routes/dealer.routes.js";
import stateRoutes from "./modules/address/routes/state.routes.js";
import districtRoutes from "./modules/address/routes/district.routes.js";
import cityRoutes from "./modules/address/routes/city.routes.js";
import pincodeRoutes from "./modules/address/routes/pincode.routes.js";
import areaRoutes from "./modules/address/routes/area.routes.js";
import brandRoutes from "./modules/brand/routes/brand.routes.js";
import productRoutes from "./modules/product/routes/product.routes.js";
import productTypeRoutes from "./modules/productType/routes/productType.routes.js";
import customerRoutes from "./modules/Customer/routes/customer.routes.js"
import complaintRoutes from "./modules/Complaint/routes/complaint.routes.js"
import { testWhatsApp } from "./services/smartpingWhatsapp.service.js";
import appointmentRoutes from "./modules/appointment/router/appointment.route.js";
const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:5176",
      "https://dg-iota-tawny.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
  });
});


// app.use("/uploads", express.static("uploads"));
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
app.use("/api/v1/brands", brandRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/product-types", productTypeRoutes);
app.use(
  "/api/v1/customers",
  customerRoutes,
);


app.use(
  "/api/v1/complaints",
  complaintRoutes,
);

app.post(
  "/api/v1/test-whatsapp",
  testWhatsApp,
);

app.use(
  "/api/v1/appointments",
  appointmentRoutes,
);

export default app;
