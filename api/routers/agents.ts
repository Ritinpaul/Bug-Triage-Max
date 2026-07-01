import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { agentActivities, messages } from "../../db/schema";
import { desc, eq, gte, sql } from "drizzle-orm";
import { processMessage } from "../services/agent-service";

export const agentRouter = createRouter({
  // Get recent agent activities
  activities: publicQuery
    .input(
      z
        .object({
          agent: z
            .enum(["parser", "triage", "reproduction", "release", "all"])
            .optional()
            .default("all"),
          limit: z.number().min(1).max(100).optional().default(20),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const opts = input || { agent: "all", limit: 20 };
      const where =
        opts.agent && opts.agent !== "all"
          ? eq(agentActivities.agentName, opts.agent)
          : undefined;

      const items = await db.query.agentActivities.findMany({
        where,
        orderBy: [desc(agentActivities.createdAt)],
        limit: opts.limit,
      });

      // Enrich with message preview
      const enriched = await Promise.all(
        items.map(async (activity) => {
          if (activity.targetId && activity.targetType === "message") {
            const msg = await db.query.messages.findFirst({
              where: eq(messages.id, Number(activity.targetId)),
            });
            return { ...activity, messagePreview: msg?.rawContent?.slice(0, 100) };
          }
          return activity;
        })
      );

      return enriched;
    }),

  // Get activity stats per agent
  stats: publicQuery.query(async () => {
    const db = getDb();
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const byAgent = await db
      .select({
        agentName: agentActivities.agentName,
        total: sql<number>`count(*)`,
        completed: sql<number>`sum(case when ${agentActivities.status} = 'completed' then 1 else 0 end)`,
        failed: sql<number>`sum(case when ${agentActivities.status} = 'failed' then 1 else 0 end)`,
        avgDuration: sql<number>`avg(${agentActivities.duration})`,
      })
      .from(agentActivities)
      .where(gte(agentActivities.createdAt, last24h))
      .groupBy(agentActivities.agentName);

    const recent = await db
      .select({
        agentName: agentActivities.agentName,
        status: agentActivities.status,
        createdAt: agentActivities.createdAt,
      })
      .from(agentActivities)
      .orderBy(desc(agentActivities.createdAt))
      .limit(10);

    return { byAgent, recent };
  }),

  // Manually trigger processing for a message
  triggerProcess: publicQuery
    .input(z.object({ messageId: z.number() }))
    .mutation(async ({ input }) => {
      const result = await processMessage(input.messageId);
      return result;
    }),

  // Get agent health/status
  health: publicQuery.query(async () => {
    const db = getDb();
    const last5min = new Date(Date.now() - 5 * 60 * 1000);

    const recentActivities = await db.query.agentActivities.findMany({
      where: gte(agentActivities.createdAt, last5min),
      orderBy: [desc(agentActivities.createdAt)],
      limit: 20,
    });

    const agents = ["parser", "triage", "reproduction", "release"] as const;
    const health = agents.map((agent) => {
      const agentActivities2 = recentActivities.filter(
        (a) => a.agentName === agent
      );
      const lastActivity = agentActivities2[0];
      const hasFailed = agentActivities2.some((a) => a.status === "failed");

      return {
        agent,
        status: hasFailed
          ? "error"
          : lastActivity
            ? lastActivity.status === "running"
              ? "running"
              : "online"
            : "idle",
        lastActivity: lastActivity?.createdAt || null,
        recentRuns: agentActivities2.length,
      };
    });

    return health;
  }),
});
