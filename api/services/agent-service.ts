/**
 * AI Agent Service — Parser, Triage, and Reproduction agents
 * Uses Google Gemini for LLM-powered analysis with pattern-matching fallback.
 * See mock.md for integration details.
 */

import { getDb } from "../queries/connection";
import {
  messages,
  parsedResults,
  bugReports,
  reproductionSteps,
  agentActivities,
  similarBugMatches,
  teamMembers,
} from "../../db/schema";
import { eq, desc, sql, gte, and, ne } from "drizzle-orm";
import {
  parseMessageWithGemini,
  generateReproStepsWithGemini,
  generateEmbedding,
  cosineSimilarity,
  geminiAvailable,
} from "./gemini-service";

// ─── Intent Classification (pattern fallback) ─────────────────────────
const INTENT_PATTERNS: Record<string, RegExp[]> = {
  bug_report: [
    /broke|broken|bug|crash|error|fail|failure|not working|doesn't work|wtf|broken again|timeout|hang|freeze|stuck/i,
  ],
  feature_request: [
    /add|feature|request|would be nice|should have|need to|support for|implement/i,
  ],
  complaint: [
    /slow|terrible|awful|hate|worst|annoying|frustrat|disappoint/i,
  ],
  question: [
    /how to|how do|what is|where is|why does|can i|help with/i,
  ],
};

const COMPONENT_PATTERNS: Record<string, RegExp[]> = {
  auth: [/login|logout|signin|sign out|password|2fa|mfa|oauth|token|auth|session|credential/i],
  billing: [/invoice|payment|charge|billing|subscription|price|cost|plan|receipt|refund/i],
  ui: [/button|modal|dropdown|menu|page|screen|layout|color|theme|font|icon|click|scroll|display|view/i],
  api: [/endpoint|api|route|request|response|status code|404|500|json|payload|header/i],
  database: [/db|database|query|table|column|migration|sql|mongo|postgres|redis|cache/i],
  notifications: [/email|notification|alert|push|sms|webhook|slack|message|remind/i],
};

const SEVERITY_KEYWORDS: Record<string, number> = {
  broke: 30, broken: 30, crash: 30, down: 30, "not working": 25,
  "doesn't work": 25, timeout: 20, hang: 20, freeze: 20, stuck: 15,
  wtf: 10, error: 10, fail: 10, urgent: 20, critical: 30, asap: 15,
};

function classifyIntentPattern(content: string): { intent: string; confidence: number } {
  const scores: Record<string, number> = {};
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    scores[intent] = 0;
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) scores[intent] += matches.length;
    }
  }
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  if (total === 0) return { intent: "other", confidence: 0.7 };
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return { intent: best[0], confidence: Math.min(0.95, 0.5 + best[1] * 0.15) };
}

function classifyComponentPattern(content: string): { component: string; confidence: number } {
  const scores: Record<string, number> = {};
  for (const [component, patterns] of Object.entries(COMPONENT_PATTERNS)) {
    scores[component] = 0;
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) scores[component] += matches.length;
    }
  }
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  if (total === 0) return { component: "other", confidence: 0.6 };
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return { component: best[0], confidence: Math.min(0.95, 0.5 + best[1] * 0.2) };
}

function calculateSeverityPattern(content: string): { score: number; label: string } {
  let score = 0;
  const lower = content.toLowerCase();
  for (const [keyword, weight] of Object.entries(SEVERITY_KEYWORDS)) {
    if (lower.includes(keyword)) score += weight;
  }
  if (/again|still|never|always/.test(lower)) score += 10;
  score = Math.min(100, score);
  let label = "P3";
  if (score >= 80) label = "P0";
  else if (score >= 60) label = "P1";
  else if (score >= 40) label = "P2";
  return { score, label };
}

function generateTitle(content: string, component: string): string {
  const lower = content.toLowerCase();
  if (lower.includes("login")) return `Login timeout — ${component}`;
  if (lower.includes("button")) return `Button unresponsive — ${component}`;
  if (lower.includes("invoice")) return `Invoice display issue — ${component}`;
  if (lower.includes("api")) return `API endpoint failure — ${component}`;
  if (lower.includes("notification")) return `Notification not sent — ${component}`;
  if (lower.includes("slow")) return `Performance degradation — ${component}`;
  if (lower.includes("crash")) return `Application crash — ${component}`;
  if (lower.includes("error")) return `Error in production — ${component}`;
  return `${component.charAt(0).toUpperCase() + component.slice(1)} issue reported`;
}

// ─── Parser Agent ─────────────────────────────────────────────────────
export async function runParserAgent(messageId: number) {
  const db = getDb();
  const startTime = Date.now();

  await db.insert(agentActivities).values({
    agentName: "parser",
    action: geminiAvailable
      ? "Analyzing with Gemini AI..."
      : "Analyzing intent and extracting components",
    targetId: messageId,
    targetType: "message",
    status: "running",
  });

  const message = await db.query.messages.findFirst({
    where: eq(messages.id, messageId),
  });
  if (!message) throw new Error("Message not found");

  // Try Gemini first, fall back to pattern matching
  let intent: string;
  let intentConfidence: number;
  let component: string;
  let componentConfidence: number;
  let severityScore: number;
  let severityLabel: string;
  let keywords: string[];
  let usedGemini = false;

  const geminiResult = await parseMessageWithGemini(message.rawContent);

  if (geminiResult) {
    intent = geminiResult.intent;
    intentConfidence = geminiResult.intentConfidence;
    component = geminiResult.component;
    componentConfidence = geminiResult.componentConfidence;
    severityScore = geminiResult.severityScore;
    severityLabel = geminiResult.severityLabel;
    keywords = geminiResult.keywords;
    usedGemini = true;
  } else {
    // Fallback to pattern matching
    const intentResult = classifyIntentPattern(message.rawContent);
    const componentResult = classifyComponentPattern(message.rawContent);
    const severityResult = calculateSeverityPattern(message.rawContent);
    intent = intentResult.intent;
    intentConfidence = intentResult.confidence;
    component = componentResult.component;
    componentConfidence = componentResult.confidence;
    severityScore = severityResult.score;
    severityLabel = severityResult.label;
    keywords = extractKeywords(message.rawContent);
  }

  const overallConfidence = (intentConfidence + componentConfidence) / 2;

  // Generate embedding for vector similarity search
  const embeddingText = `${message.rawContent} component:${component} intent:${intent}`;
  const embedding = await generateEmbedding(embeddingText);

  const [parsed] = await db.insert(parsedResults).values({
    messageId,
    intent: intent as "bug_report" | "feature_request" | "complaint" | "question" | "other",
    intentConfidence,
    component: component as "auth" | "billing" | "ui" | "api" | "database" | "notifications" | "other",
    componentConfidence,
    severityScore,
    severityLabel: severityLabel as "P0" | "P1" | "P2" | "P3",
    overallConfidence,
    keywords,
    entities: {
      ...extractEntities(message.rawContent),
      ...(embedding ? { hasEmbedding: "true" } : {}),
      engine: usedGemini ? "gemini" : "pattern",
    },
    flaggedForReview: overallConfidence < 0.6 ? 1 : 0,
  }).returning({ id: parsedResults.id });

  // Store embedding in a separate JSON field if we have it
  if (embedding) {
    // Store serialized embedding in entities for vector search
    await db
      .update(parsedResults)
      .set({
        entities: {
          ...extractEntities(message.rawContent),
          hasEmbedding: "true",
          engine: usedGemini ? "gemini" : "pattern",
          embedding: JSON.stringify(embedding),
        },
      })
      .where(eq(parsedResults.id, parsed.id));
  }

  await db.update(messages).set({ status: "parsed" }).where(eq(messages.id, messageId));

  const duration = Date.now() - startTime;
  await db.insert(agentActivities).values({
    agentName: "parser",
    action: `[${usedGemini ? "Gemini" : "Pattern"}] Intent: ${intent}, Component: ${component}, Severity: ${severityLabel}`,
    targetId: messageId,
    targetType: "message",
    status: "completed",
    duration,
    details: {
      confidence: overallConfidence,
      intent,
      component,
      engine: usedGemini ? "gemini" : "pattern",
    },
  });

  return {
    parsedResultId: parsed.id,
    intentResult: { intent, confidence: intentConfidence },
    componentResult: { component, confidence: componentConfidence },
    severityResult: { score: severityScore, label: severityLabel },
    overallConfidence,
    usedGemini,
    embedding,
  };
}

// ─── Triage Agent (with vector similarity) ────────────────────────────
export async function runTriageAgent(messageId: number, parsedResultId: number) {
  const db = getDb();
  const startTime = Date.now();

  await db.insert(agentActivities).values({
    agentName: "triage",
    action: "Finding similar bugs and calculating priority",
    targetId: messageId,
    targetType: "message",
    status: "running",
  });

  const parsed = await db.query.parsedResults.findFirst({
    where: eq(parsedResults.id, parsedResultId),
  });
  const message = await db.query.messages.findFirst({
    where: eq(messages.id, messageId),
  });
  if (!parsed || !message) throw new Error("Data not found");

  // Get current message embedding (stored in entities)
  let currentEmbedding: number[] | null = null;
  try {
    const ents = parsed.entities as Record<string, string> | null;
    if (ents?.embedding) {
      currentEmbedding = JSON.parse(ents.embedding) as number[];
    }
  } catch {
    // no embedding stored
  }

  // Find similar bugs using vector similarity (if available) or keyword matching
  const recentBugs = await db.query.bugReports.findMany({
    where: gte(bugReports.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    orderBy: [desc(bugReports.createdAt)],
    limit: 50,
  });

  const parsedKeywords = (parsed.keywords || []) as string[];
  const similar: Array<{ bugId: number; score: number; isDuplicate: boolean }> = [];

  for (const bug of recentBugs) {
    if (bug.messageId === messageId) continue;
    let score = 0;

    if (currentEmbedding) {
      // Vector similarity: get embedding of the similar bug's parsed result
      const bugParsed = await db.query.parsedResults.findFirst({
        where: eq(parsedResults.messageId, bug.messageId),
      });
      if (bugParsed) {
        try {
          const bugEnts = bugParsed.entities as Record<string, string> | null;
          if (bugEnts?.embedding) {
            const bugEmbedding = JSON.parse(bugEnts.embedding) as number[];
            score = cosineSimilarity(currentEmbedding, bugEmbedding);
          }
        } catch {
          // fall through to keyword matching
        }
      }
    }

    // Fallback or supplement with keyword matching
    if (score === 0) {
      if (bug.component === parsed.component) score += 0.3;
      const bugMessage = await db.query.messages.findFirst({
        where: eq(messages.id, bug.messageId),
      });
      if (bugMessage) {
        const bugKeywords = extractKeywords(bugMessage.rawContent);
        const overlap = bugKeywords.filter((k) => parsedKeywords.includes(k)).length;
        score += (overlap / Math.max(parsedKeywords.length, 1)) * 0.7;
      }
    }

    if (score > 0.3) {
      similar.push({ bugId: bug.id, score: Math.min(1, score), isDuplicate: score > 0.85 });
    }
  }

  similar.sort((a, b) => b.score - a.score);
  const top3 = similar.slice(0, 3);

  // Priority scoring
  const severityBase = parsed.severityScore;
  const customerTierWeight = 15;
  const blastRadius =
    parsed.component === "auth" ? 25 :
    parsed.component === "billing" ? 20 : 10;
  const frequencyBonus = Math.min(20, similar.length * 5);
  const priorityScore = Math.min(100, Math.round(
    severityBase * 0.4 + customerTierWeight * 0.3 + blastRadius * 0.2 + frequencyBonus * 0.1
  ));

  let priorityLabel: "P0" | "P1" | "P2" | "P3" = "P3";
  if (priorityScore >= 80) priorityLabel = "P0";
  else if (priorityScore >= 60) priorityLabel = "P1";
  else if (priorityScore >= 40) priorityLabel = "P2";

  const assigneeHandle = await findAssignee(parsed.component);
  const title = generateTitle(message.rawContent, parsed.component);

  const [bug] = await db.insert(bugReports).values({
    messageId,
    parsedResultId,
    title,
    description: message.rawContent,
    source: message.source,
    component: parsed.component,
    severity: parsed.severityLabel,
    priorityScore,
    status: "open",
    assigneeHandle,
  }).returning({ id: bugReports.id });

  for (const sim of top3) {
    await db.insert(similarBugMatches).values({
      bugReportId: bug.id,
      similarBugId: sim.bugId,
      similarityScore: sim.score,
      isDuplicate: sim.isDuplicate ? 1 : 0,
    });
  }

  await db.update(messages).set({ status: "triaged" }).where(eq(messages.id, messageId));

  const duration = Date.now() - startTime;
  const vectorUsed = currentEmbedding !== null;
  await db.insert(agentActivities).values({
    agentName: "triage",
    action: `[${vectorUsed ? "Vector" : "Keyword"}] Priority: ${priorityLabel} (${priorityScore}/100), Assigned: ${assigneeHandle}, ${top3.length} similar bugs found`,
    targetId: bug.id,
    targetType: "bug_report",
    status: "completed",
    duration,
    details: { priorityScore, assigneeHandle, similarCount: top3.length, vectorSearch: vectorUsed },
  });

  return { bugId: bug.id, priorityScore, priorityLabel, assigneeHandle, similarBugs: top3 };
}

// ─── Reproduction Agent ───────────────────────────────────────────────
export async function runReproductionAgent(bugId: number) {
  const db = getDb();
  const startTime = Date.now();

  await db.insert(agentActivities).values({
    agentName: "reproduction",
    action: geminiAvailable
      ? "Generating reproduction steps with Gemini AI..."
      : "Generating reproduction steps from description",
    targetId: bugId,
    targetType: "bug_report",
    status: "running",
  });

  const bug = await db.query.bugReports.findFirst({
    where: eq(bugReports.id, bugId),
  });
  if (!bug) throw new Error("Bug not found");

  const message = await db.query.messages.findFirst({
    where: eq(messages.id, bug.messageId),
  });

  const content = message?.rawContent || bug.description;

  // Try Gemini first
  let steps: string[];
  let expected: string;
  let actual: string;
  let errorSummary: string;
  let bugTitle: string;
  let usedGemini = false;

  const geminiResult = await generateReproStepsWithGemini(content, bug.component);

  if (geminiResult && geminiResult.steps.length > 0) {
    steps = geminiResult.steps;
    expected = geminiResult.expectedBehavior;
    actual = geminiResult.actualBehavior;
    errorSummary = geminiResult.errorLogSummary;
    bugTitle = geminiResult.title;
    usedGemini = true;

    // Update the bug title if Gemini generated a better one
    if (bugTitle && bugTitle !== bug.title) {
      await db.update(bugReports)
        .set({ title: bugTitle })
        .where(eq(bugReports.id, bugId));
    }
  } else {
    // Pattern-based fallback
    const result = inferReproductionStepsPattern(content, bug.component);
    steps = result.steps;
    expected = result.expected;
    actual = result.actual;
    errorSummary = result.errorSummary;
  }

  await db.insert(reproductionSteps).values({
    bugReportId: bugId,
    steps,
    expectedBehavior: expected,
    actualBehavior: actual,
    errorLogSummary: errorSummary,
    accuracyScore: usedGemini ? 0.92 : 0.75,
  });

  await db.update(bugReports).set({ status: "in_progress" }).where(eq(bugReports.id, bugId));
  await db.update(messages).set({ status: "reproduced" }).where(eq(messages.id, bug.messageId));

  const duration = Date.now() - startTime;
  await db.insert(agentActivities).values({
    agentName: "reproduction",
    action: `[${usedGemini ? "Gemini" : "Pattern"}] Generated ${steps.length} reproduction steps`,
    targetId: bugId,
    targetType: "bug_report",
    status: "completed",
    duration,
    details: { stepCount: steps.length, engine: usedGemini ? "gemini" : "pattern" },
  });

  return { steps, expected, actual, errorSummary, usedGemini };
}

// ─── Helper: Find Assignee ────────────────────────────────────────────
async function findAssignee(component: string): Promise<string> {
  const db = getDb();
  const experts = await db.query.teamMembers.findMany({
    where: sql`JSON_CONTAINS(${teamMembers.expertise}, ${JSON.stringify([component])})`,
  });
  if (experts.length > 0) return experts[0].handle;

  const onCall = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.isOnCall, 1),
  });
  return onCall?.handle || "@oncall";
}

// ─── Helper: Extract Keywords ─────────────────────────────────────────
function extractKeywords(content: string): string[] {
  const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "shall", "can", "need", "dare", "ought", "used", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "above", "below", "between", "out", "off", "over", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "just", "and", "but", "if", "or", "because", "until", "while"]);
  const words = content.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const freq: Record<string, number> = {};
  for (const w of words) {
    if (!stopWords.has(w)) freq[w] = (freq[w] || 0) + 1;
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w);
}

// ─── Helper: Extract Entities ─────────────────────────────────────────
function extractEntities(content: string): Record<string, string> {
  const entities: Record<string, string> = {};
  const urlMatch = content.match(/https?:\/\/[^\s]+/);
  if (urlMatch) entities.url = urlMatch[0];
  const emailMatch = content.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) entities.email = emailMatch[0];
  const versionMatch = content.match(/v?\d+\.\d+(?:\.\d+)?/);
  if (versionMatch) entities.version = versionMatch[0];
  return entities;
}

// ─── Helper: Pattern-based Reproduction Steps ─────────────────────────
function inferReproductionStepsPattern(content: string, component: string) {
  const lower = content.toLowerCase();
  const steps: string[] = [];
  let expected = "";
  let actual = "";
  let errorSummary = "";

  if (component === "auth" || lower.includes("login")) {
    steps.push("Navigate to /login page");
    steps.push("Enter valid credentials (email + password)");
    steps.push('Click "Sign In" button');
    if (lower.includes("hang") || lower.includes("timeout") || lower.includes("slow")) {
      steps.push("Observe: Page hangs for 5+ seconds");
      steps.push("Observe: No redirect occurs");
      expected = "Redirect to dashboard within 2 seconds";
      actual = "Page hangs indefinitely, no error message shown";
      errorSummary = "AuthService timeout after 5000ms";
    } else if (lower.includes("error") || lower.includes("broken")) {
      steps.push("Observe: Error message displayed");
      steps.push("Check browser console for stack trace");
      expected = "Successful login and dashboard redirect";
      actual = "Error page or silent failure";
      errorSummary = "TypeError: Cannot read property of undefined";
    } else {
      steps.push("Observe: Authentication behavior");
      expected = "Successful authentication flow";
      actual = "Authentication fails or behaves unexpectedly";
    }
  } else if (component === "billing" || lower.includes("invoice")) {
    steps.push("Navigate to Billing / Subscription page");
    steps.push("Click on 'Invoices' tab");
    steps.push("Select date range for invoice history");
    steps.push("Attempt to view or download invoice PDF");
    expected = "Invoice list displays with downloadable PDF links";
    actual = "Invoice section empty or PDF generation fails";
    errorSummary = "PDF generation service returned 500";
  } else if (component === "ui") {
    steps.push("Load the affected page");
    steps.push("Interact with the reported UI element");
    steps.push("Observe visual and interactive behavior");
    expected = "UI element responds correctly to interaction";
    actual = "UI element unresponsive or visually broken";
  } else {
    steps.push("Navigate to the affected feature");
    steps.push("Perform the action described in the report");
    steps.push("Observe the system behavior");
    steps.push("Check browser console and network tab");
    expected = "Feature works as documented";
    actual = "Unexpected behavior or error occurs";
  }

  return { steps, expected, actual, errorSummary };
}

// ─── Process Message End-to-End ───────────────────────────────────────
export async function processMessage(messageId: number) {
  try {
    const parseResult = await runParserAgent(messageId);
    if (parseResult.intentResult.intent === "bug_report") {
      const triageResult = await runTriageAgent(messageId, parseResult.parsedResultId);
      await runReproductionAgent(triageResult.bugId);
      return { ...parseResult, ...triageResult, complete: true };
    }
    return { ...parseResult, complete: false, reason: "Not a bug report" };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    const db = getDb();
    await db.insert(agentActivities).values({
      agentName: "parser",
      action: `Pipeline failed: ${errMsg}`,
      targetId: messageId,
      targetType: "message",
      status: "failed",
      details: { error: errMsg },
    });
    throw error;
  }
}
