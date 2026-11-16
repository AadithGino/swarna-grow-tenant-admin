import { oneTimeBonusLabel, type OneTimeGoldRules } from "@/src/types/one-time-gold";
/** Form state aligned with POST /admin/scheme-plans (05-scheme-plans.md). */
import { istBusinessDateToday } from "@/src/lib/ist-business-date";

export type BenefitType =
  | "ONE_FREE_INSTALLMENT"
  | "FIXED_BONUS_AMOUNT"
  | "MATURITY_GOLD_CREDIT"
  | "TEXT_ONLY";

export type BonusBasis = "FLAT" | "PERCENT_OF_PAID";

export type PenaltyMode = "NONE" | "FLAT" | "PERCENT_OF_PAID";

export type BenefitTreatment = "FORFEIT" | "FULL";

export type RedemptionMode =
  | "CASH"
  | "GOLD_HANDOVER"
  | "PURCHASE_ADJUSTMENT";

export type CashSettlementBasis = "GOLD_VALUE" | "PAID_AMOUNT";

import { resolveMaturityGoldRules, type CollectionRules, type MaturityGoldRules } from "@/src/types/collection";

export type PlanBuilderFormState = {
  oneTimeRules?: OneTimeGoldRules;
  collectionRules?: CollectionRules;
  name: string;
  code: string;
  displayName: string;
  description: string;
  termsText: string;
  valueBasis: "CASH" | "GOLD_WEIGHT";
  paymentPattern: "FIXED_DATE" | "FLEXIBLE_AVERAGE";
  durationMonths: number;
  installmentCount: number;
  amountMode: "JEWELLER_FIXED" | "JEWELLER_SLABS" | "CUSTOMER_CHOSEN";
  fixedAmount: number;
  slabsCsv: string;
  minAmount: number;
  maxAmount: number;
  multipleOf: number;
  partialPaymentAllowed: boolean;
  advancePaymentAllowed: boolean;
  maxAdvanceInstallments: number;
  minPaymentPerTxn: number;
  maxPaymentPerTxn: number;
  dueDay: number;
  graceDays: number;
  firstInstallmentCollectNow: boolean;
  firstInstallmentModeEditable: boolean;
  flexiblePhaseCycles: number;
  cappedPhaseCycles: number;
  averagingDivisor: number;
  capFormula:
    | "FLEXIBLE_PHASE_TOTAL_DIV_AVERAGING_DIVISOR"
    | "FLEXIBLE_PHASE_TOTAL_DIV_PAYMENT_COUNT";
  flexMinPayment: number;
  flexMaxPayment: number;
  flexPaymentIncrement: number;
  flexMinTotal: number;
  capRoundingMode: "ROUND_UP";
  capRoundToNearest: number;
  capMinCycle: number;
  capMaxCycle: number;
  onZeroFlexibleTotal: "CLOSE_SCHEME" | "USE_MINIMUM";
  onBelowMinimumTotal: "USE_MINIMUM" | "CLOSE_SCHEME";
  cappedMinPayment: number;
  allowFinalRemainderBelowMinimum: boolean;
  allowFutureCyclePayment: boolean;
  maxAdvanceCycles: number;
  blockPaymentIfRateNotSet: boolean;
  weightRoundingMode: "HALF_UP" | "ROUND_DOWN" | "ROUND_UP";
  weightPrecisionMg: number;
  benefitType: BenefitType;
  goldBonus: MaturityGoldRules;
  benefitDisplayLabel: string;
  requireAllInstallmentsPaid: boolean;
  maxAllowedDefaults: number;
  minMonthsCompleted: number;
  bonusBasis: BonusBasis;
  bonusValue: number;
  maxBonus: number;
  textBenefit: string;
  prematureClosureAllowed: boolean;
  lockInMonths: number;
  penaltyMode: PenaltyMode;
  penaltyPercent: number;
  penaltyFlat: number;
  benefitTreatment: BenefitTreatment;
  allowedRedemptionModes: RedemptionMode[];
  /** Gold-weight + CASH: how cash payout is computed (frozen at enrolment). */
  cashSettlementBasis: CashSettlementBasis;
  /** When basis is PAID_AMOUNT: add eligible monetary benefit to cash (default off). */
  includeMonetaryBenefitInPaidAmountCash: boolean;
  redeemAtAnyBranch: boolean;
  allBranches: boolean;
  branchIds: string[];
  enrolmentOpenFrom: string;
  enrolmentOpenTo: string;
  maxEnrolments: number | "";
  visibleInCustomerApp: boolean;
  customerSelfEnrolAllowed: boolean;
  editLocked: boolean;
  /** Optimistic-lock version from GET plan (PATCH only). */
  planVersion: number;
};

export const defaultPlanBuilderForm = (): PlanBuilderFormState => ({
  name: "",
  code: "",
  displayName: "",
  description: "",
  termsText:
    "1. Installments must be paid by the due date.\n2. Benefit applies only if all installments are paid.",
  valueBasis: "CASH",
  paymentPattern: "FIXED_DATE",
  durationMonths: 11,
  installmentCount: 11,
  amountMode: "CUSTOMER_CHOSEN",
  fixedAmount: 5000,
  slabsCsv: "1000,2000,5000,10000",
  minAmount: 1000,
  maxAmount: 50000,
  multipleOf: 500,
  partialPaymentAllowed: false,
  advancePaymentAllowed: true,
  maxAdvanceInstallments: 3,
  minPaymentPerTxn: 0,
  maxPaymentPerTxn: 0,
  dueDay: 10,
  graceDays: 5,
  firstInstallmentCollectNow: true,
  firstInstallmentModeEditable: true,
  flexiblePhaseCycles: 6,
  cappedPhaseCycles: 5,
  averagingDivisor: 6,
  capFormula: "FLEXIBLE_PHASE_TOTAL_DIV_AVERAGING_DIVISOR",
  flexMinPayment: 500,
  flexMaxPayment: 100000,
  flexPaymentIncrement: 100,
  flexMinTotal: 3000,
  capRoundingMode: "ROUND_UP",
  capRoundToNearest: 100,
  capMinCycle: 500,
  capMaxCycle: 100000,
  onZeroFlexibleTotal: "USE_MINIMUM",
  onBelowMinimumTotal: "USE_MINIMUM",
  cappedMinPayment: 1000,
  allowFinalRemainderBelowMinimum: true,
  allowFutureCyclePayment: false,
  maxAdvanceCycles: 0,
  blockPaymentIfRateNotSet: true,
  weightRoundingMode: "HALF_UP",
  weightPrecisionMg: 1,
  benefitType: "ONE_FREE_INSTALLMENT",
  goldBonus: { bonusBasis: "NET_GOLD_WEIGHT", bonusPercent: 3, requireAllCollections: true },
  benefitDisplayLabel: "12th installment free",
  requireAllInstallmentsPaid: true,
  maxAllowedDefaults: 0,
  minMonthsCompleted: 11,
  bonusBasis: "PERCENT_OF_PAID",
  bonusValue: 5,
  maxBonus: 5000,
  textBenefit:
    "Zero making charges on gold ornaments purchased at maturity. Wastage capped at 8%.",
  prematureClosureAllowed: true,
  lockInMonths: 3,
  penaltyMode: "PERCENT_OF_PAID",
  penaltyPercent: 2,
  penaltyFlat: 500,
  benefitTreatment: "FORFEIT",
  allowedRedemptionModes: [
    "CASH",
    "GOLD_HANDOVER",
    "PURCHASE_ADJUSTMENT",
  ],
  cashSettlementBasis: "GOLD_VALUE",
  includeMonetaryBenefitInPaidAmountCash: false,
  redeemAtAnyBranch: false,
  allBranches: true,
  branchIds: [],
  enrolmentOpenFrom: "",
  enrolmentOpenTo: "",
  maxEnrolments: "",
  visibleInCustomerApp: true,
  customerSelfEnrolAllowed: true,
  editLocked: false,
  planVersion: 1,
});

const paise = (rupees: number) => Math.round(rupees * 100);

function parseSlabs(csv: string): number[] {
  return csv
    .split(/[,;\s]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .map(paise);
}

function amountRules(form: PlanBuilderFormState) {
  const mode = form.amountMode;
  const fixed = paise(form.fixedAmount);
  const slabs = parseSlabs(form.slabsCsv);
  const min = paise(form.minAmount);
  const max = paise(form.maxAmount);
  const mult = paise(form.multipleOf);

  if (mode === "JEWELLER_FIXED") {
    return {
      amountMode: mode,
      fixedAmountPaise: fixed,
      slabsPaise: [],
      minInstallmentPaise: fixed,
      maxInstallmentPaise: fixed,
      multipleOfPaise: null,
    };
  }
  if (mode === "JEWELLER_SLABS") {
    const slabMin = slabs.length ? Math.min(...slabs) : min;
    const slabMax = slabs.length ? Math.max(...slabs) : max;
    return {
      amountMode: mode,
      fixedAmountPaise: null,
      slabsPaise: slabs.length ? slabs : [paise(1000), paise(5000)],
      minInstallmentPaise: slabMin,
      maxInstallmentPaise: slabMax,
      multipleOfPaise: null,
    };
  }
  return {
    amountMode: mode,
    fixedAmountPaise: null,
    slabsPaise: [],
    minInstallmentPaise: min,
    maxInstallmentPaise: max,
    multipleOfPaise: mult,
  };
}

const defaultBenefitEligibility = (form: PlanBuilderFormState) => ({
  requireAllInstallmentsPaid: form.requireAllInstallmentsPaid,
  maxAllowedDefaults: form.maxAllowedDefaults,
  minMonthsCompleted: form.minMonthsCompleted,
});

function benefitBlock(form: PlanBuilderFormState) {
  if (form.benefitType === "MATURITY_GOLD_CREDIT") {
    return {
      type: form.benefitType,
      goldBonus: {
        ...form.goldBonus,
        requireAllCollections: form.paymentPattern === "FIXED_DATE" ? form.goldBonus.requireAllCollections : true,
      },
      bonusBasis: null,
      bonusValue: null,
      textBenefit: null,
      maxBonusPaise: null,
      eligibility: { requireAllInstallmentsPaid: false, maxAllowedDefaults: 0, minMonthsCompleted: 0 },
      displayLabel: benefitSummaryLabel(form),
    };
  }
  if (form.benefitType === "ONE_FREE_INSTALLMENT") {
    return {
      type: form.benefitType,
      bonusBasis: null,
      bonusValue: null,
      textBenefit: null,
      maxBonusPaise: null,
      eligibility: defaultBenefitEligibility(form),
      displayLabel: form.benefitDisplayLabel,
    };
  }
  if (form.benefitType === "FIXED_BONUS_AMOUNT") {
    return {
      type: form.benefitType,
      bonusBasis: form.bonusBasis,
      bonusValue:
        form.bonusBasis === "FLAT" ? paise(form.bonusValue) : form.bonusValue,
      maxBonusPaise: paise(form.maxBonus),
      textBenefit: null,
      eligibility: defaultBenefitEligibility(form),
      displayLabel: form.benefitDisplayLabel,
    };
  }
  return {
    type: "TEXT_ONLY",
    bonusBasis: null,
    bonusValue: null,
    maxBonusPaise: null,
    textBenefit: form.textBenefit,
    eligibility: defaultBenefitEligibility(form),
    displayLabel: form.benefitDisplayLabel,
  };
}

export function allowedBenefitTypes(
  paymentPattern: PlanBuilderFormState["paymentPattern"],
): BenefitType[] {
  if (paymentPattern === "FLEXIBLE_AVERAGE") {
    return ["FIXED_BONUS_AMOUNT", "TEXT_ONLY"];
  }
  return ["ONE_FREE_INSTALLMENT", "FIXED_BONUS_AMOUNT", "TEXT_ONLY"];
}

export function coerceBenefitForPattern(
  form: PlanBuilderFormState,
): PlanBuilderFormState {
  if (
    form.paymentPattern === "FLEXIBLE_AVERAGE" &&
    form.benefitType === "ONE_FREE_INSTALLMENT"
  ) {
    return {
      ...form,
      benefitType: "FIXED_BONUS_AMOUNT",
      benefitDisplayLabel: "5% bonus on maturity (max ₹5,000)",
      bonusBasis: "PERCENT_OF_PAID",
      bonusValue: 5,
      maxBonus: 5000,
    };
  }
  return form;
}

export function buildPlanCreatePayload(input: PlanBuilderFormState) {
  const form = input.oneTimeRules ? {
    ...input, valueBasis: "GOLD_WEIGHT" as const, paymentPattern: "FIXED_DATE" as const,
    installmentCount: 1, collectionRules: undefined, firstInstallmentCollectNow: true,
    firstInstallmentModeEditable: false, partialPaymentAllowed: false, advancePaymentAllowed: false,
    maxAdvanceInstallments: 0, minPaymentPerTxn: 0, maxPaymentPerTxn: 0, benefitType: "TEXT_ONLY" as const,
    benefitDisplayLabel: oneTimeBonusLabel(input.oneTimeRules), textBenefit: oneTimeBonusLabel(input.oneTimeRules),
    requireAllInstallmentsPaid: false, maxAllowedDefaults: 0, minMonthsCompleted: 0,
    cashSettlementBasis: "GOLD_VALUE" as const,
  } : input;
  const normalized = coerceBenefitForPattern(form);
  const isFlexible = normalized.paymentPattern === "FLEXIBLE_AVERAGE";
  const paymentPatternApi = isFlexible ? "FLEXIBLE" : "FIXED";

  const payload: Record<string, unknown> = {
    name: normalized.name,
    code: String(normalized.code ?? "")
      .trim()
      .toUpperCase(),
    displayName: normalized.displayName || normalized.name,
    description: normalized.description,
    termsText: normalized.termsText,
    valueBasis: normalized.valueBasis,
    paymentPattern: paymentPatternApi,
    durationMonths: normalized.durationMonths,
    ...(form.oneTimeRules ? { oneTimeRules: form.oneTimeRules } : {}),
    installmentCount: normalized.collectionRules ? 1 : normalized.installmentCount,
    ...(normalized.collectionRules ? { collectionRules: {
      frequencies: normalized.collectionRules.frequencies,
      amountBasis: normalized.collectionRules.amountBasis,
      maturityRule: normalized.collectionRules.maturityRule,
    } } : {}),
    amountRules: amountRules(normalized),
    scheduleRules: isFlexible
      ? {
          dueDateRule: "JOIN_ANNIVERSARY",
          dueDayOfMonth: null,
          graceDays: form.graceDays,
          firstInstallmentModeDefault: form.firstInstallmentCollectNow
            ? "COLLECT_NOW"
            : "START_NEXT_CYCLE",
          firstInstallmentModeEditable: form.firstInstallmentModeEditable,
        }
      : {
          dueDateRule: form.oneTimeRules ? "JOIN_ANNIVERSARY" : "FIXED_DAY_OF_MONTH",
          dueDayOfMonth: form.oneTimeRules ? null : form.dueDay,
          graceDays: form.oneTimeRules ? 0 : form.graceDays,
          firstInstallmentModeDefault: form.firstInstallmentCollectNow
            ? "COLLECT_NOW"
            : "START_NEXT_CYCLE",
          firstInstallmentModeEditable: form.firstInstallmentModeEditable,
        },
    paymentRules: isFlexible
      ? {
          partialPaymentAllowed: true,
          advancePaymentAllowed: false,
          maxAdvanceInstallments: 0,
          minPaymentPaise: paise(form.flexMinPayment),
        }
      : {
          partialPaymentAllowed: form.partialPaymentAllowed,
          advancePaymentAllowed: form.advancePaymentAllowed,
          maxAdvanceInstallments: form.maxAdvanceInstallments,
          minPaymentPaise: form.minPaymentPerTxn
            ? paise(form.minPaymentPerTxn)
            : null,
          maxPaymentPerTransactionPaise: form.maxPaymentPerTxn
            ? paise(form.maxPaymentPerTxn)
            : form.amountMode === "JEWELLER_FIXED"
              ? paise(form.fixedAmount)
              : null,
        },
    ...(isFlexible
      ? {
          flexibleRules: {
          phaseMode: "FLEXIBLE_THEN_CAPPED",
          capMode: "FLEXIBLE_PHASE_AVERAGE",
          carryForwardMode: "NONE",
          flexiblePhaseCycles: form.flexiblePhaseCycles,
          cappedPhaseCycles: form.cappedPhaseCycles,
          averagingDivisor: form.averagingDivisor,
          frequencyMode: "MULTIPLE",
          flexiblePhase: {
            minimumPaymentPaise: paise(form.flexMinPayment),
            maximumPaymentPaise: paise(form.flexMaxPayment),
            paymentIncrementPaise: paise(form.flexPaymentIncrement),
            minTotalPaise: paise(form.flexMinTotal),
            maxPaymentsPerCycle: null,
            paymentsRequiredPerCycle: 0,
          },
          capComputation: {
            formula: form.capFormula,
            roundingMode: "ROUND_UP",
            roundToNearestPaise: paise(form.capRoundToNearest),
            minCycleCapPaise: paise(form.capMinCycle),
            maxCycleCapPaise: paise(form.capMaxCycle),
            onZeroFlexiblePhaseTotal: form.onZeroFlexibleTotal,
            onBelowMinimumTotal: form.onBelowMinimumTotal,
          },
          cappedPhase: {
            minimumPaymentPaise: paise(form.cappedMinPayment),
            paymentIncrementPaise: paise(form.flexPaymentIncrement),
            allowFinalRemainderBelowMinimum:
              form.allowFinalRemainderBelowMinimum,
            allowFutureCyclePayment: form.allowFutureCyclePayment,
            maxAdvanceCycles: form.maxAdvanceCycles,
          },
          },
        }
      : {}),
    benefit: benefitBlock(normalized),
    redemptionRules: {
      prematureClosureAllowed: form.prematureClosureAllowed,
      lockInMonths: form.oneTimeRules && !form.prematureClosureAllowed ? 0 : form.lockInMonths,
      prematurePenalty: {
        mode: form.penaltyMode,
        value:
          form.penaltyMode === "PERCENT_OF_PAID"
            ? form.penaltyPercent
            : form.penaltyMode === "FLAT"
              ? paise(form.penaltyFlat)
              : 0,
        flatPaise:
          form.penaltyMode === "FLAT" ? paise(form.penaltyFlat) : null,
        benefitTreatment: form.benefitTreatment,
      },
      allowedModes: form.allowedRedemptionModes,
      redeemAtAnyBranch: form.redeemAtAnyBranch,
      ...(form.valueBasis === "GOLD_WEIGHT" &&
      form.allowedRedemptionModes.includes("CASH")
        ? {
            cashSettlementBasis: form.cashSettlementBasis,
            ...(form.cashSettlementBasis === "PAID_AMOUNT"
              ? {
                  paidAmountBenefitTreatment:
                    form.includeMonetaryBenefitInPaidAmountCash
                      ? "INCLUDE_MONETARY"
                      : "EXCLUDE",
                }
              : {}),
          }
        : {}),
    },
    availability: {
      allBranches: form.allBranches,
      branchIds: form.allBranches ? [] : form.branchIds,
      enrolmentOpenFrom: form.enrolmentOpenFrom || null,
      enrolmentOpenTo: form.enrolmentOpenTo || null,
      maxEnrolments:
        form.maxEnrolments === "" ? null : Number(form.maxEnrolments),
      visibleInCustomerApp: form.visibleInCustomerApp,
      customerSelfEnrolAllowed: form.customerSelfEnrolAllowed,
    },
    status: "DRAFT",
  };

  if (form.valueBasis === "GOLD_WEIGHT") {
    payload.goldRules = {
      rateSource: "TENANT_DAILY_RATE",
      weightRoundingMode: form.weightRoundingMode,
      weightPrecisionMg: form.weightPrecisionMg,
      blockPaymentIfRateNotSet: form.blockPaymentIfRateNotSet,
    };
  }

  return payload;
}

/** POST /admin/scheme-plans/preview-schedule (05 §9). */
export function isPlanPreviewReady(form: PlanBuilderFormState): boolean {
  if (!Number.isInteger(form.durationMonths) || form.durationMonths < 1 || form.durationMonths > 120) return false;
  if (!form.collectionRules && !form.oneTimeRules &&
      (form.installmentCount < 1 || form.installmentCount > form.durationMonths)) return false;
  if (form.oneTimeRules) {
    const { timing, basis, value, amountPeriod } = form.oneTimeRules;
    if (!Number.isSafeInteger(value) || value <= 0 || (basis === "PRINCIPAL_PERCENT" && value > 100) ||
        (timing === "AT_MATURITY" && amountPeriod !== "TERM_TOTAL")) return false;
  }
  if (form.collectionRules && !form.collectionRules.frequencies.length) return false;
  if (!form.oneTimeRules && form.benefitType === "MATURITY_GOLD_CREDIT" && !validGoldBonusPercent(form.goldBonus.bonusPercent)) return false;
  if (form.paymentPattern === "FLEXIBLE_AVERAGE") {
    return (
      form.flexiblePhaseCycles >= 1 &&
      form.cappedPhaseCycles >= 1 &&
      form.flexMinPayment > 0 &&
      form.flexMaxPayment >= form.flexMinPayment
    );
  }
  if (form.amountMode === "JEWELLER_FIXED") {
    return form.fixedAmount > 0;
  }
  if (form.amountMode === "JEWELLER_SLABS") {
    return parseSlabs(form.slabsCsv).some((amount) => amount > 0);
  }
  const multiple = paise(form.multipleOf) || 1;
  const min = paise(form.minAmount);
  return min > 0 && multiple > 0 && Math.ceil(min / multiple) * multiple <= paise(form.maxAmount);
}

export function buildPreviewScheduleBody(
  form: PlanBuilderFormState,
  opts?: { planId?: string; startDate?: string; collectionFrequency?: CollectionRules["frequencies"][number] },
) {
  const rules = amountRules(form);
  const multiple = rules.multipleOfPaise || 1;
  const amount = form.paymentPattern === "FLEXIBLE_AVERAGE"
    ? paise(form.flexMinPayment)
    : rules.fixedAmountPaise ?? (rules.slabsPaise.length
      ? Math.min(...rules.slabsPaise)
      : Math.ceil(rules.minInstallmentPaise / multiple) * multiple);

  const core = {
    installmentAmountPaise: amount,
    startDate: opts?.startDate ?? istBusinessDateToday(),
    collectionFrequency: opts?.collectionFrequency,
    firstInstallmentMode: form.oneTimeRules || form.firstInstallmentCollectNow
      ? "COLLECT_NOW"
      : "START_NEXT_CYCLE",
  };

  if (opts?.planId) {
    return { planId: opts.planId, ...core };
  }

  const payload = buildPlanCreatePayload(form) as Record<string, unknown>;
  payload.name = "Preview plan";
  payload.code = "DRAFT";
  delete payload.displayName;
  delete payload.description;
  delete payload.termsText;

  // Settlement and publication settings are edited later and do not affect sample dates.
  payload.redemptionRules = {
    prematureClosureAllowed: false,
    lockInMonths: 0,
    prematurePenalty: { mode: "NONE", value: 0, benefitTreatment: "FORFEIT" },
    allowedModes: ["CASH"],
    redeemAtAnyBranch: false,
    ...(form.valueBasis === "GOLD_WEIGHT" || form.oneTimeRules ? { cashSettlementBasis: "GOLD_VALUE" } : {}),
  };
  const benefit = payload.benefit as Record<string, unknown>;
  payload.benefit = {
    ...benefit,
    eligibility: { requireAllInstallmentsPaid: false, maxAllowedDefaults: 0, minMonthsCompleted: 0 },
  };
  payload.availability = { allBranches: true, branchIds: [], visibleInCustomerApp: false, customerSelfEnrolAllowed: false };

  return { ...payload, ...core };
}

export function amountSummaryLabel(form: PlanBuilderFormState): string {
  if (form.paymentPattern === "FLEXIBLE_AVERAGE") {
    return `Free window: ₹${form.flexMinPayment.toLocaleString("en-IN")}–₹${form.flexMaxPayment.toLocaleString("en-IN")} per payment · ${form.flexiblePhaseCycles} free + ${form.cappedPhaseCycles} capped months.`;
  }
  if (form.amountMode === "CUSTOMER_CHOSEN") {
    const bounds = `₹${form.minAmount.toLocaleString("en-IN")} – ₹${form.maxAmount.toLocaleString("en-IN")}`;
    const multiples = form.multipleOf > 0 ? `, in multiples of ₹${form.multipleOf.toLocaleString("en-IN")}` : "";
    return `Customers can choose ${bounds}${multiples}${form.oneTimeRules ? " for their one-time payment" : ""}.`;
  }
  if (form.amountMode === "JEWELLER_FIXED") {
    return `Fixed ₹${form.fixedAmount.toLocaleString("en-IN")}${form.oneTimeRules ? " due at enrolment." : " per installment."}`;
  }
  if (form.oneTimeRules) return `One-time payment slabs · ${form.slabsCsv}`;
  return form.collectionRules?.amountBasis === "TOTAL_TARGET"
    ? `Total target slabs · ${form.slabsCsv}`
    : `Slabs: ${form.slabsCsv} (min/max derived from slab list).`;
}

const fromPaise = (v?: number | null) =>
  typeof v === "number" && Number.isFinite(v) ? v / 100 : 0;

/** Suggested unique code when duplicating in the builder (not persisted until save). */
export function suggestDuplicatePlanCode(code: string): string {
  const root = String(code ?? "PLAN")
    .replace(/_COPY_[A-Z0-9]+$/i, "")
    .replace(/-[A-Z0-9]{4,}$/i, "")
    .replace(/[^A-Z0-9_-]/gi, "")
    .slice(0, 11)
    .toUpperCase();
  const suffix = Date.now().toString(36).slice(-4).toUpperCase();
  const candidate = `${root}-${suffix}`;
  return candidate.length <= 20
    ? candidate
    : `${root.slice(0, Math.max(2, 20 - suffix.length - 1))}-${suffix}`.slice(
        0,
        20,
      );
}

/** Form state for “duplicate to edit” — copy of source, unlocked, new code/name. */
export function planDetailToDuplicateForm(
  detail: Record<string, unknown>,
): PlanBuilderFormState {
  const form = planDetailToForm(detail);
  const name = String(detail.name ?? form.name);
  return {
    ...form,
    name: `${name} Copy`.slice(0, 120),
    code: suggestDuplicatePlanCode(form.code),
    editLocked: false,
  };
}

/** Map GET /admin/scheme-plans/:id into wizard form state. */
export function planDetailToForm(detail: Record<string, unknown>): PlanBuilderFormState {
  const base = defaultPlanBuilderForm();
  const rules = (detail.amountRules ?? {}) as Record<string, unknown>;
  const schedule = (detail.scheduleRules ?? {}) as Record<string, unknown>;
  const payment = (detail.paymentRules ?? {}) as Record<string, unknown>;
  const flex = (detail.flexibleRules ?? {}) as Record<string, unknown>;
  const flexPhase = (flex.flexiblePhase ?? {}) as Record<string, unknown>;
  const cap = (flex.capComputation ?? {}) as Record<string, unknown>;
  const capped = (flex.cappedPhase ?? {}) as Record<string, unknown>;
  const benefit = (detail.benefit ?? {}) as Record<string, unknown>;
  const collectionRules = (detail.collectionRules ?? undefined) as CollectionRules | undefined;
  const goldBonus = resolveMaturityGoldRules(benefit, collectionRules);
  const elig = (benefit.eligibility ?? {}) as Record<string, unknown>;
  const redemption = (detail.redemptionRules ?? {}) as Record<string, unknown>;
  const penalty = (redemption.prematurePenalty ?? {}) as Record<string, unknown>;
  const avail = (detail.availability ?? {}) as Record<string, unknown>;
  const gold = (detail.goldRules ?? {}) as Record<string, unknown>;
  const pattern = String(detail.paymentPattern ?? "FIXED");
  const slabs = (rules.slabsPaise as number[] | null) ?? [];

  return {
    ...base,
    oneTimeRules: detail.oneTimeRules as OneTimeGoldRules | undefined,
    collectionRules,
    name: String(detail.name ?? base.name),
    code: String(detail.code ?? base.code),
    displayName: String(detail.displayName ?? detail.name ?? ""),
    description: String(detail.description ?? ""),
    termsText: String(detail.termsText ?? base.termsText),
    valueBasis: (detail.valueBasis as PlanBuilderFormState["valueBasis"]) ?? "CASH",
    paymentPattern:
      pattern === "FLEXIBLE" ? "FLEXIBLE_AVERAGE" : "FIXED_DATE",
    durationMonths: Number(detail.durationMonths ?? base.durationMonths),
    installmentCount: Number(
      detail.installmentCount ?? detail.durationMonths ?? base.installmentCount,
    ),
    amountMode:
      (rules.amountMode as PlanBuilderFormState["amountMode"]) ??
      base.amountMode,
    fixedAmount: fromPaise(rules.fixedAmountPaise as number) || fromPaise(rules.minInstallmentPaise as number),
    slabsCsv: slabs.length
      ? slabs.map((p) => fromPaise(p)).join(",")
      : base.slabsCsv,
    minAmount: fromPaise(rules.minInstallmentPaise as number) || base.minAmount,
    maxAmount: fromPaise(rules.maxInstallmentPaise as number) || base.maxAmount,
    multipleOf: fromPaise(rules.multipleOfPaise as number),
    partialPaymentAllowed: Boolean(payment.partialPaymentAllowed),
    advancePaymentAllowed: Boolean(payment.advancePaymentAllowed ?? true),
    maxAdvanceInstallments: Number(payment.maxAdvanceInstallments ?? 3),
    minPaymentPerTxn: fromPaise(payment.minPaymentPaise as number),
    maxPaymentPerTxn: fromPaise(payment.maxPaymentPerTransactionPaise as number),
    dueDay: Number(schedule.dueDayOfMonth ?? base.dueDay),
    graceDays: Number(schedule.graceDays ?? base.graceDays),
    firstInstallmentCollectNow:
      schedule.firstInstallmentModeDefault !== "START_NEXT_CYCLE",
    firstInstallmentModeEditable: Boolean(
      schedule.firstInstallmentModeEditable ?? true,
    ),
    flexiblePhaseCycles: Number(flex.flexiblePhaseCycles ?? base.flexiblePhaseCycles),
    cappedPhaseCycles: Number(flex.cappedPhaseCycles ?? base.cappedPhaseCycles),
    averagingDivisor: Number(flex.averagingDivisor ?? base.averagingDivisor),
    capFormula:
      (cap.formula as PlanBuilderFormState["capFormula"]) ??
      base.capFormula,
    flexMinPayment: fromPaise(flexPhase.minimumPaymentPaise as number) || base.flexMinPayment,
    flexMaxPayment: fromPaise(flexPhase.maximumPaymentPaise as number) || base.flexMaxPayment,
    flexPaymentIncrement:
      fromPaise(flexPhase.paymentIncrementPaise as number) || base.flexPaymentIncrement,
    flexMinTotal: fromPaise(flexPhase.minTotalPaise as number) || base.flexMinTotal,
    capRoundingMode: "ROUND_UP",
    capRoundToNearest:
      fromPaise(cap.roundToNearestPaise as number) || base.capRoundToNearest,
    capMinCycle: fromPaise(cap.minCycleCapPaise as number) || base.capMinCycle,
    capMaxCycle: fromPaise(cap.maxCycleCapPaise as number) || base.capMaxCycle,
    onZeroFlexibleTotal:
      (cap.onZeroFlexiblePhaseTotal as PlanBuilderFormState["onZeroFlexibleTotal"]) ??
      base.onZeroFlexibleTotal,
    onBelowMinimumTotal:
      (cap.onBelowMinimumTotal as PlanBuilderFormState["onBelowMinimumTotal"]) ??
      base.onBelowMinimumTotal,
    cappedMinPayment:
      fromPaise(capped.minimumPaymentPaise as number) || base.cappedMinPayment,
    allowFinalRemainderBelowMinimum: Boolean(
      capped.allowFinalRemainderBelowMinimum ?? true,
    ),
    allowFutureCyclePayment: Boolean(capped.allowFutureCyclePayment),
    maxAdvanceCycles: Number(capped.maxAdvanceCycles ?? 0),
    blockPaymentIfRateNotSet: Boolean(
      gold.blockPaymentIfRateNotSet ?? true,
    ),
    weightRoundingMode:
      (gold.weightRoundingMode as PlanBuilderFormState["weightRoundingMode"]) ??
      base.weightRoundingMode,
    weightPrecisionMg: Number(
      gold.weightPrecisionMg ?? base.weightPrecisionMg,
    ),
    benefitType: goldBonus ? "MATURITY_GOLD_CREDIT" : (benefit.type as BenefitType) ?? base.benefitType,
    goldBonus: goldBonus ?? base.goldBonus,
    benefitDisplayLabel: String(benefit.displayLabel ?? base.benefitDisplayLabel),
    requireAllInstallmentsPaid: Boolean(
      elig.requireAllInstallmentsPaid ?? true,
    ),
    maxAllowedDefaults: Number(elig.maxAllowedDefaults ?? 0),
    minMonthsCompleted: Number(
      elig.minMonthsCompleted ?? base.minMonthsCompleted,
    ),
    bonusBasis:
      (benefit.bonusBasis as BonusBasis) ?? base.bonusBasis,
    bonusValue:
      benefit.bonusBasis === "FLAT"
        ? fromPaise(benefit.bonusValue as number)
        : Number(benefit.bonusValue ?? base.bonusValue),
    maxBonus: fromPaise(benefit.maxBonusPaise as number) || base.maxBonus,
    textBenefit: String(benefit.textBenefit ?? base.textBenefit),
    prematureClosureAllowed: Boolean(
      redemption.prematureClosureAllowed ?? true,
    ),
    lockInMonths: Number(redemption.lockInMonths ?? base.lockInMonths),
    penaltyMode:
      (penalty.mode as PenaltyMode) ?? base.penaltyMode,
    penaltyPercent: Number(penalty.value ?? base.penaltyPercent),
    penaltyFlat:
      fromPaise(penalty.flatPaise as number) ||
      fromPaise(penalty.value as number) ||
      base.penaltyFlat,
    benefitTreatment:
      (penalty.benefitTreatment as BenefitTreatment) ?? base.benefitTreatment,
    allowedRedemptionModes: Array.isArray(redemption.allowedModes)
      ? (redemption.allowedModes as RedemptionMode[])
      : base.allowedRedemptionModes,
    cashSettlementBasis:
      (redemption.cashSettlementBasis as CashSettlementBasis) ??
      base.cashSettlementBasis,
    includeMonetaryBenefitInPaidAmountCash:
      redemption.paidAmountBenefitTreatment === "INCLUDE_MONETARY",
    redeemAtAnyBranch: Boolean(redemption.redeemAtAnyBranch),
    allBranches: Boolean(avail.allBranches ?? true),
    branchIds: Array.isArray(avail.branchIds)
      ? (avail.branchIds as string[])
      : [],
    enrolmentOpenFrom: String(avail.enrolmentOpenFrom ?? "").slice(0, 10),
    enrolmentOpenTo: String(avail.enrolmentOpenTo ?? "").slice(0, 10),
    maxEnrolments:
      avail.maxEnrolments == null || avail.maxEnrolments === undefined
        ? ""
        : Number(avail.maxEnrolments),
    visibleInCustomerApp: avail.visibleInCustomerApp !== false,
    customerSelfEnrolAllowed: avail.customerSelfEnrolAllowed !== false,
    editLocked: Boolean(detail.editLocked),
    planVersion: Number(detail.version ?? base.planVersion),
  };
}

/** PATCH body — financial blocks omitted when plan is edit-locked. */
export function buildPlanPatchPayload(form: PlanBuilderFormState) {
  const version = { expectedVersion: form.planVersion };
  if (form.editLocked) {
    return {
      ...version,
      name: form.name,
      displayName: form.displayName || form.name,
      description: form.description,
      termsText: form.termsText,
      availability: {
        allBranches: form.allBranches,
        branchIds: form.allBranches ? [] : form.branchIds,
        enrolmentOpenFrom: form.enrolmentOpenFrom || null,
        enrolmentOpenTo: form.enrolmentOpenTo || null,
        maxEnrolments:
          form.maxEnrolments === "" ? null : Number(form.maxEnrolments),
        visibleInCustomerApp: form.visibleInCustomerApp,
        customerSelfEnrolAllowed: form.customerSelfEnrolAllowed,
      },
    };
  }
  const rest = { ...buildPlanCreatePayload(form) } as Record<string, unknown>;
  delete rest.status;
  if (!form.collectionRules) rest.collectionRules = null;
  if (!form.oneTimeRules) rest.oneTimeRules = null;
  if (form.benefitType !== "MATURITY_GOLD_CREDIT") {
    rest.benefit = { ...(rest.benefit as object), goldBonus: null };
  }
  if (form.paymentPattern === "FLEXIBLE_AVERAGE") {
    rest.paymentRules = {
      ...((rest.paymentRules as Record<string, unknown>) ?? {}),
      // Explicitly clear a fixed-plan cap during FIXED → FLEXIBLE PATCH.
      maxPaymentPerTransactionPaise: null,
    };
  }
  return { ...version, ...rest };
}

export type PlanAvailabilityFormSlice = Pick<
  PlanBuilderFormState,
  | "planVersion"
  | "allBranches"
  | "branchIds"
  | "enrolmentOpenFrom"
  | "enrolmentOpenTo"
  | "maxEnrolments"
  | "visibleInCustomerApp"
  | "customerSelfEnrolAllowed"
>;

export function availabilitySliceFromPlan(
  detail: Record<string, unknown>,
): PlanAvailabilityFormSlice {
  const form = planDetailToForm(detail);
  return {
    planVersion: form.planVersion,
    allBranches: form.allBranches,
    branchIds: form.branchIds,
    enrolmentOpenFrom: form.enrolmentOpenFrom,
    enrolmentOpenTo: form.enrolmentOpenTo,
    maxEnrolments: form.maxEnrolments,
    visibleInCustomerApp: form.visibleInCustomerApp,
    customerSelfEnrolAllowed: form.customerSelfEnrolAllowed,
  };
}

/** PATCH only availability (safe while plan is edit-locked). */
export function buildPlanAvailabilityPatchPayload(
  slice: PlanAvailabilityFormSlice,
) {
  return {
    expectedVersion: slice.planVersion,
    availability: {
      allBranches: slice.allBranches,
      branchIds: slice.allBranches ? [] : slice.branchIds,
      enrolmentOpenFrom: slice.enrolmentOpenFrom || null,
      enrolmentOpenTo: slice.enrolmentOpenTo || null,
      maxEnrolments:
        slice.maxEnrolments === "" ? null : Number(slice.maxEnrolments),
      visibleInCustomerApp: slice.visibleInCustomerApp,
      customerSelfEnrolAllowed: slice.customerSelfEnrolAllowed,
    },
  };
}

export function valueBasisLabel(
  valueBasis: PlanBuilderFormState["valueBasis"],
): string {
  return valueBasis === "GOLD_WEIGHT" ? "Gold weight" : "Cash";
}

export function paymentPatternLabel(
  pattern: PlanBuilderFormState["paymentPattern"],
): string {
  return pattern === "FLEXIBLE_AVERAGE"
    ? "Flexible (free + capped phases)"
    : "Fixed installments on due dates";
}

export function penaltyModeLabel(mode: PenaltyMode): string {
  if (mode === "PERCENT_OF_PAID") return "Percentage of amount paid";
  if (mode === "FLAT") return "Flat fee";
  return "No penalty";
}

export function redemptionModesLabel(modes: RedemptionMode[]): string {
  const labels: Record<RedemptionMode, string> = {
    CASH: "Cash settlement",
    GOLD_HANDOVER: "Gold handover",
    PURCHASE_ADJUSTMENT: "Purchase adjustment",
  };
  return modes.map((m) => labels[m] ?? m).join(" · ");
}

export function validGoldBonusPercent(percent: number): boolean {
  return Number.isInteger(percent) && percent >= 1 && percent <= 100;
}

export function benefitSummaryLabel(form: PlanBuilderFormState): string {
  if (form.oneTimeRules) return oneTimeBonusLabel(form.oneTimeRules);
  if (form.benefitType === "MATURITY_GOLD_CREDIT") return `${form.goldBonus.bonusPercent}% additional gold at maturity`;
  if (form.benefitType === "FIXED_BONUS_AMOUNT") {
    if (form.bonusBasis === "FLAT") {
      return `Flat bonus ₹${form.bonusValue.toLocaleString("en-IN")} · ${form.benefitDisplayLabel}`;
    }
    return `${form.bonusValue}% of paid (max ₹${form.maxBonus.toLocaleString("en-IN")}) · ${form.benefitDisplayLabel}`;
  }
  if (form.benefitType === "TEXT_ONLY") {
    return form.benefitDisplayLabel || form.textBenefit.slice(0, 60);
  }
  return form.benefitDisplayLabel;
}
