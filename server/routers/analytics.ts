import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { gte, sql } from "drizzle-orm";
import { getDb, getPg } from "../queries/connection";
import { agentActivities, messages, bugReports } from "../../db/schema";

export const analyticsRouter = createRouter({
  // Dashboard overview stats
  overview: publicQuery.query(async () => {
    const pg = getPg();
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Message stats
    const messageStats = await pg`
      SELECT count(*) as total24h, source as "bySource"
      FROM messages
      WHERE created_at >= ${last24h.toISOString()}
      GROUP BY source
    `;

    // Bug stats
    const bugStatsRows = await pg`
      SELECT
        count(*) as total,
        sum(case when status = 'open' then 1 else 0 end) as open,
        sum(case when status = 'in_progress' then 1 else 0 end) as "inProgress",
        sum(case when status in ('resolved', 'closed') and updated_at >= ${last7d.toISOString()} then 1 else 0 end) as "resolved7d",
        avg(case when resolution_time is not null then resolution_time end) as "avgResolution"
      FROM bug_reports
    `;
    const bugStats = bugStatsRows[0] || { total: 0, open: 0, inProgress: 0, resolved7d: 0, avgResolution: null };

    // Component breakdown
    const byComponent = await pg`
      SELECT
        component,
        count(*) as count,
        sum(case when status in ('open', 'in_progress') then 1 else 0 end) as open
      FROM bug_reports
      GROUP BY component
      ORDER BY count(*) desc
    `;

    // Severity distribution
    const bySeverity = await pg`
      SELECT severity, count(*) as count
      FROM bug_reports
      GROUP BY severity
      ORDER BY severity
    `;

    // Agent activity (24h)
    const agentStats = await pg`
      SELECT
        agent_name as "agentName",
        count(*) as runs,
        avg(duration) as "avgDuration",
        sum(case when status = 'completed' then 1 else 0 end) * 100.0 / count(*) as "successRate"
      FROM agent_activities
      WHERE created_at >= ${last24h.toISOString()}
      GROUP BY agent_name
    `;

    // Trend data (last 7 days) using messages.timestamp
    const dailyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayMessages = await pg`
        SELECT count(*) as count FROM messages
        WHERE timestamp >= ${dayStart.toISOString()} AND timestamp <= ${dayEnd.toISOString()}
      `;

      const dayBugs = await pg`
        SELECT count(*) as count FROM bug_reports
        WHERE created_at >= ${dayStart.toISOString()} AND created_at <= ${dayEnd.toISOString()}
      `;

      dailyTrend.push({
        date: dayStart.toISOString().split("T")[0],
        messages: Number(dayMessages[0]?.count || 0),
        bugs: Number(dayBugs[0]?.count || 0),
      });
    }

    return {
      messages: {
        total24h: messageStats.reduce((s: number, m: any) => s + Number(m.total24h), 0),
        bySource: messageStats.map((m: any) => ({ total24h: Number(m.total24h), bySource: m.bySource })),
      },
      bugs: {
        total: Number(bugStats.total),
        open: Number(bugStats.open),
        inProgress: Number(bugStats.inProgress),
        resolved7d: Number(bugStats.resolved7d),
        avgResolution: bugStats.avgResolution ? Number(bugStats.avgResolution) : null,
        byComponent: byComponent.map((r: any) => ({ component: r.component, count: Number(r.count), open: Number(r.open) })),
        bySeverity: bySeverity.map((r: any) => ({ severity: r.severity, count: Number(r.count) })),
      },
      agents: agentStats.map((r: any) => ({
        agentName: r.agentName,
        runs: Number(r.runs),
        avgDuration: r.avgDuration ? Number(r.avgDuration) : 0,
        successRate: r.successRate ? Number(r.successRate) : 0,
      })),
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
