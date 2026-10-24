import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/tech_ai";

if (!process.env.DATABASE_URL) {
  console.warn(
    "[Warning] DATABASE_URL is not set. Defaulting to local postgresql connection. For persistent user accounts, set DATABASE_URL.",
  );
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });

export * from "./schema";
