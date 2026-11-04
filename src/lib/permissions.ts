import type { PortalCapabilities, PortalUser } from "@/src/types/session";

export function hasPermission(
  user: PortalUser | undefined,
  permission: string,
): boolean {
  // No signed-in user → deny (do not fail open for anonymous shells).
  if (!user) return false;
  // Empty permission list = unrestricted staff role (e.g. owner).
  if (!user.permissions?.length) return true;
  if (user.permissions.includes("*")) return true;
  return user.permissions.includes(permission);
}

export function hasAnyPermission(
  user: PortalUser | undefined,
  permissions: string[],
): boolean {
  if (!permissions.length) return true;
  return permissions.some((p) => hasPermission(user, p));
}

export function hasCapability(
  caps: PortalCapabilities | undefined,
  key: keyof PortalCapabilities,
): boolean {
  if (!caps) return true;
  const v = caps[key];
  return v !== false;
}

/** Nav href → required permission (any of). Empty = always show. */
export const NAV_PERMISSIONS: Record<string, string[]> = {
  "/": ["report.read"],
  "/customers": ["customer.read"],
  "/enrollments": ["customer.read", "scheme.read", "scheme.write"],
  "/dues": ["customer.read", "report.read"],
  "/collections": ["customer.read", "payment.read", "payment.record"],
  "/cash-control": ["cash.read", "cash.handover", "cash.handover.accept"],
  "/payments/needing-attention": ["ecommerce.read", "digital-metals.read"],
  "/maturity": ["customer.read", "redemption.read", "redemption.write"],
  "/gold-rates": ["gold-rate.read", "gold-rate.write"],
  "/reminders": ["message.read", "settings.read"],
  "/reports": ["report.read"],
  "/support": ["grievance.read"],
  "/schemes": ["plan.read", "plan.write"],
  "/staff-branches": [
    "staff.read",
    "staff.write",
    "branch.read",
    "branch.write",
  ],
  "/audit": ["audit.read"],
  "/settings": ["settings.read", "settings.write"],
  "/ecommerce": ["ecommerce.read"],
  "/ecommerce/catalog": ["ecommerce.read"],
  "/ecommerce/campaigns": ["ecommerce.read"],
  "/ecommerce/categories": ["ecommerce.read"],
  "/ecommerce/banners": ["ecommerce.read"],
  "/ecommerce/gold-rates": ["ecommerce.read"],
  "/ecommerce/tax": ["ecommerce.read"],
  "/ecommerce/inventory": ["ecommerce.read"],
  "/ecommerce/fulfilment": ["ecommerce.read"],
  "/ecommerce/orders": ["ecommerce.read"],
  "/ecommerce/payment-exceptions": ["ecommerce.read"],
  "/ecommerce/courier-cod": ["ecommerce.read"],
  "/digital-metals": ["digital-metals.read"],
  "/digital-metals/purchases": ["digital-metals.read"],
  "/digital-metals/sells": ["digital-metals.read"],
  "/digital-metals/payouts": ["digital-metals.read"],
  "/digital-metals/bank-verification": ["digital-metals.read"],
  "/digital-metals/redemption/orders": ["digital-metals.read"],
  "/digital-metals/redemption/fulfilment": ["digital-metals.read"],
  "/digital-metals/redemption/catalogue": ["digital-metals.read"],
  "/digital-metals/procurement": ["digital-metals.read"],
  "/digital-metals/hedge": ["digital-metals.read"],
  "/digital-metals/payment-exceptions": ["digital-metals.read"],
  "/digital-metals/settings": ["digital-metals.read"],
  "/digital-metals/rates": ["digital-metals.read"],
};

export function canAccessRoute(
  href: string,
  user: PortalUser | undefined,
): boolean {
  const perms = NAV_PERMISSIONS[href];
  if (!perms?.length) return true;
  return hasAnyPermission(user, perms);
}
