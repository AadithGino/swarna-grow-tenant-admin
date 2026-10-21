"use client";

import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { useGetCustomerDigitalMetalsCapabilityQuery } from "@/src/store/api/customer-api";

/** True when the customer app may show Digital Gold & Silver entry points (server capability). */
export function useCustomerDigitalMetalsVisible() {
  const { tenantSlug } = useCustomerTenant();
  const capability = useGetCustomerDigitalMetalsCapabilityQuery(undefined, {
    skip: !tenantSlug,
  });
  const visible = capability.data?.canViewHoldings === true;
  return {
    visible,
    capability: capability.data,
    loading: capability.isLoading || capability.isFetching,
    isError: capability.isError,
  };
}
