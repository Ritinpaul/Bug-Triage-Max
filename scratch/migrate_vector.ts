import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL!;
const client = postgres(connectionString, { prepare: false });
const db = drizzle(client);

async function main() {
  await client`CREATE EXTENSION IF NOT EXISTS vector;`;
  console.log("Vector extension created!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
