import { describe, expect, it } from "vitest";
import { resolveShopAvailability } from "@/src/lib/ecommerce-store-availability";

describe("resolveShopAvailability", () => {
  it("requires plan entitlement and store switch", () => {
    expect(
      resolveShopAvailability({ planEntitled: true, ecommerceEnabled: false }),
    ).toEqual({
      available: false,
      ecommerce: { planEntitled: true, enabled: false, active: false },
    });
    expect(
      resolveShopAvailability({ planEntitled: false, ecommerceEnabled: true }),
    ).toEqual({
      available: false,
      ecommerce: { planEntitled: false, enabled: true, active: false },
    });
    expect(
      resolveShopAvailability({ planEntitled: true, ecommerceEnabled: true }),
    ).toEqual({
      available: true,
      ecommerce: { planEntitled: true, enabled: true, active: true },
    });
  });
});
