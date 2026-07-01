import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { messages, parsedResults, bugReports } from "../../db/schema";
import { eq, desc, and, sql, gte } from "drizzle-orm";
import { processMessage } from "../services/agent-service";

export const messageRouter = createRouter({
  // List messages with optional filtering
  list: publicQuery
    .input(
      z.object({
        source: z.enum(["slack", "email", "form", "all"]).optional().default("all"),
        status: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const opts = input || { source: "all", limit: 50, offset: 0 };
      const conditions = [];

      if (opts.source && opts.source !== "all") {
        conditions.push(eq(messages.source, opts.source));
      }
      if (opts.status) {
        conditions.push(eq(messages.status, opts.status as "pending" | "parsed" | "triaged" | "reproduced" | "resolved"));
      }
      if (opts.search) {
        conditions.push(sql`${messages.rawContent} LIKE ${`%${opts.search}%`}`);
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db.query.messages.findMany({
        where,
        orderBy: [desc(messages.createdAt)],
        limit: opts.limit,
        offset: opts.offset,
      });

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(where);
      const total = countResult[0]?.count || 0;

      return { items, total };
    }),

  // Get single message with related data
  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const message = await db.query.messages.findFirst({
        where: eq(messages.id, input.id),
      });
      if (!message) return null;

      const parsed = await db.query.parsedResults.findFirst({
        where: eq(parsedResults.messageId, input.id),
      });

      const bug = await db.query.bugReports.findFirst({
        where: eq(bugReports.messageId, input.id),
      });

      return { message, parsed, bug };
    }),

  // Create new message (simulates webhook ingestion)
  create: publicQuery
    .input(
      z.object({
        source: z.enum(["slack", "email", "form"]),
        rawContent: z.string().min(1),
        senderId: z.string(),
        senderName: z.string().optional(),
        senderEmail: z.string().optional(),
        channel: z.string().optional(),
        attachments: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const contentHash = await hashContent(input.senderId + input.rawContent);

      // Check for duplicates within 5 min window
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      const existing = await db.query.messages.findFirst({
        where: and(
          eq(messages.contentHash, contentHash),
          gte(messages.createdAt, fiveMinAgo)
        ),
      });

      if (existing) {
        return { id: existing.id, duplicate: true };
      }

      const [result] = await db.insert(messages).values({
        source: input.source,
        rawContent: input.rawContent,
        senderId: input.senderId,
        senderName: input.senderName,
        senderEmail: input.senderEmail,
        channel: input.channel,
        contentHash,
        attachments: input.attachments,
      }).returning({ id: messages.id });

      // Auto-trigger pipeline in background
      setTimeout(() => {
        processMessage(result.id).catch(console.error);
      }, 100);

      return { id: result.id, duplicate: false };
    }),

  // Stats for dashboard
  stats: publicQuery.query(async () => {
    const db = getDb();
    const result = await db
      .select({
        total: sql<number>`count(*)`,
        pending: sql<number>`sum(case when ${messages.status} = 'pending' then 1 else 0 end)`,
        parsed: sql<number>`sum(case when ${messages.status} = 'parsed' then 1 else 0 end)`,
        triaged: sql<number>`sum(case when ${messages.status} = 'triaged' then 1 else 0 end)`,
        resolved: sql<number>`sum(case when ${messages.status} = 'resolved' then 1 else 0 end)`,
      })
      .from(messages);

    const bySource = await db
      .select({
        source: messages.source,
        count: sql<number>`count(*)`,
      })
      .from(messages)
      .groupBy(messages.source);

    return { ...result[0], bySource };
  }),

  // Recent messages stream (for real-time dashboard)
  recent: publicQuery
    .input(z.object({
      limit: z.number().optional().default(20),
      source: z.enum(["slack", "email", "form", "all"]).optional().default("all"),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const limit = input?.limit || 20;
      const source = input?.source ?? "all";

      const conditions = source !== "all"
        ? [eq(messages.source, source)]
        : [];
      const where = conditions.length > 0 ? conditions[0] : undefined;

      const items = await db.query.messages.findMany({
        where,
        orderBy: [desc(messages.createdAt)],
        limit,
      });

      // Enrich with parsed data
      const enriched = await Promise.all(
        items.map(async (msg) => {
          const parsed = await db.query.parsedResults.findFirst({
            where: eq(parsedResults.messageId, msg.id),
          });
          const bug = await db.query.bugReports.findFirst({
            where: eq(bugReports.messageId, msg.id),
          });
          return { ...msg, parsed, bug };
        })
      );

      return enriched;
    }),
});

async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
