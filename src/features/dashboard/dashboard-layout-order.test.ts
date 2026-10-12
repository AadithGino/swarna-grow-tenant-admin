import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("dashboard layout order", () => {
  it("renders scheme operations before the online store section", () => {
    const src = readFileSync(
      resolve(__dirname, "dashboard-page.tsx"),
      "utf8",
    );
    const blocking = src.indexOf("DashboardBlockingAlerts");
    const widgets = src.indexOf("DashboardWidgetGrid");
    const redemption = src.indexOf("RedemptionFulfillmentCard");
    const schemeChartsGrid = src.indexOf('<PlanUsageCard className="h-full min-h-[23.75rem]" />');
    const ecommerce = src.lastIndexOf("EcommerceDashboardSection");
    expect(blocking).toBeGreaterThan(-1);
    expect(ecommerce).toBeGreaterThan(-1);
    expect(blocking).toBeLessThan(ecommerce);
    expect(widgets).toBeLessThan(ecommerce);
    expect(redemption).toBeLessThan(ecommerce);
    expect(schemeChartsGrid).toBeLessThan(ecommerce);
  });
});
