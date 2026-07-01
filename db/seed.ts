/**
 * Seed script for Bug Triage Max
 * Populates the database with realistic demo data
 * Run: npx tsx db/seed.ts
 */

import { getDb } from "../api/queries/connection";
import {
  users,
  teamMembers,
  messages,
  parsedResults,
  bugReports,
  reproductionSteps,
  similarBugMatches,
  agentActivities,
  integrationStatus,
  analyticsSnapshots,
} from "./schema";

async function seed() {
  const db = getDb();
  console.log("Seeding Bug Triage Max database...");

  // ─── Clear existing data ──────────────────────────────────────────────
  await db.delete(similarBugMatches);
  await db.delete(reproductionSteps);
  await db.delete(bugReports);
  await db.delete(parsedResults);
  await db.delete(agentActivities);
  await db.delete(messages);
  await db.delete(teamMembers);
  await db.delete(analyticsSnapshots);
  console.log("  Cleared existing data");

  // ─── Team Members ─────────────────────────────────────────────────────
  const teamData = [
    { name: "Alice Chen", handle: "@alice", email: "alice@company.com", expertise: ["auth", "api"], isOnCall: 0 },
    { name: "Bob Martinez", handle: "@bob", email: "bob@company.com", expertise: ["billing", "database"], isOnCall: 1 },
    { name: "Charlie Kim", handle: "@charlie", email: "charlie@company.com", expertise: ["ui", "notifications"], isOnCall: 0 },
    { name: "Diana Park", handle: "@diana", email: "diana@company.com", expertise: ["database", "api"], isOnCall: 0 },
    { name: "Evan Wright", handle: "@evan", email: "evan@company.com", expertise: ["auth", "ui"], isOnCall: 0 },
  ];

  for (const member of teamData) {
    await db.insert(teamMembers).values(member);
  }
  console.log("  Seeded 5 team members");

  // ─── Integration Status ───────────────────────────────────────────────
  const integrationData = [
    { service: "github" as const, status: "online" as const, responseTime: 120, metadata: { rateLimit: "4999/5000", version: "v3" } },
    { service: "slack" as const, status: "online" as const, responseTime: 85, metadata: { botUser: "bug-triage-bot", channels: 3 } },
    { service: "email" as const, status: "online" as const, responseTime: 200, metadata: { imapServer: "imap.company.com", lastPoll: new Date().toISOString() } },
    { service: "lemma" as const, status: "online" as const, responseTime: 150, metadata: { version: "0.5.3", agents: 4 } },
    { service: "llm" as const, status: "online" as const, responseTime: 450, metadata: { provider: "openrouter", model: "anthropic/claude-sonnet-4" } },
  ];

  for (const integration of integrationData) {
    await db.insert(integrationStatus).values(integration);
  }
  console.log("  Seeded 5 integration statuses");

  // ─── Sample Messages & Pipeline Data ──────────────────────────────────
  const sampleMessages = [
    {
      source: "slack" as const,
      rawContent: "wtf the login button is broken again, i click it and nothing happens",
      senderId: "U12345",
      senderName: "Sarah Johnson",
      senderEmail: "sarah@customer.com",
      channel: "#bugs",
      status: "reproduced" as const,
      hoursAgo: 2,
      parsed: { intent: "bug_report" as const, component: "auth" as const, severityScore: 75, severityLabel: "P1" as const, confidence: 0.89 },
      bug: { title: "Login timeout — auth", priorityScore: 72, severity: "P1" as const, status: "open" as const, assigneeHandle: "@alice" },
      repro: { steps: ["Navigate to /login page", "Enter valid credentials (email + password)", 'Click "Sign In" button', "Observe: Page hangs for 5+ seconds", "Observe: No redirect occurs, silent failure"], expected: "Redirect to dashboard within 2 seconds", actual: "Page hangs indefinitely, no error message shown", errorSummary: "AuthService timeout after 5000ms" },
    },
    {
      source: "email" as const,
      rawContent: "Can't see my invoice for June. The billing page shows a blank screen after I log in. This is urgent as our accounting team needs it today.",
      senderId: "acct@enterprise.com",
      senderName: "Accounting Team",
      senderEmail: "acct@enterprise.com",
      channel: "Invoice Issue - June",
      status: "reproduced" as const,
      hoursAgo: 5,
      parsed: { intent: "bug_report" as const, component: "billing" as const, severityScore: 65, severityLabel: "P1" as const, confidence: 0.91 },
      bug: { title: "Invoice page blank — billing", priorityScore: 68, severity: "P1" as const, status: "in_progress" as const, assigneeHandle: "@bob" },
      repro: { steps: ["Navigate to Billing / Subscription page", "Click on 'Invoices' tab", "Select date range for June 2026", "Observe: Page displays blank white screen"], expected: "Invoice list displays with downloadable PDF links", actual: "Blank page - no content rendered", errorSummary: "React render error: Cannot read properties of undefined (reading 'map')" },
    },
    {
      source: "form" as const,
      rawContent: "The API returns 500 errors when I try to create a new user with the /v1/users endpoint. This started happening after yesterday's deployment.",
      senderId: "dev-456",
      senderName: "Mike Ross",
      senderEmail: "mike@partner.com",
      channel: "API Bug Report",
      status: "reproduced" as const,
      hoursAgo: 8,
      parsed: { intent: "bug_report" as const, component: "api" as const, severityScore: 85, severityLabel: "P0" as const, confidence: 0.94 },
      bug: { title: "User creation API 500 error — api", priorityScore: 82, severity: "P0" as const, status: "open" as const, assigneeHandle: "@diana" },
      repro: { steps: ["Send POST request to /v1/users", "Include valid JSON payload with user data", "Include Authorization header with valid token", "Observe: Response returns HTTP 500"], expected: "201 Created with new user object", actual: "500 Internal Server Error with no helpful message", errorSummary: "TypeError: Cannot destructure property 'email' of 'req.body' as it is undefined" },
    },
    {
      source: "slack" as const,
      rawContent: "The notification bell icon is not showing the red badge even though I have unread messages. Refreshing the page doesn't help.",
      senderId: "U67890",
      senderName: "Emily Davis",
      senderEmail: "emily@company.com",
      channel: "#frontend",
      status: "triaged" as const,
      hoursAgo: 12,
      parsed: { intent: "bug_report" as const, component: "notifications" as const, severityScore: 35, severityLabel: "P2" as const, confidence: 0.87 },
      bug: { title: "Notification badge not updating — notifications", priorityScore: 42, severity: "P2" as const, status: "open" as const, assigneeHandle: "@charlie" },
      repro: { steps: ["Receive a new notification", "Look at notification bell in top nav", "Observe: No red badge appears"], expected: "Red badge with unread count appears on bell icon", actual: "Bell icon shows no indication of unread notifications" },
    },
    {
      source: "email" as const,
      rawContent: "Database query timeout on the analytics dashboard. Loading the monthly report takes over 30 seconds and eventually fails. Our team uses this daily.",
      senderId: "ops@company.com",
      senderName: "Ops Team",
      senderEmail: "ops@company.com",
      channel: "Analytics Dashboard Timeout",
      status: "reproduced" as const,
      hoursAgo: 18,
      parsed: { intent: "bug_report" as const, component: "database" as const, severityScore: 70, severityLabel: "P1" as const, confidence: 0.88 },
      bug: { title: "Analytics query timeout — database", priorityScore: 65, severity: "P1" as const, status: "open" as const, assigneeHandle: "@diana" },
      repro: { steps: ["Navigate to Analytics Dashboard", "Select 'Monthly Report' view", "Set date range to current month", "Click 'Generate Report'", "Observe: Loading spinner for 30+ seconds", "Observe: Request times out with error"], expected: "Report generates within 5 seconds", actual: "Query timeout after 30 seconds" },
    },
    {
      source: "slack" as const,
      rawContent: "Can you add dark mode to the dashboard? The current light theme is hard on the eyes during night shifts.",
      senderId: "U11111",
      senderName: "Night Shift Crew",
      senderEmail: "night@company.com",
      channel: "#feature-requests",
      status: "parsed" as const,
      hoursAgo: 24,
      parsed: { intent: "feature_request" as const, component: "ui" as const, severityScore: 15, severityLabel: "P3" as const, confidence: 0.92 },
    },
    {
      source: "form" as const,
      rawContent: "The password reset email is not being sent. I've tried 3 times and checked my spam folder. This is blocking 5 users from accessing their accounts.",
      senderId: "support-789",
      senderName: "Support Team",
      senderEmail: "support@company.com",
      channel: "Password Reset Failure",
      status: "reproduced" as const,
      hoursAgo: 6,
      parsed: { intent: "bug_report" as const, component: "auth" as const, severityScore: 80, severityLabel: "P0" as const, confidence: 0.93 },
      bug: { title: "Password reset email not sending — auth", priorityScore: 78, severity: "P0" as const, status: "in_progress" as const, assigneeHandle: "@alice" },
      repro: { steps: ["Navigate to /forgot-password", "Enter registered email address", 'Click "Send Reset Link"', "Check email inbox and spam folder", "Observe: No email received after 10 minutes"], expected: "Password reset email delivered within 2 minutes", actual: "No email sent, SendGrid logs show 400 Bad Request" },
    },
    {
      source: "slack" as const,
      rawContent: "The export to CSV button on the users table doesn't do anything when clicked. Chrome latest version.",
      senderId: "U22222",
      senderName: "Jane Smith",
      senderEmail: "jane@company.com",
      channel: "#ui-issues",
      status: "triaged" as const,
      hoursAgo: 14,
      parsed: { intent: "bug_report" as const, component: "ui" as const, severityScore: 40, severityLabel: "P2" as const, confidence: 0.85 },
      bug: { title: "CSV export button unresponsive — ui", priorityScore: 45, severity: "P2" as const, status: "open" as const, assigneeHandle: "@charlie" },
    },
    {
      source: "email" as const,
      rawContent: "Webhook deliveries are failing with SSL certificate errors since this morning. Our integration partners can't receive events.",
      senderId: "integration@partner.com",
      senderName: "Partner Integration",
      senderEmail: "integration@partner.com",
      channel: "Webhook SSL Errors",
      status: "reproduced" as const,
      hoursAgo: 10,
      parsed: { intent: "bug_report" as const, component: "api" as const, severityScore: 90, severityLabel: "P0" as const, confidence: 0.91 },
      bug: { title: "Webhook SSL certificate error — api", priorityScore: 88, severity: "P0" as const, status: "open" as const, assigneeHandle: "@diana" },
      repro: { steps: ["Trigger any event that fires a webhook", "Observe webhook delivery attempt in logs", "Observe: SSL handshake fails with CERT_INVALID"], expected: "Webhook delivered successfully via HTTPS", actual: "SSL certificate validation failure" },
    },
    {
      source: "slack" as const,
      rawContent: "How do I set up two-factor authentication for my team? The docs mention it but I can't find the setting.",
      senderId: "U33333",
      senderName: "Team Lead",
      senderEmail: "lead@customer.com",
      channel: "#general",
      status: "parsed" as const,
      hoursAgo: 20,
      parsed: { intent: "question" as const, component: "auth" as const, severityScore: 10, severityLabel: "P3" as const, confidence: 0.82 },
    },
  ];

  const bugIds: number[] = [];

  for (let i = 0; i < sampleMessages.length; i++) {
    const sample = sampleMessages[i];
    const timestamp = new Date(Date.now() - sample.hoursAgo * 60 * 60 * 1000);

    // Insert message
    const [msgResult] = await db.insert(messages).values({
      source: sample.source,
      rawContent: sample.rawContent,
      senderId: sample.senderId,
      senderName: sample.senderName,
      senderEmail: sample.senderEmail,
      channel: sample.channel,
      status: sample.status,
      timestamp,
    }).$returningId();

    if (sample.parsed) {
      // Insert parsed result
      const [parsedResult] = await db.insert(parsedResults).values({
        messageId: msgResult.id,
        intent: sample.parsed.intent,
        intentConfidence: sample.parsed.confidence + 0.05,
        component: sample.parsed.component,
        componentConfidence: sample.parsed.confidence,
        severityScore: sample.parsed.severityScore,
        severityLabel: sample.parsed.severityLabel,
        overallConfidence: sample.parsed.confidence,
        keywords: extractKeywords(sample.rawContent),
        flaggedForReview: sample.parsed.confidence < 0.6 ? 1 : 0,
      }).$returningId();

      if (sample.bug) {
        // Insert bug report
        const [bugResult] = await db.insert(bugReports).values({
          messageId: msgResult.id,
          parsedResultId: parsedResult.id,
          title: sample.bug.title,
          description: sample.rawContent,
          source: sample.source,
          component: sample.parsed.component,
          severity: sample.bug.severity,
          priorityScore: sample.bug.priorityScore,
          status: sample.bug.status,
          assigneeHandle: sample.bug.assigneeHandle,
        }).$returningId();

        bugIds.push(bugResult.id);

        if (sample.repro) {
          // Insert reproduction steps
          await db.insert(reproductionSteps).values({
            bugReportId: bugResult.id,
            steps: sample.repro.steps,
            expectedBehavior: sample.repro.expected,
            actualBehavior: sample.repro.actual,
            errorLogSummary: sample.repro.errorSummary,
            accuracyScore: 0.85,
          });
        }
      }
    }
  }

  // Add similar bug matches for demo
  if (bugIds.length >= 2) {
    await db.insert(similarBugMatches).values({
      bugReportId: bugIds[0],
      similarBugId: bugIds[6], // Login related
      similarityScore: 0.87,
      isDuplicate: 0,
    });
    await db.insert(similarBugMatches).values({
      bugReportId: bugIds[2],
      similarBugId: bugIds[7], // API related
      similarityScore: 0.72,
      isDuplicate: 0,
    });
  }

  console.log(`  Seeded ${sampleMessages.length} messages with pipeline data`);

  // ─── Agent Activities ─────────────────────────────────────────────────
  const activityData = [
    { agentName: "parser" as const, action: "Intent: bug_report, Component: auth, Severity: P1", targetId: 1, targetType: "message" as const, status: "completed" as const, duration: 420, details: { confidence: 0.89 } },
    { agentName: "triage" as const, action: "Priority: P1 (72/100), Assigned: @alice, 1 similar bug found", targetId: 1, targetType: "bug_report" as const, status: "completed" as const, duration: 680, details: { priorityScore: 72 } },
    { agentName: "reproduction" as const, action: "Generated 5 reproduction steps", targetId: 1, targetType: "bug_report" as const, status: "completed" as const, duration: 1200, details: { stepCount: 5 } },
    { agentName: "parser" as const, action: "Intent: bug_report, Component: billing, Severity: P1", targetId: 2, targetType: "message" as const, status: "completed" as const, duration: 380, details: { confidence: 0.91 } },
    { agentName: "triage" as const, action: "Priority: P1 (68/100), Assigned: @bob, 0 similar bugs found", targetId: 2, targetType: "bug_report" as const, status: "completed" as const, duration: 520, details: { priorityScore: 68 } },
    { agentName: "reproduction" as const, action: "Generated 4 reproduction steps", targetId: 2, targetType: "bug_report" as const, status: "completed" as const, duration: 980, details: { stepCount: 4 } },
    { agentName: "parser" as const, action: "Intent: bug_report, Component: api, Severity: P0", targetId: 3, targetType: "message" as const, status: "completed" as const, duration: 450, details: { confidence: 0.94 } },
    { agentName: "triage" as const, action: "Priority: P0 (82/100), Assigned: @diana, 0 similar bugs found", targetId: 3, targetType: "bug_report" as const, status: "completed" as const, duration: 610, details: { priorityScore: 82 } },
    { agentName: "parser" as const, action: "Intent: bug_report, Component: auth, Severity: P0", targetId: 7, targetType: "message" as const, status: "completed" as const, duration: 390, details: { confidence: 0.93 } },
    { agentName: "triage" as const, action: "Priority: P0 (78/100), Assigned: @alice, 1 similar bug found", targetId: 7, targetType: "bug_report" as const, status: "completed" as const, duration: 540, details: { priorityScore: 78 } },
    { agentName: "reproduction" as const, action: "Generated 5 reproduction steps", targetId: 7, targetType: "bug_report" as const, status: "completed" as const, duration: 1100, details: { stepCount: 5 } },
  ];

  for (const activity of activityData) {
    await db.insert(agentActivities).values(activity);
  }
  console.log(`  Seeded ${activityData.length} agent activities`);

  // ─── Analytics Snapshot ───────────────────────────────────────────────
  await db.insert(analyticsSnapshots).values({
    totalMessages: 10,
    totalBugs: 8,
    openBugs: 6,
    resolvedBugs: 0,
    avgResolutionTime: 0,
    bugsByComponent: { auth: 2, billing: 1, api: 2, ui: 2, database: 1 },
    bugsBySeverity: { P0: 2, P1: 3, P2: 2, P3: 1 },
    topAssignees: [
      { handle: "@alice", count: 2 },
      { handle: "@diana", count: 2 },
      { handle: "@bob", count: 1 },
      { handle: "@charlie", count: 2 },
    ],
  });
  console.log("  Seeded analytics snapshot");

  console.log("\nSeed complete! The dashboard is ready with realistic demo data.");
  console.log("Run 'npm run dev' to start the application.");
}

function extractKeywords(content: string): string[] {
  const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "shall", "can", "need", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "above", "below", "between", "out", "off", "over", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "just", "and", "but", "if", "or", "because", "until", "while"]);
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

seed().catch(console.error);
