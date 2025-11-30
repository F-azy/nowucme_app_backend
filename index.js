import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import os from "os";
import process from "process";
import path from "path";
import { fileURLToPath } from "url";

import { pool, initializeDatabase } from "./conn.js";
import authRoutes from "./Routes/authRoutes.js";
import profileRoutes from "./Routes/profileRoutes.js";
import discoverRoutes from "./Routes/discoverRoutes.js";
import { cleanupUnverifiedUsers } from "./Controllers/authController.js";
import { initializeDatabaseModels } from "./Models/userModel.js";
import surveyRoutes from "./Routes/survey.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files (CSS, JS, images) from public
app.use(express.static(path.join(__dirname, "public")));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/discover", discoverRoutes);
app.use("/api/survey", surveyRoutes);

// HTML routes
// Robots.txt route
app.get("/robots.txt", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "robots.txt"));
});

// Sitemap.xml route
app.get("/sitemap.xml", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "sitemap.xml"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/index", (req, res) => {
  res.redirect("/");
});

app.get("/faq", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "faq.html"));
});

app.get("/privacy-policy", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "privacy-policy.html"));
});

app.get("/cookie-policy", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "cookie-policy.html"));
});

app.get("/terms-of-service", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "terms-of-service.html"));
});



// Health check route (unchanged)
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

    cleanupUnverifiedUsers(); // Run once on startup
    setInterval(cleanupUnverifiedUsers, 24 * 60 * 60 * 1000);

    app.listen(PORT, "0.0.0.0", () =>
      console.log(`🚀 Server running on port ${PORT}`)
    );
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
})();
