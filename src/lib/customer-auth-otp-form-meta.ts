import { customerOtpLengthFromTenant } from "@/src/lib/customer-otp-ui";

export type OtpRequestMetaPick = {
  otpLength?: number | null;
  authCountryCode?: string | null;
};

/** Resolve-tenant branding plus OTP SMS fields (AUD-09); no need for full `TenantBranding`. */
export type TenantOtpInputSlice = {
  otpLength?: number | null;
  authCountryCode?: string | null;
};

export function customerAuthOtpLengthFromContext(
  tenant: TenantOtpInputSlice | null | undefined,
  requestMeta: OtpRequestMetaPick | null,
): number {
  return customerOtpLengthFromTenant({
    otpLength: requestMeta?.otpLength ?? tenant?.otpLength,
  });
}

export function customerAuthOtpSmsRegionFromContext(
  tenant: TenantOtpInputSlice | null | undefined,
  requestMeta: OtpRequestMetaPick | null,
): string | null | undefined {
  return requestMeta?.authCountryCode ?? tenant?.authCountryCode;
}
