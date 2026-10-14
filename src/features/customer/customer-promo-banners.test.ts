import { describe, expect, it } from "vitest";
import { customerBannerHref } from "@/src/lib/customer-banner-routing";
import { shouldShowShopPromoRail } from "@/src/features/customer/customer-promo-banners";

describe("shop banner placement filtering", () => {
  it("keeps only banners with image ids for render list contract", () => {
    const items = [
      { id: "1", title: "A", imageUploadId: "u1", destination: { type: "SHOP" as const } },
      { id: "2", title: "B", imageUploadId: null, destination: { type: "SHOP" as const } },
    ];
    const visible = items.filter((b) => b.title && b.imageUploadId);
    expect(visible).toHaveLength(1);
    expect(customerBannerHref("demo", visible[0].destination)).toContain("/shop");
  });

  it("hides shop promos while filters are active", () => {
    const items = [{ id: "1", title: "A", imageUploadId: "u1" }];
    expect(shouldShowShopPromoRail(items, true)).toBe(false);
    expect(shouldShowShopPromoRail(items, false)).toBe(true);
  });
});
