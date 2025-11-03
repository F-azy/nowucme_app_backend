import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import os from "os";
import process from "process";
import { pool, initializeDatabase } from "./conn.js";
import authRoutes from "./Routes/authRoutes.js";
import profileRoutes from "./Routes/profileRoutes.js";
import discoverRoutes from "./Routes/discoverRoutes.js";
import { cleanupUnverifiedUsers } from "./Controllers/authController.js";
import { initializeDatabaseModels } from "./Models/userModel.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:8081"],
    credentials: true,
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/discover", discoverRoutes);

setInterval(cleanupUnverifiedUsers, 24 * 60 * 60 * 1000);
cleanupUnverifiedUsers();

app.get("/health", async (req, res) => {
  if (req.query.passkey !== "imdev") {
    return res
      .status(401)
      .json({ success: false, message: "Permission Denied" });
  }

  try {
    await pool.query("SELECT 1");

    const serverInfo = {
      hostname: os.hostname(),
      platform: os.platform(),
      architecture: os.arch(),
      cpuCount: os.cpus().length,
      uptime: `${Math.round(os.uptime() / 60)} mins`,
      loadAverage: os.loadavg(),
      totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
      freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
    };

    const processInfo = {
      nodeVersion: process.version,
      pid: process.pid,
      memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      uptime: `${Math.round(process.uptime())} secs`,
      environment: process.env.NODE_ENV || "development",
    };

    res.status(200).json({
      status: "OK",
      database: "Connected",
      server: serverInfo,
      process: processInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ Health check failed:", err.message);
    res.status(500).json({
      status: "DB connection failed",
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await initializeDatabase();
    await initializeDatabaseModels();

      //  NOW start cleanup (after pool is ready)
    cleanupUnverifiedUsers(); // Run once on startup
    setInterval(cleanupUnverifiedUsers, 24 * 60 * 60 * 1000); 

    app.listen(PORT, "0.0.0.0",() => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
})();
