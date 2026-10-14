/**
 * Single source of truth: admin banner management ↔ customer home ↔ online store.
 */

export const CUSTOMER_PROMO_SECTION_TITLE = "Offers";

/** Tailwind classes matching the customer promo rail card. */
export const CUSTOMER_PROMO_RAIL_FRAME =
  "relative h-[92px] overflow-hidden rounded-xl border border-[#e8e2dc] bg-[#f3f0ec] sm:h-[100px]";

/** Shown under admin placement / image previews (not a live customer screenshot). */
export const BANNER_PLACEMENT_PREVIEW_CAPTION =
  "Illustration only — layout matches the customer promo rail, not live content.";

export type EcommerceBannerPlacementValue = "HOME" | "SHOP" | "BOTH";

export type CustomerBannerSurface = "home" | "shop";

export const ECOMMERCE_BANNER_PLACEMENTS: {
  value: EcommerceBannerPlacementValue;
  label: string;
  shortLabel: string;
  adminHint: string;
  customerLocation: string;
}[] = [
  {
    value: "HOME",
    label: "Customer home only",
    shortLabel: "Home",
    adminHint: "Requires ecommerce plan. Store can be off.",
    customerLocation: `Home screen → after Active schemes → “${CUSTOMER_PROMO_SECTION_TITLE}” horizontal rail`,
  },
  {
    value: "SHOP",
    label: "Online store only",
    shortLabel: "Store",
    adminHint: "Requires an active online store.",
    customerLocation: `Shop → inside the product grid (after 2 rows) → “${CUSTOMER_PROMO_SECTION_TITLE}” rail`,
  },
  {
    value: "BOTH",
    label: "Home and online store",
    shortLabel: "Home & store",
    adminHint: "Home needs plan entitlement; store promos need an active store.",
    customerLocation: `Same “${CUSTOMER_PROMO_SECTION_TITLE}” rail on home (after schemes) and in the shop grid`,
  },
];

export const ECOMMERCE_BANNER_DESTINATIONS: {
  value: string;
  label: string;
  hint?: string;
}[] = [
  { value: "NONE", label: "None (image only)", hint: "No tap action" },
  { value: "HOME", label: "Customer home" },
  { value: "SHOP", label: "Shop catalog" },
  { value: "CATEGORY", label: "Shop category" },
  { value: "PRODUCT", label: "Product detail" },
  { value: "SCHEMES", label: "Schemes list" },
  { value: "ORDERS", label: "My orders", hint: "Only if the customer has order history" },
];

export const BANNER_IMAGE_ARTWORK_HINT =
  "Upload wide artwork (~3:1). Customers see the image in a compact rail; title and subtitle are for admin and screen readers.";

export const BANNER_SIGNED_URL_REVOCATION_HINT =
  "Unpublish or archive stops new image downloads immediately; URLs already opened may work for up to 15 minutes.";

export function bannerCustomerSurfaces(placement: string): CustomerBannerSurface[] {
  const p = String(placement).toUpperCase();
  if (p === "HOME") return ["home"];
  if (p === "SHOP") return ["shop"];
  if (p === "BOTH") return ["home", "shop"];
  return [];
}

export function placementMeta(placement: string) {
  return (
    ECOMMERCE_BANNER_PLACEMENTS.find((row) => row.value === String(placement).toUpperCase()) ??
    ECOMMERCE_BANNER_PLACEMENTS[0]
  );
}

export function destinationMeta(type: string) {
  return (
    ECOMMERCE_BANNER_DESTINATIONS.find((row) => row.value === String(type).toUpperCase()) ?? {
      value: type,
      label: type,
    }
  );
}

export function customerSurfaceLocation(surface: CustomerBannerSurface): string {
  if (surface === "home") {
    return ECOMMERCE_BANNER_PLACEMENTS[0].customerLocation;
  }
  return ECOMMERCE_BANNER_PLACEMENTS[1].customerLocation;
}

export function compareBannerDisplayOrder<
  T extends { displayOrder?: number; title?: string; id?: string; createdAt?: string },
>(a: T, b: T): number {
  const da = a.displayOrder ?? 0;
  const db = b.displayOrder ?? 0;
  if (da !== db) return da - db;
  const ta = String(a.title ?? "");
  const tb = String(b.title ?? "");
  if (ta !== tb) return ta.localeCompare(tb);
  return String(a.id ?? "").localeCompare(String(b.id ?? ""));
}

export function formatBannerDestinationLabel(
  destinationType: string,
  options?: {
    categoryName?: string | null;
    productName?: string | null;
  },
): string {
  const base = destinationMeta(destinationType).label;
  if (destinationType === "CATEGORY" && options?.categoryName) {
    return `${base}: ${options.categoryName}`;
  }
  if (destinationType === "PRODUCT" && options?.productName) {
    return `${base}: ${options.productName}`;
  }
  return base;
}
