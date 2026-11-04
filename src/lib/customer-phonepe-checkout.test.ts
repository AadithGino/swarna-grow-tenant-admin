import { describe, expect, it } from "vitest";
import { normalizePhonePeCheckout } from "@/src/lib/customer-phonepe-checkout";
import { pickPhonePeGatewayUrl } from "@/src/lib/customer-payment-redirect";

describe("scheme vs PhonePe checkout URLs", () => {
  it("does not treat payment link token as SDK token", () => {
    const url = pickPhonePeGatewayUrl({
      token: "public-link-token-abc",
      gatewayUrl: "/pay/public-link-token-abc",
    });
    expect(url).toBe("");
  });

  it("prefers hosted paymentUrl", () => {
    const url = pickPhonePeGatewayUrl({
      paymentUrl: "https://mercury-uat.phonepe.com/transact/checkout?token=real",
      token: "public-link-token-abc",
    });
    expect(url).toBe("https://mercury-uat.phonepe.com/transact/checkout?token=real");
  });

  it("does not mark link-only responses as SDK_ORDER", () => {
    const row = normalizePhonePeCheckout({
      token: "link-only",
      gatewayUrl: "/pay/link-only",
    });
    expect(row.checkoutKind).toBeNull();
  });

  it("recognizes hosted redirect from API", () => {
    const row = normalizePhonePeCheckout({
      checkoutKind: "HOSTED_REDIRECT",
      paymentUrl: "https://example.com/checkout",
      token: "link-only",
    });
    expect(row.checkoutKind).toBe("HOSTED_REDIRECT");
  });
});
