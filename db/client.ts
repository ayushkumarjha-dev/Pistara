import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

if (!process.env.TURSO_DATABASE_URL) {
  throw new Error("TURSO_DATABASE_URL environment variable is required");
}

// Check if using local file (file:local.db)
const isLocalFile = process.env.TURSO_DATABASE_URL.startsWith("file:");

// Auth token is only required for remote Turso databases
if (!isLocalFile && !process.env.TURSO_AUTH_TOKEN) {
  throw new Error("TURSO_AUTH_TOKEN environment variable is required for remote databases");
}

// Create the libSQL client
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: isLocalFile ? undefined : process.env.TURSO_AUTH_TOKEN,
});

// Create the Drizzle instance with schema
export const db = drizzle(client, { schema });

// Export the client for raw queries if needed
export { client };
