export function customerOtpLengthFromTenant(tenant?: { otpLength?: number | null } | null): number {
  const len = Number(tenant?.otpLength ?? 6);
  if (!Number.isInteger(len) || len < 4 || len > 8) return 6;
  return len;
}

export function customerOtpPattern(length: number): RegExp {
  const safe = Math.min(8, Math.max(4, length));
  return new RegExp(`^\\d{${safe}}$`);
}

export function customerOtpIncompleteMessage(length: number): string {
  return `Enter the ${length}-digit code sent to your mobile.`;
}
