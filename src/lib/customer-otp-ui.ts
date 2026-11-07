export function customerOtpLengthFromTenant(tenant?: { otpLength?: number | null } | null): number {
  const len = Number(tenant?.otpLength ?? 6);
  if (!Number.isInteger(len) || len < 4 || len > 8) return 6;
  return len;
}

/** Human label for OTP SMS — avoids implying unsupported regions (AUD-09). */
export function customerOtpSmsRegionLabel(authCountryCode?: string | null): string {
  const cc = String(authCountryCode ?? "91").replace(/\D/g, "") || "91";
  if (cc === "91") return "India";
  return `country code +${cc}`;
}

export function customerOtpPattern(length: number): RegExp {
  const safe = Math.min(8, Math.max(4, length));
  return new RegExp(`^\\d{${safe}}$`);
}

export function customerOtpIncompleteMessage(length: number): string {
  return `Enter the ${length}-digit code sent to your mobile.`;
}
