/**
 * Webhook Handlers — Slack Events API + Form submissions
 * These are Hono HTTP routes (not tRPC) for raw webhook ingestion.
 * Registered directly in api/boot.ts before the tRPC handler.
 */

import { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { getDb } from "../queries/connection";
import { messages } from "../../db/schema";
import { eq, and, gte } from "drizzle-orm";
import { processMessage } from "../services/agent-service";
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
  source: "slack" | "email" | "form";
  rawContent: string;
  senderId: string;
  senderName?: string;
  senderEmail?: string;
  channel?: string;
}) {
  const db = getDb();
  const contentHash = await sha256Hex(payload.senderId + payload.rawContent);

  const [result] = await db.insert(messages).values({
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

  // Fire-and-forget: don't block the webhook response
  setTimeout(() => {
    processMessage(result.id).catch((err) =>
      console.error(`[Webhook] processMessage(${result.id}) failed:`, err)
    );
  }, 50);

  return result.id;
}

// ─── Webhook Router ───────────────────────────────────────────────────
export function createWebhookRouter() {
  const webhook = new Hono<{ Bindings: HttpBindings }>();

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

        if (text.trim().length > 0) {
          const dup = await isDuplicate(userId, text);
          if (!dup) {
            await insertAndProcess({
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
      source: "form",
      rawContent,
      senderId,
      senderName,
      senderEmail,
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
    });
  });

  return webhook;
}
