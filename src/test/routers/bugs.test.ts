import { describe, expect, it } from "vitest";
import { createCaller, createMockContext } from "../utils";
import { getTestDb } from "../setup";
import { bugReports, messages, parsedResults } from "@db/schema";

describe("bugs router", () => {
  it("list should return bugs with correct filters", async () => {
    const db = getTestDb();
    
    // Create a dummy message
    const [msg] = await db.insert(messages).values({
      tenantId: 1,
      source: "slack",
      rawContent: "Test bug",
      senderId: "U123",
      status: "triaged",
    }).returning();
    
    // Create parsed result
    const [parsed] = await db.insert(parsedResults).values({
      tenantId: 1,
      messageId: msg.id,
      intent: "bug_report",
      intentConfidence: 0.9,
      component: "auth",
      componentConfidence: 0.9,
      severityLabel: "P1",
      severityScore: 9,
      overallConfidence: 0.9,
    }).returning();
    
    // Create a bug report
    await db.insert(bugReports).values({
      tenantId: 1,
      messageId: msg.id,
      parsedResultId: parsed.id,
      title: "Test Bug Title",
      description: "Test description",
      source: "slack",
      component: "auth",
      severity: "P1",
      priorityScore: 85,
      status: "open",
      assigneeHandle: "@alice",
    });

    const caller = createCaller(createMockContext(undefined));
    
    // 1. Fetch all
    const all = await caller.bugs.list();
    expect(all.total).toBe(1);
    expect(all.items[0].title).toBe("Test Bug Title");
    
    // 2. Fetch by assignee
    const filtered = await caller.bugs.list({ assignee: "@alice" });
    expect(filtered.total).toBe(1);
    
    // 3. Fetch by assignee (not found)
    const empty = await caller.bugs.list({ assignee: "@bob" });
    expect(empty.total).toBe(0);
    
    // 4. Fetch by component
    const comp = await caller.bugs.list({ component: "auth" });
    expect(comp.total).toBe(1);
  });
});
