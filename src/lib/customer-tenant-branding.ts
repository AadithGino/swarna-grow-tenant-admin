import type { TenantBranding } from "@/src/types/customer";

function hexToRgbTriplet(hex: string): [number, number, number] | null {
  const clean = hex.replace("#", "").trim();
  if (clean.length !== 6 && clean.length !== 3) return null;
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** True when brand primary (or splash) is dark enough for light logo / gold on dark UI. */
export function isDarkBrandColor(hex: string | null | undefined): boolean {
  const rgb = hexToRgbTriplet(String(hex ?? ""));
  if (!rgb) return false;
  const [r, g, b] = rgb;
  return 0.299 * r + 0.587 * g + 0.114 * b < 88;
}

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
    splashBackgroundColor: (tenant.splashBackgroundColor
      ?? branding.splashBackgroundColor
      ?? null) as string | null,
    splashTagline: (tenant.splashTagline ?? branding.splashTagline ?? null) as string | null,
    splashEnabled: (tenant.splashEnabled ?? branding.splashEnabled) !== false,
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
