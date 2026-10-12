import { describe, expect, it } from "vitest";
import {
  formatPaymentBlockedReason,
  paymentGateBlockers,
  taxBlockers,
} from "@/src/lib/ecommerce-payment-blockers";

describe("ecommerce-payment-blockers", () => {
  it("splits tax vs payment gate blockers", () => {
    const blockers = [
      { code: "MISSING_HSN_SAC_MAPPING", message: "Map HSN" },
      { code: "PLAN_ECOMMERCE_PAYMENTS_DISABLED", message: "Not on plan" },
      { code: "PAYMENT_GATEWAY_NOT_CONFIGURED", message: "No gateway" },
    ];
    expect(taxBlockers(blockers)).toHaveLength(1);
    expect(paymentGateBlockers(blockers)).toHaveLength(2);
    expect(formatPaymentBlockedReason(blockers)).toContain("Not on plan");
  });
});
