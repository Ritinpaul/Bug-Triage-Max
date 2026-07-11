import PgBoss from "pg-boss";
import { processMessage } from "./agent-service";
import { getDb } from "../queries/connection";

let boss: PgBoss | null = null;

export async function initQueue() {
  const connectionString = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Cannot start pg-boss: missing database connection string.");
  }

  boss = new PgBoss(connectionString);

  boss.on("error", (error) => console.error("pg-boss error:", error));

  await boss.start();

  console.log("pg-boss started successfully");

  // Register the worker to process messages
  await boss.work("process-message", async (job) => {
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
  if (!boss) {
    throw new Error("pg-boss is not initialized");
  }
  
  const jobId = await boss.send("process-message", { messageId }, {
    retryLimit: 5,
    retryDelay: 60, // 1 minute
  });
  
  console.log(`[Queue] Enqueued message ${messageId} for processing, jobId: ${jobId}`);
  return jobId;
}
