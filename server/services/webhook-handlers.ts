/**
 * Webhook Handlers — Slack Events API + Form submissions
 * These are Hono HTTP routes (not tRPC) for raw webhook ingestion.
 * Registered directly in api/boot.ts before the tRPC handler.
 */

import { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { getDb } from "../queries/connection";
import { messages, tenants } from "../../db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { enqueueMessageProcessing } from "../services/queue";
import { systemEvents } from "./events";

const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET ?? "";
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN ?? "";

// ─── Hash helpers ─────────────────────────────────────────────────────
async function sha256Hex(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const msgData = encoder.encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  const hashArray = Array.from(new Uint8Array(sig));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Slack signature verification ─────────────────────────────────────
async function verifySlackSignature(
  body: string,
  timestamp: string,
  signature: string
): Promise<boolean> {
  if (!SLACK_SIGNING_SECRET) return true; // skip in dev

  // Replay attack guard: reject requests older than 5 minutes
  const tsNumber = parseInt(timestamp, 10);
  if (Math.abs(Date.now() / 1000 - tsNumber) > 300) return false;

  const baseString = `v0:${timestamp}:${body}`;
  const myHash = await hmacSha256Hex(SLACK_SIGNING_SECRET, baseString);
  const mySignature = `v0=${myHash}`;
  return mySignature === signature;
}

// ─── Deduplication helper ─────────────────────────────────────────────
async function isDuplicate(senderId: string, rawContent: string): Promise<boolean> {
  const db = getDb();
  const contentHash = await sha256Hex(senderId + rawContent);
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const existing = await db.query.messages.findFirst({
    where: and(
      eq(messages.contentHash, contentHash),
      gte(messages.createdAt, fiveMinAgo)
    ),
  });
  return !!existing;
}

async function insertAndProcess(payload: {
  tenantId: number;
  source: "slack" | "email" | "form";
  rawContent: string;
  senderId: string;
  senderName?: string;
  senderEmail?: string;
  channel?: string;
}) {
  const db = getDb();
  const { subscriptions, usageMetrics } = await import("../../db/schema");
  
  // 1. Check Usage Limits
  const currentMonth = new Date().toISOString().slice(0, 7);
  let limit = 50; // Free tier limit
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, payload.tenantId)).limit(1);
  if (sub && sub.status === "active") {
    limit = 10000; // Pro tier limit
  }

  const [usage] = await db.select().from(usageMetrics).where(
    and(eq(usageMetrics.tenantId, payload.tenantId), eq(usageMetrics.month, currentMonth))
  ).limit(1);

  if (usage && usage.bugsProcessedCount >= limit) {
    console.warn(`[Limits] Tenant ${payload.tenantId} exceeded bug limit (${limit}) for month ${currentMonth}. Dropping message.`);
    return -1; // Or throw error
  }

  // Increment usage
  await db.insert(usageMetrics).values({
    tenantId: payload.tenantId,
    month: currentMonth,
    bugsProcessedCount: 1,
  }).onConflictDoUpdate({
    target: [usageMetrics.tenantId, usageMetrics.month],
    set: {
      bugsProcessedCount: sql`${usageMetrics.bugsProcessedCount} + 1`
    }
  });

  const contentHash = await sha256Hex(payload.senderId + payload.rawContent);

  const [result] = await db.insert(messages).values({
    tenantId: payload.tenantId,
    source: payload.source,
    rawContent: payload.rawContent,
    senderId: payload.senderId,
    senderName: payload.senderName,
    senderEmail: payload.senderEmail,
    channel: payload.channel,
    contentHash,
    status: "pending",
  }).returning({ id: messages.id });

  systemEvents.emit("update");

  // Enqueue job in pg-boss
  try {
    await enqueueMessageProcessing(result.id);
  } catch (err) {
    console.error(`[Webhook] Failed to enqueue message ${result.id}:`, err);
  }

  return result.id;
}

// ─── Webhook Router ───────────────────────────────────────────────────
export function createWebhookRouter() {
  const webhook = new Hono<{ Bindings: HttpBindings }>();

  // ─── Mailgun Webhook ────────────────────────────────────────────────
  webhook.post("/api/webhooks/mailgun", async (c) => {
    let formData: Record<string, string | File> = {};
    try {
      formData = await c.req.parseBody();
    } catch {
      return c.json({ error: "Invalid form data" }, 400);
    }
    
    // Mailgun signature verification
    const timestamp = (formData.timestamp as string) ?? "";
    const token = (formData.token as string) ?? "";
    const signature = (formData.signature as string) ?? "";
    
    const MAILGUN_SIGNING_KEY = process.env.MAILGUN_SIGNING_KEY;
    if (MAILGUN_SIGNING_KEY) {
      const crypto = await import("crypto");
      const hash = crypto
        .createHmac("sha256", MAILGUN_SIGNING_KEY)
        .update(timestamp + token)
        .digest("hex");
      if (hash !== signature) {
        return c.json({ error: "Invalid signature" }, 403);
      }
    }

    const recipient = (formData.recipient as string) || "";
    const sender = (formData.sender as string) || (formData.from as string) || "mailgun_user";
    const subject = (formData.subject as string) || "No Subject";
    const bodyPlain = (formData['body-plain'] as string) || "";
    
    const prefix = recipient.split("@")[0];
    const db = getDb();
    
    let tenantId = 1;
    if (prefix) {
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.inboundEmailPrefix, prefix)
      });
      if (tenant) {
        tenantId = tenant.id;
      } else {
        console.warn(`[Mailgun Webhook] No tenant found for inbound prefix: ${prefix}`);
      }
    }

    const rawContent = `Subject: ${subject}\n\n${bodyPlain}`;
    
    if (rawContent.trim().length > 0) {
      const dup = await isDuplicate(sender, rawContent);
      if (!dup) {
        await insertAndProcess({
          tenantId,
          source: "email",
          rawContent,
          senderId: sender,
          senderEmail: sender,
        });
      }
    }
    
    return c.json({ ok: true });
  });

  // ─── Stripe Webhook ──────────────────────────────────────────────────
  webhook.post("/api/webhooks/stripe", async (c) => {
    const signature = c.req.header("stripe-signature");
    if (!signature) {
      return c.json({ error: "No signature" }, 400);
    }

    const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
    if (!STRIPE_WEBHOOK_SECRET) {
      return c.json({ error: "Webhook secret not configured" }, 500);
    }

    const bodyText = await c.req.text();
    let event;
    try {
      const { default: Stripe } = await import("stripe");
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
      event = stripe.webhooks.constructEvent(bodyText, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return c.json({ error: "Invalid signature" }, 400);
    }

    const db = getDb();
    const { subscriptions, tenants } = await import("../../db/schema");

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const tenantIdStr = session.client_reference_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (tenantIdStr) {
          const tenantId = parseInt(tenantIdStr, 10);
          await db.update(tenants)
            .set({ stripeCustomerId: customerId })
            .where(eq(tenants.id, tenantId));
            
          await db.insert(subscriptions).values({
            tenantId,
            stripeSubscriptionId: subscriptionId,
            status: "active",
            plan: "pro"
          }).onConflictDoUpdate({
            target: subscriptions.tenantId,
            set: {
              stripeSubscriptionId: subscriptionId,
              status: "active",
              plan: "pro"
            }
          });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await db.update(subscriptions)
          .set({ status: subscription.status })
          .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
        break;
      }
    }

    return c.json({ received: true });
  });

  // ── Slack Events API ────────────────────────────────────────────────
  webhook.post("/api/webhooks/slack", async (c) => {
    const bodyText = await c.req.text();
    const timestamp = c.req.header("X-Slack-Request-Timestamp") ?? "";
    const slackSig = c.req.header("X-Slack-Signature") ?? "";

    // Signature verification (skip if SLACK_SIGNING_SECRET not set)
    if (SLACK_SIGNING_SECRET) {
      const valid = await verifySlackSignature(bodyText, timestamp, slackSig);
      if (!valid) {
        return c.json({ error: "Invalid signature" }, 403);
      }
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(bodyText) as Record<string, unknown>;
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }

    // 1. URL Verification challenge (required when first configuring Slack App)
    if (body.type === "url_verification") {
      return c.json({ challenge: body.challenge });
    }

    // 2. Event callback
    if (body.type === "event_callback") {
      const event = body.event as Record<string, unknown> | undefined;
      const eventType = event?.type as string | undefined;

      // Only handle message events; ignore bot messages to prevent loops
      if (
        event &&
        (eventType === "message" || eventType === "message.channels" || eventType === "message.im") &&
        !event.bot_id &&
        event.subtype !== "bot_message"
      ) {
        const text = (event.text as string | undefined) ?? "";
        const userId = (event.user as string | undefined) ?? "slack_user";
        const channel = (event.channel as string | undefined) ?? "";
        const username = (event.username as string | undefined) ?? userId;

        let tenantId = 1; // Default fallback for development
        if (body.team_id) {
          const db = getDb();
          const tenant = await db.query.tenants.findFirst({
            where: eq(tenants.slackTeamId, body.team_id as string)
          });
          if (tenant) {
            tenantId = tenant.id;
          }
        }

        if (text.trim().length > 0) {
          const dup = await isDuplicate(userId, text);
          if (!dup) {
            await insertAndProcess({
              tenantId,
              source: "slack",
              rawContent: text,
              senderId: userId,
              senderName: username,
              channel,
            });
          }
        }
      }

      // Slack requires 200 within 3 seconds
      return c.json({ ok: true });
    }

    return c.json({ ok: true });
  });

  // ── Form Webhook (Typeform / Google Forms / Generic) ─────────────────
  webhook.post("/api/webhooks/form", async (c) => {
    let body: Record<string, unknown>;
    try {
      body = await c.req.json<Record<string, unknown>>();
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }

    // Support multiple form formats
    let rawContent = "";
    let senderId = "form_user";
    let senderName: string | undefined;
    let senderEmail: string | undefined;

    // Typeform format
    if (body.form_response) {
      const formResponse = body.form_response as Record<string, unknown>;
      const answers = formResponse.answers as Array<Record<string, unknown>> | undefined;
      const hidden = formResponse.hidden as Record<string, string> | undefined;

      const textAnswers = answers
        ?.map((a) => {
          if (a.type === "text" || a.type === "long_text") return a.text as string;
          if (a.type === "short_text") return a.short_text as string;
          if (a.type === "choice") return (a.choice as Record<string, string>)?.label;
          return null;
        })
        .filter(Boolean)
        .join("\n");

      rawContent = textAnswers || JSON.stringify(formResponse);
      senderId = hidden?.email || hidden?.user_id || "typeform_user";
      senderEmail = hidden?.email;
      senderName = hidden?.name;
    }
    // Google Forms / generic format: { email, name, message/description/body }
    else if (body.message || body.description || body.body) {
      rawContent =
        (body.message as string) ||
        (body.description as string) ||
        (body.body as string) ||
        "";
      senderId = (body.email as string) || (body.user_id as string) || "form_user";
      senderEmail = body.email as string | undefined;
      senderName = body.name as string | undefined;
    }
    // Generic fallback: use stringified body
    else {
      rawContent = JSON.stringify(body);
      senderId = "form_webhook";
    }

    if (!rawContent.trim()) {
      return c.json({ error: "No content found in form payload" }, 400);
    }

    const dup = await isDuplicate(senderId, rawContent);
    if (dup) {
      return c.json({ ok: true, duplicate: true });
    }

    const id = await insertAndProcess({
      tenantId: 1, // Generic forms fall back to default tenant 1 unless authenticated
      source: "form",
      rawContent,
      senderId,
      senderName,
      senderEmail,
    });

    return c.json({ ok: true, messageId: id });
  });

  // ── Sentry Webhook ───────────────────────────────────────────────────
  webhook.post("/api/webhooks/sentry", async (c) => {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }
    
    // Sentry issues webhooks usually have data.issue
    const issue = body?.data?.issue;
    if (!issue) {
      return c.json({ error: "No issue data found in payload" }, 400);
    }
    
    const title = issue.title || "Sentry Issue";
    const value = issue.metadata?.value || "";
    const rawContent = `[SENTRY] ${title}\n\n${value}\n\nURL: ${issue.permalink || ""}`;
    const senderId = issue.id || "sentry_bot";
    
    const dup = await isDuplicate(senderId, rawContent);
    if (dup) return c.json({ ok: true, duplicate: true });
    
    const id = await insertAndProcess({
      tenantId: 1, // Sentry integration defaults to tenant 1 until per-tenant routing is wired up
      source: "form", // using 'form' as generic webhook source since we don't have 'sentry' in schema yet
      rawContent,
      senderId,
      senderName: "Sentry Integration",
    });
    
    return c.json({ ok: true, messageId: id });
  });

  // ── GitHub Webhook ───────────────────────────────────────────────────
  webhook.post("/api/webhooks/github", async (c) => {
    const event = c.req.header("X-GitHub-Event");
    if (event !== "issues") {
      return c.json({ ok: true, ignored: true, reason: "Not an issues event" });
    }
    
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }
    
    if (body.action !== "opened") {
      return c.json({ ok: true, ignored: true, reason: "Issue not opened" });
    }
    
    const issue = body.issue;
    if (!issue) {
      return c.json({ error: "No issue data found" }, 400);
    }
    
    const title = issue.title;
    const desc = issue.body || "";
    const rawContent = `[GITHUB] ${title}\n\n${desc}\n\nURL: ${issue.html_url}`;
    const senderId = `github_${issue.id}`;
    
    const dup = await isDuplicate(senderId, rawContent);
    if (dup) return c.json({ ok: true, duplicate: true });
    
    const id = await insertAndProcess({
      tenantId: 1, // GitHub integration defaults to tenant 1 until per-tenant routing is wired up
      source: "form", // mapping to 'form' as generic integration
      rawContent,
      senderId,
      senderName: body.sender?.login || "GitHub Integration",
    });
    
    return c.json({ ok: true, messageId: id });
  });

  // ── Health check for webhooks ────────────────────────────────────────
  webhook.get("/api/webhooks/health", (c) => {
    return c.json({
      ok: true,
      slack: {
        configured: !!SLACK_SIGNING_SECRET && !!SLACK_BOT_TOKEN,
        endpoint: "/api/webhooks/slack",
      },
      form: { endpoint: "/api/webhooks/form" },
      email: { polling: !!process.env.EMAIL_IMAP_HOST },
      sentry: { endpoint: "/api/webhooks/sentry" },
      github: { endpoint: "/api/webhooks/github" },
    });
  });

  return webhook;
}
