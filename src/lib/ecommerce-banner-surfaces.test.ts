import { describe, expect, it } from "vitest";
import {
  bannerCustomerSurfaces,
  compareBannerDisplayOrder,
  placementMeta,
} from "@/src/lib/ecommerce-banner-surfaces";

describe("ecommerce-banner-surfaces", () => {
  it("maps placement to customer surfaces", () => {
    expect(bannerCustomerSurfaces("HOME")).toEqual(["home"]);
    expect(bannerCustomerSurfaces("SHOP")).toEqual(["shop"]);
    expect(bannerCustomerSurfaces("BOTH")).toEqual(["home", "shop"]);
  });

  it("sorts by display order then title", () => {
    const sorted = [
      { displayOrder: 5, title: "B" },
      { displayOrder: 0, title: "Z" },
      { displayOrder: 0, title: "A" },
    ].sort(compareBannerDisplayOrder);
    expect(sorted.map((r) => r.title)).toEqual(["A", "Z", "B"]);
  });

  it("includes customer location copy for placements", () => {
    expect(placementMeta("SHOP").customerLocation).toContain("Offers");
    expect(placementMeta("HOME").customerLocation).toContain("Active schemes");
  });
});
