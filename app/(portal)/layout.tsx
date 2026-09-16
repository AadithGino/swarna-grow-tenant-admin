"use client";

import { usePathname } from "next/navigation";
import { AdminShell } from "@/src/components/layout/admin-shell";
import { PlatformShell } from "@/src/components/layout/platform-shell";
import { CustomerShell } from "@/src/components/customer/customer-shell";
import { CustomerTenantProvider } from "@/src/components/customer/customer-tenant-context";
import { CUSTOMER_ROUTE_SECTIONS } from "@/src/lib/customer-tenant";

function customerTenantSlugFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "customer" || !parts[1]) return null;
  if (CUSTOMER_ROUTE_SECTIONS.has(parts[1])) return null;
  return parts[1];
}

function isCustomerPortalPath(pathname: string): boolean {
  return pathname === "/customer" || pathname.startsWith("/customer/");
}

function isCustomerAuthSurface(pathname: string): boolean {
  return (
    pathname === "/customer/login" ||
    pathname === "/customer/onboarding" ||
    /^\/customer\/[^/]+\/(login|onboarding)\/?$/.test(pathname)
  );
}

/** Keeps sidebar + topbar mounted across in-app navigations (see [[...slug]] page). */
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname === "/login") return children;
  if (pathname === "/platform/login") return children;
  if (isCustomerPortalPath(pathname)) {
    const tenantSlug = customerTenantSlugFromPath(pathname);
    const inner = isCustomerAuthSurface(pathname) ? children : <CustomerShell>{children}</CustomerShell>;
    return (
      <CustomerTenantProvider tenantSlug={tenantSlug}>
        {inner}
      </CustomerTenantProvider>
    );
  }
  if (pathname.startsWith("/platform")) return <PlatformShell>{children}</PlatformShell>;
  return <AdminShell>{children}</AdminShell>;
}
