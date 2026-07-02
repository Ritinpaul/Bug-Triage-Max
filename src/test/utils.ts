import { appRouter } from "../../server/router";
import { createCallerFactory } from "../../server/middleware";
import type { TrpcContext } from "../../server/context";
import { users } from "@db/schema";
import { getTestDb } from "./setup";

export const createCaller = createCallerFactory(appRouter);

export async function createMockUser(overrides?: Partial<typeof users.$inferInsert>) {
  const db = getTestDb();
  const [user] = await db.insert(users).values({
    unionId: "test_union_id_" + Math.random().toString(36).substring(7),
    email: "test@example.com",
    role: "user",
    passwordHash: "hash",
    ...overrides,
  }).returning();
  return user;
}

export function createMockContext(user?: typeof users.$inferSelect): TrpcContext {
  return {
    req: new Request("http://localhost"),
    resHeaders: new Headers(),
    user,
  };
}
