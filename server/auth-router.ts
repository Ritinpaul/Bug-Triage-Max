import * as cookie from "cookie";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./lib/cookies";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { signSessionToken } from "./kimi/session";
import { env } from "./lib/env";
import { upsertUser } from "./queries/users";
import { getDb } from "./queries/connection";
import { messages } from "../db/schema";
import { processMessage } from "./services/agent-service";
import crypto from "crypto";

export const authRouter = createRouter({
  me: authedQuery.query((opts) => opts.ctx.user),
  logout: authedQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    return { success: true };
  }),
  guestLogin: publicQuery.mutation(async ({ ctx }) => {
    // 1. Create a guest user
    const guestId = `guest-${crypto.randomUUID()}`;
    await upsertUser({
      unionId: guestId,
      name: "Guest Explorer",
      avatar: "",
      lastSignInAt: new Date(),
    });

    // 2. Sign session token
    const token = await signSessionToken({
      unionId: guestId,
      clientId: env.appId,
    });

    // 3. Set cookie
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, token, {
        ...opts,
        maxAge: Session.maxAgeMs / 1000,
      } as any),
    );

    // 4. Simulate some dummy bugs for the dashboard (like earlier dummy mode)
    const db = getDb();
    const dummyMessages = [
      {
        source: "slack" as const,
        rawContent: "Hey, the payment page is crashing when I try to submit my card. Urgent!",
        senderId: guestId,
        senderName: "Demo User 1",
        channel: "support-urgent",
      },
      {
        source: "email" as const,
        rawContent: "I can't seem to reset my password. The link says expired.",
        senderId: guestId,
        senderName: "Demo User 2",
      },
      {
        source: "form" as const,
        rawContent: "The dashboard graph doesn't load on mobile Safari.",
        senderId: guestId,
        senderName: "Demo User 3",
      },
    ];

    for (const msg of dummyMessages) {
      const hashData = new TextEncoder().encode(msg.senderId + msg.rawContent);
      const hashBuffer = await crypto.webcrypto.subtle.digest("SHA-256", hashData);
      const contentHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
      
      const [result] = await db.insert(messages).values({
        ...msg,
        contentHash,
      }).returning({ id: messages.id });
      
      // trigger agent in background
      setTimeout(() => {
        processMessage(result.id).catch(console.error);
      }, 200);
    }

    return { success: true };
  }),
});
