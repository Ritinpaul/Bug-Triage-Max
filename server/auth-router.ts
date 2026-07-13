import * as cookie from "cookie";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./lib/cookies";
import { createRouter, authedQuery, publicQuery, rateLimitMiddleware, requireAuth } from "./middleware";
import { signSessionToken } from "./kimi/session";
import { env } from "./lib/env";
import { upsertUser } from "./queries/users";
import { getDb } from "./queries/connection";
import { messages, users, tenants, tenantMembers } from "../db/schema";
import { processMessage } from "./services/agent-service";
import crypto from "crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const authRouter = createRouter({
  me: publicQuery.use(requireAuth).query((opts) => opts.ctx.user),
  logout: publicQuery.use(requireAuth).mutation(async ({ ctx }) => {
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
  guestLogin: publicQuery.use(rateLimitMiddleware(5, 15 * 60 * 1000)).mutation(async ({ ctx }) => {
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
        tenantId: 1, // Guest demo uses tenant 1
        contentHash,
      }).returning({ id: messages.id });
      
      // trigger agent in background
      setTimeout(() => {
        processMessage(result.id).catch(console.error);
      }, 200);
    }

    return { success: true };
  }),
  register: publicQuery.use(rateLimitMiddleware(5, 15 * 60 * 1000)).input(z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  })).mutation(async ({ input, ctx }) => {
    const db = getDb();
    const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
    if (existing.length > 0) {
      throw new TRPCError({ code: "CONFLICT", message: "Email already in use" });
    }
    
    const passwordHash = await bcrypt.hash(input.password, 10);
    const unionId = `user-${crypto.randomUUID()}`;
    
    const userResult = await upsertUser({
      unionId,
      name: input.name,
      email: input.email,
      passwordHash,
      lastSignInAt: new Date(),
    });
    
    // Create a default tenant for the new user
    const tenantName = `${input.name}'s Workspace`;
    const tenantSlug = tenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + crypto.randomUUID().slice(0, 6);
    const [tenant] = await db.insert(tenants).values({
      name: tenantName,
      slug: tenantSlug,
    }).returning({ id: tenants.id });

    // Assign user as owner of the new tenant
    await db.insert(tenantMembers).values({
      tenantId: tenant.id,
      userId: userResult.id,
      role: "admin"
    });
    
    const token = await signSessionToken({ unionId, clientId: env.appId });
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, token, {
        ...opts,
        maxAge: Session.maxAgeMs / 1000,
      } as any),
    );
    return { success: true };
  }),
  login: publicQuery.use(rateLimitMiddleware(10, 15 * 60 * 1000)).input(z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(1, "Password is required"),
  })).mutation(async ({ input, ctx }) => {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
    if (!user || !user.passwordHash) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
    }
    
    const isValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValid) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
    }
    
    const token = await signSessionToken({ unionId: user.unionId, clientId: env.appId });
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, token, {
        ...opts,
        maxAge: Session.maxAgeMs / 1000,
      } as any),
    );
    return { success: true };
  }),
});
