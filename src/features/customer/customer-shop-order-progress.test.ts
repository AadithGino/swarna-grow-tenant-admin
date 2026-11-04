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

  it("never marks pickup handover complete before DELIVERED", () => {
    const t = buildShopOrderTimeline({
      status: "READY_FOR_PICKUP",
      paymentMethod: "ONLINE",
      fulfilmentMode: "BRANCH_PICKUP",
      fulfilmentHandover: { customerPickupAcknowledgedAt: "2026-01-01T10:00:00.000Z" },
    });
    const last = t.steps[t.steps.length - 1];
    expect(last?.label).toMatch(/Handed over/i);
    expect(last?.label).not.toMatch(/Collected/i);
    expect(last?.state).toBe("upcoming");
    expect(t.steps.find((s) => s.label.match(/Ready for pickup/i))?.state).toBe("current");
    expect(t.subheadline).toMatch(/staff/i);
  });

  it("does not complete COD pickup timeline when delivered but cash not collected", () => {
    const t = buildShopOrderTimeline({
      status: "DELIVERED",
      paymentMethod: "COD",
      fulfilmentMode: "BRANCH_PICKUP",
      courierCodCollectionStatus: "PENDING",
    });
    expect(t.steps[t.steps.length - 1]?.state).toBe("current");
    expect(t.steps[t.steps.length - 1]?.label).not.toMatch(/^Collected$/i);
  });
});
