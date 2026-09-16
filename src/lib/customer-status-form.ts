/** Matches backend `customerBlockBody.reason` (optional, 3–500 when provided). */
export const CUSTOMER_STATUS_REASON_MIN = 3;
export const CUSTOMER_STATUS_REASON_MAX = 500;

export function liveCustomerStatusReasonError(
  reason: string,
): string | undefined {
  const trimmed = reason.trim();
  if (!trimmed) return undefined;
  if (trimmed.length < CUSTOMER_STATUS_REASON_MIN) {
    return `Reason must be at least ${CUSTOMER_STATUS_REASON_MIN} characters.`;
  }
  if (reason.length > CUSTOMER_STATUS_REASON_MAX) {
    return `Reason must be ${CUSTOMER_STATUS_REASON_MAX} characters or fewer.`;
  }
  return undefined;
}

export function validateCustomerStatusReasonRequired(
  reason: string,
): string | undefined {
  const trimmed = reason.trim();
  if (!trimmed) {
    return "Reason is required.";
  }
  if (trimmed.length < CUSTOMER_STATUS_REASON_MIN) {
    return `Reason must be at least ${CUSTOMER_STATUS_REASON_MIN} characters.`;
  }
  if (trimmed.length > CUSTOMER_STATUS_REASON_MAX) {
    return `Reason must be ${CUSTOMER_STATUS_REASON_MAX} characters or fewer.`;
  }
  return undefined;
}

export function customerStatusReasonReady(reason: string): boolean {
  return validateCustomerStatusReasonRequired(reason) === undefined;
}
