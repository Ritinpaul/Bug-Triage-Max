import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { streamSSE } from "hono/streaming";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { createOAuthCallbackHandler } from "./kimi/auth";
import { Paths } from "@contracts/constants";
import { createWebhookRouter } from "./services/webhook-handlers";
import { systemEvents } from "./services/events";
import { authenticateRequest } from "./kimi/auth";
import { getDb } from "./queries/connection";
import { bugReports } from "../db/schema";

const app = new Hono<{ Bindings: HttpBindings }>();

// ── Initialize Background Queue ───────────────────────────────────────
import { initQueue } from "./services/queue";
await initQueue().catch(err => {
  console.error("Failed to initialize queue:", err);
});

// ── Webhook routes (registered BEFORE tRPC catch-all) ────────────────
const webhookRouter = createWebhookRouter();
app.route("/", webhookRouter);

// ── OAuth callback ────────────────────────────────────────────────────
app.get(Paths.oauthCallback, createOAuthCallbackHandler());

// ── CSV Bug Export ────────────────────────────────────────────────────
app.get("/api/export/bugs.csv", async (c) => {
  try {
    const user = await authenticateRequest(c.req.raw.headers);
    if (!user) {
      return c.text("Unauthorized", 401);
    }
  } catch {
    return c.text("Unauthorized", 401);
  }

  const db = getDb();
  const bugs = await db.select().from(bugReports);
  
  // Format as CSV
  const header = ["ID", "Title", "Status", "Severity", "Component", "Created At"].join(",");
  const rows = bugs.map(b => {
    return [
      b.id,
      `"${b.title.replace(/"/g, '""')}"`,
      b.status,
      b.severity,
      b.component,
      b.createdAt.toISOString()
    ].join(",");
  });
  
  const csvData = [header, ...rows].join("\n");
  
  return c.text(csvData, 200, {
    "Content-Type": "text/csv",
    "Content-Disposition": 'attachment; filename="bugpulse-export.csv"'
  });
});

// ── SSE Real-time Events ──────────────────────────────────────────────
app.get("/api/events", (c) => {
  return streamSSE(c, async (stream) => {
    const handler = () => {
      stream.writeSSE({ data: "update", event: "update" }).catch(() => {});
    };
    systemEvents.on("update", handler);
    
    // Send initial ping to establish connection
    await stream.writeSSE({ data: "connected", event: "ping" });
    
    // Keep alive interval
    const interval = setInterval(() => {
      stream.writeSSE({ data: "ping", event: "ping" }).catch(() => {});
    }, 15000);
    
    stream.onAbort(() => {
      systemEvents.off("update", handler);
      clearInterval(interval);
    });
    
    // Hono streaming requires a long-running promise to keep connection open
    await new Promise(() => {});
  });
});

// ── tRPC API ──────────────────────────────────────────────────────────
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
