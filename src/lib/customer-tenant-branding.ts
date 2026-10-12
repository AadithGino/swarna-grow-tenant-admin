import type { TenantBranding } from "@/src/types/customer";

/** Flatten nested `branding` from API payloads into top-level tenant colour fields. */
export function normalizeCustomerTenantBranding(
  tenant: Record<string, unknown> | null | undefined,
): TenantBranding | null {
  if (!tenant) return null;
  const branding = (tenant.branding ?? {}) as Record<string, unknown>;
  return {
    ...tenant,
    tenantCode: String(tenant.tenantCode ?? tenant.code ?? ""),
    displayName: String(tenant.displayName ?? branding.displayName ?? tenant.name ?? ""),
    appDisplayName: String(
      tenant.appDisplayName ?? branding.appDisplayName ?? branding.displayName ?? tenant.name ?? "",
    ),
    logoUrl: (tenant.logoUrl ?? branding.logoUrl ?? null) as string | null,
    primaryColor: String(tenant.primaryColor ?? branding.primaryColor ?? "#7c2d12"),
    accentColor: String(
      tenant.accentColor ?? branding.accentColor ?? branding.secondaryColor ?? "#b45309",
    ),
    foregroundColor: String(tenant.foregroundColor ?? branding.foregroundColor ?? "#ffffff"),
    contrastColor: String(tenant.contrastColor ?? branding.contrastColor ?? "#ffffff"),
    supportNumber: String(tenant.supportNumber ?? branding.supportNumber ?? ""),
    city: String(tenant.city ?? branding.city ?? ""),
  } as TenantBranding;
}

export function normalizeCustomerTenantResolve(data: {
  resolvedBy?: string;
  tenantCode?: string | null;
  tenants?: Record<string, unknown>[];
}): { resolvedBy?: string; tenantCode?: string | null; tenants: TenantBranding[] } {
  return {
    ...data,
    tenants: (data.tenants ?? [])
      .map((row) => normalizeCustomerTenantBranding(row))
      .filter((row): row is TenantBranding => row != null),
  };
}
