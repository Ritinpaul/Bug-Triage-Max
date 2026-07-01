/**
 * Email IMAP Polling Service
 * Polls an IMAP inbox every 60 seconds for new bug reports.
 * Uses built-in Node.js net/tls — no external IMAP library needed.
 * For production Gmail, use an App Password and enable IMAP.
 *
 * Environment variables required:
 *   EMAIL_IMAP_HOST     — e.g. imap.gmail.com
 *   EMAIL_IMAP_PORT     — e.g. 993
 *   EMAIL_IMAP_USER     — e.g. bugs@yourcompany.com
 *   EMAIL_IMAP_PASSWORD — App-specific password
 */

import * as tls from "tls";
import { getDb } from "../queries/connection";
import { messages } from "../../db/schema";
import { eq, and, gte } from "drizzle-orm";
import { processMessage } from "./agent-service";

const IMAP_HOST = process.env.EMAIL_IMAP_HOST ?? "";
const IMAP_PORT = parseInt(process.env.EMAIL_IMAP_PORT ?? "993", 10);
const IMAP_USER = process.env.EMAIL_IMAP_USER ?? "";
const IMAP_PASSWORD = process.env.EMAIL_IMAP_PASSWORD ?? "";

let pollerInterval: ReturnType<typeof setInterval> | null = null;

// ─── SHA-256 hash ─────────────────────────────────────────────────────
async function sha256Hex(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Simple IMAP client ───────────────────────────────────────────────
interface EmailMessage {
  subject: string;
  from: string;
  fromEmail: string;
  body: string;
  uid: string;
}

function imapCommand(
  socket: tls.TLSSocket,
  tag: string,
  command: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const timeout = setTimeout(() => reject(new Error("IMAP timeout")), 15000);

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString();
      // Command is complete when we get our tag back
      if (buffer.includes(`${tag} OK`) || buffer.includes(`${tag} NO`) || buffer.includes(`${tag} BAD`)) {
        clearTimeout(timeout);
        socket.removeListener("data", onData);
        resolve(buffer);
      }
    };

    socket.on("data", onData);
    socket.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    socket.write(`${tag} ${command}\r\n`);
  });
}

async function fetchUnseenEmails(): Promise<EmailMessage[]> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      { host: IMAP_HOST, port: IMAP_PORT, rejectUnauthorized: true },
      async () => {
        try {
          const emails: EmailMessage[] = [];
          let tag = 1;
          const t = () => `A${String(tag++).padStart(3, "0")}`;

          // Wait for server greeting
          await new Promise<void>((res) => {
            const onGreeting = () => {
              socket.removeListener("data", onGreeting);
              res();
            };
            socket.once("data", onGreeting);
          });

          // LOGIN
          await imapCommand(socket, t(), `LOGIN "${IMAP_USER}" "${IMAP_PASSWORD}"`);

          // SELECT INBOX
          await imapCommand(socket, t(), "SELECT INBOX");

          // SEARCH UNSEEN from last 1 day
          const searchRes = await imapCommand(socket, t(), "SEARCH UNSEEN SINCE " + getImapDate(1));

          // Parse UIDs
          const uidMatch = searchRes.match(/\* SEARCH([\d\s]*)/);
          const uids = uidMatch?.[1]
            ?.trim()
            .split(/\s+/)
            .filter(Boolean) ?? [];

          if (uids.length === 0) {
            await imapCommand(socket, t(), "LOGOUT");
            socket.destroy();
            resolve([]);
            return;
          }

          // Fetch headers + body for each UID (limit 20)
          const toFetch = uids.slice(-20).join(",");
          const fetchRes = await imapCommand(
            socket,
            t(),
            `FETCH ${toFetch} (BODY[TEXT] BODY[HEADER.FIELDS (FROM SUBJECT)])`
          );

          // Parse emails from FETCH response
          const emailBlocks = fetchRes.split(/\* \d+ FETCH/);
          for (const block of emailBlocks) {
            if (!block.trim()) continue;

            const subjectMatch = block.match(/Subject: ([^\r\n]+)/i);
            const fromMatch = block.match(/From: ([^\r\n]+)/i);
            const subject = subjectMatch?.[1]?.trim() ?? "(no subject)";
            const fromRaw = fromMatch?.[1]?.trim() ?? "unknown";

            // Extract email address from "Name <email>" format
            const emailAddrMatch = fromRaw.match(/<([^>]+)>/) || fromRaw.match(/[\w.+-]+@[\w.-]+\.\w+/);
            const fromEmail = Array.isArray(emailAddrMatch)
              ? (emailAddrMatch[1] || emailAddrMatch[0])
              : "unknown@email.com";
            const fromName = fromRaw.replace(/<[^>]+>/, "").trim().replace(/"/g, "") || fromEmail;

            // Extract body text (skip MIME headers)
            const bodyStart = block.indexOf("\r\n\r\n");
            let body = bodyStart > -1 ? block.slice(bodyStart + 4).trim() : "";
            // Remove MIME boundary markers and quoted reply text
            body = body
              .replace(/--[\w-]+/g, "")
              .replace(/Content-Type:[^\r\n]+/gi, "")
              .replace(/Content-Transfer-Encoding:[^\r\n]+/gi, "")
              .replace(/On .+wrote:/gs, "")
              .trim();

            if (body || subject) {
              const rawContent = body || subject;
              const uid = block.match(/UID (\d+)/)?.[1] ?? String(Date.now());
              emails.push({ subject, from: fromName, fromEmail, body: rawContent, uid });
            }
          }

          await imapCommand(socket, t(), "LOGOUT");
          socket.destroy();
          resolve(emails);
        } catch (err) {
          socket.destroy();
          reject(err);
        }
      }
    );

    socket.on("error", reject);
  });
}

function getImapDate(daysBack: number): string {
  const d = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

// ─── Poll and store ───────────────────────────────────────────────────
async function pollEmails() {
  if (!IMAP_HOST || !IMAP_USER || !IMAP_PASSWORD) {
    return; // Not configured
  }

  try {
    const emails = await fetchUnseenEmails();
    if (emails.length === 0) return;

    const db = getDb();
    for (const email of emails) {
      const rawContent = email.subject
        ? `Subject: ${email.subject}\n\n${email.body}`
        : email.body;

      if (!rawContent.trim()) continue;

      const contentHash = await sha256Hex(email.fromEmail + rawContent);
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

      // Deduplication check
      const existing = await db.query.messages.findFirst({
        where: and(
          eq(messages.contentHash, contentHash),
          gte(messages.createdAt, fiveMinAgo)
        ),
      });

      if (existing) continue;

      const [result] = await db.insert(messages).values({
        source: "email",
        rawContent,
        senderId: email.fromEmail,
        senderName: email.from,
        senderEmail: email.fromEmail,
        channel: email.subject,
        contentHash,
        status: "pending",
      }).returning({ id: messages.id });

      // Trigger pipeline asynchronously
      setTimeout(() => {
        processMessage(result.id).catch((err) =>
          console.error(`[EmailPoller] processMessage(${result.id}) failed:`, err)
        );
      }, 50);

      console.log(`[EmailPoller] Ingested email from ${email.fromEmail}: "${email.subject}"`);
    }
  } catch (err) {
    console.error("[EmailPoller] Poll failed:", err);
  }
}

// ─── Public API ───────────────────────────────────────────────────────
export function startEmailPoller(intervalMs = 60_000) {
  if (!IMAP_HOST || !IMAP_USER || !IMAP_PASSWORD) {
    console.log("[EmailPoller] Not started — EMAIL_IMAP_* env vars not set");
    return;
  }

  console.log(`[EmailPoller] Starting — polling ${IMAP_HOST} every ${intervalMs / 1000}s`);

  // Run immediately on startup
  pollEmails().catch(console.error);

  // Then poll on interval
  pollerInterval = setInterval(() => {
    pollEmails().catch(console.error);
  }, intervalMs);
}

export function stopEmailPoller() {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
    console.log("[EmailPoller] Stopped");
  }
}

export const emailPollerConfigured = !!(IMAP_HOST && IMAP_USER && IMAP_PASSWORD);
