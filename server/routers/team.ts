import { z } from "zod";
import { createRouter, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { teamMembers } from "../../db/schema";
import { eq, desc } from "drizzle-orm";

export const teamRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const items = await db.select().from(teamMembers).where(eq(teamMembers.tenantId, ctx.tenantId)).orderBy(desc(teamMembers.createdAt));
    return items;
  }),

  getByHandle: authedQuery
    .input(z.object({ handle: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      return db.query.teamMembers.findFirst({
        where: (teamMembers, { and, eq }) => 
          and(eq(teamMembers.handle, input.handle), eq(teamMembers.tenantId, ctx.tenantId)),
      });
    }),

  create: authedQuery
    .input(
      z.object({
        name: z.string().min(1),
        handle: z.string().min(1),
        email: z.string().email().optional(),
        expertise: z.array(z.string()).optional(),
        isOnCall: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [result] = await db.insert(teamMembers).values({
        tenantId: ctx.tenantId,
        name: input.name,
        handle: input.handle,
        email: input.email,
        expertise: input.expertise,
        isOnCall: input.isOnCall ? 1 : 0,
      }).returning({ id: teamMembers.id });
      return { id: result.id };
    }),

  update: authedQuery
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
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...updates } = input;
      await db
        .update(teamMembers)
        .set({
          ...updates,
          isOnCall: updates.isOnCall !== undefined ? (updates.isOnCall ? 1 : 0) : undefined,
        })
        .where((teamMembers, { and, eq }) => 
          and(eq(teamMembers.id, id), eq(teamMembers.tenantId, ctx.tenantId))
        );
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.delete(teamMembers).where(
        (teamMembers, { and, eq }) => and(eq(teamMembers.id, input.id), eq(teamMembers.tenantId, ctx.tenantId))
      );
      return { success: true };
    }),
});
