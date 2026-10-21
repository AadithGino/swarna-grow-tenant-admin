import { describe, expect, it } from "vitest";
import { defaultStatementDateRange } from "@/src/lib/customer-digital-metals-statement-dates";

describe("defaultStatementDateRange", () => {
  it("does not hardcode October 2026 demo window", () => {
    const range = defaultStatementDateRange(new Date("2026-10-21T12:00:00Z"));
    expect(range.from).not.toBe("2026-10-01");
    expect(range.to).not.toBe("2026-10-18");
  });
});
