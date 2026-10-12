import { describe, expect, it } from "vitest";
import {
  buildEcommerceOrdersListQuery,
  emptyEcommerceOrdersListFilters,
} from "./ecommerce-orders-list-filters";

describe("buildEcommerceOrdersListQuery views", () => {
  it("maps actionable views to server flags", () => {
    const base = emptyEcommerceOrdersListFilters();
    expect(buildEcommerceOrdersListQuery({ ...base, view: "cod_acceptance" }).codPendingAcceptance).toBe(
      "true",
    );
    expect(buildEcommerceOrdersListQuery({ ...base, view: "to_fulfil" }).status).toBe("PAID");
    expect(buildEcommerceOrdersListQuery({ ...base, view: "payment_issues" }).paymentException).toBe(
      "true",
    );
    expect(buildEcommerceOrdersListQuery({ ...base, view: "returns_cancel" }).returnPending).toBe("true");
  });

  it("passes cursor pagination params", () => {
    const q = buildEcommerceOrdersListQuery({
      ...emptyEcommerceOrdersListFilters(),
      cursor: "next",
      limit: 25,
    });
    expect(q.cursor).toBe("next");
    expect(q.limit).toBe(25);
  });
});
