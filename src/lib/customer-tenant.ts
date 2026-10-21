/** Path segments under `/customer/:tenant?/…` that are routes, not tenant slugs. */
export const CUSTOMER_ROUTE_SECTIONS = new Set([
  "login",
  "schemes",
  "plans",
  "payments",
  "notifications",
  "profile",
  "security",
  "support",
  "gold-rate",
  "branches",
  "shop",
  "digital-metals",
  "pay",
  "onboarding",
]);

/** Maps URL slug to backend `tenantCode` (uppercase, hyphens → underscores). */
export function tenantSlugToCode(slug: string): string {
  return slug.trim().toUpperCase().replace(/-/g, "_");
}

export function tenantCodeToSlug(code: string): string {
  return code.trim().toLowerCase().replace(/_/g, "-");
}

export type ParsedCustomerPath = {
  tenantSlug: string | null;
  section: string;
  id?: string;
  extra?: string;
};

/** Parses `slug` from `PortalRouter` when `slug[0] === "customer"`. */
export function parseCustomerSlug(slug: string[]): ParsedCustomerPath {
  const rest = slug.slice(1);
  if (!rest.length) return { tenantSlug: null, section: "" };
  if (CUSTOMER_ROUTE_SECTIONS.has(rest[0])) {
    return { tenantSlug: null, section: rest[0], id: rest[1], extra: rest[2] };
  }
  return {
    tenantSlug: rest[0],
    section: rest[1] ?? "",
    id: rest[2],
    extra: rest[3],
  };
}

export function customerBasePath(tenantSlug: string | null | undefined): string {
  if (tenantSlug) return `/customer/${tenantSlug}`;
  return "/customer";
}

export function customerPath(
  tenantSlug: string | null | undefined,
  ...segments: string[]
): string {
  const base = customerBasePath(tenantSlug);
  const tail = segments.filter(Boolean).join("/");
  return tail ? `${base}/${tail}` : base;
}

export const CUSTOMER_TENANT_SLUG_STORAGE_KEY = "swarnagrow.customer.tenantSlug";
