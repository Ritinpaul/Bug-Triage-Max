import { PgBoss } from "pg-boss";
import { processMessage } from "./agent-service";
import { getDb } from "../queries/connection";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForBoss = globalThis as unknown as { boss: any };
const boss = globalForBoss.boss;

export async function initQueue() {
  if (globalForBoss.boss) {
    console.log("[Queue] pg-boss already initialized, skipping");
    return;
  }

  if (process.env.VERCEL) {
    console.log("[Queue] Skipping pg-boss initialization on Vercel");
    return;
  }

  const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Cannot start pg-boss: missing database connection string.");
  }

  globalForBoss.boss = new PgBoss(connectionString);

  globalForBoss.boss.on("error", (error: any) => console.error("pg-boss error:", error));

  await globalForBoss.boss.start();

  console.log("pg-boss started successfully");

  // Register the worker to process messages
  await globalForBoss.boss.createQueue("process-message");
  await globalForBoss.boss.work("process-message", async (job: any) => {
    const { messageId } = job.data as { messageId: number };
    console.log(`[Queue] Processing message ${messageId} (job ${job.id})`);
    try {
      await processMessage(messageId);
      console.log(`[Queue] Finished processing message ${messageId}`);
    } catch (error) {
      console.error(`[Queue] Failed to process message ${messageId}:`, error);
      throw error;
    }
  });
}

export async function enqueueMessageProcessing(messageId: number) {
  if (process.env.VERCEL) {
    console.log(`[Queue] Processing message ${messageId} inline on Vercel`);
    // Process async but don't await so the webhook can return immediately (Note: Vercel might kill it early if no waitUntil is used, but for now we try this)
    processMessage(messageId).catch(err => console.error(err));
    return "inline";
  }

  if (!globalForBoss.boss) {
    throw new Error("pg-boss is not initialized");
  }
  
  const jobId = await globalForBoss.boss.send("process-message", { messageId }, {
    retryLimit: 5,
    retryDelay: 60, // 1 minute
  });
  
  console.log(`[Queue] Enqueued message ${messageId} for processing, jobId: ${jobId}`);
  return jobId;
}
