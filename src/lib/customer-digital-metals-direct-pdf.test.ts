import { describe, expect, it } from "vitest";
import { customerDigitalMetalsPdfPath } from "@/src/lib/customer-digital-metals-direct-pdf";

describe("customerDigitalMetalsPdfPath", () => {
  it("maps redemption charge receipt to app pdf route", () => {
    expect(
      customerDigitalMetalsPdfPath("REDEMPTION_CHARGE_RECEIPT", { subjectId: "dmro_abc" }),
    ).toBe("/app/digital-metals/redemption/orders/dmro_abc/charge-receipt.pdf");
  });

  it("maps metal statement with query params", () => {
    expect(
      customerDigitalMetalsPdfPath("METAL_STATEMENT", {
        fromBusinessDate: "2026-04-01",
        toBusinessDate: "2026-04-30",
      }),
    ).toContain("/app/digital-metals/statements/metal.pdf?");
    expect(
      customerDigitalMetalsPdfPath("METAL_STATEMENT", {
        fromBusinessDate: "2026-04-01",
        toBusinessDate: "2026-04-30",
      }),
    ).toContain("fromBusinessDate=2026-04-01");
  });
});
