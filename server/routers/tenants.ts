import { createRouter, publicQuery, requireAuth } from "../middleware";
import { getDb } from "../queries/connection";
import { tenants, tenantMembers } from "../../db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

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

  createRazorpayOrder: publicQuery.use(requireAuth).mutation(async ({ ctx }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No tenant context" });
    }

    const Razorpay = (await import("razorpay")).default;
    const instance = new Razorpay({
      key_id: process.env.VITE_RAZORPAY_KEY_ID ?? "",
      key_secret: process.env.RAZORPAY_KEY_SECRET ?? "",
    });

    const amount = 490000; // 4900 INR = $49 (rough estimate, 100 paise = 1 INR)

    try {
      const order = await instance.orders.create({
        amount,
        currency: "INR",
        receipt: `receipt_tenant_${tenantId}`,
      });

      return {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
      };
    } catch (err: any) {
      console.error("Razorpay order creation failed:", err);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create Razorpay order" });
    }
  }),

  verifyRazorpayPayment: publicQuery.use(requireAuth).input(z.object({
    razorpay_order_id: z.string(),
    razorpay_payment_id: z.string(),
    razorpay_signature: z.string()
  })).mutation(async ({ ctx, input }) => {
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No tenant context" });
    }

    const crypto = await import("crypto");
    const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
    
    const body = input.razorpay_order_id + "|" + input.razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== input.razorpay_signature) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid signature" });
    }

    // Payment successful! Update database
    const db = getDb();
    const { subscriptions } = await import("../../db/schema");
    
    await db.insert(subscriptions).values({
      tenantId,
      razorpayPaymentId: input.razorpay_payment_id,
      razorpayOrderId: input.razorpay_order_id,
      status: "active",
      plan: "pro",
    }).onConflictDoUpdate({
      target: subscriptions.tenantId,
      set: {
        razorpayPaymentId: input.razorpay_payment_id,
        razorpayOrderId: input.razorpay_order_id,
        status: "active",
        plan: "pro",
      }
    });

    return { success: true };
  }),
});
