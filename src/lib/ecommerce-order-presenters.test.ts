import { describe, expect, it } from "vitest";
import {
  nextFulfilmentTargets,
  orderListItemNeedsAttention,
  orderListPrimaryAction,
  orderPaymentPresentation,
} from "./ecommerce-order-presenters";

describe("orderPaymentPresentation", () => {
  it("does not mark pending online as collected", () => {
    const p = orderPaymentPresentation({
      paymentMethod: "ONLINE",
      status: "PENDING_PAYMENT",
      paidAt: null,
      paymentCompleted: false,
      courierCodCollectionStatus: null,
      paymentExceptionStatus: null,
    });
    expect(p.collected).toBe(false);
    expect(p.stateLabel).toMatch(/awaiting/i);
  });

  it("does not mark uncollected COD as paid", () => {
    const p = orderPaymentPresentation({
      paymentMethod: "COD",
      status: "PROCESSING",
      paidAt: null,
      courierCodCollectionStatus: "PENDING",
      paymentCompleted: false,
      paymentExceptionStatus: null,
    });
    expect(p.collected).toBe(false);
  });

  it("surfaces payment exceptions prominently", () => {
    const p = orderPaymentPresentation({
      paymentMethod: "ONLINE",
      status: "PAID",
      paidAt: "2026-01-01T00:00:00Z",
      paymentCompleted: true,
      courierCodCollectionStatus: null,
      paymentExceptionStatus: "STUCK_RECONCILE",
    });
    expect(p.tone).toBe("danger");
    expect(p.collected).toBe(false);
  });
});

describe("orderListItemNeedsAttention", () => {
  it("flags COD pending acceptance", () => {
    expect(
      orderListItemNeedsAttention({
        id: "1",
        status: "COD_PENDING_ACCEPTANCE",
      }),
    ).toBe(true);
  });
});

describe("nextFulfilmentTargets", () => {
  it("pickup path from processing", () => {
    expect(nextFulfilmentTargets("PROCESSING", "BRANCH_PICKUP")).toEqual(["READY_FOR_PICKUP"]);
  });
});

describe("orderListPrimaryAction", () => {
  it("prioritises COD review", () => {
    const a = orderListPrimaryAction({ id: "e1", status: "COD_PENDING_ACCEPTANCE" });
    expect(a.label).toBe("Review COD");
  });
});
