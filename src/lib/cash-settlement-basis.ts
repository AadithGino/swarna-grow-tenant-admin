export type CashSettlementBasis = "GOLD_VALUE" | "PAID_AMOUNT";
export type PaidAmountBenefitTreatment = "EXCLUDE" | "INCLUDE_MONETARY";

export const DEFAULT_CASH_SETTLEMENT_BASIS: CashSettlementBasis = "GOLD_VALUE";
export const DEFAULT_PAID_AMOUNT_BENEFIT_TREATMENT: PaidAmountBenefitTreatment =
  "EXCLUDE";

export function resolveCashSettlementBasis(
  rules?: {
    cashSettlementBasis?: CashSettlementBasis | null;
  } | null,
): CashSettlementBasis {
  const raw = rules?.cashSettlementBasis;
  if (raw === "PAID_AMOUNT" || raw === "GOLD_VALUE") return raw;
  return DEFAULT_CASH_SETTLEMENT_BASIS;
}

export function resolvePaidAmountBenefitTreatment(
  rules?: {
    paidAmountBenefitTreatment?: PaidAmountBenefitTreatment | null;
  } | null,
): PaidAmountBenefitTreatment {
  const raw = rules?.paidAmountBenefitTreatment;
  if (raw === "INCLUDE_MONETARY" || raw === "EXCLUDE") return raw;
  return DEFAULT_PAID_AMOUNT_BENEFIT_TREATMENT;
}

export function planShowsCashSettlementBasis(
  valueBasis: string,
  allowedModes: string[] | undefined,
): boolean {
  return (
    valueBasis === "GOLD_WEIGHT" &&
    (allowedModes ?? []).includes("CASH")
  );
}

export const CASH_SETTLEMENT_BASIS_OPTIONS: {
  value: CashSettlementBasis;
  label: string;
  description: string;
}[] = [
  {
    value: "GOLD_VALUE",
    label: "Value of accumulated gold at settlement-day 22K rate",
    description:
      "Cash payout equals accrued gold weight (plus eligible bonus weight) valued at the exact-day 22K rate, minus penalties.",
  },
  {
    value: "PAID_AMOUNT",
    label: "Net amount paid",
    description:
      "Cash payout equals net contributions recorded on the ledger (optionally plus an eligible monetary plan benefit), minus penalties — not today's gold price.",
  },
];

export function cashSettlementBasisLabel(basis: CashSettlementBasis): string {
  return (
    CASH_SETTLEMENT_BASIS_OPTIONS.find((row) => row.value === basis)?.label ??
    basis.replaceAll("_", " ")
  );
}

export function paidAmountCashFormulaNote(
  includeMonetaryBenefit: boolean,
): string {
  const benefitPart = includeMonetaryBenefit
    ? " + eligible monetary plan benefit"
    : "";
  return `Cash payout = max(0, net paid principal${benefitPart} − penalty). Accrued gold weight is closed on completion but does not set the cash amount.`;
}

export type PlanBenefitType =
  | "ONE_FREE_INSTALLMENT"
  | "FIXED_BONUS_AMOUNT"
  | "TEXT_ONLY";

/** Client-side guard aligned with backend plan validation (server remains authoritative). */
export function validatePlanCashSettlementFields(input: {
  valueBasis: string;
  allowedRedemptionModes: string[];
  cashSettlementBasis: CashSettlementBasis;
  includeMonetaryBenefitInPaidAmountCash: boolean;
  benefitType: PlanBenefitType;
}): string | null {
  if (
    !planShowsCashSettlementBasis(
      input.valueBasis,
      input.allowedRedemptionModes,
    )
  ) {
    return null;
  }
  if (
    input.cashSettlementBasis === "PAID_AMOUNT" &&
    input.includeMonetaryBenefitInPaidAmountCash
  ) {
    if (input.benefitType === "TEXT_ONLY") {
      return "Include monetary benefit requires a computed plan benefit (fixed bonus or one free installment), not text-only.";
    }
    if (
      input.benefitType !== "FIXED_BONUS_AMOUNT" &&
      input.benefitType !== "ONE_FREE_INSTALLMENT"
    ) {
      return "Include monetary benefit is only supported with fixed bonus or one free installment benefits.";
    }
  }
  return null;
}

export function isPaidAmountGoldCashPreview(
  preview: {
    cashSettlementBasis?: CashSettlementBasis;
    scheme?: { valueBasis?: string };
  },
  mode?: string,
): boolean {
  return (
    (preview.scheme?.valueBasis === "GOLD_WEIGHT" ||
      preview.cashSettlementBasis != null) &&
    mode === "CASH" &&
    (preview.cashSettlementBasis ?? DEFAULT_CASH_SETTLEMENT_BASIS) ===
      "PAID_AMOUNT"
  );
}
