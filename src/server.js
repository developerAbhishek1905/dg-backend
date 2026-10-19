import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";
import { startNoActionScheduler } from "./modules/allocation/services/noActionPenalty.service.js";
import { startAllocationScheduler } from "./modules/allocation/services/allocationScheduler.service.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  startAllocationScheduler();
  startNoActionScheduler();
};

startServer();