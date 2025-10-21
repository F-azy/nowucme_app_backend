import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

// Test the connection
pool.query("SELECT NOW()", (err) => {
  if (err) {
    console.error("❌ Database connection error: ", err.stack);
  } else {
    console.log("✅ Database connected successfully");
  }
});
