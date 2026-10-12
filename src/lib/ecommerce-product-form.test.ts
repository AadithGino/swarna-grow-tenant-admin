import { describe, expect, it } from "vitest";
import {
  buildEcommerceProductBody,
  saveActionLabel,
  type ProductFormInput,
} from "@/src/lib/ecommerce-product-form";

const base: ProductFormInput = {
  name: "Ring",
  slug: "ring",
  sku: "",
  description: "",
  categoryId: "",
  priceMode: "GOLD_RATE_BASED",
  taxClassification: "GST_3",
  imageUploadIds: [],
  featured: true,
  status: "DRAFT",
  baseRupee: "",
  saleRupee: "",
  saleStartsAt: "",
  saleEndsAt: "",
  purity: "22K",
  weightGrams: "5",
  makingChargeMode: "PER_GRAM_PAISE",
  makingFixedRupee: "",
  makingPerGramRupee: "400",
  makingPercentBps: "",
  stones: [{ name: "Ruby", chargeRupee: "1500" }],
  otherChargesRupee: "50",
  offerType: "PERCENT_OFF",
  offerValueRupee: "",
  offerPercentBps: "500",
  offerStartsAt: "",
  offerEndsAt: "",
};

describe("buildEcommerceProductBody", () => {
  it("maps gold-rate fields including making-only offer", () => {
    const body = buildEcommerceProductBody(base);
    expect(body.priceMode).toBe("GOLD_RATE_BASED");
    expect(body.goldWeightMg).toBe(5000);
    expect(body.makingChargeMode).toBe("PER_GRAM_PAISE");
    expect(body.makingCharge).toEqual({ perGramPaise: 40_000 });
    expect(body.stones).toEqual([{ name: "Ruby", chargePaise: 150_000 }]);
    expect(body.otherChargesPaise).toBe(5000);
    expect(body.offer).toMatchObject({ type: "PERCENT_OFF", percentBps: 500 });
    expect(body.featured).toBe(true);
  });

  it("maps fixed pricing with optional sale window", () => {
    const body = buildEcommerceProductBody({
      ...base,
      priceMode: "FIXED",
      baseRupee: "99000",
      saleRupee: "95000",
      saleStartsAt: "2026-01-01T00:00",
      saleEndsAt: "2027-01-01T00:00",
      offerType: "",
    });
    expect(body.fixedPricing).toMatchObject({
      basePricePaise: 9_900_000,
      salePricePaise: 9_500_000,
    });
    expect(body.offer).toBeNull();
  });
});

describe("saveActionLabel", () => {
  it("uses save changes for published products", () => {
    expect(saveActionLabel("PUBLISHED")).toBe("Save changes");
    expect(saveActionLabel("DRAFT")).toBe("Save draft");
  });
});
