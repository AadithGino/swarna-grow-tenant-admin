import { describe, expect, it } from "vitest";

describe("digital metals fulfilment mock envelope", () => {
  it("queue items expose permittedActions and version on detail", () => {
    const queue = {
      items: [{ id: "dmro_1", status: "CHARGE_PAID", permittedActions: ["ACCEPT_FULFILMENT"] }],
    };
    const detail = {
      id: "dmro_1",
      status: "CHARGE_PAID",
      version: 1,
      permittedActions: ["ACCEPT_FULFILMENT", "CANCEL_PRE_DISPATCH"],
      fulfilmentMode: "PICKUP",
    };
    expect(queue.items[0].permittedActions).toContain("ACCEPT_FULFILMENT");
    expect(detail.version).toBe(1);
    expect(detail.permittedActions.length).toBeGreaterThan(0);
  });

  it("error envelope shape for version conflict", () => {
    const err = {
      success: false,
      error: { code: "VERSION_CONFLICT", message: "Order was updated elsewhere." },
    };
    expect(err.success).toBe(false);
    expect(err.error.code).toBe("VERSION_CONFLICT");
  });
});
