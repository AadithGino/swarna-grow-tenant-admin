import { money } from "@/src/lib/format";
import { amountWithinPayableQuote } from "@/src/lib/payment-limits";

export const PAYMENT_REFERENCE_MAX = 160;
export const PAYMENT_REMARKS_MAX = 500;
export const PAYMENT_REVERSAL_REASON_MIN = 3;
export const PAYMENT_REVERSAL_REASON_MAX = 500;

export type PayableQuoteBounds = {
  min: number;
  max: number;
  multipleOf?: number;
  eligible?: boolean;
  allowedAmountsPaise?: number[];
};

export function payableAmountRangeMessage(quote: PayableQuoteBounds): string {
  let msg = `Enter an amount between ${money(quote.min)} and ${money(quote.max)}`;
  if (quote.multipleOf) {
    msg += ` (multiples of ${money(quote.multipleOf)})`;
  }
  if (quote.allowedAmountsPaise?.length) {
    msg = `Choose one of the allowed amounts: ${quote.allowedAmountsPaise
      .map((paise) => money(paise / 100))
      .join(", ")}`;
  }
  return `${msg}.`;
}

export function validatePaymentEnrollmentId(schemeId: string): string | undefined {
  if (!schemeId.trim()) return "Select an enrollment.";
  return undefined;
}

export function validatePayableAmount(
  amount: number | "",
  quote?: PayableQuoteBounds,
): string | undefined {
  if (!quote?.eligible) {
    return "This enrollment is not payable right now.";
  }
  if (amount === "" || !Number.isFinite(amount) || amount <= 0) {
    return "Enter a payment amount greater than zero.";
  }
  if (!amountWithinPayableQuote(amount, quote)) {
    return payableAmountRangeMessage(quote);
  }
  const amountPaise = Math.round(amount * 100);
  if (quote.allowedAmountsPaise?.length && !quote.allowedAmountsPaise.includes(amountPaise)) {
    return payableAmountRangeMessage(quote);
  }
  return undefined;
}

export function livePayableAmountError(
  amount: number | "",
  quote?: PayableQuoteBounds,
): string | undefined {
  if (!quote?.eligible) return undefined;
  if (amount === "") return undefined;
  return validatePayableAmount(amount, quote);
}

export function paymentAmountReady(
  amount: number | "",
  quote?: PayableQuoteBounds,
): boolean {
  return validatePayableAmount(amount, quote) === undefined;
}

export function validatePaymentReference(reference: string): string | undefined {
  if (reference.length > PAYMENT_REFERENCE_MAX) {
    return `Reference must be ${PAYMENT_REFERENCE_MAX} characters or fewer.`;
  }
  return undefined;
}

export function validatePaymentRemarks(remarks: string): string | undefined {
  if (remarks.length > PAYMENT_REMARKS_MAX) {
    return `Remarks must be ${PAYMENT_REMARKS_MAX} characters or fewer.`;
  }
  return undefined;
}

export function livePaymentReferenceError(
  reference: string,
): string | undefined {
  return validatePaymentReference(reference);
}

export function livePaymentRemarksError(remarks: string): string | undefined {
  return validatePaymentRemarks(remarks);
}

export function validatePaymentReversalReason(
  reason: string,
): string | undefined {
  const trimmed = reason.trim();
  if (!trimmed) return "Reversal reason is required.";
  if (trimmed.length < PAYMENT_REVERSAL_REASON_MIN) {
    return `Reason must be at least ${PAYMENT_REVERSAL_REASON_MIN} characters.`;
  }
  if (trimmed.length > PAYMENT_REVERSAL_REASON_MAX) {
    return `Reason must be ${PAYMENT_REVERSAL_REASON_MAX} characters or fewer.`;
  }
  return undefined;
}

export function livePaymentReversalReasonError(
  reason: string,
): string | undefined {
  const trimmed = reason.trim();
  if (!trimmed) return undefined;
  return validatePaymentReversalReason(reason);
}

export function paymentReversalReasonReady(reason: string): boolean {
  return validatePaymentReversalReason(reason) === undefined;
}

/** One-click payment link: amount must be positive (quote optional). */
export function validatePaymentLinkAmount(amount: number): string | undefined {
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Payment link amount must be greater than zero.";
  }
  return undefined;
}
