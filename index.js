import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./conn.js";
import authRoutes from "./Routes/authRoutes.js";
import profileRoutes from "./Routes/profileRoutes.js";
import { createUsersTable } from "./Models/userModel.js";
import discoverRoutes from "./Routes/discoverRoutes.js"; 
import { initializeDatabase } from './Models/userModel.js';

dotenv.config();

const app = express();
app.use(express.json());
// Allow RN + Web
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:8081",],
  credentials: true
}));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/discover", discoverRoutes);

initializeDatabase()
  .then(() => {
    console.log("✅ Database ready");
  })
  .catch(err => {
    console.error("❌ Failed to initialize database:", err);
    process.exit(1); // Exit if database fails
  });


// Health check
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "OK" });
  } catch {
    res.status(500).json({ status: "DB connection failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(` Server running on port ${PORT}`);
  await createUsersTable();
});
