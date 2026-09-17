"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useResolveTenantQuery } from "@/src/store/api/customer-api";
import { env } from "@/src/config/env";
import {
  CUSTOMER_TENANT_SLUG_STORAGE_KEY,
  tenantCodeToSlug,
  tenantSlugToCode,
} from "@/src/lib/customer-tenant";

type CustomerTenantContextValue = {
  tenantSlug: string | null;
  tenantCode: string;
  tenant: {
    tenantCode: string;
    displayName: string;
    appDisplayName?: string;
    logoUrl?: string | null;
    primaryColor?: string;
    kycMandatory?: boolean;
    customerSelfRegistration?: boolean;
    customerSelfEnrol?: boolean;
    multiScheme?: boolean;
    supportNumber?: string;
  } | null;
  loading: boolean;
  notFound: boolean;
};

const CustomerTenantContext = createContext<CustomerTenantContextValue | null>(
  null,
);

function resolveSlug(initial: string | null): string | null {
  if (initial) return initial;
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(CUSTOMER_TENANT_SLUG_STORAGE_KEY);
    if (stored) return stored;
  }
  if (env.customerTenantCode) return tenantCodeToSlug(env.customerTenantCode);
  return null;
}

export function CustomerTenantProvider({
  tenantSlug: initialSlug,
  children,
}: {
  tenantSlug: string | null;
  children: ReactNode;
}) {
  const tenantSlug = resolveSlug(initialSlug);
  const tenantCode = tenantSlug ? tenantSlugToCode(tenantSlug) : env.customerTenantCode;

  const { data, isLoading, isError } = useResolveTenantQuery(
    { tenantCode },
    { skip: !tenantCode },
  );

  const tenant = data?.tenants?.[0] ?? null;

  useEffect(() => {
    if (tenantSlug && typeof window !== "undefined") {
      localStorage.setItem(CUSTOMER_TENANT_SLUG_STORAGE_KEY, tenantSlug);
    }
  }, [tenantSlug]);

  const value = useMemo(
    (): CustomerTenantContextValue => ({
      tenantSlug,
      tenantCode: tenant?.tenantCode ?? tenantCode,
      tenant: tenant
        ? {
            tenantCode: tenant.tenantCode,
            displayName: tenant.displayName,
            appDisplayName: tenant.appDisplayName,
            logoUrl: tenant.logoUrl,
            primaryColor: tenant.primaryColor,
            kycMandatory: tenant.kycMandatory,
            customerSelfRegistration: tenant.customerSelfRegistration,
            customerSelfEnrol: tenant.customerSelfEnrol,
            multiScheme: tenant.multiScheme,
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
