/**
 * Gemini AI Service
 * Powers the Parser Agent (intent, component, severity) and
 * Reproduction Agent (step inference) using Google Gemini API.
 * Falls back to pattern matching if the API call fails.
 */

import "dotenv/config";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "gemini-2.5-flash"; // confirmed working on this API key

// ─── Core Gemini call ─────────────────────────────────────────────────
async function callGemini(
  prompt: string,
  systemInstruction: string,
  retries = 3
): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(
        `${GEMINI_BASE}/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemInstruction }],
            },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 1024,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini API ${res.status}: ${err}`);
      }

      const json = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      return text;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  return "";
}

// ─── Types ────────────────────────────────────────────────────────────
export type IntentType =
  | "bug_report"
  | "feature_request"
  | "complaint"
  | "question"
  | "other";

export type ComponentType =
  | "auth"
  | "billing"
  | "ui"
  | "api"
  | "database"
  | "notifications"
  | "other";

export type SeverityLabel = "P0" | "P1" | "P2" | "P3";

export interface ParseResult {
  intent: IntentType;
  intentConfidence: number;
  component: ComponentType;
  componentConfidence: number;
  severityScore: number;
  severityLabel: SeverityLabel;
  overallConfidence: number;
  keywords: string[];
  reasoning: string;
}

export interface ReproResult {
  steps: string[];
  expectedBehavior: string;
  actualBehavior: string;
  errorLogSummary: string;
  title: string;
}

// ─── Parser Agent via Gemini ──────────────────────────────────────────
const PARSER_SYSTEM = `You are an expert bug triage AI. Analyze the given message and return ONLY valid JSON.

Return this exact JSON structure:
{
  "intent": "bug_report" | "feature_request" | "complaint" | "question" | "other",
  "intentConfidence": 0.0-1.0,
  "component": "auth" | "billing" | "ui" | "api" | "database" | "notifications" | "other",
  "componentConfidence": 0.0-1.0,
  "severityScore": 0-100,
  "severityLabel": "P0" | "P1" | "P2" | "P3",
  "keywords": ["array", "of", "key", "terms"],
  "reasoning": "brief explanation"
}

Severity guide:
- P0 (score 80-100): System down, data loss, affects all users, payment broken
- P1 (score 60-79): Major feature broken, affects many users, no workaround
- P2 (score 40-59): Feature degraded, workaround exists
- P3 (score 0-39): Minor issue, cosmetic, low impact

Few-shot examples:
Message: "wtf the login button is broken again"
→ { "intent": "bug_report", "intentConfidence": 0.95, "component": "auth", "componentConfidence": 0.92, "severityScore": 72, "severityLabel": "P1", "keywords": ["login", "button", "broken"], "reasoning": "Login functionality broken, affects all users trying to authenticate" }

Message: "Can you add dark mode to the dashboard?"
→ { "intent": "feature_request", "intentConfidence": 0.91, "component": "ui", "componentConfidence": 0.88, "severityScore": 15, "severityLabel": "P3", "keywords": ["dark", "mode", "dashboard"], "reasoning": "UI enhancement request, no functionality broken" }

Message: "getting 500 error on /api/users endpoint"
→ { "intent": "bug_report", "intentConfidence": 0.97, "component": "api", "componentConfidence": 0.96, "severityScore": 65, "severityLabel": "P1", "keywords": ["500", "error", "api", "users"], "reasoning": "API endpoint returning server error" }

Message: "invoice PDF won't generate, customers can't download receipts"
→ { "intent": "bug_report", "intentConfidence": 0.96, "component": "billing", "componentConfidence": 0.94, "severityScore": 80, "severityLabel": "P0", "keywords": ["invoice", "pdf", "customers", "receipts"], "reasoning": "Billing-critical: customers cannot access their invoices" }`;

export async function parseMessageWithGemini(
  rawContent: string
): Promise<ParseResult | null> {
  if (!GEMINI_API_KEY) return null;

  try {
    const raw = await callGemini(rawContent, PARSER_SYSTEM);
    const parsed = JSON.parse(raw) as Partial<ParseResult>;

    // Validate required fields
    const validIntents: IntentType[] = [
      "bug_report",
      "feature_request",
      "complaint",
      "question",
      "other",
    ];
    const validComponents: ComponentType[] = [
      "auth",
      "billing",
      "ui",
      "api",
      "database",
      "notifications",
      "other",
    ];
    const validSeverity: SeverityLabel[] = ["P0", "P1", "P2", "P3"];

    const intent = validIntents.includes(parsed.intent as IntentType)
      ? (parsed.intent as IntentType)
      : "other";
    const component = validComponents.includes(parsed.component as ComponentType)
      ? (parsed.component as ComponentType)
      : "other";
    const severityLabel = validSeverity.includes(
      parsed.severityLabel as SeverityLabel
    )
      ? (parsed.severityLabel as SeverityLabel)
      : "P3";

    const intentConfidence = Math.min(
      1,
      Math.max(0, parsed.intentConfidence ?? 0.7)
    );
    const componentConfidence = Math.min(
      1,
      Math.max(0, parsed.componentConfidence ?? 0.7)
    );
    const severityScore = Math.min(100, Math.max(0, parsed.severityScore ?? 30));
    const overallConfidence = (intentConfidence + componentConfidence) / 2;

    return {
      intent,
      intentConfidence,
      component,
      componentConfidence,
      severityScore,
      severityLabel,
      overallConfidence,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      reasoning: parsed.reasoning ?? "",
    };
  } catch (err) {
    console.error("[GeminiParser] Failed:", err);
    return null;
  }
}

// ─── Reproduction Agent via Gemini ────────────────────────────────────
const REPRO_SYSTEM = `You are an expert software QA engineer. Given a bug description and optional error log, generate reproduction steps and return ONLY valid JSON.

Return this exact JSON structure:
{
  "title": "short descriptive bug title (max 80 chars)",
  "steps": ["step 1", "step 2", "step 3", ...],
  "expectedBehavior": "what should happen",
  "actualBehavior": "what actually happens / the bug",
  "errorLogSummary": "brief summary of any error if present, or empty string"
}

Rules:
- steps should be numbered actions starting with verbs (Navigate, Click, Enter, Observe)
- Be specific: use actual UI element names, URLs, form fields
- Expected behavior should describe the ideal user flow
- Actual behavior should describe the broken/unexpected behavior
- steps array should have 4-7 items
- If no error log provided, errorLogSummary should be ""`;

export async function generateReproStepsWithGemini(
  description: string,
  component: string,
  errorLog?: string
): Promise<ReproResult | null> {
  if (!GEMINI_API_KEY) return null;

  try {
    const prompt = `Bug Description: ${description}
Component: ${component}
${errorLog ? `Error Log: ${errorLog}` : ""}

Generate reproduction steps for this bug.`;

    const raw = await callGemini(prompt, REPRO_SYSTEM);
    const parsed = JSON.parse(raw) as Partial<ReproResult>;

    return {
      title:
        typeof parsed.title === "string"
          ? parsed.title
          : `${component} issue reported`,
      steps: Array.isArray(parsed.steps) ? parsed.steps : [],
      expectedBehavior: parsed.expectedBehavior ?? "",
      actualBehavior: parsed.actualBehavior ?? "",
      errorLogSummary: parsed.errorLogSummary ?? "",
    };
  } catch (err) {
    console.error("[GeminiRepro] Failed:", err);
    return null;
  }
}

// ─── Vector Embeddings via Gemini ─────────────────────────────────────
export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!GEMINI_API_KEY) return null;

  try {
    const res = await fetch(
      `${GEMINI_BASE}/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text }] },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Embedding API ${res.status}: ${errText}`);
    }

    const json = (await res.json()) as {
      embedding?: { values?: number[] };
    };
    return json?.embedding?.values ?? null;
  } catch (err) {
    console.error("[GeminiEmbed] Failed:", err);
    return null;
  }
}

// ─── Cosine Similarity ────────────────────────────────────────────────
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export const geminiAvailable = !!GEMINI_API_KEY;
