import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { integrationStatus } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { checkRateLimit, githubConfigured } from "../services/github-service";

/**
 * Integration Status Router
 * Real health checks against external APIs: GitHub, Slack, Gemini/LLM.
 * Email and Lemma fall back to env-var presence check.
 */

// ─── Real health check functions ──────────────────────────────────────

async function checkGitHub(): Promise<{
  status: "online" | "degraded" | "offline" | "error";
  responseTime: number;
  metadata: Record<string, unknown>;
  error?: string;
}> {
  if (!githubConfigured) {
    return { status: "offline", responseTime: 0, metadata: { configured: false } };
  }
  const start = Date.now();
  try {
    const rateLimit = await checkRateLimit();
    const ms = Date.now() - start;
    if (!rateLimit) throw new Error("No rate limit response");
    const status = rateLimit.remaining < 10 ? "degraded" : "online";
    return {
      status,
      responseTime: ms,
      metadata: {
        configured: true,
        rateLimitRemaining: rateLimit.remaining,
        rateLimitReset: new Date(rateLimit.reset * 1000).toISOString(),
      },
    };
  } catch (err) {
    return {
      status: "error",
      responseTime: Date.now() - start,
      metadata: { configured: true },
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function checkGemini(): Promise<{
  status: "online" | "degraded" | "offline" | "error";
  responseTime: number;
  metadata: Record<string, unknown>;
  error?: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) {
    return { status: "offline", responseTime: 0, metadata: { configured: false } };
  }
  const start = Date.now();
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=1`,
      { signal: AbortSignal.timeout(5000) }
    );
    const ms = Date.now() - start;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return {
      status: ms > 3000 ? "degraded" : "online",
      responseTime: ms,
      metadata: { configured: true, model: "gemini-2.0-flash" },
    };
  } catch (err) {
    return {
      status: "error",
      responseTime: Date.now() - start,
      metadata: { configured: true },
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function checkSlack(): Promise<{
  status: "online" | "degraded" | "offline" | "error";
  responseTime: number;
  metadata: Record<string, unknown>;
  error?: string;
}> {
  const token = process.env.SLACK_BOT_TOKEN ?? "";
  const signingSecret = process.env.SLACK_SIGNING_SECRET ?? "";
  if (!token && !signingSecret) {
    return { status: "offline", responseTime: 0, metadata: { configured: false } };
  }

  if (!token) {
    // Has signing secret (for receiving) but no bot token (for sending)
    return {
      status: "online",
      responseTime: 0,
      metadata: { configured: true, mode: "receive-only", hasSigningSecret: true },
    };
  }

  const start = Date.now();
  try {
    const res = await fetch("https://slack.com/api/auth.test", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    const ms = Date.now() - start;
    const body = (await res.json()) as { ok: boolean; team?: string; user?: string };
    if (!body.ok) throw new Error("auth.test failed");
    return {
      status: "online",
      responseTime: ms,
      metadata: { configured: true, team: body.team, user: body.user },
    };
  } catch (err) {
    return {
      status: "error",
      responseTime: Date.now() - start,
      metadata: { configured: true },
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

function checkEmail(): { status: "online" | "offline"; responseTime: number; metadata: Record<string, unknown>; error?: string } {
  const host = process.env.EMAIL_IMAP_HOST ?? "";
  const user = process.env.EMAIL_IMAP_USER ?? "";
  const pass = process.env.EMAIL_IMAP_PASSWORD ?? "";
  const configured = !!(host && user && pass);
  return {
    status: configured ? "online" : "offline",
    responseTime: 0,
    metadata: { configured, host: host || "(not set)", mode: "imap-polling" },
  };
}

function checkLemma(): { status: "online" | "offline"; responseTime: number; metadata: Record<string, unknown>; error?: string } {
  // Lemma SDK — not integrated yet, report offline
  return { status: "offline", responseTime: 0, metadata: { configured: false, note: "Lemma SDK integration pending" } };
}

// ─── Helper: upsert integration_status row ────────────────────────────
async function upsertStatus(
  service: "github" | "slack" | "email" | "lemma" | "llm",
  status: "online" | "offline" | "degraded" | "error",
  responseTime: number,
  metadata: Record<string, unknown>,
  error?: string
) {
  const db = getDb();
  const existing = await db.query.integrationStatus.findFirst({
    where: eq(integrationStatus.service, service),
  });

  const payload = {
    status: status as "online" | "offline" | "degraded" | "error",
    responseTime,
    lastCheckedAt: new Date(),
    lastError: error ?? null,
    metadata,
  };

  if (existing) {
    await db.update(integrationStatus).set(payload).where(eq(integrationStatus.service, service));
  } else {
    await db.insert(integrationStatus).values({ service, ...payload });
  }
}

// ─── tRPC Router ───────────────────────────────────────────────────────
export const integrationRouter = createRouter({
  // Get all integration statuses
  list: publicQuery.query(async () => {
    const db = getDb();
    const items = await db.query.integrationStatus.findMany({
      orderBy: [desc(integrationStatus.updatedAt)],
    });
    return items;
  }),

  // Get specific integration status
  get: publicQuery
    .input(z.object({ service: z.enum(["github", "slack", "email", "lemma", "llm"]) }))
    .query(async ({ input }) => {
      const db = getDb();
      const item = await db.query.integrationStatus.findFirst({
        where: eq(integrationStatus.service, input.service),
      });
      return item;
    }),

  // Real health check for a single service
  check: publicQuery
    .input(z.object({ service: z.enum(["github", "slack", "email", "lemma", "llm"]) }))
    .mutation(async ({ input }) => {
      let result: { status: "online" | "offline" | "degraded" | "error"; responseTime: number; metadata: Record<string, unknown>; error?: string };

      switch (input.service) {
        case "github":
          result = await checkGitHub();
          break;
        case "slack":
          result = await checkSlack();
          break;
        case "email":
          result = checkEmail();
          break;
        case "llm":
          result = await checkGemini();
          break;
        case "lemma":
          result = checkLemma();
          break;
        default:
          result = { status: "offline", responseTime: 0, metadata: {} };
      }

      await upsertStatus(
        input.service,
        result.status,
        result.responseTime,
        result.metadata,
        result.error
      );

      return { service: input.service, ...result };
    }),

  // Batch check all integrations — real API pings
  checkAll: publicQuery.mutation(async () => {
    const [github, slack, gemini] = await Promise.all([
      checkGitHub(),
      checkSlack(),
      checkGemini(),
    ]);
    const email = checkEmail();
    const lemma = checkLemma();

    const results = [
      { service: "github" as const, ...github },
      { service: "slack" as const, ...slack },
      { service: "email" as const, ...email },
      { service: "llm" as const, ...gemini },
      { service: "lemma" as const, ...lemma },
    ];

    // Persist all results
    await Promise.all(
      results.map((r) =>
        upsertStatus(r.service, r.status, r.responseTime, r.metadata, r.error)
      )
    );

    return results;
  }),

  // Get configuration status (for Settings UI — shows which keys are set)
  config: publicQuery.query(() => {
    return {
      github: {
        hasPat: !!process.env.GITHUB_PAT,
        hasOwner: !!process.env.GITHUB_REPO_OWNER,
        hasRepo: !!process.env.GITHUB_REPO_NAME,
        configured: githubConfigured,
        repoDisplay: process.env.GITHUB_REPO_OWNER && process.env.GITHUB_REPO_NAME
          ? `${process.env.GITHUB_REPO_OWNER}/${process.env.GITHUB_REPO_NAME}`
          : null,
      },
      slack: {
        hasBotToken: !!process.env.SLACK_BOT_TOKEN,
        hasSigningSecret: !!process.env.SLACK_SIGNING_SECRET,
        configured: !!(process.env.SLACK_BOT_TOKEN || process.env.SLACK_SIGNING_SECRET),
      },
      email: {
        hasImapHost: !!process.env.EMAIL_IMAP_HOST,
        hasImapUser: !!process.env.EMAIL_IMAP_USER,
        hasImapPassword: !!process.env.EMAIL_IMAP_PASSWORD,
        configured: !!(process.env.EMAIL_IMAP_HOST && process.env.EMAIL_IMAP_USER && process.env.EMAIL_IMAP_PASSWORD),
      },
      gemini: {
        hasApiKey: !!process.env.GEMINI_API_KEY,
        configured: !!process.env.GEMINI_API_KEY,
      },
    };
  }),
});
