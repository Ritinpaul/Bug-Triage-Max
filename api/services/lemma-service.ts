/**
 * Lemma SDK Service
 * Provides a singleton LemmaClient for the Grappy pod.
 * Used for:
 *  - Health check (integrations panel)
 *  - Writing bug reports to Lemma pod tables
 *  - Logging agent activity to Lemma pod tables
 *  - Live datastore subscription (via WebSocket, used in frontend)
 */

import "dotenv/config";

const LEMMA_TOKEN = process.env.LEMMA_TOKEN ?? "";
const LEMMA_POD_ID = process.env.LEMMA_POD_ID ?? "";
const LEMMA_ORG_ID = process.env.LEMMA_ORG_ID ?? "";
const LEMMA_BASE_URL = process.env.LEMMA_BASE_URL ?? "https://api.lemma.work";

export const lemmaAvailable = !!(LEMMA_TOKEN && LEMMA_POD_ID);

// ─── Typed row shapes ─────────────────────────────────────────────────
export interface LemmaBugReport {
  message_id?: string;
  raw_content: string;
  source?: "slack" | "email" | "form" | "webhook";
  status?: "pending" | "parsing" | "triaged" | "resolved" | "closed";
  intent?: "bug_report" | "feature_request" | "complaint" | "question" | "other";
  component?: "auth" | "billing" | "ui" | "api" | "database" | "notifications" | "other";
  severity_label?: "P0" | "P1" | "P2" | "P3";
  severity_score?: number;
  overall_confidence?: number;
  keywords?: string[];
  reasoning?: string;
  repro_steps?: string[];
  github_issue_url?: string;
  assignee?: string;
  embedding?: number[];
}

export interface LemmaAgentActivity {
  agent_name: string;
  action: string;
  status?: "running" | "success" | "failed" | "skipped";
  bug_report_id?: string;
  message_id?: string;
  duration_ms?: number;
  output_summary?: string;
  error?: string;
}

// ─── Core API helper ──────────────────────────────────────────────────
async function lemmaFetch(
  path: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const url = `${LEMMA_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${LEMMA_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    signal: AbortSignal.timeout(10000),
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

// ─── Health check (for integrations router) ───────────────────────────
export async function checkLemmaHealth(): Promise<{
  status: "online" | "degraded" | "offline" | "error";
  responseTime: number;
  metadata: Record<string, unknown>;
  error?: string;
}> {
  if (!lemmaAvailable) {
    return {
      status: "offline",
      responseTime: 0,
      metadata: { configured: false, note: "LEMMA_TOKEN or LEMMA_POD_ID missing" },
    };
  }

  const start = Date.now();
  try {
    const result = await lemmaFetch(`/pods/${LEMMA_POD_ID}/tables`);
    const ms = Date.now() - start;

    if (!result.ok) {
      return {
        status: "error",
        responseTime: ms,
        metadata: { configured: true, podId: LEMMA_POD_ID },
        error: `Lemma API returned ${result.status}`,
      };
    }

    const tables = result.data as { items?: { name: string }[] };
    const tableNames = tables?.items?.map((t) => t.name) ?? [];

    return {
      status: ms > 4000 ? "degraded" : "online",
      responseTime: ms,
      metadata: {
        configured: true,
        podId: LEMMA_POD_ID,
        orgId: LEMMA_ORG_ID,
        tables: tableNames.length,
        tableNames,
        baseUrl: LEMMA_BASE_URL,
      },
    };
  } catch (err) {
    return {
      status: "error",
      responseTime: Date.now() - start,
      metadata: { configured: true, podId: LEMMA_POD_ID },
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─── Write a bug report row to Lemma pod ─────────────────────────────
export async function writeBugReportToLemma(
  report: LemmaBugReport
): Promise<{ id: string } | null> {
  if (!lemmaAvailable) return null;

  try {
    // Serialize array fields as JSON strings for Lemma JSON columns
    const payload: Record<string, unknown> = {
      ...report,
      keywords: report.keywords ? JSON.stringify(report.keywords) : undefined,
      repro_steps: report.repro_steps ? JSON.stringify(report.repro_steps) : undefined,
      embedding: report.embedding ? JSON.stringify(report.embedding) : undefined,
    };

    const result = await lemmaFetch(`/pods/${LEMMA_POD_ID}/tables/bug_reports/records`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!result.ok) {
      console.error("[Lemma] Failed to write bug report:", result.status, result.data);
      return null;
    }

    const record = result.data as { id: string };
    console.log("[Lemma] Bug report written:", record.id);
    return record;
  } catch (err) {
    console.error("[Lemma] writeBugReportToLemma error:", err);
    return null;
  }
}

// ─── Update an existing Lemma bug report ─────────────────────────────
export async function updateBugReportInLemma(
  recordId: string,
  updates: Partial<LemmaBugReport>
): Promise<boolean> {
  if (!lemmaAvailable || !recordId) return false;

  try {
    const payload: Record<string, unknown> = { ...updates };
    if (updates.keywords) payload.keywords = JSON.stringify(updates.keywords);
    if (updates.repro_steps) payload.repro_steps = JSON.stringify(updates.repro_steps);
    if (updates.embedding) payload.embedding = JSON.stringify(updates.embedding);

    const result = await lemmaFetch(
      `/pods/${LEMMA_POD_ID}/tables/bug_reports/records/${recordId}`,
      { method: "PATCH", body: JSON.stringify(payload) }
    );

    if (!result.ok) {
      console.error("[Lemma] Failed to update bug report:", result.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Lemma] updateBugReportInLemma error:", err);
    return false;
  }
}

// ─── Log agent activity to Lemma ─────────────────────────────────────
export async function logAgentActivityToLemma(
  activity: LemmaAgentActivity
): Promise<{ id: string } | null> {
  if (!lemmaAvailable) return null;

  try {
    const result = await lemmaFetch(
      `/pods/${LEMMA_POD_ID}/tables/agent_activities/records`,
      { method: "POST", body: JSON.stringify(activity) }
    );

    if (!result.ok) {
      console.error("[Lemma] Failed to log agent activity:", result.status);
      return null;
    }

    return result.data as { id: string };
  } catch (err) {
    console.error("[Lemma] logAgentActivityToLemma error:", err);
    return null;
  }
}

// ─── List recent bug reports from Lemma ──────────────────────────────
export async function listBugReportsFromLemma(limit = 50): Promise<LemmaBugReport[]> {
  if (!lemmaAvailable) return [];

  try {
    const result = await lemmaFetch(
      `/pods/${LEMMA_POD_ID}/tables/bug_reports/records?limit=${limit}&order_by=created_at&order=desc`
    );

    if (!result.ok) return [];
    const data = result.data as { items?: LemmaBugReport[] };
    return data?.items ?? [];
  } catch (err) {
    console.error("[Lemma] listBugReportsFromLemma error:", err);
    return [];
  }
}

// ─── Re-export config for frontend use ───────────────────────────────
export const lemmaConfig = {
  podId: LEMMA_POD_ID,
  orgId: LEMMA_ORG_ID,
  baseUrl: LEMMA_BASE_URL,
};
