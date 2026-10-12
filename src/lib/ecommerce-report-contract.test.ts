import { describe, expect, it } from "vitest";
import { mockAdminReport } from "@/src/mocks/admin-report-mocks";
import { isEcommerceAdminReportKey } from "@/src/types/admin-report";

describe("ecommerce admin report contract", () => {
  it("includes summary and charts for all ecommerce report keys", () => {
    for (const key of [
      "ECOMMERCE_SALES",
      "ECOMMERCE_ORDERS_FULFILMENT",
      "ECOMMERCE_PRODUCTS",
    ] as const) {
      expect(isEcommerceAdminReportKey(key)).toBe(true);
      const wrapped = mockAdminReport(key, { from: "2026-03-01", to: "2026-03-31" });
      const payload = wrapped.payload as {
        summary?: unknown[];
        charts?: Record<string, unknown>;
      };
      expect(payload.summary?.length).toBeGreaterThan(0);
      expect(Object.keys(payload.charts ?? {}).length).toBeGreaterThan(0);
    }
  });
});
