import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const poolerUrl = process.env.DATABASE_URL;
if (!poolerUrl) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

// drizzle-kit needs a direct (non-pooler) connection to run migrations.
// Set DIRECT_DATABASE_URL in .env to the direct connection string from Supabase Dashboard.
// If not set, we attempt to construct it from the pooler URL (may time out behind IPv6).
const directUrl = process.env.DIRECT_DATABASE_URL 
  || poolerUrl.replace(":6543", ":5432").replace("?pgbouncer=true", "");

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: directUrl,
  },
});
