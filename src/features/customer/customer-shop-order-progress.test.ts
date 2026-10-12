import { describe, expect, it } from "vitest";
import { buildShopOrderTimeline } from "@/src/features/customer/customer-shop-order-progress";

describe("buildShopOrderTimeline", () => {
  it("marks online pending payment at payment step", () => {
    const t = buildShopOrderTimeline({
      status: "PENDING_PAYMENT",
      paymentMethod: "ONLINE",
      fulfilmentMode: "DELIVERY",
      paymentAllowed: true,
    });
    expect(t.headline).toMatch(/payment/i);
    expect(t.steps[1]?.state).toBe("current");
  });

  it("tracks COD acceptance before preparing", () => {
    const t = buildShopOrderTimeline({
      status: "COD_PENDING_ACCEPTANCE",
      paymentMethod: "COD",
      fulfilmentMode: "DELIVERY",
    });
    expect(t.steps[1]?.label).toMatch(/confirm/i);
    expect(t.steps[1]?.state).toBe("current");
  });

  it("shows pending cancellation review without implying refund", () => {
    const t = buildShopOrderTimeline({
      status: "PROCESSING",
      cancellation: { request: { status: "PENDING_DECISION" } },
    });
    expect(t.headline).toMatch(/Cancellation request/i);
    expect(t.subheadline).toMatch(/not automatic/i);
  });

  it("completes all steps when delivered online", () => {
    const t = buildShopOrderTimeline({
      status: "DELIVERED",
      paymentMethod: "ONLINE",
      fulfilmentMode: "DELIVERY",
      paymentCompleted: true,
    });
    expect(t.terminal).toBe(true);
    expect(t.steps.every((s) => s.state === "complete")).toBe(true);
  });
});
