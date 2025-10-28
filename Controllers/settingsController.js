// controllers/settingsController.js
import { pool } from "../conn.js";

// Get user settings
export const getUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      SELECT notifications_enabled, location_accuracy
      FROM users
      WHERE id = $1;
    `;
    
    const { rows } = await pool.query(query, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ 
      success: true, 
      settings: {
        notifications_enabled: rows[0].notifications_enabled ?? true,
        location_accuracy: rows[0].location_accuracy || 'balanced'
      }
    });
  } catch (err) {
    console.error("Get settings error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update user settings
export const updateUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notifications_enabled, location_accuracy } = req.body;

    // Validate location_accuracy
    const validAccuracies = ['high', 'balanced', 'low'];
    if (location_accuracy && !validAccuracies.includes(location_accuracy)) {
      return res.status(400).json({ error: "Invalid location accuracy value" });
    }

    const query = `
      UPDATE users
      SET notifications_enabled = COALESCE($1, notifications_enabled),
          location_accuracy = COALESCE($2, location_accuracy),
          updated_at = NOW()
      WHERE id = $3
      RETURNING notifications_enabled, location_accuracy;
    `;
    
    const { rows } = await pool.query(query, [
      notifications_enabled !== undefined ? notifications_enabled : null,
      location_accuracy || null,
      userId
    ]);

    console.log(`✅ Settings updated for user ${userId}`);
    res.json({ 
      success: true, 
      settings: rows[0]
    });
  } catch (err) {
    console.error("Update settings error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};