import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { authenticateRequest } from "./kimi/auth";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
  tenantId?: number;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };
  try {
    ctx.user = await authenticateRequest(opts.req.headers);
  } catch {
    // Authentication is optional here
  }
  
  const tenantHeader = opts.req.headers.get("x-tenant-id");
  if (tenantHeader) {
    ctx.tenantId = parseInt(tenantHeader, 10);
  } else if (ctx.user && ctx.user.defaultTenantId) {
    ctx.tenantId = ctx.user.defaultTenantId;
  }
  
  return ctx;
}
