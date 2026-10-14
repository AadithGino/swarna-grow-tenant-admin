import { customerPath } from "@/src/lib/customer-tenant";
import { customerShopOrdersPath } from "@/src/lib/customer-shop-paths";

export type CustomerBannerDestination =
  | { type: "NONE" }
  | { type: "HOME" }
  | { type: "SHOP" }
  | { type: "SCHEMES" }
  | { type: "ORDERS" }
  | { type: "CATEGORY"; categoryId: string }
  | { type: "PRODUCT"; productId: string; slug: string };

export function customerBannerHref(
  tenantSlug: string,
  destination: CustomerBannerDestination | null | undefined,
  options?: { shopAvailable?: boolean },
): string | null {
  if (!destination || destination.type === "NONE") return null;
  const needsShop =
    destination.type === "SHOP"
    || destination.type === "CATEGORY"
    || destination.type === "PRODUCT";
  if (needsShop && options?.shopAvailable === false) return null;
  switch (destination.type) {
    case "HOME":
      return customerPath(tenantSlug);
    case "SHOP":
      return customerPath(tenantSlug, "shop");
    case "SCHEMES":
      return customerPath(tenantSlug, "schemes");
    case "ORDERS":
      return customerShopOrdersPath(tenantSlug);
    case "CATEGORY":
      return `${customerPath(tenantSlug, "shop")}?categoryId=${encodeURIComponent(destination.categoryId)}`;
    case "PRODUCT":
      return customerPath(tenantSlug, "shop", encodeURIComponent(destination.slug));
    default:
      return null;
  }
}
