import { money } from "@/src/lib/format";

export const HANDOVER_REMARKS_MAX = 500;
export const HANDOVER_REJECT_REASON_MIN = 3;

export function validateHandoverStaffId(staffId: string): string | undefined {
  if (!staffId.trim()) return "Select a staff member.";
  return undefined;
}

export function validateHandoverAmount(
  amount: number,
  maxSubmit?: number,
): string | undefined {
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Enter an amount greater than zero.";
  }
  if (maxSubmit != null && maxSubmit >= 0 && amount - 1e-9 > maxSubmit) {
    return `Amount cannot exceed available to submit (${money(maxSubmit)}).`;
  }
  return undefined;
}

export function liveHandoverAmountError(
  amount: number,
  maxSubmit?: number,
): string | undefined {
  if (!amount) return undefined;
  return validateHandoverAmount(amount, maxSubmit);
}

export function validateHandoverReceiptCount(count: number): string | undefined {
  if (!Number.isInteger(count) || count < 1) {
    return "Receipt count must be at least 1.";
  }
  return undefined;
}

export function validateHandoverRemarks(remarks: string): string | undefined {
  if (remarks.length > HANDOVER_REMARKS_MAX) {
    return `Remarks must be ${HANDOVER_REMARKS_MAX} characters or fewer.`;
  }
  return undefined;
}

export function liveHandoverRemarksError(remarks: string): string | undefined {
  return validateHandoverRemarks(remarks);
}

export function markCashHandoverFormReady(input: {
  staffId: string;
  amount: number;
  receiptCount: number;
  remarks: string;
  maxSubmit?: number;
}): boolean {
  return (
    validateHandoverStaffId(input.staffId) === undefined &&
    validateHandoverAmount(input.amount, input.maxSubmit) === undefined &&
    validateHandoverReceiptCount(input.receiptCount) === undefined &&
    validateHandoverRemarks(input.remarks) === undefined
  );
}

export function validateHandoverAcceptedAmount(
  amountRupee: number,
): string | undefined {
  if (!Number.isFinite(amountRupee) || amountRupee <= 0) {
    return "Accepted amount must be greater than zero.";
  }
  return undefined;
}

export function validateHandoverRejectReason(reason: string): string | undefined {
  const trimmed = reason.trim();
  if (!trimmed) return "Rejection reason is required.";
  if (trimmed.length < HANDOVER_REJECT_REASON_MIN) {
    return `Reason must be at least ${HANDOVER_REJECT_REASON_MIN} characters.`;
  }
  if (trimmed.length > HANDOVER_REMARKS_MAX) {
    return `Reason must be ${HANDOVER_REMARKS_MAX} characters or fewer.`;
  }
  return undefined;
}

export function liveHandoverRejectReasonError(
  reason: string,
): string | undefined {
  const trimmed = reason.trim();
  if (!trimmed) return undefined;
  return validateHandoverRejectReason(reason);
}
