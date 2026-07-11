import { z } from "zod";
import { createRouter, authedQuery, publicQuery } from "../middleware";
import { getDb, getPg } from "../queries/connection";
import {
  bugReports,
  agentActivities,
  messages,
  parsedResults,
  reproductionSteps,
  similarBugMatches,
} from "../../db/schema";
import { eq, and, isNotNull, sql, inArray } from "drizzle-orm";
import {
  createGitHubIssue,
  getGitHubIssue,
  githubConfigured,
} from "../services/github-service";

export const bugRouter = createRouter({
  // List bugs with filtering
  list: authedQuery
    .input(
      z
        .object({
          status: z.enum(["open", "in_progress", "resolved", "closed", "all"]).optional().default("all"),
          component: z.string().optional(),
          severity: z.enum(["P0", "P1", "P2", "P3", "all"]).optional().default("all"),
          assignee: z.string().optional(),
          search: z.string().optional(),
          limit: z.number().min(1).max(100).optional().default(50),
          offset: z.number().min(0).optional().default(0),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const opts = input || { status: "all" as const, severity: "all" as const, limit: 50, offset: 0 };

      // Build WHERE clauses dynamically using Drizzle conditions
      const conditions = [eq(bugReports.tenantId, ctx.tenantId)];

      if (opts.status && opts.status !== "all") {
        conditions.push(eq(bugReports.status, opts.status as any));
      }
      if ("component" in opts && opts.component) {
        conditions.push(eq(bugReports.component, opts.component));
      }
      if ("severity" in opts && opts.severity && opts.severity !== "all") {
        conditions.push(eq(bugReports.severity, opts.severity as any));
      }
      if ("assignee" in opts && opts.assignee) {
        conditions.push(eq(bugReports.assigneeHandle, opts.assignee));
      }
      if ("search" in opts && opts.search) {
        conditions.push(sql`${bugReports.title} ILIKE ${'%' + opts.search + '%'}`);
      }

      const limit = opts.limit ?? 50;
      const offset = opts.offset ?? 0;
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db.select().from(bugReports)
        .where(whereClause)
        .orderBy(sql`priority_score DESC, created_at DESC`)
        .limit(limit)
        .offset(offset);

      const countResult = await db.select({ total: sql`count(*)` }).from(bugReports).where(whereClause);
      const total = Number(countResult[0]?.total || 0);

      const bugIds = items.map((b) => b.id);
      let reprosByBugId: Record<number, any> = {};
      let similarByBugId: Record<number, any[]> = {};

      if (bugIds.length > 0) {
        const repros = await db.select().from(reproductionSteps)
          .where(inArray(reproductionSteps.bugReportId, bugIds));
        repros.forEach((r) => {
          reprosByBugId[r.bugReportId] = r;
        });

        const similars = await db.select().from(similarBugMatches)
          .where(inArray(similarBugMatches.bugReportId, bugIds))
          .orderBy(sql`similarity_score DESC`);
        similars.forEach((s) => {
          if (!similarByBugId[s.bugReportId]) similarByBugId[s.bugReportId] = [];
          if (similarByBugId[s.bugReportId].length < 3) {
            similarByBugId[s.bugReportId].push(s);
          }
        });
      }

      // Enrich with repro and similar bugs
      const enriched = items.map((bug) => {
        const repro = reprosByBugId[bug.id];
        const similar = similarByBugId[bug.id] || [];
        return {
          ...bug,
          priorityScore: Number(bug.priorityScore),
          reproduction: repro ? {
            ...repro,
          } : null,
          similarBugs: similar.map((s: any) => ({
            ...s,
            similarityScore: Number(s.similarityScore),
          })),
        };
      });

      return { items: enriched, total };
    }),

  // Get single bug with full details
  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const pg = getPg();

      const bugs = await pg`SELECT * FROM bug_reports WHERE id = ${input.id} LIMIT 1`;
      if (!bugs[0]) return null;
      const bug = bugs[0];

      const messages = await pg`SELECT * FROM messages WHERE id = ${bug.message_id} LIMIT 1`;
      const parsed = bug.parsed_result_id
        ? await pg`SELECT * FROM parsed_results WHERE id = ${bug.parsed_result_id} LIMIT 1`
        : [];
      const repro = await pg`SELECT * FROM reproduction_steps WHERE bug_report_id = ${input.id} LIMIT 1`;
      const similar = await pg`
        SELECT * FROM similar_bug_matches WHERE bug_report_id = ${input.id}
        ORDER BY similarity_score DESC LIMIT 5
      `;
      const assignee = bug.assignee_id
        ? await pg`SELECT * FROM team_members WHERE id = ${bug.assignee_id} LIMIT 1`
        : [];

      const similarEnriched = await Promise.all(
        similar.map(async (s: any) => {
          const sb = await pg`SELECT title FROM bug_reports WHERE id = ${s.similar_bug_id} LIMIT 1`;
          return {
            ...s,
            similarityScore: Number(s.similarity_score),
            bugTitle: sb[0]?.title || `#${s.similar_bug_id}`,
          };
        })
      );

      return {
        bug,
        message: messages[0] || null,
        parsed: parsed[0] || null,
        reproduction: repro[0] || null,
        similarBugs: similarEnriched,
      };
    }),

  // Link GitHub issue
  linkGithub: authedQuery
    .input(
      z.object({
        id: z.number(),
        githubIssueId: z.string(),
        githubIssueUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db
        .update(bugReports)
        .set({
          githubIssueId: input.githubIssueId,
          githubIssueUrl: input.githubIssueUrl,
        })
        .where(and(eq(bugReports.id, input.id), eq(bugReports.tenantId, ctx.tenantId)));
      return { success: true };
    }),

  // Stats
  stats: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const results = await db.select().from(bugReports).where(eq(bugReports.tenantId, ctx.tenantId));

    const total = results.length;
    const open = results.filter(r => r.status === 'open').length;
    const inProgress = results.filter(r => r.status === 'in_progress').length;
    const resolved = results.filter(r => r.status === 'resolved').length;
    const closed = results.filter(r => r.status === 'closed').length;
    
    return {
      total,
      open,
      inProgress,
      resolved,
      closed,
    };
  }),

  // Create real GitHub issue via API
  createGithubIssue: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!githubConfigured) {
        throw new Error(
          "GitHub not configured. Add GITHUB_PAT, GITHUB_REPO_OWNER, GITHUB_REPO_NAME to .env"
        );
      }

      const db = getDb();
      const bug = await db.query.bugReports.findFirst({
        where: and(eq(bugReports.id, input.id), eq(bugReports.tenantId, ctx.tenantId)),
      });
      if (!bug) throw new Error("Bug not found");

      // Don't create a duplicate if already linked
      if (bug.githubIssueId) {
        return {
          issueNumber: parseInt(bug.githubIssueId, 10),
          url: bug.githubIssueUrl ?? "",
          alreadyExists: true,
        };
      }

      const message = bug.messageId ? await db.query.messages.findFirst({ where: eq(messages.id, bug.messageId) }) : null;
      const parsed = bug.parsedResultId ? await db.query.parsedResults.findFirst({ where: eq(parsedResults.id, bug.parsedResultId) }) : null;
      const repro = await db.query.reproductionSteps.findFirst({ where: eq(reproductionSteps.bugReportId, input.id) });

      const body = buildGithubIssueBody({ bug, message, parsed, repro });
      const labels = ["bug", bug.severity.toLowerCase(), bug.component].filter(Boolean) as string[];

      const { number, url } = await createGitHubIssue({
        title: bug.title,
        body,
        labels,
      });

      // Persist the link back to DB
      await db
        .update(bugReports)
        .set({ githubIssueId: String(number), githubIssueUrl: url })
        .where(and(eq(bugReports.id, input.id), eq(bugReports.tenantId, ctx.tenantId)));

      return { issueNumber: number, url, alreadyExists: false };
    }),

  // Generate GitHub issue body (preview — no API call)
  generateGithubBody: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const bug = await db.query.bugReports.findFirst({
        where: and(eq(bugReports.id, input.id), eq(bugReports.tenantId, ctx.tenantId)),
      });
      if (!bug) return null;

      const message = bug.messageId ? await db.query.messages.findFirst({ where: eq(messages.id, bug.messageId) }) : null;
      const parsed = bug.parsedResultId ? await db.query.parsedResults.findFirst({ where: eq(parsedResults.id, bug.parsedResultId) }) : null;
      const repro = await db.query.reproductionSteps.findFirst({ where: eq(reproductionSteps.bugReportId, input.id) });

      const body = `## Bug Report
**Source:** ${message?.source || "unknown"}${message?.channel ? ` #${message.channel}` : ""} | **Component:** ${bug.component} | **Severity:** ${bug.severity}
**Priority Score:** ${bug.priorityScore}/100 | **Assigned:** ${bug.assigneeHandle || "unassigned"}

### Description
${message?.rawContent || bug.description}

### Parsed Intent
- Type: ${parsed?.intent || "unknown"} (confidence: ${parsed?.intentConfidence?.toFixed(2) || "N/A"})
- Component: ${parsed?.component || "unknown"} (confidence: ${parsed?.componentConfidence?.toFixed(2) || "N/A"})
- Overall confidence: ${parsed?.overallConfidence?.toFixed(2) || "N/A"}

${repro ? `### Reproduction Steps
${repro.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

**Expected:** ${repro.expectedBehavior || "N/A"}
**Actual:** ${repro.actualBehavior || "N/A"}

${repro.errorLogSummary ? `### Error Log Summary\n${repro.errorLogSummary}` : ""}` : "### Reproduction Steps\n*Pending generation*"}

---
*Generated by Bug Triage Max*`;

      return { title: bug.title, body };
    }),

  // Update bug status manually
  updateStatus: authedQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["open", "in_progress", "resolved", "closed"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const updateData: Record<string, unknown> = { status: input.status };
      if (input.status === "resolved" || input.status === "closed") {
        const bug = await db.query.bugReports.findFirst({ where: and(eq(bugReports.id, input.id), eq(bugReports.tenantId, ctx.tenantId)) });
        if (bug) {
          const created = new Date(bug.createdAt).getTime();
          updateData.resolvedAt = new Date();
          updateData.resolutionTime = Math.round((Date.now() - created) / 3600000); // hours
        }
      }
      await db.update(bugReports).set(updateData).where(and(eq(bugReports.id, input.id), eq(bugReports.tenantId, ctx.tenantId)));
      return { ok: true };
    }),

  // Assign bug to a team member
  assign: authedQuery
    .input(z.object({ id: z.number(), assigneeHandle: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db
        .update(bugReports)
        .set({ assigneeHandle: input.assigneeHandle })
        .where(and(eq(bugReports.id, input.id), eq(bugReports.tenantId, ctx.tenantId)));
      return { ok: true };
    }),

  // Sync GitHub issue state → auto-resolve bugs whose GH issue is closed
  syncGithubStatus: authedQuery
    .input(
      z.object({
        bugId: z.number().optional(),
      }).optional()
    )
    .mutation(async ({ input, ctx }) => {
      if (!githubConfigured) {
        throw new Error("GitHub not configured. Set GITHUB_PAT, GITHUB_REPO_OWNER, GITHUB_REPO_NAME in .env");
      }

      const db = getDb();
      const conditions = [isNotNull(bugReports.githubIssueId), eq(bugReports.tenantId, ctx.tenantId)];
      if (input?.bugId) conditions.push(eq(bugReports.id, input.bugId));

      const linkedBugs = await db.query.bugReports.findMany({
        where: and(...conditions),
        limit: 50,
      });

      const results: Array<{
        bugId: number;
        issueNumber: number;
        githubState: string;
        action: string;
      }> = [];

      for (const bug of linkedBugs) {
        if (!bug.githubIssueId) continue;
        const issueNumber = parseInt(bug.githubIssueId, 10);
        const ghIssue = await getGitHubIssue(issueNumber);
        if (!ghIssue) continue;

        let action = "no-change";

        // If GitHub issue is closed and our bug is still open/in_progress → resolve it
        if (ghIssue.state === "closed" && (bug.status === "open" || bug.status === "in_progress")) {
          const hoursOpen = Math.round((Date.now() - new Date(bug.createdAt).getTime()) / 3600000);
          await db.update(bugReports).set({
            status: "resolved",
            resolvedAt: new Date(),
            resolutionTime: hoursOpen,
          }).where(and(eq(bugReports.id, bug.id), eq(bugReports.tenantId, ctx.tenantId)));

          // Log to agent activities
          await db.insert(agentActivities).values({
            tenantId: ctx.tenantId,
            agentName: "release",
            action: `Auto-resolved: GitHub issue #${issueNumber} was closed`,
            targetId: bug.id,
            targetType: "bug_report",
            status: "completed",
            details: { githubIssueNumber: issueNumber, githubState: "closed" },
          });
          action = "auto-resolved";
        }
        // If GitHub issue was reopened and our bug is resolved → re-open it
        else if (ghIssue.state === "open" && bug.status === "resolved") {
          await db.update(bugReports).set({
            status: "in_progress",
            resolvedAt: null,
          }).where(and(eq(bugReports.id, bug.id), eq(bugReports.tenantId, ctx.tenantId)));
          action = "reopened";
        }

        results.push({
          bugId: bug.id,
          issueNumber,
          githubState: ghIssue.state,
          action,
        });
      }

      return {
        synced: results.length,
        autoResolved: results.filter((r) => r.action === "auto-resolved").length,
        reopened: results.filter((r) => r.action === "reopened").length,
        results,
      };
    }),
});


// ─── Shared body builder ─────────────────────────────────────────────
function buildGithubIssueBody({
  bug,
  message,
  parsed,
  repro,
}: {
  bug: { title: string; component: string; severity: string; priorityScore: number; assigneeHandle?: string | null };
  message?: { source: string; channel?: string | null; rawContent: string } | null;
  parsed?: { intent?: string | null; intentConfidence?: number | null; component?: string | null; componentConfidence?: number | null; overallConfidence?: number | null } | null;
  repro?: { steps: string[]; expectedBehavior?: string | null; actualBehavior?: string | null; errorLogSummary?: string | null } | null;
}): string {
  return `## Bug Report
**Source:** ${message?.source ?? "unknown"}${message?.channel ? ` #${message.channel}` : ""} | **Component:** ${bug.component} | **Severity:** ${bug.severity}
**Priority Score:** ${bug.priorityScore}/100 | **Assigned:** ${bug.assigneeHandle ?? "unassigned"}

### Description
${message?.rawContent ?? "(no description)"}

### Parsed Intent
- Type: ${parsed?.intent ?? "unknown"} (confidence: ${parsed?.intentConfidence?.toFixed(2) ?? "N/A"})
- Component: ${parsed?.component ?? "unknown"} (confidence: ${parsed?.componentConfidence?.toFixed(2) ?? "N/A"})
- Overall confidence: ${parsed?.overallConfidence?.toFixed(2) ?? "N/A"}

${repro ? `### Reproduction Steps
${repro.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

**Expected:** ${repro.expectedBehavior ?? "N/A"}
**Actual:** ${repro.actualBehavior ?? "N/A"}

${repro.errorLogSummary ? `### Error Log Summary\n${repro.errorLogSummary}` : ""}` : "### Reproduction Steps\n*Pending generation*"}

---
*Generated by Bug Triage Max*`;
}
