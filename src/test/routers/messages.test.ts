import { describe, expect, it } from "vitest";
import { createCaller, createMockContext } from "../utils";
import { getTestDb } from "../setup";
import { messages } from "@db/schema";
import crypto from "crypto";

describe("messages router", () => {
  it("list should return messages and filter by source", async () => {
    const db = getTestDb();
    
    // Seed messages
    await db.insert(messages).values([
      { source: "slack", rawContent: "Hello", senderId: "1", status: "pending", contentHash: crypto.randomUUID() },
      { source: "email", rawContent: "World", senderId: "2", status: "parsed", contentHash: crypto.randomUUID() },
    ]);

    const caller = createCaller(createMockContext(undefined));
    
    // 1. Fetch all
    const all = await caller.messages.list();
    expect(all.total).toBe(2);
    
    // 2. Filter by source
    const slack = await caller.messages.list({ source: "slack" });
    expect(slack.total).toBe(1);
    expect(slack.items[0].source).toBe("slack");
  });
  
  it("create should simulate webhook ingestion", async () => {
    const caller = createCaller(createMockContext(undefined));
    
    const res = await caller.messages.create({
      source: "form",
      rawContent: "Webhook test",
      senderId: "form123"
    });
    
    expect(res.id).toBeGreaterThan(0);
    expect(res.duplicate).toBe(false);
  });
});
