import { Pool } from "pg";
import { readConfiguredEnv } from "./config";

let pool: Pool | null | undefined;

export function getPostgresPool(): Pool | null {
  if (pool !== undefined) {
    return pool;
  }

  const connectionString = readConfiguredEnv("POSTGRES_URL") || readConfiguredEnv("DATABASE_URL");
  if (!connectionString) {
    pool = null;
    return pool;
  }

  const sslDisabled = process.env.POSTGRES_SSL === "disable";
  pool = new Pool({
    connectionString,
    ssl: sslDisabled ? false : { rejectUnauthorized: false },
    max: 2,
    connectionTimeoutMillis: 2500,
  });

  pool.on("error", (error) => {
    console.warn(`[postgres] Idle client error: ${error.message}`);
  });

  return pool;
}
