import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { bugReports, messages, agentActivities } from "../../db/schema";
import { gte, sql } from "drizzle-orm";

export const analyticsRouter = createRouter({
  // Dashboard overview stats
  overview: publicQuery.query(async () => {
    const db = getDb();
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Message stats
    const messageStats = await db
      .select({
        total24h: sql<number>`count(*)`,
        bySource: messages.source,
      })
      .from(messages)
      .where(gte(messages.createdAt, last24h))
      .groupBy(messages.source);

    // Bug stats
    const bugStats = await db
      .select({
        total: sql<number>`count(*)`,
        open: sql<number>`sum(case when ${bugReports.status} = 'open' then 1 else 0 end)`,
        inProgress: sql<number>`sum(case when ${bugReports.status} = 'in_progress' then 1 else 0 end)`,
        resolved7d: sql<number>`sum(case when ${bugReports.status} in ('resolved', 'closed') and ${bugReports.updatedAt} >= ${last7d} then 1 else 0 end)`,
        avgResolution: sql<number>`avg(case when ${bugReports.resolutionTime} is not null then ${bugReports.resolutionTime} end)`,
      })
      .from(bugReports);

    // Component breakdown
    const byComponent = await db
      .select({
        component: bugReports.component,
        count: sql<number>`count(*)`,
        open: sql<number>`sum(case when ${bugReports.status} in ('open', 'in_progress') then 1 else 0 end)`,
      })
      .from(bugReports)
      .groupBy(bugReports.component)
      .orderBy(sql`count(*) desc`);

    // Severity distribution
    const bySeverity = await db
      .select({
        severity: bugReports.severity,
        count: sql<number>`count(*)`,
      })
      .from(bugReports)
      .groupBy(bugReports.severity)
      .orderBy(bugReports.severity);

    // Agent activity (24h)
    const agentStats = await db
      .select({
        agentName: agentActivities.agentName,
        runs: sql<number>`count(*)`,
        avgDuration: sql<number>`avg(${agentActivities.duration})`,
        successRate: sql<number>`sum(case when ${agentActivities.status} = 'completed' then 1 else 0 end) * 100.0 / count(*)`,
      })
      .from(agentActivities)
      .where(gte(agentActivities.createdAt, last24h))
      .groupBy(agentActivities.agentName);

    // Trend data (last 7 days)
    const dailyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayMessages = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(
          sql`${messages.createdAt} >= ${dayStart} and ${messages.createdAt} <= ${dayEnd}`
        );

      const dayBugs = await db
        .select({ count: sql<number>`count(*)` })
        .from(bugReports)
        .where(
          sql`${bugReports.createdAt} >= ${dayStart} and ${bugReports.createdAt} <= ${dayEnd}`
        );

      dailyTrend.push({
        date: dayStart.toISOString().split("T")[0],
        messages: dayMessages[0]?.count || 0,
        bugs: dayBugs[0]?.count || 0,
      });
    }

    return {
      messages: {
        total24h: messageStats.reduce((s, m) => s + m.total24h, 0),
        bySource: messageStats,
      },
      bugs: {
        ...bugStats[0],
        byComponent,
        bySeverity,
      },
      agents: agentStats,
      dailyTrend,
    };
  }),

  // Time-series data for charts
  timeSeries: publicQuery
    .input(
      z
        .object({
          days: z.number().min(1).max(90).optional().default(7),
          metric: z
            .enum(["messages", "bugs", "resolutions"])
            .optional()
            .default("bugs"),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const opts = input || { days: 7, metric: "bugs" };
      const startDate = new Date(
        Date.now() - opts.days * 24 * 60 * 60 * 1000
      );

      if (opts.metric === "messages") {
        const result = await db
          .select({
            date: sql<string>`date(${messages.createdAt})`,
            count: sql<number>`count(*)`,
          })
          .from(messages)
          .where(gte(messages.createdAt, startDate))
          .groupBy(sql`date(${messages.createdAt})`)
          .orderBy(sql`date(${messages.createdAt})`);
        return result;
      }

      const result = await db
        .select({
          date: sql<string>`date(${bugReports.createdAt})`,
          count: sql<number>`count(*)`,
        })
        .from(bugReports)
        .where(gte(bugReports.createdAt, startDate))
        .groupBy(sql`date(${bugReports.createdAt})`)
        .orderBy(sql`date(${bugReports.createdAt})`);

      return result;
    }),

  // Performance metrics
  performance: publicQuery.query(async () => {
    const db = getDb();
    const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const avgParseTime = await db
      .select({
        avg: sql<number>`avg(case when ${agentActivities.agentName} = 'parser' then ${agentActivities.duration} end)`,
      })
      .from(agentActivities)
      .where(gte(agentActivities.createdAt, last7d));

    const avgTriageTime = await db
      .select({
        avg: sql<number>`avg(case when ${agentActivities.agentName} = 'triage' then ${agentActivities.duration} end)`,
      })
      .from(agentActivities)
      .where(gte(agentActivities.createdAt, last7d));

    const avgReproTime = await db
      .select({
        avg: sql<number>`avg(case when ${agentActivities.agentName} = 'reproduction' then ${agentActivities.duration} end)`,
      })
      .from(agentActivities)
      .where(gte(agentActivities.createdAt, last7d));

    const pipelineStats = await db
      .select({
        total: sql<number>`count(*)`,
        completed: sql<number>`sum(case when ${agentActivities.status} = 'completed' then 1 else 0 end)`,
        failed: sql<number>`sum(case when ${agentActivities.status} = 'failed' then 1 else 0 end)`,
      })
      .from(agentActivities)
      .where(gte(agentActivities.createdAt, last7d));

    return {
      avgParseTime: Math.round(avgParseTime[0]?.avg || 0),
      avgTriageTime: Math.round(avgTriageTime[0]?.avg || 0),
      avgReproTime: Math.round(avgReproTime[0]?.avg || 0),
      pipeline: pipelineStats[0],
    };
  }),
});
