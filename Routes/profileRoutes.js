// routes/profileRoutes.js
import express from "express";
import { 
  getUserProfileController, 
  updateUserProfile,
  uploadProfileImage,
  deleteProfileImage 
} from "../Controllers/profileController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { upload } from "../config/cloudinary.js";

const router = express.Router();

// GET /api/profile - Get current user's profile
router.get("/", authMiddleware, getUserProfileController);

// PUT /api/profile - Update current user's profile
router.put("/", authMiddleware, updateUserProfile);

// POST /api/profile/upload-image - Upload profile image
router.post("/upload-image", authMiddleware, upload.single('image'), uploadProfileImage);

// DELETE /api/profile/delete-image - Delete profile image
router.delete("/delete-image", authMiddleware, deleteProfileImage);

export default router;