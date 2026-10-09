import type { MoneyRef, SchemePlan } from "@/src/types/customer";
import { money } from "@/src/mocks/customer-data";

export type CustomerEnrolMockResponse = {
  scheme: { id: string; schemeNumber: string };
  paymentType?: "FLEXIBLE_PAYMENT_INTENT" | "FIXED_PAYMENT_LINK";
  paymentIntent?: {
    id: string;
    paymentId: string;
    paymentUrl: string;
    status: string;
  };
  paymentLink?: {
    id: string;
    token: string;
    gatewayUrl: string;
    amount: MoneyRef;
    expiresAt: string;
  };
};

/** Mirrors backend customer self-enrol first-installment resolution for mocks. */
export function resolveCustomerEnrolFirstInstallmentMode(
  plan: SchemePlan,
  payNow: boolean | undefined,
): "COLLECT_NOW" | "START_NEXT_CYCLE" {
  const lockedDefault =
    plan.enrolRules?.firstInstallmentModeDefault ??
    plan.firstInstallmentModeDefault ??
    "COLLECT_NOW";
  const editable =
    plan.enrolRules?.firstInstallmentModeEditable ??
    plan.firstInstallmentModeEditable ??
    true;
  if (editable === false) return lockedDefault;
  if (payNow === false) return "START_NEXT_CYCLE";
  if (payNow === true) return "COLLECT_NOW";
  return lockedDefault;
}

export function buildCustomerEnrolMockResponse(
  plan: SchemePlan,
  body: { installmentAmountPaise?: number; payNow?: boolean },
): CustomerEnrolMockResponse {
  const mode = resolveCustomerEnrolFirstInstallmentMode(plan, body.payNow);
  const base = {
    scheme: { id: "sch_new", schemeNumber: "ENR-24992" },
  };
  if (mode === "START_NEXT_CYCLE") return base;

  const flexible = plan.model === "FLEXIBLE";
  const amountPaise = Number(body.installmentAmountPaise ?? 250_000);
  if (flexible) {
    return {
      ...base,
      paymentType: "FLEXIBLE_PAYMENT_INTENT",
      paymentIntent: {
        id: "pi_new",
        paymentId: "pay_new",
        paymentUrl: "https://mercury.phonepe.com/transact/pg?token=mock",
        status: "PENDING",
      },
    };
  }
  return {
    ...base,
    paymentType: "FIXED_PAYMENT_LINK",
    paymentLink: {
      id: "pl_new",
      token: "mock_pay_link",
      gatewayUrl: "/pay/mock_pay_link",
      amount: money(amountPaise),
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
    },
  };
}
