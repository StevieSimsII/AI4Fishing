import { Pool } from "pg";

let pool: Pool | null | undefined;

export function getPostgresPool(): Pool | null {
  if (pool !== undefined) {
    return pool;
  }

  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    pool = null;
    return pool;
  }

  const sslDisabled = process.env.POSTGRES_SSL === "disable";
  pool = new Pool({
    connectionString,
    ssl: sslDisabled ? false : { rejectUnauthorized: false },
  });

  return pool;
}

