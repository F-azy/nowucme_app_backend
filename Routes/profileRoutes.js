// routes/profileRoutes.js
import express from "express";
import { getUserProfileController, updateUserProfile } from "../Controllers/profileController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// GET /api/profile - Get current user's profile
router.get("/", authMiddleware, getUserProfileController);

// PUT /api/profile - Update current user's profile
router.put("/", authMiddleware, updateUserProfile);

export default router;