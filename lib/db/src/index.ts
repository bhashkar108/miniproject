import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const defaultNeonUrl =
  "postgresql://neondb_owner:npg_axW5TCzwMo8k@ep-crimson-boat-aof0q2mv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

const connectionString = (process.env.DATABASE_URL || defaultNeonUrl).trim();

const isRemote =
  connectionString.includes("neon.tech") ||
  connectionString.includes("sslmode=require") ||
  connectionString.includes(".render.com") ||
  connectionString.includes(".supabase.co");

export const pool = new Pool({
  connectionString,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
