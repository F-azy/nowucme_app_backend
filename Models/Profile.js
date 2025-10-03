import { pool } from "../conn.js";

export async function updateProfile(userId, profileData) {
  const { display_name, bio, instagram, twitter, linkedin } = profileData;

  const result = await pool.query(
    `UPDATE users
     SET display_name = $1, bio = $2, instagram = $3, twitter = $4, linkedin = $5
     WHERE id = $6
     RETURNING id, email, username, display_name, bio, instagram, twitter, linkedin`,
    [display_name, bio, instagram, twitter, linkedin, userId]
  );

  return result.rows[0];
}
