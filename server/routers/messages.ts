import { z } from "zod";
import { createHash } from "node:crypto";
import { createRouter, publicQuery } from "../middleware";
import { getPg } from "../queries/connection";
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
      const pg = getPg();
      const opts = input || { source: "all", limit: 50, offset: 0 };

      const conditions: string[] = [];
      const params: unknown[] = [];
      let p = 1;

      if (opts.source && opts.source !== "all") {
        conditions.push(`source = $${p++}`);
        params.push(opts.source);
      }
      if (opts.status) {
        conditions.push(`status = $${p++}`);
        params.push(opts.status);
      }
      if (opts.search) {
        conditions.push(`raw_content ILIKE $${p++}`);
        params.push(`%${opts.search}%`);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const limit = opts.limit ?? 50;
      const offset = opts.offset ?? 0;

      const items = await pg.unsafe(`
        SELECT * FROM messages ${where}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `, params as any[]);

      const countRows = await pg.unsafe(`SELECT count(*) as total FROM messages ${where}`, params as any[]);
      const total = Number(countRows[0]?.total || 0);

      return {
        items: items.map((m: any) => ({
          id: m.id, source: m.source, rawContent: m.raw_content,
          senderId: m.sender_id, senderName: m.sender_name, senderEmail: m.sender_email,
          channel: m.channel, status: m.status, contentHash: m.content_hash,
          attachments: m.attachments, createdAt: m.created_at, timestamp: m.timestamp,
        })),
        total,
      };
    }),

  // Get single message with related data
  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const pg = getPg();
      const msgs = await pg`SELECT * FROM messages WHERE id = ${input.id} LIMIT 1`;
      if (!msgs[0]) return null;
      const m = msgs[0];

      const parsed = await pg`SELECT * FROM parsed_results WHERE message_id = ${input.id} LIMIT 1`;
      const bug = await pg`SELECT * FROM bug_reports WHERE message_id = ${input.id} LIMIT 1`;

      return {
        message: { id: m.id, source: m.source, rawContent: m.raw_content, senderId: m.sender_id, senderName: m.sender_name, senderEmail: m.sender_email, channel: m.channel, status: m.status, createdAt: m.created_at },
        parsed: parsed[0] || null,
        bug: bug[0] ? { id: bug[0].id, title: bug[0].title, severity: bug[0].severity, status: bug[0].status, assigneeHandle: bug[0].assignee_handle, component: bug[0].component, priorityScore: Number(bug[0].priority_score) } : null,
      };
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
      const pg = getPg();
      const contentHash = await hashContent(input.senderId + input.rawContent);

      // Check for duplicates within 5 min window
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      const existing = await pg`
        SELECT id FROM messages WHERE content_hash = ${contentHash} AND created_at >= ${fiveMinAgo.toISOString()} LIMIT 1
      `;

      if (existing[0]) {
        return { id: existing[0].id, duplicate: true };
      }

      const result = await pg`
        INSERT INTO messages (source, raw_content, sender_id, sender_name, sender_email, channel, content_hash)
        VALUES (${input.source}, ${input.rawContent}, ${input.senderId}, ${input.senderName ?? null}, ${input.senderEmail ?? null}, ${input.channel ?? null}, ${contentHash})
        RETURNING id
      `;

      const id = result[0].id;

      // Auto-trigger pipeline in background
      setTimeout(() => {
        processMessage(id).catch(console.error);
      }, 100);

      return { id, duplicate: false };
    }),

  // Stats for dashboard
  stats: publicQuery.query(async () => {
    const pg = getPg();
    const result = await pg`
      SELECT
        count(*) as total,
        sum(case when status = 'pending' then 1 else 0 end) as pending,
        sum(case when status = 'parsed' then 1 else 0 end) as parsed,
        sum(case when status = 'triaged' then 1 else 0 end) as triaged,
        sum(case when status = 'resolved' then 1 else 0 end) as resolved
      FROM messages
    `;
    const bySource = await pg`
      SELECT source, count(*) as count FROM messages GROUP BY source
    `;
    const r = result[0] || {};
    return {
      total: Number(r.total || 0),
      pending: Number(r.pending || 0),
      parsed: Number(r.parsed || 0),
      triaged: Number(r.triaged || 0),
      resolved: Number(r.resolved || 0),
      bySource: bySource.map((s: any) => ({ source: s.source, count: Number(s.count) })),
    };
  }),

  // Recent messages stream (for real-time dashboard)
  recent: publicQuery
    .input(z.object({
      limit: z.number().optional().default(20),
      source: z.enum(["slack", "email", "form", "all"]).optional().default("all"),
    }).optional())
    .query(async ({ input }) => {
      const pg = getPg();
      const limit = input?.limit || 20;
      const source = input?.source ?? "all";

      const items = source !== "all"
        ? await pg`SELECT * FROM messages WHERE source = ${source} ORDER BY created_at DESC LIMIT ${limit}`
        : await pg`SELECT * FROM messages ORDER BY created_at DESC LIMIT ${limit}`;

      const messageIds = items.map((m: any) => m.id);
      let parsedByMessageId: Record<number, any> = {};
      let bugByMessageId: Record<number, any> = {};

      if (messageIds.length > 0) {
        const parsed = await pg`SELECT * FROM parsed_results WHERE message_id IN ${pg(messageIds)}`;
        parsed.forEach((p: any) => {
          parsedByMessageId[p.message_id] = p;
        });

        const bugs = await pg`SELECT * FROM bug_reports WHERE message_id IN ${pg(messageIds)}`;
        bugs.forEach((b: any) => {
          bugByMessageId[b.message_id] = b;
        });
      }

      // Enrich with parsed data and bug
      const enriched = items.map((m: any) => {
        const parsed = parsedByMessageId[m.id];
        const bug = bugByMessageId[m.id];
        return {
          id: m.id, source: m.source, rawContent: m.raw_content,
          senderId: m.sender_id, senderName: m.sender_name, senderEmail: m.sender_email,
          channel: m.channel, status: m.status, createdAt: m.created_at,
          parsed: parsed ? { ...parsed, overallConfidence: Number(parsed.overall_confidence) } : null,
          bug: bug ? {
            id: bug.id, title: bug.title, severity: bug.severity,
            status: bug.status, assigneeHandle: bug.assignee_handle,
            component: bug.component, priorityScore: Number(bug.priority_score),
          } : null,
        };
      });

      return enriched;
    }),
});

async function hashContent(content: string): Promise<string> {
  return createHash("sha256").update(content).digest("hex");
}

