import { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";

const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(limit: number, windowMs: number) {
  return async (c: Context, next: Next) => {
    // Get IP or some unique identifier
    const ip = c.req.header('x-forwarded-for') || 
               c.req.header('x-real-ip') || 
               'unknown';
    
    // Key by IP and path
    const key = `${ip}-${c.req.path}`;
    const now = Date.now();
    const record = requestCounts.get(key);

    if (record) {
      if (now > record.resetTime) {
        // Reset window
        requestCounts.set(key, { count: 1, resetTime: now + windowMs });
      } else {
        if (record.count >= limit) {
          throw new HTTPException(429, { message: "Too many requests. Please try again later." });
        }
        record.count++;
      }
    } else {
      requestCounts.set(key, { count: 1, resetTime: now + windowMs });
    }

    // Clean up old entries periodically to prevent memory leaks
    if (Math.random() < 0.01) {
      for (const [k, v] of requestCounts.entries()) {
        if (now > v.resetTime) {
          requestCounts.delete(k);
        }
      }
    }

    await next();
  };
}
