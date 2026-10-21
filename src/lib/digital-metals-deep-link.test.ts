import { describe, expect, it } from "vitest";
import { parseCustomerSlug } from "@/src/lib/customer-tenant";

describe("digital metals notification deep links", () => {
  it("parses to routes that customer-router renders", () => {
    const buy = parseCustomerSlug(["customer", "testco", "digital-metals", "order", "dmbo_123"]);
    expect(buy.tenantSlug).toBe("testco");
    expect(buy.section).toBe("digital-metals");
    expect(buy.id).toBe("order");
    expect(buy.extra).toBe("dmbo_123");

    const sell = parseCustomerSlug(["customer", "test-co", "digital-metals", "sell-order", "dmso_1"]);
    expect(sell.id).toBe("sell-order");
    expect(sell.extra).toBe("dmso_1");

    const redeem = parseCustomerSlug(["customer", "test-co", "digital-metals", "redeem-order", "dmro_1"]);
    expect(redeem.id).toBe("redeem-order");
    expect(redeem.extra).toBe("dmro_1");

    const doc = parseCustomerSlug(["customer", "test-co", "digital-metals", "document", "dmdoc_1"]);
    expect(doc.id).toBe("document");
    expect(doc.extra).toBe("dmdoc_1");
  });
});
