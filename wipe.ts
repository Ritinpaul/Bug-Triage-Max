import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import "dotenv/config";
import fs from "fs";
import path from "path";

async function run() {
  console.log("Connecting directly to database...");
  const client = postgres(process.env.DIRECT_DATABASE_URL!, { prepare: false });
  const db = drizzle(client);

  console.log("Dropping schema...");
  await db.execute(sql`DROP SCHEMA public CASCADE`);
  console.log("Creating schema...");
  await db.execute(sql`CREATE SCHEMA public`);

  console.log("Applying migrations...");
  const sql1 = fs.readFileSync(path.join(process.cwd(), "db/migrations/0000_illegal_talisman.sql"), "utf8");
  const sql2 = fs.readFileSync(path.join(process.cwd(), "db/migrations/0001_hesitant_clint_barton.sql"), "utf8");
  
  await client.unsafe(sql1);
  await client.unsafe(sql2);

  console.log("Done.");
  process.exit(0);
}
run();
