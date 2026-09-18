import { customerPath, tenantCodeToSlug } from "@/src/lib/customer-tenant";

/** Path-only customer login URL for this jeweller (e.g. `/customer/kairali/login`). */
export function customerPortalLoginPath(tenantCode: string): string {
  return customerPath(tenantCodeToSlug(tenantCode), "login");
}

/** Absolute customer login URL using the current browser origin. */
export function customerPortalLoginUrl(tenantCode: string): string {
  const path = customerPortalLoginPath(tenantCode);
  if (typeof window === "undefined") return path;
  return `${window.location.origin.replace(/\/$/, "")}${path}`;
}
