import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;

export function getDb() {
  if (!instance) {
    const client = postgres(env.databaseUrl, {
      // Supabase requires SSL in production
      ssl: env.isProduction ? "require" : false,
      max: 10, // connection pool
    });
    instance = drizzle(client, { schema: fullSchema });
  }
  return instance;
}
