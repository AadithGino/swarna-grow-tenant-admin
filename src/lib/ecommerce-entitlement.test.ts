import { describe, expect, it } from "vitest";
import {
  isEcommercePlanEntitled,
  isEcommerceStorefrontActive,
  resolveEcommerceServerAccess,
} from "./ecommerce-entitlement";

describe("ecommerce entitlement", () => {
  it("uses subscription ecommerce before operations", () => {
    const state = resolveEcommerceServerAccess(
      { ecommerce: { planEntitled: true, enabled: false, active: false } },
      { ecommerce: { planEntitled: false, enabled: true, active: true } },
    );
    expect(isEcommercePlanEntitled(state)).toBe(true);
    expect(isEcommerceStorefrontActive(state)).toBe(false);
  });

  it("does not infer plan from local feature flags", () => {
    expect(
      isEcommercePlanEntitled(
        resolveEcommerceServerAccess({ features: { ecommerce: true } } as never, null),
      ),
    ).toBe(false);
  });
});
