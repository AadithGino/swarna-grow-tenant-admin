import { describe, expect, it } from "vitest";

function placeOrderLabel(input: {
  paymentMethod: string;
  orderPlacementAllowed: boolean;
  checkoutTaxReady: boolean;
  status: string;
  expired: boolean;
}) {
  const canPlaceOrder =
    input.orderPlacementAllowed && input.checkoutTaxReady && input.status === "ACTIVE" && !input.expired;
  if (canPlaceOrder) {
    return input.paymentMethod === "COD" ? "Place COD order" : "Place order & pay";
  }
  if (!input.checkoutTaxReady) return "Place order (checkout tax blocked)";
  if (!input.orderPlacementAllowed) {
    return input.paymentMethod === "COD"
      ? "Place COD order (not available)"
      : "Place order (payment blocked)";
  }
  return "Place order (unavailable)";
}

describe("customer shop quote CTA", () => {
  it("uses COD label when method is COD and placement allowed", () => {
    expect(
      placeOrderLabel({
        paymentMethod: "COD",
        orderPlacementAllowed: true,
        checkoutTaxReady: true,
        status: "ACTIVE",
        expired: false,
      }),
    ).toBe("Place COD order");
  });

  it("keeps online pay label for ONLINE", () => {
    expect(
      placeOrderLabel({
        paymentMethod: "ONLINE",
        orderPlacementAllowed: true,
        checkoutTaxReady: true,
        status: "ACTIVE",
        expired: false,
      }),
    ).toBe("Place order & pay");
  });
});
