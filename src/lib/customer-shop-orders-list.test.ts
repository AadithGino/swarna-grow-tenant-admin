import { describe, expect, it } from "vitest";
import { normalizeShopOrdersListResponse } from "@/src/lib/customer-shop-orders-list";

describe("normalizeShopOrdersListResponse", () => {
  it("maps live API payload after envelope unwrap (data is an array)", () => {
    const order = { id: "eord_01", orderNumber: "EC-1", status: "PAID" };
    const out = normalizeShopOrdersListResponse([order]);
    expect(out.items).toEqual([order]);
  });

  it("maps mock shape { items }", () => {
    const order = { id: "eord_02" };
    const out = normalizeShopOrdersListResponse({ items: [order] });
    expect(out.items).toEqual([order]);
  });

  it("maps nested envelope when transform runs before unwrap", () => {
    const order = { id: "eord_03" };
    const out = normalizeShopOrdersListResponse({
      data: [order],
      meta: { nextCursor: "cur_1" },
    });
    expect(out.items).toEqual([order]);
    expect(out.page.nextCursor).toBe("cur_1");
  });
});
