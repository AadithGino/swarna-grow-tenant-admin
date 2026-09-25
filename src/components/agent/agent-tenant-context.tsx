"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useResolveTenantQuery } from "@/src/store/api/customer-api";
import { tenantSlugToCode } from "@/src/lib/customer-tenant";

type AgentTenantContextValue = {
  tenantSlug: string | null;
  tenantCode: string;
  displayName: string | null;
  logoUrl: string | null;
  loading: boolean;
  notFound: boolean;
};

const AgentTenantContext = createContext<AgentTenantContextValue | null>(null);

export function AgentTenantProvider({
  tenantSlug,
  children,
}: {
  tenantSlug: string | null;
  children: ReactNode;
}) {
  const tenantCode = tenantSlug ? tenantSlugToCode(tenantSlug) : "";
  const { data, isLoading, isError } = useResolveTenantQuery(
    { tenantCode },
    { skip: !tenantCode },
  );
  const tenant = data?.tenants?.[0] ?? null;

  const value = useMemo(
    (): AgentTenantContextValue => ({
      tenantSlug,
      tenantCode: tenant?.tenantCode ?? tenantCode,
      displayName: tenant?.displayName ?? tenant?.appDisplayName ?? null,
      logoUrl: tenant?.logoUrl ?? null,
      loading: Boolean(tenantCode) && isLoading,
      notFound: Boolean(tenantCode) && !isLoading && (isError || !tenant),
    }),
    [tenantSlug, tenantCode, tenant, isLoading, isError],
  );

  return (
    <AgentTenantContext.Provider value={value}>
      {children}
    </AgentTenantContext.Provider>
  );
}

export function useAgentTenant(): AgentTenantContextValue {
  const ctx = useContext(AgentTenantContext);
  if (!ctx) {
    throw new Error("useAgentTenant must be used within AgentTenantProvider");
  }
  return ctx;
}
