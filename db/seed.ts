/**
 * Seed script for Bug Triage Max
 * Populates the database with foundational data only.
 * Run: npx tsx db/seed.ts
 */

import { getDb } from "../server/queries/connection";
import {
  teamMembers,
  integrationStatus,
} from "./schema";

async function seed() {
  const db = getDb();
  console.log("Seeding Bug Triage Max database...");

  // ─── Team Members ─────────────────────────────────────────────────────
  const teamData = [
    { tenantId: 1, name: "Admin User", handle: "@admin", email: "admin@company.com", expertise: ["all"], isOnCall: 1 },
  ];

  for (const member of teamData) {
    await db.insert(teamMembers).values(member).onConflictDoNothing();
  }
  console.log("  Seeded 1 foundational team member");

  // ─── Integration Status ───────────────────────────────────────────────
  const integrationData = [
    { tenantId: 1, service: "github" as const, status: "offline" as const },
    { tenantId: 1, service: "slack" as const, status: "offline" as const },
    { tenantId: 1, service: "email" as const, status: "offline" as const },
    { tenantId: 1, service: "lemma" as const, status: "offline" as const },
    { tenantId: 1, service: "llm" as const, status: "offline" as const },
  ];

  for (const integration of integrationData) {
    await db.insert(integrationStatus).values(integration).onConflictDoNothing();
  }
  console.log("  Seeded foundational integration statuses");

  console.log("Done seeding foundation!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
