import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb, getPg } from "../queries/connection";
import {
  bugReports,
  agentActivities,
  messages,
  parsedResults,
  reproductionSteps,
} from "../../db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import {
  createGitHubIssue,
  getGitHubIssue,
  githubConfigured,
} from "../services/github-service";

export const bugRouter = createRouter({
  // List bugs with filtering
  list: publicQuery
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
    .query(async ({ input }) => {
      const pg = getPg();
      const opts = input || { status: "all" as const, severity: "all" as const, limit: 50, offset: 0 };

      // Build WHERE clauses dynamically
      const conditions: string[] = [];
      const params: unknown[] = [];
      let p = 1;

      if (opts.status && opts.status !== "all") {
        conditions.push(`status = $${p++}`);
        params.push(opts.status);
      }
      if ("component" in opts && opts.component) {
        conditions.push(`component = $${p++}`);
        params.push(opts.component);
      }
      if ("severity" in opts && opts.severity && opts.severity !== "all") {
        conditions.push(`severity = $${p++}`);
        params.push(opts.severity);
      }
      if ("assignee" in opts && opts.assignee) {
        conditions.push(`assignee_handle = $${p++}`);
        params.push(opts.assignee);
      }
      if ("search" in opts && opts.search) {
        conditions.push(`title ILIKE $${p++}`);
        params.push(`%${opts.search}%`);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const limit = opts.limit ?? 50;
      const offset = opts.offset ?? 0;

      const items = await pg.unsafe(`
        SELECT * FROM bug_reports ${where}
        ORDER BY priority_score DESC, created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `, params as any[]);

      const countRows = await pg.unsafe(`SELECT count(*) as total FROM bug_reports ${where}`, params as any[]);
      const total = Number(countRows[0]?.total || 0);

      const bugIds = items.map((b: any) => b.id);
      let reprosByBugId: Record<number, any> = {};
      let similarByBugId: Record<number, any[]> = {};

      if (bugIds.length > 0) {
        const repros = await pg`SELECT * FROM reproduction_steps WHERE bug_report_id IN ${pg(bugIds)}`;
        repros.forEach((r: any) => {
          reprosByBugId[r.bug_report_id] = r;
        });

        const similars = await pg`
          SELECT * FROM similar_bug_matches WHERE bug_report_id IN ${pg(bugIds)}
          ORDER BY similarity_score DESC
        `;
        similars.forEach((s: any) => {
          if (!similarByBugId[s.bug_report_id]) similarByBugId[s.bug_report_id] = [];
          if (similarByBugId[s.bug_report_id].length < 3) {
            similarByBugId[s.bug_report_id].push(s);
          }
        });
      }

      // Enrich with repro and similar bugs
      const enriched = items.map((bug: any) => {
        const repro = reprosByBugId[bug.id];
        const similar = similarByBugId[bug.id] || [];
        return {
          id: bug.id,
          messageId: bug.message_id,
          parsedResultId: bug.parsed_result_id,
          title: bug.title,
          description: bug.description,
          source: bug.source,
          component: bug.component,
          severity: bug.severity,
          priorityScore: Number(bug.priority_score),
          status: bug.status,
          assigneeId: bug.assignee_id,
          assigneeHandle: bug.assignee_handle,
          githubIssueId: bug.github_issue_id,
          githubIssueUrl: bug.github_issue_url,
          duplicateOfId: bug.duplicate_of_id,
          resolutionTime: bug.resolution_time,
          createdAt: bug.created_at,
          updatedAt: bug.updated_at,
          resolvedAt: bug.resolved_at,
          reproduction: repro ? {
            id: repro.id,
            bugReportId: repro.bug_report_id,
            steps: repro.steps,
            expectedBehavior: repro.expected_behavior,
            actualBehavior: repro.actual_behavior,
            errorLogSummary: repro.error_log_summary,
          } : null,
          similarBugs: similar.map((s: any) => ({
            id: s.id,
            bugReportId: s.bug_report_id,
            similarBugId: s.similar_bug_id,
            similarityScore: Number(s.similarity_score),
            reason: s.reason,
          })),
        };
      });

      return { items: enriched, total };
    }),

  // Get single bug with full details
  getById: publicQuery
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
        bug: {
          id: bug.id,
          messageId: bug.message_id,
          parsedResultId: bug.parsed_result_id,
          title: bug.title,
          description: bug.description,
          source: bug.source,
          component: bug.component,
          severity: bug.severity,
          priorityScore: Number(bug.priority_score),
          status: bug.status,
          assigneeId: bug.assignee_id,
          assigneeHandle: bug.assignee_handle,
          githubIssueId: bug.github_issue_id,
          githubIssueUrl: bug.github_issue_url,
          duplicateOfId: bug.duplicate_of_id,
          resolutionTime: bug.resolution_time,
          createdAt: bug.created_at,
          updatedAt: bug.updated_at,
          resolvedAt: bug.resolved_at,
        },
        message: messages[0] || null,
        parsed: parsed[0] || null,
        reproduction: repro[0] ? {
          id: repro[0].id,
          bugReportId: repro[0].bug_report_id,
          steps: repro[0].steps,
          expectedBehavior: repro[0].expected_behavior,
          actualBehavior: repro[0].actual_behavior,
          errorLogSummary: repro[0].error_log_summary,
        } : null,
        similarBugs: similarEnriched,
        assignee: assignee[0] || null,
      };
    }),


  // Link GitHub issue
  linkGithub: publicQuery
    .input(
      z.object({
        id: z.number(),
        githubIssueId: z.string(),
        githubIssueUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(bugReports)
        .set({
          githubIssueId: input.githubIssueId,
          githubIssueUrl: input.githubIssueUrl,
        })
        .where(eq(bugReports.id, input.id));
      return { success: true };
    }),

  // Stats
  stats: publicQuery.query(async () => {
    const pg = getPg();

    const result = await pg`
      SELECT
        count(*) as total,
        sum(case when status = 'open' then 1 else 0 end) as open,
        sum(case when status = 'in_progress' then 1 else 0 end) as "inProgress",
        sum(case when status = 'resolved' then 1 else 0 end) as resolved,
        sum(case when status = 'closed' then 1 else 0 end) as closed,
        avg(priority_score) as "avgPriority"
      FROM bug_reports
    `;

    const byComponent = await pg`
      SELECT component, count(*) as count FROM bug_reports GROUP BY component
    `;

    const bySeverity = await pg`
      SELECT severity, count(*) as count FROM bug_reports GROUP BY severity
    `;

    const byAssignee = await pg`
      SELECT assignee_handle as "assigneeHandle", count(*) as count
      FROM bug_reports WHERE assignee_handle IS NOT NULL
      GROUP BY assignee_handle ORDER BY count(*) DESC LIMIT 5
    `;

    const r = result[0] || {};
    return {
      total: Number(r.total || 0),
      open: Number(r.open || 0),
      inProgress: Number(r.inProgress || 0),
      resolved: Number(r.resolved || 0),
      closed: Number(r.closed || 0),
      avgPriority: r.avgPriority ? Number(r.avgPriority) : 0,
      byComponent: byComponent.map((x: any) => ({ component: x.component, count: Number(x.count) })),
      bySeverity: bySeverity.map((x: any) => ({ severity: x.severity, count: Number(x.count) })),
      byAssignee: byAssignee.map((x: any) => ({ assigneeHandle: x.assigneeHandle, count: Number(x.count) })),
    };
  }),

  // Create real GitHub issue via API
  createGithubIssue: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      if (!githubConfigured) {
        throw new Error(
          "GitHub not configured. Add GITHUB_PAT, GITHUB_REPO_OWNER, GITHUB_REPO_NAME to .env"
        );
      }

      const db = getDb();
      const bug = await db.query.bugReports.findFirst({
        where: eq(bugReports.id, input.id),
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

      const message = await db.query.messages.findFirst({
        where: eq(messages.id, bug.messageId),
      });
      const parsed = await db.query.parsedResults.findFirst({
        where: eq(parsedResults.id, bug.parsedResultId),
      });
      const repro = await db.query.reproductionSteps.findFirst({
        where: eq(reproductionSteps.bugReportId, input.id),
      });

      const body = buildGithubIssueBody({ bug, message, parsed, repro });
      const labels = ["bug", bug.severity.toLowerCase(), bug.component];

      const { number, url } = await createGitHubIssue({
        title: bug.title,
        body,
        labels,
      });

      // Persist the link back to DB
      await db
        .update(bugReports)
        .set({ githubIssueId: String(number), githubIssueUrl: url })
        .where(eq(bugReports.id, input.id));

      return { issueNumber: number, url, alreadyExists: false };
    }),

  // Generate GitHub issue body (preview — no API call)
  generateGithubBody: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const bug = await db.query.bugReports.findFirst({
        where: eq(bugReports.id, input.id),
      });
      if (!bug) return null;

      const message = await db.query.messages.findFirst({
        where: eq(messages.id, bug.messageId),
      });
      const parsed = await db.query.parsedResults.findFirst({
        where: eq(parsedResults.id, bug.parsedResultId),
      });
      const repro = await db.query.reproductionSteps.findFirst({
        where: eq(reproductionSteps.bugReportId, input.id),
      });

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
  updateStatus: publicQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["open", "in_progress", "resolved", "closed"]),
        resolvedAt: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const updateData: Record<string, unknown> = { status: input.status };
      if (input.status === "resolved" || input.status === "closed") {
        const bug = await db.query.bugReports.findFirst({ where: eq(bugReports.id, input.id) });
        if (bug) {
          const created = new Date(bug.createdAt).getTime();
          updateData.resolvedAt = new Date();
          updateData.resolutionTime = Math.round((Date.now() - created) / 3600000); // hours
        }
      }
      await db.update(bugReports).set(updateData).where(eq(bugReports.id, input.id));
      return { ok: true };
    }),

  // Assign bug to a team member
  assign: publicQuery
    .input(z.object({ id: z.number(), assigneeHandle: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(bugReports)
        .set({ assigneeHandle: input.assigneeHandle })
        .where(eq(bugReports.id, input.id));
      return { ok: true };
    }),

  // Sync GitHub issue state → auto-resolve bugs whose GH issue is closed
  syncGithubStatus: publicQuery
    .input(
      z.object({
        // Optional: sync a single bug; if omitted, syncs all bugs with linked GH issues
        bugId: z.number().optional(),
      }).optional()
    )
    .mutation(async ({ input }) => {
      if (!githubConfigured) {
        throw new Error("GitHub not configured. Set GITHUB_PAT, GITHUB_REPO_OWNER, GITHUB_REPO_NAME in .env");
      }

      const db = getDb();
      const conditions = [isNotNull(bugReports.githubIssueId)];
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
          }).where(eq(bugReports.id, bug.id));

          // Log to agent activities
          await db.insert(agentActivities).values({
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
          }).where(eq(bugReports.id, bug.id));
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
