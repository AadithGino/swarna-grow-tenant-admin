import { describe, expect, it } from "vitest";
import {
  ecommerceInsightsQueryFromDashboard,
  ecommerceOrdersListHref,
} from "./ecommerce-dashboard-period";

describe("ecommerce dashboard period", () => {
  it("maps preset dashboard period to summary query", () => {
    expect(ecommerceInsightsQueryFromDashboard({ period: "THIS_WEEK" })).toEqual({
      period: "THIS_WEEK",
    });
  });

  it("builds orders list links with view and period", () => {
    expect(
      ecommerceOrdersListHref("payment_issues", { period: "THIS_MONTH" }),
    ).toBe("/ecommerce/orders?view=payment_issues&period=THIS_MONTH");
  });
});
