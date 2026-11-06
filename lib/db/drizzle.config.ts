import { defineConfig } from "drizzle-kit";
import path from "path";
import fs from "fs";

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Look for .env file in root or current dir
  const envCandidates = [
    path.resolve(__dirname, "../../.env"),
    path.resolve(__dirname, "../.env"),
    path.resolve(__dirname, "./.env"),
  ];

  for (const envFile of envCandidates) {
    if (fs.existsSync(envFile)) {
      try {
        const text = fs.readFileSync(envFile, "utf-8");
        for (const line of text.split("\n")) {
          const trimmed = line.trim();
          if (trimmed.startsWith("DATABASE_URL=")) {
            const url = trimmed.slice("DATABASE_URL=".length).replace(/["']/g, "").trim();
            if (url) return url;
          }
        }
      } catch {
        // ignore read error
      }
    }
  }

  // Default local PostgreSQL fallback
  return "postgresql://postgres:postgres@localhost:5432/tech_ai";
}

const connectionUrl = resolveDatabaseUrl();

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionUrl,
  },
});

