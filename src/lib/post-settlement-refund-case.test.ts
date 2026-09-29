import { describe, expect, it } from "vitest";
import {
  buildPostSettlementResolveBody,
  isPostSettlementVersionConflict,
  validatePostSettlementResolveReason,
} from "@/src/lib/post-settlement-refund-case";

describe("post-settlement refund case workflow", () => {
  it("requires substantive reason", () => {
    expect(validatePostSettlementResolveReason("short")).toMatch(/at least/);
    expect(validatePostSettlementResolveReason("  valid reason here  ")).toBeUndefined();
  });

  it("builds resolve payload with exact ids and version", () => {
    const body = buildPostSettlementResolveBody(
      { _id: "psrc_abc", version: 2 },
      "WRITE_OFF",
      "Provider refund after closure — ops approved",
    );
    expect(body).toEqual({
      caseId: "psrc_abc",
      disposition: "WRITE_OFF",
      reason: "Provider refund after closure — ops approved",
      expectedVersion: 2,
    });
  });

  it("detects version conflict codes", () => {
    expect(isPostSettlementVersionConflict("VERSION_CONFLICT")).toBe(true);
    expect(isPostSettlementVersionConflict("CASE_ALREADY_RESOLVED")).toBe(true);
    expect(isPostSettlementVersionConflict("FORBIDDEN")).toBe(false);
  });
});
