import { useAppSelector } from "@/src/store/hooks";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { useGetCustomerProfileQuery } from "@/src/store/api/customer-api";
import type { TenantBranding } from "@/src/types/customer";

export type CustomerPortalCapabilities = {
  kycMandatory: boolean;
  customerSelfRegistration: boolean;
  customerSelfEnrol: boolean;
  multiScheme: boolean;
  customerLoginMode: "OTP_ONLY" | "PASSWORD_ONLY";
  customerAppWriteEnabled: boolean;
  customerAppPaymentsEnabled: boolean;
};

function capBool(value: boolean | undefined | null, defaultWhenUnset: boolean): boolean {
  if (value === true) return true;
  if (value === false) return false;
  return defaultWhenUnset;
}

export function customerPortalCapabilitiesFromTenant(
  tenant?: Partial<TenantBranding> | null,
): CustomerPortalCapabilities {
  return {
    kycMandatory: tenant?.kycMandatory === true,
    customerSelfRegistration: capBool(tenant?.customerSelfRegistration, true),
    customerSelfEnrol: capBool(tenant?.customerSelfEnrol, true),
    multiScheme: capBool(tenant?.multiScheme, true),
    customerLoginMode:
      tenant?.customerLoginMode === "PASSWORD_ONLY"
        ? "PASSWORD_ONLY"
        : "OTP_ONLY",
    customerAppWriteEnabled: capBool(tenant?.customerAppWriteEnabled, true),
    customerAppPaymentsEnabled: capBool(tenant?.customerAppPaymentsEnabled, true),
  };
}

/** Tenant operational rules for the customer portal (resolve tenant + session + profile). */
export function useCustomerPortalCapabilities(): CustomerPortalCapabilities {
  const session = useAppSelector((s) => s.customerSession);
  const authenticated = session.authenticated;
  const { tenant } = useCustomerTenant();
  const { data: profile } = useGetCustomerProfileQuery(undefined, {
    skip: !authenticated,
  });

  const fromTenant = customerPortalCapabilitiesFromTenant(tenant ?? profile?.tenant);

  return {
    kycMandatory:
      session.kycMandatory != null ? session.kycMandatory === true : fromTenant.kycMandatory,
    customerSelfRegistration:
      session.customerSelfRegistration != null
        ? session.customerSelfRegistration
        : fromTenant.customerSelfRegistration,
    customerSelfEnrol:
      session.customerSelfEnrol != null ? session.customerSelfEnrol : fromTenant.customerSelfEnrol,
    multiScheme: session.multiScheme != null ? session.multiScheme : fromTenant.multiScheme,
    customerLoginMode:
      session.customerLoginMode != null
        ? session.customerLoginMode
        : fromTenant.customerLoginMode,
    customerAppWriteEnabled:
      session.customerAppWriteEnabled != null
        ? session.customerAppWriteEnabled
        : fromTenant.customerAppWriteEnabled,
    customerAppPaymentsEnabled:
      session.customerAppPaymentsEnabled != null
        ? session.customerAppPaymentsEnabled
        : fromTenant.customerAppPaymentsEnabled,
  };
}
