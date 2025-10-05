import { pool } from "../conn.js";

// Find user by email
export async function findUserByEmail(email) {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return result.rows[0];
}

// Create users table with all required columns
export async function createUsersTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name VARCHAR(100),
      bio TEXT,
      profile_image TEXT,
      instagram VARCHAR(100),
      twitter VARCHAR(100),
      linkedin VARCHAR(100),
      bluetooth_id VARCHAR(255),
      discover_status BOOLEAN DEFAULT false,
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      location_updated_at TIMESTAMP,
      is_verified BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(query);
  console.log("✅ Users table ready");
}

// Migration function to add missing columns to existing table
export async function migrateUsersTable() {
  try {
    const migrations = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS bluetooth_id VARCHAR(255);`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS discover_status BOOLEAN DEFAULT false;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP;`,
    ];

    for (const migration of migrations) {
      await pool.query(migration);
    }
    
    console.log("✅ Users table migrated successfully");
  } catch (error) {
    console.error("❌ Migration error:", error.message);
  }
}

// Create indexes for better performance
export async function createUsersIndexes() {
  try {
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_users_bluetooth_id ON users(bluetooth_id);`,
      `CREATE INDEX IF NOT EXISTS idx_users_discover_status ON users(discover_status);`,
      `CREATE INDEX IF NOT EXISTS idx_users_location ON users(latitude, longitude);`,
      `CREATE INDEX IF NOT EXISTS idx_users_discover_location ON users(discover_status, latitude, longitude) WHERE discover_status = true;`,
    ];

    for (const indexQuery of indexes) {
      await pool.query(indexQuery);
    }
    console.log("✅ Users indexes created");
  } catch (error) {
    console.error("❌ Index creation error:", error.message);
  }
}

// Update profile
export async function updateProfile(userId, profileData) {
  const { display_name, bio, instagram, twitter, linkedin } = profileData;

  const query = `
    UPDATE users 
    SET display_name = $1, bio = $2, instagram = $3, twitter = $4, linkedin = $5, updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING id, email, username, display_name, bio, instagram, twitter, linkedin;
  `;

  const values = [display_name, bio, instagram, twitter, linkedin, userId];
  const result = await pool.query(query, values);
  return result.rows[0];
}

// Initialize database (call this on server startup)
export async function initializeDatabase() {
  await createUsersTable();
  await migrateUsersTable(); // Add missing columns if table already exists
  await createUsersIndexes();
  console.log("✅ Database initialized");
}