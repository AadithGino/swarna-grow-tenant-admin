import { describe, expect, it } from "vitest";
import {
  canViewEcommerceHistoricalWorkspace,
  hasEcommerceOrderHistory,
} from "@/src/lib/ecommerce-entitlement";

describe("ecommerce historical workspace visibility", () => {
  it("allows history when plan is not entitled but orders exist", () => {
    expect(
      canViewEcommerceHistoricalWorkspace({
        planEntitled: false,
        enabled: false,
        active: false,
        hasOrderHistory: true,
      }),
    ).toBe(true);
  });

  it("does not infer history from tier names", () => {
    expect(hasEcommerceOrderHistory({ planEntitled: true })).toBe(false);
  });
});
