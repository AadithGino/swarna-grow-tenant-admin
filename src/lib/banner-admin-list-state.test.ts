import { describe, expect, it } from "vitest";
import {
  applyBannerUpdate,
  bannerMatchesListFilters,
  mergeBannerRows,
  mergeBannerRowsForView,
  mergeExtraBannerPage,
  mergeBannerRowRecords,
  resolveNextBannerCursor,
  shouldApplyLoadMoreResult,
  tailAfterLoadedPage,
} from "@/src/lib/banner-admin-list-state";
import { compareBannerDisplayOrder } from "@/src/lib/ecommerce-banner-surfaces";

function row(
  id: string,
  version: number,
  displayOrder: number,
  extra: { status?: string; placement?: string } = {},
) {
  return { id, version, displayOrder, title: id, status: "DRAFT", placement: "HOME", ...extra };
}

describe("banner-admin-list-state", () => {
  it("exhausts pagination after the final page for 51 banners", () => {
    const pageOne = Array.from({ length: 50 }, (_, i) => row(`b-${i}`, 1, i));
    const pageTwo = [row("b-50", 1, 50)];
    const extra = mergeExtraBannerPage([], pageTwo);
    expect(tailAfterLoadedPage(null)).toBe("exhausted");
    expect(resolveNextBannerCursor("exhausted", "cursor-page-1")).toBeUndefined();
    const merged = mergeBannerRows(pageOne, extra).sort(compareBannerDisplayOrder);
    expect(merged).toHaveLength(51);
    expect(new Set(merged.map((r) => r.id)).size).toBe(51);
  });

  it("merges by version instead of always preferring page one", () => {
    const stalePageOne = [row("b-50", 1, 50)];
    const freshExtra = [row("b-50", 4, 50)];
    const merged = mergeBannerRows(stalePageOne, freshExtra);
    expect(merged.find((r) => r.id === "b-50")?.version).toBe(4);
    const merged2 = mergeBannerRows([row("b-50", 5, 50)], [row("b-50", 4, 50)]);
    expect(merged2.find((r) => r.id === "b-50")?.version).toBe(5);
    expect(mergeBannerRowRecords(row("b-50", 2, 0), row("b-50", 3, 0)).version).toBe(3);
  });

  it("removes later-page banner from draft filter after publish", () => {
    const pageOne = Array.from({ length: 50 }, (_, i) => row(`b-${i}`, 1, i, { status: "DRAFT" }));
    let extra = [row("b-50", 1, 50, { status: "DRAFT" })];
    const published = row("b-50", 2, 50, { status: "PUBLISHED" });
    const filters = { status: "DRAFT" };
    extra = applyBannerUpdate(pageOne, extra, published, filters).extra;
    const view = mergeBannerRowsForView(pageOne, extra, filters);
    expect(view.some((r) => r.id === "b-50")).toBe(false);
    expect(bannerMatchesListFilters(published, filters)).toBe(false);
  });

  it("updates version on later-page banner after mutation while filter matches", () => {
    const pageOne = Array.from({ length: 50 }, (_, i) => row(`b-${i}`, 1, i));
    let extra = [row("b-50", 1, 50)];
    const published = row("b-50", 2, 50, { status: "PUBLISHED" });
    extra = applyBannerUpdate(pageOne, extra, published, { status: "ALL" }).extra;
    const merged = mergeBannerRows(pageOne, extra);
    expect(merged.find((r) => r.id === "b-50")?.version).toBe(2);
  });

  it("re-sorts when display order crosses page boundary without duplicates", () => {
    const pageOne = Array.from({ length: 50 }, (_, i) => row(`b-${i}`, 1, i));
    const extra = [row("b-50", 2, -1)];
    const merged = mergeBannerRows(pageOne, extra).sort(compareBannerDisplayOrder);
    expect(merged[0].id).toBe("b-50");
    expect(merged.filter((r) => r.id === "b-50")).toHaveLength(1);
  });

  it("drops stale load-more results after filter or list mutation change", () => {
    expect(shouldApplyLoadMoreResult("a", "b", 1, 1, 0, 0)).toBe(false);
    expect(shouldApplyLoadMoreResult("a", "a", 1, 2, 0, 0)).toBe(false);
    expect(shouldApplyLoadMoreResult("a", "a", 2, 2, 0, 1)).toBe(false);
    expect(shouldApplyLoadMoreResult("a", "a", 2, 2, 1, 1)).toBe(true);
  });
});
