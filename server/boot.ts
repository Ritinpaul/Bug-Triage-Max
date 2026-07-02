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
import { startEmailPoller } from "./services/email-service";
import { systemEvents } from "./services/events";

const app = new Hono<{ Bindings: HttpBindings }>();

// ── Webhook routes (registered BEFORE tRPC catch-all) ────────────────
const webhookRouter = createWebhookRouter();
app.route("/", webhookRouter);

// ── OAuth callback ────────────────────────────────────────────────────
app.get(Paths.oauthCallback, createOAuthCallbackHandler());

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

  // Start email poller (only runs if EMAIL_IMAP_* env vars are set)
  startEmailPoller(60_000);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

// Also start email poller in dev mode if configured
if (!env.isProduction && process.env.EMAIL_IMAP_HOST) {
  startEmailPoller(60_000);
}
