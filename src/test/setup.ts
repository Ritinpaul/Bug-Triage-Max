import { vi, beforeAll, afterAll, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../../db/schema";
import * as relations from "../../db/relations";
import path from "path";

const fullSchema = { ...schema, ...relations };

let client: PGlite;
let db: ReturnType<typeof drizzle>;
let pgMock: any;

export function getTestDb() {
  return db;
}

beforeAll(async () => {
  client = new PGlite();
  // @ts-ignore
  db = drizzle(client, { schema: fullSchema });

  await migrate(db, {
    migrationsFolder: path.resolve(process.cwd(), "db/migrations"),
  });
});

beforeEach(async () => {
  // Clear tables
  await client.query(`
    TRUNCATE TABLE bug_reports, messages, users, team_members, reproduction_steps, parsed_results, similar_bug_matches CASCADE;
  `);

  // Basic mock for postgres.js tagged template literal used in raw queries
  pgMock = async (strings: TemplateStringsArray, ...values: any[]) => {
    let text = "";
    for (let i = 0; i < strings.length; i++) {
      text += strings[i];
      if (i < values.length) {
        text += "$" + (i + 1);
      }
    }
    const res = await client.query(text, values);
    return res.rows;
  };
  pgMock.unsafe = async (query: string, params: any[] = []) => {
    const res = await client.query(query, params);
    return res.rows;
  };

  // Mock the DB connection module before each test
  vi.mock("../../server/queries/connection", () => ({
    getDb: () => db,
    getPg: () => pgMock,
  }));
});

afterAll(async () => {
  vi.resetAllMocks();
  if (client) {
    await client.close();
  }
});
