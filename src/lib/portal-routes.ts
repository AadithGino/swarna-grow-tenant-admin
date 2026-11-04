/** Top-level portal path segments handled by `PortalRouter`. */
export const PORTAL_SECTIONS = new Set([
  "dashboard",
  "customers",
  "enrollments",
  "dues",
  "collections",
  "cash-control",
  "payments",
  "maturity",
  "gold-rates",
  "reports",
  "schemes",
  "staff-branches",
  "support",
  "audit",
  "settings",
  "ecommerce",
  "digital-metals",
  "alerts",
  "login",
  "shop",
]);

export function isKnownPortalSection(section: string): boolean {
  return PORTAL_SECTIONS.has(section);
}
