import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { teamMembers } from "../../db/schema";
import { eq, desc } from "drizzle-orm";

export const teamRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    const items = await db.query.teamMembers.findMany({
      orderBy: [desc(teamMembers.createdAt)],
    });
    return items;
  }),

  getByHandle: publicQuery
    .input(z.object({ handle: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.query.teamMembers.findFirst({
        where: eq(teamMembers.handle, input.handle),
      });
    }),

  create: publicQuery
    .input(
      z.object({
        name: z.string().min(1),
        handle: z.string().min(1),
        email: z.string().email().optional(),
        expertise: z.array(z.string()).optional(),
        isOnCall: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [result] = await db.insert(teamMembers).values({
        name: input.name,
        handle: input.handle,
        email: input.email,
        expertise: input.expertise,
        isOnCall: input.isOnCall ? 1 : 0,
      }).returning({ id: teamMembers.id });
      return { id: result.id };
    }),

  update: publicQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        handle: z.string().optional(),
        email: z.string().email().optional(),
        expertise: z.array(z.string()).optional(),
        isOnCall: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...updates } = input;
      await db
        .update(teamMembers)
        .set({
          ...updates,
          isOnCall: updates.isOnCall !== undefined ? (updates.isOnCall ? 1 : 0) : undefined,
        })
        .where(eq(teamMembers.id, id));
      return { success: true };
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(teamMembers).where(eq(teamMembers.id, input.id));
      return { success: true };
    }),
});
