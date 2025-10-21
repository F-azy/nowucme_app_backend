// controllers/profileController.js
import { getUserProfile, updateProfile } from "../Models/userModel.js";

// Get user profile
export const getUserProfileController = async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await getUserProfile(userId);

    if (!profile) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, profile });
  } catch (err) {
    console.error("Get profile error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await updateProfile(userId, req.body);

    if (!profile) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log(`✅ Profile updated for user ${userId}`);
    res.json({ success: true, profile });
  } catch (err) {
    console.error("Update profile error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};