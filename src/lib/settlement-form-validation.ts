export const SETTLEMENT_REMARKS_MAX = 500;
export const SETTLEMENT_REMARKS_MIN = 3;

export function liveSettlementRemarksError(
  remarks: string,
  options?: { required?: boolean },
): string | undefined {
  const trimmed = remarks.trim();
  if (!trimmed) {
    return undefined;
  }
  if (options?.required && trimmed.length < SETTLEMENT_REMARKS_MIN) {
    return `Remarks must be at least ${SETTLEMENT_REMARKS_MIN} characters.`;
  }
  if (!options?.required && trimmed.length > 0 && trimmed.length < SETTLEMENT_REMARKS_MIN) {
    return `Remarks must be at least ${SETTLEMENT_REMARKS_MIN} characters.`;
  }
  if (remarks.length > SETTLEMENT_REMARKS_MAX) {
    return `Remarks must be ${SETTLEMENT_REMARKS_MAX} characters or fewer.`;
  }
  return undefined;
}

export function validateSettlementRemarks(
  remarks: string,
  options?: { required?: boolean },
): string | undefined {
  const trimmed = remarks.trim();
  if (options?.required && !trimmed) {
    return "Remarks are required.";
  }
  if (trimmed && trimmed.length < SETTLEMENT_REMARKS_MIN) {
    return `Remarks must be at least ${SETTLEMENT_REMARKS_MIN} characters.`;
  }
  if (trimmed.length > SETTLEMENT_REMARKS_MAX) {
    return `Remarks must be ${SETTLEMENT_REMARKS_MAX} characters or fewer.`;
  }
  return undefined;
}

/** Premature closure always requires explanatory remarks for audit trail. */
export function prematureClosureRemarksReady(remarks: string): boolean {
  return validateSettlementRemarks(remarks, { required: true }) === undefined;
}

export function redeemRemarksReady(remarks: string): boolean {
  return validateSettlementRemarks(remarks, { required: false }) === undefined;
}
