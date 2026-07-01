import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import {
  bugReports,
  reproductionSteps,
  similarBugMatches,
  messages,
  parsedResults,
  teamMembers,
  agentActivities,
} from "../../db/schema";
import { eq, desc, and, sql, isNotNull } from "drizzle-orm";
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
      const db = getDb();
      const opts = input || { status: "all" as const, severity: "all" as const, limit: 50, offset: 0 };
      const conditions = [];

      if (opts.status && opts.status !== "all") {
        conditions.push(eq(bugReports.status, opts.status));
      }
      if ("component" in opts && opts.component) {
        conditions.push(eq(bugReports.component, opts.component));
      }
      if ("severity" in opts && opts.severity && opts.severity !== "all") {
        conditions.push(eq(bugReports.severity, opts.severity));
      }
      if ("assignee" in opts && opts.assignee) {
        conditions.push(eq(bugReports.assigneeHandle, opts.assignee));
      }
      if ("search" in opts && opts.search) {
        conditions.push(sql`${bugReports.title} LIKE ${`%${opts.search}%`}`);
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db.query.bugReports.findMany({
        where,
        orderBy: [desc(bugReports.priorityScore), desc(bugReports.createdAt)],
        limit: opts.limit,
        offset: opts.offset,
      });

      // Enrich with relations
      const enriched = await Promise.all(
        items.map(async (bug) => {
          const repro = await db.query.reproductionSteps.findFirst({
            where: eq(reproductionSteps.bugReportId, bug.id),
          });
          const similar = await db.query.similarBugMatches.findMany({
            where: eq(similarBugMatches.bugReportId, bug.id),
            orderBy: [desc(similarBugMatches.similarityScore)],
            limit: 3,
          });
          return { ...bug, reproduction: repro, similarBugs: similar };
        })
      );

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(bugReports)
        .where(where);
      const total = countResult[0]?.count || 0;

      return { items: enriched, total };
    }),

  // Get single bug with full details
  getById: publicQuery
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

      const similar = await db.query.similarBugMatches.findMany({
        where: eq(similarBugMatches.bugReportId, input.id),
        orderBy: [desc(similarBugMatches.similarityScore)],
        limit: 5,
      });

      // Enrich similar bugs with titles
      const similarEnriched = await Promise.all(
        similar.map(async (s) => {
          const similarBug = await db.query.bugReports.findFirst({
            where: eq(bugReports.id, s.similarBugId),
          });
          return { ...s, bugTitle: similarBug?.title || `#${s.similarBugId}` };
        })
      );

      const assignee = bug.assigneeId
        ? await db.query.teamMembers.findFirst({
            where: eq(teamMembers.id, bug.assigneeId),
          })
        : null;

      return {
        bug,
        message,
        parsed,
        reproduction: repro,
        similarBugs: similarEnriched,
        assignee,
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
    const db = getDb();
    const result = await db
      .select({
        total: sql<number>`count(*)`,
        open: sql<number>`sum(case when ${bugReports.status} = 'open' then 1 else 0 end)`,
        inProgress: sql<number>`sum(case when ${bugReports.status} = 'in_progress' then 1 else 0 end)`,
        resolved: sql<number>`sum(case when ${bugReports.status} = 'resolved' then 1 else 0 end)`,
        closed: sql<number>`sum(case when ${bugReports.status} = 'closed' then 1 else 0 end)`,
        avgPriority: sql<number>`avg(${bugReports.priorityScore})`,
      })
      .from(bugReports);

    const byComponent = await db
      .select({
        component: bugReports.component,
        count: sql<number>`count(*)`,
      })
      .from(bugReports)
      .groupBy(bugReports.component);

    const bySeverity = await db
      .select({
        severity: bugReports.severity,
        count: sql<number>`count(*)`,
      })
      .from(bugReports)
      .groupBy(bugReports.severity);

    const byAssignee = await db
      .select({
        assigneeHandle: bugReports.assigneeHandle,
        count: sql<number>`count(*)`,
      })
      .from(bugReports)
      .where(sql`${bugReports.assigneeHandle} is not null`)
      .groupBy(bugReports.assigneeHandle)
      .orderBy(sql`count(*) desc`)
      .limit(5);

    return {
      ...result[0],
      byComponent,
      bySeverity,
      byAssignee,
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
