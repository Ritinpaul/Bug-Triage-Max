import {
  pgTable,
  pgEnum,
  serial,
  varchar,
  text,
  timestamp,
  json,
  integer,
  real,
  bigint,
  index,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const sourceEnum = pgEnum("source", ["slack", "email", "form"]);
export const messageStatusEnum = pgEnum("message_status", ["pending", "parsed", "triaged", "reproduced", "resolved"]);
export const intentEnum = pgEnum("intent", ["bug_report", "feature_request", "complaint", "question", "other"]);
export const componentEnum = pgEnum("component", ["auth", "billing", "ui", "api", "database", "notifications", "other"]);
export const severityEnum = pgEnum("severity", ["P0", "P1", "P2", "P3"]);
export const bugStatusEnum = pgEnum("bug_status", ["open", "in_progress", "resolved", "closed"]);
export const agentNameEnum = pgEnum("agent_name", ["parser", "triage", "reproduction", "release"]);
export const agentTargetEnum = pgEnum("agent_target", ["message", "bug_report"]);
export const agentStatusEnum = pgEnum("agent_status", ["running", "completed", "failed", "waiting"]);
export const integrationServiceEnum = pgEnum("integration_service", ["github", "slack", "email", "lemma", "llm"]);
export const integrationStatusValueEnum = pgEnum("integration_status_value", ["online", "offline", "degraded", "error"]);
export const releaseNoteStatusEnum = pgEnum("release_note_status", ["draft", "published"]);

// ─── Users (OAuth) ────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("union_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignInAt: timestamp("last_sign_in_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Team Members (for auto-assignment) ───────────────────────────────
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  handle: varchar("handle", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 320 }),
  expertise: json("expertise").$type<string[]>(),
  isOnCall: integer("is_on_call").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TeamMember = typeof teamMembers.$inferSelect;

// ─── Messages (raw ingestion from all channels) ────────────────────────
export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    source: sourceEnum("source").notNull(),
    rawContent: text("raw_content").notNull(),
    senderId: varchar("sender_id", { length: 255 }).notNull(),
    senderName: varchar("sender_name", { length: 255 }),
    senderEmail: varchar("sender_email", { length: 320 }),
    channel: varchar("channel", { length: 255 }),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    status: messageStatusEnum("status").default("pending").notNull(),
    contentHash: varchar("content_hash", { length: 64 }),
    attachments: json("attachments").$type<string[]>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_source_status").on(table.source, table.status),
    index("idx_content_hash").on(table.contentHash),
    index("idx_timestamp").on(table.timestamp),
  ]
);

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// ─── Parsed Results (AI Parser Agent output) ──────────────────────────
export const parsedResults = pgTable("parsed_results", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull(),
  intent: intentEnum("intent").notNull(),
  intentConfidence: real("intent_confidence").notNull(),
  component: componentEnum("component").notNull(),
  componentConfidence: real("component_confidence").notNull(),
  severityScore: integer("severity_score").notNull(),
  severityLabel: severityEnum("severity_label").default("P3").notNull(),
  overallConfidence: real("overall_confidence").notNull(),
  keywords: json("keywords").$type<string[]>(),
  entities: json("entities").$type<Record<string, unknown>>(),
  flaggedForReview: integer("flagged_for_review").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ParsedResult = typeof parsedResults.$inferSelect;

// ─── Bug Reports (triaged bugs) ───────────────────────────────────────
export const bugReports = pgTable(
  "bug_reports",
  {
    id: serial("id").primaryKey(),
    messageId: integer("message_id").notNull(),
    parsedResultId: integer("parsed_result_id").notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description").notNull(),
    source: sourceEnum("source").notNull(),
    component: varchar("component", { length: 50 }).notNull(),
    severity: severityEnum("severity").default("P3").notNull(),
    priorityScore: integer("priority_score").default(0).notNull(),
    status: bugStatusEnum("status").default("open").notNull(),
    assigneeId: integer("assignee_id"),
    assigneeHandle: varchar("assignee_handle", { length: 100 }),
    githubIssueId: varchar("github_issue_id", { length: 100 }),
    githubIssueUrl: text("github_issue_url"),
    duplicateOfId: integer("duplicate_of_id"),
    resolutionTime: integer("resolution_time"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at"),
  },
  (table) => [
    index("idx_status_component").on(table.status, table.component),
    index("idx_assignee").on(table.assigneeId),
    index("idx_severity").on(table.severity),
  ]
);

export type BugReport = typeof bugReports.$inferSelect;

// ─── Similar Bug Matches ──────────────────────────────────────────────
export const similarBugMatches = pgTable("similar_bug_matches", {
  id: serial("id").primaryKey(),
  bugReportId: integer("bug_report_id").notNull(),
  similarBugId: integer("similar_bug_id").notNull(),
  similarityScore: real("similarity_score").notNull(),
  isDuplicate: integer("is_duplicate").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SimilarBugMatch = typeof similarBugMatches.$inferSelect;

// ─── Reproduction Steps ───────────────────────────────────────────────
export const reproductionSteps = pgTable("reproduction_steps", {
  id: serial("id").primaryKey(),
  bugReportId: integer("bug_report_id").notNull(),
  steps: json("steps").$type<string[]>().notNull(),
  expectedBehavior: text("expected_behavior"),
  actualBehavior: text("actual_behavior"),
  errorLogSummary: text("error_log_summary"),
  validatedBy: varchar("validated_by", { length: 255 }),
  accuracyScore: real("accuracy_score"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ReproductionSteps = typeof reproductionSteps.$inferSelect;

// ─── Agent Activities ─────────────────────────────────────────────────
export const agentActivities = pgTable(
  "agent_activities",
  {
    id: serial("id").primaryKey(),
    agentName: agentNameEnum("agent_name").notNull(),
    action: varchar("action", { length: 255 }).notNull(),
    targetId: integer("target_id"),
    targetType: agentTargetEnum("target_type"),
    status: agentStatusEnum("status").default("running").notNull(),
    details: json("details").$type<Record<string, unknown>>(),
    duration: integer("duration"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_agent_created").on(table.agentName, table.createdAt)]
);

export type AgentActivity = typeof agentActivities.$inferSelect;

// ─── Integration Status ───────────────────────────────────────────────
export const integrationStatus = pgTable("integration_status", {
  id: serial("id").primaryKey(),
  service: integrationServiceEnum("service").notNull().unique(),
  status: integrationStatusValueEnum("status").default("offline").notNull(),
  lastCheckedAt: timestamp("last_checked_at").defaultNow().notNull(),
  lastError: text("last_error"),
  responseTime: integer("response_time"),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type IntegrationStatus = typeof integrationStatus.$inferSelect;

// ─── Analytics Snapshots ──────────────────────────────────────────────
export const analyticsSnapshots = pgTable("analytics_snapshots", {
  id: serial("id").primaryKey(),
  snapshotDate: timestamp("snapshot_date").defaultNow().notNull(),
  totalMessages: integer("total_messages").default(0).notNull(),
  totalBugs: integer("total_bugs").default(0).notNull(),
  openBugs: integer("open_bugs").default(0).notNull(),
  resolvedBugs: integer("resolved_bugs").default(0).notNull(),
  avgResolutionTime: real("avg_resolution_time").default(0).notNull(),
  bugsByComponent: json("bugs_by_component").$type<Record<string, number>>(),
  bugsBySeverity: json("bugs_by_severity").$type<Record<string, number>>(),
  topAssignees: json("top_assignees").$type<{ handle: string; count: number }[]>(),
});

export type AnalyticsSnapshot = typeof analyticsSnapshots.$inferSelect;

// ─── Release Notes ────────────────────────────────────────────────────
export const releaseNotes = pgTable("release_notes", {
  id: serial("id").primaryKey(),
  tagName: varchar("tag_name", { length: 100 }).notNull(),
  name: varchar("name", { length: 500 }).notNull(),
  body: text("body").notNull(),
  githubReleaseId: varchar("github_release_id", { length: 100 }),
  githubReleaseUrl: text("github_release_url"),
  status: releaseNoteStatusEnum("status").default("draft").notNull(),
  daysRange: integer("days_range").default(7).notNull(),
  bugCount: integer("bug_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ReleaseNote = typeof releaseNotes.$inferSelect;
export type InsertReleaseNote = typeof releaseNotes.$inferInsert;
