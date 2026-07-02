import { describe, expect, it } from "vitest";
import { createCaller, createMockContext, createMockUser } from "../utils";

describe("auth router", () => {
  it("me should return null when unauthenticated", async () => {
    const caller = createCaller(createMockContext(undefined));
    await expect(caller.auth.me()).rejects.toThrow("Authentication required");
  });

  it("me should return user when authenticated", async () => {
    const user = await createMockUser();
    const caller = createCaller(createMockContext(user));
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result.id).toBe(user.id);
    expect(result.email).toBe(user.email);
  });

  it("login should reject invalid credentials", async () => {
    const caller = createCaller(createMockContext(undefined));
    await expect(
      caller.auth.login({ email: "notfound@example.com", password: "wrong" })
    ).rejects.toThrow("Invalid email or password");
  });
});
