import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;
export let pool;

const createPool = (database = process.env.DB_NAME) => {
  return new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  });
};

// export const pool = new Pool({
//   user: process.env.DB_USER,
//   host: process.env.DB_HOST,
//   database: process.env.DB_NAME,
//   password: process.env.DB_PASSWORD,
//   port: process.env.DB_PORT || 5432,
//   ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
// });

export const initializeDatabase = async () => {
  try {
    const defaultPool = createPool("postgres");
    const dbName = process.env.DB_NAME;
    const result = await defaultPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1;",
      [dbName]
    );

    if (result.rowCount === 0) {
      console.log(`Database "${dbName}" not found. Creating...`);
      await defaultPool.query(`CREATE DATABASE "${dbName}";`);
      console.log(`Database "${dbName}" created successfully.`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }

    await defaultPool.end();

    pool = createPool();
    await pool.query("SELECT NOW()");
    console.log("✅ Connected to target database successfully.");
  } catch (error) {}
};
