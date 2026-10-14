import { describe, expect, it } from "vitest";
import { customerBannerHref } from "@/src/lib/customer-banner-routing";

describe("customerBannerHref", () => {
  const slug = "meher";

  it("maps shop category deep link with query", () => {
    expect(customerBannerHref(slug, { type: "CATEGORY", categoryId: "ecat_1" })).toBe(
      "/customer/meher/shop?categoryId=ecat_1",
    );
  });

  it("maps product slug path", () => {
    expect(
      customerBannerHref(slug, { type: "PRODUCT", productId: "eprd_1", slug: "gold-ring" }),
    ).toBe("/customer/meher/shop/gold-ring");
  });

  it("returns null for none", () => {
    expect(customerBannerHref(slug, { type: "NONE" })).toBeNull();
  });

  it("blocks shop links when shopAvailable is false", () => {
    expect(
      customerBannerHref(slug, { type: "SHOP" }, { shopAvailable: false }),
    ).toBeNull();
    expect(
      customerBannerHref(
        slug,
        { type: "CATEGORY", categoryId: "ecat_1" },
        { shopAvailable: false },
      ),
    ).toBeNull();
  });
});
