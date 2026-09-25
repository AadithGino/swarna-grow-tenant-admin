import { livePaymentReferenceError } from "@/src/lib/payment-form-validation";
import type { V1ManualPaymentMode } from "@/src/lib/v1-payment-modes";

export type EnrolFirstPaymentAction =
  | "RECORD_MANUAL_PAYMENT"
  | "CREATE_PAYMENT_LINK";

export type EnrolFirstPaymentFields = {
  firstInstallmentAction: EnrolFirstPaymentAction;
  paymentMode: V1ManualPaymentMode;
  paymentReference: string;
};

export const DEFAULT_ENROL_FIRST_PAYMENT: EnrolFirstPaymentFields = {
  firstInstallmentAction: "RECORD_MANUAL_PAYMENT",
  paymentMode: "CASH",
  paymentReference: "",
};

export function validateEnrolFirstPaymentFields(
  collectNow: boolean,
  fields: EnrolFirstPaymentFields,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!collectNow) return errors;
  if (fields.firstInstallmentAction === "RECORD_MANUAL_PAYMENT") {
    if (!fields.paymentMode) {
      errors.paymentMode = "Select how the customer paid.";
    }
    const refErr = livePaymentReferenceError(fields.paymentReference);
    if (refErr) errors.paymentReference = refErr;
  }
  return errors;
}

export function enrolFirstPaymentSubmitReady(
  collectNow: boolean,
  fields: EnrolFirstPaymentFields,
): boolean {
  return (
    Object.keys(validateEnrolFirstPaymentFields(collectNow, fields)).length ===
    0
  );
}

/** New flexible schemes start at position version 0 (see backend payments-phase2 tests). */
export const ENROL_FLEXIBLE_POSITION_VERSION = 0;

export function buildEnrolFirstPaymentRequest(
  collectNow: boolean,
  amountRupee: number,
  fields: EnrolFirstPaymentFields,
  options?: { isFlexiblePlan?: boolean },
): {
  firstInstallmentAction?: EnrolFirstPaymentAction;
  payment?: {
    amountPaise: number;
    mode: V1ManualPaymentMode;
    reference?: string;
    expectedPositionVersion?: number;
  };
} {
  if (!collectNow) return {};
  if (fields.firstInstallmentAction === "RECORD_MANUAL_PAYMENT") {
    const reference = fields.paymentReference.trim();
    return {
      firstInstallmentAction: fields.firstInstallmentAction,
      payment: {
        amountPaise: Math.round(amountRupee * 100),
        mode: fields.paymentMode,
        ...(reference ? { reference } : {}),
        ...(options?.isFlexiblePlan
          ? { expectedPositionVersion: ENROL_FLEXIBLE_POSITION_VERSION }
          : {}),
      },
    };
  }
  return { firstInstallmentAction: fields.firstInstallmentAction };
}

export function enrolFlexiblePaymentLinkPositionVersion(
  isFlexiblePlan: boolean,
): number | undefined {
  return isFlexiblePlan ? ENROL_FLEXIBLE_POSITION_VERSION : undefined;
}
