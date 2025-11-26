// controllers/profileController.js
import { getUserProfile, updateProfile } from "../Models/userModel.js";
import { pool } from "../conn.js";
import cloudinary from "../config/cloudinary.js";

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

// Upload profile image
export const uploadProfileImage = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const imageUrl = req.file.path; // Cloudinary URL

    // Update user's profile_image in database
    const query = `
      UPDATE users
      SET profile_image = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING profile_image;
    `;

    const { rows } = await pool.query(query, [imageUrl, userId]);

    console.log(`✅ Profile image uploaded for user ${userId}`);
    res.json({
      success: true,
      profile_image: rows[0].profile_image,
    });
  } catch (err) {
    console.error("Upload image error:", err.message);
    res.status(500).json({ error: "Failed to upload image" });
  }
};

// Delete profile image-upadted after 2nd chat
export const deleteProfileImage = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get current image URL
    const userQuery = await pool.query(
      "SELECT profile_image FROM users WHERE id = $1",
      [userId]
    );
    
    const currentImage = userQuery.rows[0]?.profile_image;
    
    if (!currentImage) {
      return res.status(400).json({ error: "No profile image to delete" });
    }
    
    // Delete from Cloudinary if exists
    try {
      // Extract public_id from Cloudinary URL
      // Example: https://res.cloudinary.com/cloud/image/upload/v123/nowucme/profiles/abc123.jpg
      // Expected public_id: nowucme/profiles/abc123
      
      console.log("🔍 Original URL:", currentImage);
      
      // Method 1: Using regex (most reliable)
      const regex = /\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/;
      const match = currentImage.match(regex);
      
      if (!match) {
        throw new Error("Could not extract public_id from Cloudinary URL");
      }
      
      let publicId = match[1];
      
      // Remove file extension if still present
      publicId = publicId.replace(/\.\w+$/, '');
      
      console.log("🎯 Extracted public_id:", publicId);
      
      // Delete from Cloudinary
      const result = await cloudinary.uploader.destroy(publicId, {
        invalidate: true, // ✅ Invalidate CDN cache
        resource_type: 'image' // ✅ Specify resource type
      });
      
      console.log("📊 Cloudinary deletion result:", result);
      
      if (result.result === "ok") {
        console.log(`✅ Successfully deleted from Cloudinary: ${publicId}`);
      } else if (result.result === "not found") {
        console.log(`⚠️ Image not found in Cloudinary (may be already deleted): ${publicId}`);
      } else {
        console.log(`⚠️ Unexpected Cloudinary result: ${result.result}`);
      }
      
    } catch (cloudinaryError) {
      console.error("❌ Cloudinary deletion error:", cloudinaryError);
      // Continue even if Cloudinary delete fails - still remove from DB
    }
    
    // Remove from database
    await pool.query("UPDATE users SET profile_image = NULL WHERE id = $1", [
      userId,
    ]);
    
    console.log(`✅ Profile image removed from database for user ${userId}`);
    res.json({ success: true, message: "Profile image deleted successfully" });
    
  } catch (err) {
    console.error("❌ Delete image error:", err.message);
    res.status(500).json({ error: "Failed to delete image" });
  }
};