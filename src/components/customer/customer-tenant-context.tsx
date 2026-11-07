"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useResolveTenantQuery } from "@/src/store/api/customer-api";
import { env } from "@/src/config/env";
import {
  CUSTOMER_TENANT_SLUG_STORAGE_KEY,
  tenantCodeToSlug,
  tenantSlugToCode,
} from "@/src/lib/customer-tenant";
import { normalizeCustomerTenantBranding } from "@/src/lib/customer-tenant-branding";

type CustomerTenantContextValue = {
  tenantSlug: string | null;
  tenantCode: string;
  tenant: {
    id?: string;
    tenantCode: string;
    displayName: string;
    appDisplayName?: string;
    logoUrl?: string | null;
    primaryColor?: string;
    accentColor?: string;
    kycMandatory?: boolean;
    customerSelfRegistration?: boolean;
    customerSelfEnrol?: boolean;
    multiScheme?: boolean;
    customerLoginMode?: "OTP_ONLY" | "PASSWORD_ONLY";
    otpLength?: number;
    authCountryCode?: string;
    customerAppWriteEnabled?: boolean;
    customerAppPaymentsEnabled?: boolean;
    supportNumber?: string;
  } | null;
  loading: boolean;
  notFound: boolean;
};

const CustomerTenantContext = createContext<CustomerTenantContextValue | null>(
  null,
);

function normalizeHexColor(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const hex = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(hex)) return hex.toUpperCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(hex)) {
    const [, r, g, b] = hex;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return fallback;
}

function hexToRgb(value: string): string {
  const clean = value.replace("#", "");
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

export function CustomerTenantProvider({
  tenantSlug: initialSlug,
  children,
}: {
  tenantSlug: string | null;
  children: ReactNode;
}) {
  const fallbackSlug = env.customerTenantCode
    ? tenantCodeToSlug(env.customerTenantCode)
    : null;

  const storedSlug = useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined") return () => {};
      const handler = () => onChange();
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
    () => localStorage.getItem(CUSTOMER_TENANT_SLUG_STORAGE_KEY),
    () => null,
  );

  const tenantSlug = initialSlug ?? storedSlug ?? fallbackSlug;

  const tenantCode = tenantSlug ? tenantSlugToCode(tenantSlug) : env.customerTenantCode;

  const { data, isLoading, isError } = useResolveTenantQuery(
    { tenantCode },
    { skip: !tenantCode },
  );

  const tenant = normalizeCustomerTenantBranding(data?.tenants?.[0] ?? null);

  const themePrimary = normalizeHexColor(tenant?.primaryColor, "#730321");
  const themeAccent = normalizeHexColor(tenant?.accentColor, "#C9A227");

  useEffect(() => {
    if (tenantSlug && typeof window !== "undefined") {
      localStorage.setItem(CUSTOMER_TENANT_SLUG_STORAGE_KEY, tenantSlug);
    }
  }, [tenantSlug]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    root.style.setProperty("--customer-primary", themePrimary);
    root.style.setProperty("--customer-primary-rgb", hexToRgb(themePrimary));
    root.style.setProperty("--customer-accent", themeAccent);
    root.style.setProperty("--customer-accent-rgb", hexToRgb(themeAccent));
  }, [themePrimary, themeAccent]);

  const value = useMemo(
    (): CustomerTenantContextValue => ({
      tenantSlug,
      tenantCode: tenant?.tenantCode ?? tenantCode,
      tenant: tenant
        ? {
            id: tenant.id,
            tenantCode: tenant.tenantCode,
            displayName: tenant.displayName,
            appDisplayName: tenant.appDisplayName,
            logoUrl: tenant.logoUrl,
            primaryColor: tenant.primaryColor,
            accentColor: tenant.accentColor,
            kycMandatory: tenant.kycMandatory,
            customerSelfRegistration: tenant.customerSelfRegistration,
            customerSelfEnrol: tenant.customerSelfEnrol,
            multiScheme: tenant.multiScheme,
            customerLoginMode: tenant.customerLoginMode,
            otpLength: tenant.otpLength,
            authCountryCode: tenant.authCountryCode,
            customerAppWriteEnabled: tenant.customerAppWriteEnabled,
            customerAppPaymentsEnabled: tenant.customerAppPaymentsEnabled,
            supportNumber: tenant.supportNumber,
          }
        : null,
      loading: Boolean(tenantCode) && isLoading,
      notFound: Boolean(tenantCode) && !isLoading && (isError || !tenant),
    }),
    [tenantSlug, tenantCode, tenant, isLoading, isError],
  );

  return (
    <CustomerTenantContext.Provider value={value}>
      {children}
    </CustomerTenantContext.Provider>
  );
}

export function useCustomerTenant(): CustomerTenantContextValue {
  const ctx = useContext(CustomerTenantContext);
  if (!ctx) {
    throw new Error("useCustomerTenant must be used within CustomerTenantProvider");
  }
  return ctx;
}
