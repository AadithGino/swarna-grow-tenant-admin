import { describe, expect, it } from "vitest";
import { parseCustomerSlug } from "@/src/lib/customer-tenant";
import {
  customerShopOrderPath,
  customerShopOrdersPath,
  customerShopQuotePath,
} from "@/src/lib/customer-shop-paths";

describe("customer shop routes", () => {
  it("keeps the tenant slug and resolves a quote in the customer router", () => {
    const path = customerShopQuotePath("kairali", "quote_123");
    expect(path).toBe("/customer/kairali/shop/quote/quote_123");
    expect(parseCustomerSlug(path.split("/").filter(Boolean))).toEqual({
      tenantSlug: "kairali",
      section: "shop",
      id: "quote",
      extra: "quote_123",
    });
  });

  it("lists orders under shop/orders", () => {
    const path = customerShopOrdersPath("kairali");
    expect(path).toBe("/customer/kairali/shop/orders");
    expect(parseCustomerSlug(path.split("/").filter(Boolean))).toEqual({
      tenantSlug: "kairali",
      section: "shop",
      id: "orders",
      extra: undefined,
    });
  });

  it("uses the singular order route recognized by the customer router", () => {
    const path = customerShopOrderPath("kairali", "order_123");
    expect(path).toBe("/customer/kairali/shop/order/order_123");
    expect(parseCustomerSlug(path.split("/").filter(Boolean))).toEqual({
      tenantSlug: "kairali",
      section: "shop",
      id: "order",
      extra: "order_123",
    });
  });
});
