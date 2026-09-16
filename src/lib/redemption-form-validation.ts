export const REDEMPTION_REMARKS_MAX = 500;
export const REDEMPTION_REJECT_REASON_MIN = 3;

export function validateRedemptionRejectReason(
  reason: string,
): string | undefined {
  const trimmed = reason.trim();
  if (!trimmed) return "Rejection reason is required.";
  if (trimmed.length < REDEMPTION_REJECT_REASON_MIN) {
    return `Reason must be at least ${REDEMPTION_REJECT_REASON_MIN} characters.`;
  }
  if (trimmed.length > REDEMPTION_REMARKS_MAX) {
    return `Reason must be ${REDEMPTION_REMARKS_MAX} characters or fewer.`;
  }
  return undefined;
}

export function liveRedemptionRejectReasonError(
  reason: string,
): string | undefined {
  const trimmed = reason.trim();
  if (!trimmed) return undefined;
  return validateRedemptionRejectReason(reason);
}

export function validateRedemptionCompleteRemarks(
  remarks: string,
): string | undefined {
  if (remarks.length > REDEMPTION_REMARKS_MAX) {
    return `Remarks must be ${REDEMPTION_REMARKS_MAX} characters or fewer.`;
  }
  return undefined;
}

export function liveRedemptionCompleteRemarksError(
  remarks: string,
): string | undefined {
  return validateRedemptionCompleteRemarks(remarks);
}

export function redemptionRejectReasonReady(reason: string): boolean {
  return validateRedemptionRejectReason(reason) === undefined;
}
