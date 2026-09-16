import {
  customerPortalCapabilitiesFromTenant,
  useCustomerPortalCapabilities,
} from "@/src/lib/customer-portal-capabilities";

/** KYC UI in the customer portal only when the jeweller requires it for enrolment. */
export function isCustomerKycPortalEnabled(kycMandatory?: boolean | null): boolean {
  return kycMandatory === true;
}

export function useCustomerKycEnabled(): boolean {
  return useCustomerPortalCapabilities().kycMandatory;
}

export { customerPortalCapabilitiesFromTenant };
