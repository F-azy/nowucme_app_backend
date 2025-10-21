// controllers/profileController.js
import { pool } from "../conn.js";

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT id, email, username, display_name, profile_image,
             instagram, twitter, linkedin, facebook
      FROM users
      WHERE id = $1;
    `;
    
    const { rows } = await pool.query(query, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, profile: rows[0] });
  } catch (err) {
    console.error("Get profile error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update user profile
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { display_name, instagram, twitter, linkedin, facebook } = req.body;

    const query = `
      UPDATE users
      SET display_name = $1,
          instagram = $2,
          twitter = $3,
          linkedin = $4,
          facebook = $5,
          updated_at = NOW()
      WHERE id = $6
      RETURNING id, email, username, display_name, instagram, twitter, linkedin, facebook;
    `;
    
    const values = [display_name, instagram, twitter, linkedin, facebook, userId];
    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log(`✅ Profile updated for user ${userId}`);
    res.json({ success: true, profile: rows[0] });
  } catch (err) {
    console.error("Update profile error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};