import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const databaseUrl = process.env.TURSO_DATABASE_URL || "file:local.db";
const isLocalFile = databaseUrl.startsWith("file:");
const authToken = isLocalFile ? undefined : process.env.TURSO_AUTH_TOKEN;

// Create the libSQL client
export const client = createClient({
  url: databaseUrl,
  authToken,
});

// Create the Drizzle instance with schema
export const db = drizzle(client, { schema });
