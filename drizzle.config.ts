import { defineConfig } from "drizzle-kit";

const neonUrl =
  process.env.DATABASE_URL?.trim() ||
  "postgresql://neondb_owner:npg_axW5TCzwMo8k@ep-crimson-boat-aof0q2mv-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

export default defineConfig({
  schema: "./lib/db/src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: neonUrl,
  },
});
