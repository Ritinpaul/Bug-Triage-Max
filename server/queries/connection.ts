import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

// Use globalThis to store the connection to prevent leaks during HMR
const globalForDb = globalThis as unknown as {
  _pgClient2?: ReturnType<typeof postgres>;
};

const client = globalForDb._pgClient2 ?? postgres(env.databaseUrl, {
  // Supabase requires SSL in all environments (dev and production)
  ssl: "require",
  max: 10, // connection pool
  prepare: false, // Required for PgBouncer/Supabase pooler
});

if (process.env.NODE_ENV !== "production") {
  globalForDb._pgClient2 = client;
}

const db = drizzle(client, { schema: fullSchema });

export function getDb() {
  return db;
}

export function getPg() {
  return client;
}
