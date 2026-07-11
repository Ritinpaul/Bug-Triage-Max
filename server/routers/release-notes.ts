/**
 * Release Notes tRPC Router
 *
 * Procedures:
 *   generate  — Generate changelog markdown from resolved bugs (last N days)
 *   save      — Persist a draft release note to DB
 *   publish   — Publish a saved note as GitHub draft release
 *   list      — List all saved release notes
 *   getById   — Get single release note with full body
 *   delete    — Delete a draft note
 */

import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { bugReports, releaseNotes } from "../../db/schema";
import { eq, gte, desc } from "drizzle-orm";
import {
  generateChangelog,
  publishToGitHub,
  suggestTagName,
  type ResolvedBugSummary,
} from "../services/release-note-service";

export const releaseNotesRouter = createRouter({
  // ── Generate changelog markdown from resolved bugs (last N days) ───────
  generate: publicQuery
    .input(
      z.object({
        days: z.number().int().min(1).max(365).default(7),
        tagName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

      // Fetch resolved bugs in the period
      const resolved = await db
        .select({
          id: bugReports.id,
          title: bugReports.title,
          component: bugReports.component,
          severity: bugReports.severity,
          resolvedAt: bugReports.resolvedAt,
          githubIssueId: bugReports.githubIssueId,
          githubIssueUrl: bugReports.githubIssueUrl,
        })
        .from(bugReports)
        .where(
          gte(bugReports.resolvedAt, since)
        )
        .orderBy(desc(bugReports.resolvedAt));

      // Suggest a tag name if not provided
      const existingNotes = await db
        .select({ tagName: releaseNotes.tagName })
        .from(releaseNotes);
      const existingTags = existingNotes.map((n) => n.tagName);
      const tagName = input.tagName || suggestTagName(existingTags);

      const bugs: ResolvedBugSummary[] = resolved.map((b) => ({
        id: b.id,
        title: b.title,
        component: b.component,
        severity: b.severity,
        resolvedAt: b.resolvedAt,
        githubIssueId: b.githubIssueId,
        githubIssueUrl: b.githubIssueUrl,
      }));

      const markdown = await generateChangelog(bugs, tagName, input.days);

      return {
        markdown,
        tagName,
        bugCount: bugs.length,
        days: input.days,
        bugs: bugs.map((b) => ({
          id: b.id,
          title: b.title,
          component: b.component,
          severity: b.severity,
        })),
      };
    }),

  // ── Save a draft release note ──────────────────────────────────────────
  save: publicQuery
    .input(
      z.object({
        tagName: z.string().min(1).max(100),
        name: z.string().min(1).max(500),
        body: z.string().min(1),
        daysRange: z.number().int().min(1).max(365).default(7),
        bugCount: z.number().int().min(0).default(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const [note] = await db
        .insert(releaseNotes)
        .values({
          tenantId: ctx.tenantId,
          tagName: input.tagName,
          name: input.name,
          body: input.body,
          status: "draft",
          daysRange: input.daysRange,
          bugCount: input.bugCount,
        })
        .returning();

      return note;
    }),

  // ── Publish a saved note as a GitHub draft release ─────────────────────
  publish: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();

      const note = await db.query.releaseNotes.findFirst({
        where: eq(releaseNotes.id, input.id),
      });

      if (!note) throw new Error("Release note not found");
      if (note.status === "published") {
        return { alreadyPublished: true, githubReleaseUrl: note.githubReleaseUrl };
      }

      const result = await publishToGitHub({
        tagName: note.tagName,
        name: note.name,
        body: note.body,
      });

      if (!result) {
        throw new Error(
          "GitHub release creation failed — check GITHUB_PAT, GITHUB_REPO_OWNER, GITHUB_REPO_NAME"
        );
      }

      await db
        .update(releaseNotes)
        .set({
          status: "published",
          githubReleaseId: String(result.id),
          githubReleaseUrl: result.url,
          updatedAt: new Date(),
        })
        .where(eq(releaseNotes.id, input.id));

      return { alreadyPublished: false, githubReleaseUrl: result.url };
    }),

  // ── List all release notes ─────────────────────────────────────────────
  list: publicQuery.query(async () => {
    const db = getDb();
    return db
      .select({
        id: releaseNotes.id,
        tagName: releaseNotes.tagName,
        name: releaseNotes.name,
        status: releaseNotes.status,
        bugCount: releaseNotes.bugCount,
        daysRange: releaseNotes.daysRange,
        githubReleaseUrl: releaseNotes.githubReleaseUrl,
        createdAt: releaseNotes.createdAt,
      })
      .from(releaseNotes)
      .orderBy(desc(releaseNotes.createdAt));
  }),

  // ── Get single note with full body ─────────────────────────────────────
  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.query.releaseNotes.findFirst({
        where: eq(releaseNotes.id, input.id),
      });
    }),

  // ── Delete a draft note ────────────────────────────────────────────────
  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const note = await db.query.releaseNotes.findFirst({
        where: eq(releaseNotes.id, input.id),
      });
      if (!note) throw new Error("Release note not found");
      if (note.status === "published") {
        throw new Error("Cannot delete a published release note");
      }
      await db.delete(releaseNotes).where(eq(releaseNotes.id, input.id));
      return { deleted: true };
    }),
});
