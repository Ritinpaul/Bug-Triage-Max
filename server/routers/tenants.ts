import { createRouter, publicQuery, requireAuth } from "../middleware";
import { getDb } from "../queries/connection";
import { tenants, tenantMembers } from "../../db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const tenantRouter = createRouter({
  list: publicQuery.use(requireAuth).query(async ({ ctx }) => {
    const db = getDb();
    const memberships = await db.select().from(tenantMembers).where(eq(tenantMembers.userId, ctx.user!.id));
    
    if (memberships.length === 0) {
      return [];
    }
    
    const tenantIds = memberships.map(m => m.tenantId);
    const userTenants = await db.query.tenants.findMany({
      where: (tenants, { inArray }) => inArray(tenants.id, tenantIds)
    });
    
    return userTenants;
  }),

  getSubscriptionStatus: publicQuery.use(requireAuth).query(async ({ ctx }) => {
    const db = getDb();
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No tenant context" });
    }

    const { subscriptions, usageMetrics } = await import("../../db/schema");
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId)).limit(1);
    
    // Get usage for current month
    const currentMonth = new Date().toISOString().slice(0, 7);
    const [usage] = await db.select().from(usageMetrics)
      .where(
        (usageMetrics) => 
          eq(usageMetrics.tenantId, tenantId) && 
          eq(usageMetrics.month, currentMonth)
      )
      .limit(1);

    return {
      subscription: sub || { status: "free", plan: "free" },
      usage: usage || { bugsProcessedCount: 0, month: currentMonth }
    };
  }),

  createCheckoutSession: publicQuery.use(requireAuth).mutation(async ({ ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No tenant context" });
    }

    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

    // Get the base URL from the request or env (for local testing, use localhost:5173)
    const baseUrl = process.env.VITE_APP_URL || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "BugPulse Pro",
              description: "Unlimited bugs and AI agents",
            },
            unit_amount: 4900, // $49.00
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${baseUrl}/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/settings`,
      client_reference_id: tenantId.toString(),
    });

    if (!session.url) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create checkout session" });
    }

    return { url: session.url };
  }),
});
