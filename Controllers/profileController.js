import { updateProfile } from "../Models/userModel.js";

export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id; // comes from auth middleware
    const updatedProfile = await updateProfile(userId, req.body);

    res.json({
      message: "Profile updated successfully",
      user: updatedProfile,
    });
  } catch (err) {
    console.error("❌ Profile update error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
};
