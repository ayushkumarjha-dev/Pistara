import type { Config } from "drizzle-kit";

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error("TURSO_DATABASE_URL environment variable is required");
}

// Check if using local file
const isLocalFile = process.env.TURSO_DATABASE_URL.startsWith("file:");

// Auth token is only required for remote Turso databases
if (!isLocalFile && !process.env.TURSO_AUTH_TOKEN) {
  throw new Error("TURSO_AUTH_TOKEN environment variable is required for remote databases");
}

export default {
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "sqlite",
  dbCredentials: isLocalFile
    ? {
        url: process.env.TURSO_DATABASE_URL,
      }
    : {
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN!,
      },
} satisfies Config;
