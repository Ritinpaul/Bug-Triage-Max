import { ErrorMessages } from "@contracts/constants";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimitMiddleware = (limit: number, windowMs: number) => t.middleware(async ({ ctx, next, path }) => {
  const ip = ctx.req.headers.get('x-forwarded-for') || ctx.req.headers.get('x-real-ip') || 'unknown';
  const key = `${ip}-${path}`;
  const now = Date.now();
  const record = requestCounts.get(key);

  if (record) {
    if (now > record.resetTime) {
      requestCounts.set(key, { count: 1, resetTime: now + windowMs });
    } else {
      if (record.count >= limit) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many requests. Please try again later.",
        });
      }
      record.count++;
    }
  } else {
    requestCounts.set(key, { count: 1, resetTime: now + windowMs });
  }

  if (Math.random() < 0.01) {
    for (const [k, v] of requestCounts.entries()) {
      if (now > v.resetTime) {
        requestCounts.delete(k);
      }
    }
  }

  return next();
});

export const createRouter = t.router;
export const publicQuery = t.procedure;
export const createCallerFactory = t.createCallerFactory;

const requireAuth = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: ErrorMessages.unauthenticated,
    });
  }

  return next({ ctx: { ...ctx, user: ctx.user } });
});

function requireRole(role: string) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== role) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: ErrorMessages.insufficientRole,
      });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}

export const authedQuery = t.procedure.use(requireAuth);
export const adminQuery = authedQuery.use(requireRole("admin"));
