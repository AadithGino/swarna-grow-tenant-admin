import { describe, expect, it } from "vitest";
import {
  ordersListBackHref,
  ordersListFiltersToSearchParams,
  parseOrdersListFiltersFromSearchParams,
} from "./ecommerce-orders-url-state";

describe("ecommerce orders URL state", () => {
  it("round-trips view and cursor for list back navigation", () => {
    const params = new URLSearchParams("view=to_fulfil&q=RG-100&cursor=abc");
    const filters = parseOrdersListFiltersFromSearchParams(params);
    expect(filters.view).toBe("to_fulfil");
    expect(filters.q).toBe("RG-100");
    expect(ordersListBackHref(filters, "abc")).toBe("/ecommerce/orders?view=to_fulfil&q=RG-100&cursor=abc");
  });

  it("omits default view and period", () => {
    const q = ordersListFiltersToSearchParams({
      view: "all",
      q: "",
      status: "ALL",
      paymentMethod: "ALL",
      createdFrom: "",
      createdTo: "",
      period: "THIS_MONTH",
    });
    expect(q.toString()).toBe("");
  });
});
