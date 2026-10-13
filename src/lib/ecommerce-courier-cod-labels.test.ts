import { describe, expect, it } from "vitest";
import { courierCodQueueHint } from "@/src/features/ecommerce/ecommerce-courier-cod-order-panel";

describe("courierCodQueueHint", () => {
  it("maps remittance pipeline stages", () => {
    expect(courierCodQueueHint({ collectionStatus: "PENDING" })).toBe("awaiting_collection");
    expect(
      courierCodQueueHint({ collectionStatus: "CONFIRMED", remittanceStatus: "OWED" }),
    ).toBe("awaiting_remittance");
    expect(courierCodQueueHint({ remittanceStatus: "DISCREPANCY" })).toBe("reconciliation_exception");
    expect(courierCodQueueHint({ remittanceStatus: "BANK_RECONCILED" })).toBe("settled");
  });
});
