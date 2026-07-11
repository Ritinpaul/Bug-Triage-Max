import { eq, sql } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { usageMetrics, subscriptions } from "../../db/schema";
import { format } from "date-fns";

/**
 * Ensures a usage metric row exists for the current month.
 */
export async function getOrCreateUsageMetric(tenantId: number, date = new Date()) {
  const db = getDb();
  const monthStr = format(date, "yyyy-MM");

  let metric = await db.query.usageMetrics.findFirst({
    where: (usage, { and, eq }) => and(eq(usage.tenantId, tenantId), eq(usage.month, monthStr))
  });

  if (!metric) {
    const [inserted] = await db.insert(usageMetrics)
      .values({ tenantId, month: monthStr, bugsProcessedCount: 0 })
      .returning();
    metric = inserted;
  }

  return metric;
}

/**
 * Checks if the tenant has exceeded their billing limit for the month.
 * Pro users have unlimited (or high limit), free users are limited to 50 bugs/month.
 */
export async function checkUsageLimit(tenantId: number): Promise<boolean> {
  const db = getDb();
  
  const sub = await db.query.subscriptions.findFirst({
    where: (s, { eq }) => eq(s.tenantId, tenantId)
  });

  // If they have an active Pro plan, no limits
  if (sub && sub.plan === "pro" && sub.status === "active") {
    return true; // within limit
  }

  // Otherwise, free tier limit is 50 bugs per month
  const metric = await getOrCreateUsageMetric(tenantId);
  if (metric.bugsProcessedCount >= 50) {
    return false; // over limit
  }

  return true;
}

/**
 * Increments the processed bug count for the month.
 */
export async function incrementUsage(tenantId: number) {
  const db = getDb();
  const monthStr = format(new Date(), "yyyy-MM");

  await db.update(usageMetrics)
    .set({
      bugsProcessedCount: sql`${usageMetrics.bugsProcessedCount} + 1`,
      updatedAt: new Date()
    })
    .where(
      sql`${usageMetrics.tenantId} = ${tenantId} AND ${usageMetrics.month} = ${monthStr}`
    );
}
