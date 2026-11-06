import { describe, it, expect, beforeEach, vi } from "vitest";
import { login, currentSession, logout } from "../auth.js";

// Mock the db module so tests are deterministic
vi.mock("../db.js", () => {
  const hashPassword = async (pw) =>
    pw === "stem123" ? "hash_stem123" : "hash_other";
  return {
    hashPassword,
    get: vi.fn(async (_store, username) => {
      if (username === "facilitator")
        return { username: "facilitator", passwordHash: "hash_stem123",
                 displayName: "Demo Facilitator", role: "facilitator" };
      return undefined;
    }),
  };
});

beforeEach(() => sessionStorage.clear());

describe("login", () => {
  it("rejects unknown username", async () => {
    const r = await login("nobody", "x");
    expect(r.ok).toBe(false);
  });
  it("rejects wrong password", async () => {
    const r = await login("facilitator", "wrong");
    expect(r.ok).toBe(false);
  });
  it("accepts correct credentials and creates a session", async () => {
    const r = await login("facilitator", "stem123");
    expect(r.ok).toBe(true);
    expect(currentSession().username).toBe("facilitator");
    logout();
    expect(currentSession()).toBeNull();
  });
});
