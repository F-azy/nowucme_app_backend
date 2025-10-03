import { pool } from "../conn.js";

// 🔹 Find user by email
export async function findUserByEmail(email) {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return result.rows[0];
}

// 🔹 Create users table
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
      is_verified BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(query);
  console.log("✅ Users table ready");
}

// 🔹 Update profile
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
