// controllers/discoverController.js
import { pool } from "../conn.js";

// Toggle discover mode ON/OFF and save Bluetooth ID
export const toggleDiscover = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bluetooth_id, discover_status, latitude, longitude } = req.body;

    if (!bluetooth_id) {
      return res.status(400).json({ error: "Bluetooth ID is required" });
    }

    // Update user's discover status and initial location
    const query = `
      UPDATE users
      SET bluetooth_id = $1, 
          discover_status = $2,
          latitude = $3,
          longitude = $4,
          location_updated_at = NOW(),
          updated_at = NOW()
      WHERE id = $5
      RETURNING id, username, display_name, bluetooth_id, discover_status, latitude, longitude;
    `;
    const values = [bluetooth_id, discover_status, latitude || null, longitude || null, userId];
    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("Toggle discover error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update location
export const updateLocation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude } = req.body;

    console.log(`📍 Location update from user ${userId}:`, { latitude, longitude });

    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Location coordinates required" });
    }

    const query = `
      UPDATE users
      SET latitude = $1,
          longitude = $2,
          location_updated_at = NOW()
      WHERE id = $3 AND discover_status = true
      RETURNING id, latitude, longitude, location_updated_at;
    `;
    const { rows } = await pool.query(query, [latitude, longitude, userId]);

    console.log(`✅ Location saved for user ${userId}`);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("Update location error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get nearby users by GPS location (Haversine formula)
export const getNearbyUsersByLocation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude, radius_meters = 100 } = req.body;

    console.log(`🔍 User ${userId} searching from:`, { latitude, longitude, radius_meters });

    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Location coordinates required" });
    }

    // Use subquery to calculate distance first, then filter
    const query = `
      SELECT * FROM (
        SELECT 
          id, display_name, username,
          instagram, twitter, linkedin, facebook,
          profile_image, bluetooth_id,
          latitude, longitude,
          (
            6371000 * acos(
              LEAST(1.0, 
                cos(radians($1)) * cos(radians(latitude)) * 
                cos(radians(longitude) - radians($2)) + 
                sin(radians($1)) * sin(radians(latitude))
              )
            )
          ) AS distance_meters
        FROM users
        WHERE discover_status = true
        AND id != $3
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND location_updated_at > NOW() - INTERVAL '5 minutes'
      ) AS nearby_users
      WHERE distance_meters <= $4
      ORDER BY distance_meters ASC
      LIMIT 50;
    `;
    
    const { rows } = await pool.query(query, [
      latitude, 
      longitude, 
      userId, 
      radius_meters
    ]);

    console.log(`✅ Found ${rows.length} users within ${radius_meters}m`);
    if (rows.length > 0) {
      rows.forEach(user => {
        console.log(`   - ${user.display_name || user.username}: ${Math.round(user.distance_meters)}m`);
      });
    }

    res.json({ 
      success: true, 
      users: rows,
      count: rows.length 
    });
  } catch (err) {
    console.error("❌ Get nearby users error:", err.message);
    console.error("Stack:", err.stack);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
};

// Verify proximity with bluetooth_ids (optional BLE verification)
export const verifyBluetoothProximity = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bluetooth_ids } = req.body;

    if (!bluetooth_ids || !Array.isArray(bluetooth_ids)) {
      return res.json({ success: true, verified_users: [] });
    }

    // Return users that match both GPS proximity AND BLE detection
    const query = `
      SELECT id, display_name, username,
             instagram, twitter, linkedin, facebook,
             profile_image, bluetooth_id
      FROM users
      WHERE bluetooth_id = ANY($1)
      AND discover_status = true
      AND id != $2;
    `;
    
    const { rows } = await pool.query(query, [bluetooth_ids, userId]);

    res.json({ 
      success: true, 
      verified_users: rows 
    });
  } catch (err) {
    console.error("Verify bluetooth proximity error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Heartbeat - keeps user active in discovery
export const updateDiscoverHeartbeat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { latitude, longitude } = req.body;

    const query = `
      UPDATE users
      SET latitude = COALESCE($1, latitude),
          longitude = COALESCE($2, longitude),
          location_updated_at = NOW(),
          updated_at = NOW()
      WHERE id = $3 AND discover_status = true
      RETURNING id, updated_at, location_updated_at;
    `;
    
    const { rows } = await pool.query(query, [
      latitude || null, 
      longitude || null, 
      userId
    ]);

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("Heartbeat error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};