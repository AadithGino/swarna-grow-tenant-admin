import { describe, expect, it } from "vitest";
import { isEcommercePlanEntitled, resolveEcommerceServerAccess } from "./ecommerce-entitlement";

describe("ecommerce dashboard visibility gates", () => {
  it("does not treat storefront active as plan entitlement", () => {
    const access = resolveEcommerceServerAccess(
      { ecommerce: { planEntitled: false, enabled: true, active: true } },
      null,
    );
    expect(isEcommercePlanEntitled(access)).toBe(false);
  });

  it("requires server planEntitled for insights", () => {
    expect(
      isEcommercePlanEntitled(
        resolveEcommerceServerAccess({ ecommerce: { planEntitled: true, enabled: false } }, null),
      ),
    ).toBe(true);
  });
});
