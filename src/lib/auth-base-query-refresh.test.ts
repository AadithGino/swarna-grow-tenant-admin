import { describe, expect, it } from "vitest";
import { shouldForceAuthLogout } from "./auth-base-query-refresh";

describe("shouldForceAuthLogout", () => {
  it("signs out on hard 401 without refresh attempt", () => {
    expect(shouldForceAuthLogout("tenant", false)).toBe(true);
  });

  it("signs out when refresh was attempted but failed", () => {
    expect(shouldForceAuthLogout("tenant", true)).toBe(true);
  });
});
