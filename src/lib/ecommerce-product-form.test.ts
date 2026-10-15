import { describe, expect, it } from "vitest";
import {
  buildEcommerceProductBody,
  productRowToFormInput,
  productScheduleOriginsFromRow,
} from "@/src/lib/ecommerce-product-form";

describe("ecommerce product schedule round-trip", () => {
  it("omits unchanged schedule keys in PATCH payload (server merge preserves DB values)", () => {
    const original = "2026-03-10T10:15:00.000Z";
    const row = {
      priceMode: "FIXED",
      fixedPricing: { basePricePaise: 100_000, saleStartsAt: original },
      taxClassification: "GST_3",
      status: "DRAFT",
    };
    const form = productRowToFormInput(row, "GST_3");
    const origins = productScheduleOriginsFromRow(row);
    const body = buildEcommerceProductBody(form, origins);
    const fixed = body.fixedPricing as Record<string, unknown>;
    expect(fixed.saleStartsAt).toBeUndefined();
    expect(form.saleStartsAt).toBeTruthy();
  });

  it("sends null when a stored schedule field is cleared in the form", () => {
    const row = {
      priceMode: "FIXED",
      fixedPricing: {
        basePricePaise: 100_000,
        saleStartsAt: "2026-03-10T10:15:00.000Z",
      },
      taxClassification: "GST_3",
      status: "DRAFT",
    };
    const form = productRowToFormInput(row, "GST_3");
    const body = buildEcommerceProductBody(
      { ...form, saleStartsAt: "" },
      productScheduleOriginsFromRow(row),
    );
    const fixed = body.fixedPricing as Record<string, unknown>;
    expect(fixed.saleStartsAt).toBeNull();
  });

  it("sends null to clear an removed sale price when one existed", () => {
    const row = {
      priceMode: "FIXED",
      fixedPricing: { basePricePaise: 100_000, salePricePaise: 80_000 },
      taxClassification: "GST_3",
      status: "DRAFT",
    };
    const form = productRowToFormInput(row, "GST_3");
    const body = buildEcommerceProductBody(
      { ...form, saleRupee: "" },
      productScheduleOriginsFromRow(row),
    );
    const fixed = body.fixedPricing as Record<string, unknown>;
    expect(fixed.salePricePaise).toBeNull();
  });

  it("maps stored UTC to datetime-local and back on edit", () => {
    const previous = process.env.TZ;
    process.env.TZ = "Asia/Kolkata";
    try {
      const original = "2026-06-15T04:30:00.000Z";
      const row = {
        priceMode: "FIXED",
        fixedPricing: {
          basePricePaise: 100_000,
          salePricePaise: 80_000,
          saleStartsAt: original,
        },
        taxClassification: "GST_3",
        status: "DRAFT",
      };
      const form = productRowToFormInput(row, "GST_3");
      expect(form.saleStartsAt).toBe("2026-06-15T10:00");
      const edited = { ...form, saleStartsAt: "2026-06-16T10:00" };
      const body = buildEcommerceProductBody(edited, productScheduleOriginsFromRow(row));
      const fixed = body.fixedPricing as Record<string, unknown>;
      expect(fixed.saleStartsAt).toBe("2026-06-16T04:30:00.000Z");
    } finally {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    }
  });
});
