import type { MoneyRef, SchemePlan } from "@/src/types/customer";
import { mapRawPlanRules } from "@/src/lib/enrol-plan-rules";

type ApiPlan = Record<string, unknown>;

type AmountSummaryObj = {
  label?: string;
  amountMode?: string;
  min?: MoneyRef | null;
  max?: MoneyRef | null;
  multipleOf?: MoneyRef | null;
};

function readAmountSummary(raw: unknown): AmountSummaryObj | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as AmountSummaryObj;
}

function formatAmountSummaryLabel(raw: unknown): string {
  const obj = readAmountSummary(raw);
  if (obj?.label && obj.label.trim() && obj.label !== "—") return obj.label.trim();
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return "See contribution details";
}

function cardAmountSummary(raw: unknown, flexible?: SchemePlan["flexibleSummary"]): string {
  const obj = readAmountSummary(raw);
  if (obj?.min?.amountDisplay && obj?.max?.amountDisplay) {
    return `${obj.min.amountDisplay} – ${obj.max.amountDisplay}`;
  }
  if (obj?.min?.amountDisplay) return `From ${obj.min.amountDisplay}`;
  if (flexible?.minPerPayment?.amountDisplay && flexible?.maxPerPayment?.amountDisplay) {
    return `${flexible.minPerPayment.amountDisplay} – ${flexible.maxPerPayment.amountDisplay} per payment`;
  }
  const label = formatAmountSummaryLabel(raw);
  if (label.length > 72) {
    const firstSentence = label.split(".")[0];
    return firstSentence ? `${firstSentence.trim()}.` : label.slice(0, 72).trim() + "…";
  }
  return label;
}

function planModel(raw: ApiPlan): SchemePlan["model"] {
  const pattern = String(raw.paymentPattern ?? raw.model ?? "FIXED").toUpperCase();
  return pattern === "FLEXIBLE" ? "FLEXIBLE" : "FIXED";
}

function readFlexibleSummary(raw: ApiPlan): SchemePlan["flexibleSummary"] | undefined {
  const flex = raw.flexibleSummary;
  if (!flex || typeof flex !== "object") return undefined;
  const f = flex as Record<string, unknown>;
  return {
    freeWindowMonths: (f.freeWindowMonths as number | null | undefined) ?? null,
    lockWindowMonths: (f.lockWindowMonths as number | null | undefined) ?? null,
    explainer: typeof f.explainer === "string" ? f.explainer : null,
    minPerPayment: (f.minPerPayment as MoneyRef | null | undefined) ?? null,
    maxPerPayment: (f.maxPerPayment as MoneyRef | null | undefined) ?? null,
  };
}

function planRules(raw: ApiPlan, flexible?: SchemePlan["flexibleSummary"]): string[] {
  if (Array.isArray(raw.highlights)) {
    const fromHighlights = raw.highlights.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
    if (fromHighlights.length) return fromHighlights;
  }
  if (Array.isArray(raw.rules)) {
    return raw.rules.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  }
  const lines: string[] = [];
  const description = raw.description;
  if (typeof description === "string" && description.trim()) lines.push(description.trim());
  if (flexible?.explainer && !lines.includes(flexible.explainer)) lines.push(flexible.explainer);
  if (typeof raw.paymentPatternLabel === "string" && raw.paymentPatternLabel.trim()) {
    lines.push(raw.paymentPatternLabel.trim());
  }
  return lines;
}

function readEnrolBlock(raw: ApiPlan) {
  const enrol = raw.enrol;
  if (!enrol || typeof enrol !== "object") return null;
  return enrol as Record<string, unknown>;
}

function amountBounds(raw: ApiPlan, summary: AmountSummaryObj | null) {
  const rules = (raw.amountRules ?? {}) as Record<string, unknown>;
  const flex = (raw.flexibleRules ?? {}) as Record<string, unknown>;
  const flexPhase = (flex.flexiblePhase ?? {}) as Record<string, unknown>;
  const fixedFromRules = rules.fixedAmountPaise as number | undefined;
  const minPaise =
    summary?.min?.amountPaise ??
    (Number(rules.minInstallmentPaise) > 0
      ? (rules.minInstallmentPaise as number)
      : undefined) ??
    (Number(fixedFromRules) > 0 && rules.amountMode === "JEWELLER_FIXED"
      ? fixedFromRules
      : undefined) ??
    (flexPhase.minimumPaymentPaise as number | undefined);
  const maxPaise =
    summary?.max?.amountPaise ??
    (Number(rules.maxInstallmentPaise) > 0
      ? (rules.maxInstallmentPaise as number)
      : undefined) ??
    (Number(fixedFromRules) > 0 && rules.amountMode === "JEWELLER_FIXED"
      ? fixedFromRules
      : undefined) ??
    (flexPhase.maximumPaymentPaise as number | undefined);
  const multipleOfPaise =
    summary?.multipleOf?.amountPaise ?? (rules.multipleOfPaise as number | undefined) ?? 100;
  const fixedAmountPaise = rules.fixedAmountPaise as number | undefined;
  const slabsPaise = Array.isArray(rules.slabsPaise)
    ? (rules.slabsPaise as number[])
    : undefined;
  const amountMode = (rules.amountMode ?? summary?.amountMode) as string | undefined;
  return { minPaise, maxPaise, multipleOfPaise, fixedAmountPaise, slabsPaise, amountMode };
}

/** Maps GET /app/scheme-plans (contract + backend DTO) into portal UI shape. */
export function adaptCustomerSchemePlan(raw: unknown): SchemePlan {
  const plan = (raw ?? {}) as ApiPlan;
  const flexibleSummary = readFlexibleSummary(plan);
  const amountSummaryRaw = plan.amountSummary;
  const summaryObj = readAmountSummary(amountSummaryRaw);
  const { minPaise, maxPaise, multipleOfPaise, fixedAmountPaise, slabsPaise, amountMode } =
    amountBounds(plan, summaryObj);
  const contributionDetail = formatAmountSummaryLabel(amountSummaryRaw);
  const benefitSummary = String(plan.benefitSummary ?? plan.benefitLabel ?? "").trim();
  const enrolBlock = readEnrolBlock(plan);
  const enrolRules = enrolBlock
    ? mapRawPlanRules({
        paymentPattern: plan.paymentPattern ?? planModel(plan),
        amountRules: plan.amountRules ?? {
          amountMode,
          fixedAmountPaise,
          slabsPaise,
          minInstallmentPaise: minPaise,
          maxInstallmentPaise: maxPaise,
          multipleOfPaise,
        },
        scheduleRules: plan.scheduleRules ?? {
          firstInstallmentModeDefault: enrolBlock.firstInstallmentModeDefault,
          firstInstallmentModeEditable: enrolBlock.firstInstallmentModeEditable,
        },
      })
    : mapRawPlanRules({
        paymentPattern: plan.paymentPattern ?? planModel(plan),
        amountRules: plan.amountRules,
        scheduleRules: plan.scheduleRules,
      });
  const termsText =
    typeof plan.termsText === "string" && plan.termsText.trim()
      ? plan.termsText.trim()
      : typeof enrolBlock?.termsText === "string" && enrolBlock.termsText.trim()
        ? String(enrolBlock.termsText).trim()
        : undefined;
  const firstInstallmentRequired =
    enrolBlock?.firstInstallmentRequired === false
      ? false
      : enrolBlock?.firstInstallmentRequired === true
        ? true
        : enrolRules.firstInstallmentModeDefault !== "START_NEXT_CYCLE";

  return {
    id: String(plan.id ?? plan._id ?? ""),
    code: String(plan.code ?? ""),
    name: String(plan.name ?? plan.displayName ?? "Savings plan"),
    tagline: String(
      plan.tagline ??
        plan.description ??
        (typeof plan.paymentPatternLabel === "string" ? plan.paymentPatternLabel : "") ??
        "",
    ).trim(),
    model: planModel(plan),
    durationMonths: Number(plan.durationMonths ?? 0),
    oneTimeRules: plan.oneTimeRules as SchemePlan["oneTimeRules"],
    collectionRules: plan.collectionRules as SchemePlan["collectionRules"],
    maturityGoldBonus: plan.maturityGoldBonus as SchemePlan["maturityGoldBonus"],
    amountSummary: cardAmountSummary(amountSummaryRaw, flexibleSummary),
    contributionDetail: contributionDetail !== "See contribution details" ? contributionDetail : undefined,
    benefitSummary,
    benefitType: (plan.benefitType as SchemePlan["benefitType"]) ?? undefined,
    valueBasisLabel: typeof plan.valueBasisLabel === "string" ? plan.valueBasisLabel : undefined,
    paymentPatternLabel:
      typeof plan.paymentPatternLabel === "string" ? plan.paymentPatternLabel : undefined,
    rules: planRules(plan, flexibleSummary),
    canEnrol: plan.canEnrol !== false,
    blockedReason: typeof plan.blockedReason === "string" ? plan.blockedReason : undefined,
    featured: Boolean(plan.featured),
    amountMinPaise: minPaise,
    amountMaxPaise: maxPaise,
    multipleOfPaise,
    fixedAmountPaise,
    slabsPaise,
    amountMode,
    enrolRules,
    termsText,
    firstInstallmentRequired,
    firstInstallmentModeDefault: enrolRules.firstInstallmentModeDefault,
    firstInstallmentModeEditable: enrolRules.firstInstallmentModeEditable,
    flexibleSummary,
  };
}

export function adaptCustomerSchemePlanList(raw: unknown): SchemePlan[] {
  if (Array.isArray(raw)) return raw.map(adaptCustomerSchemePlan);
  if (raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown[] }).items)) {
    return (raw as { items: unknown[] }).items.map(adaptCustomerSchemePlan);
  }
  return [];
}

export function suggestedEnrolAmountRupee(plan: SchemePlan): string {
  if (plan.fixedAmountPaise && plan.fixedAmountPaise > 0) {
    return String(Math.round(plan.fixedAmountPaise / 100));
  }
  if (plan.amountMinPaise && plan.amountMinPaise > 0) {
    return String(Math.round(plan.amountMinPaise / 100));
  }
  return "2500";
}

export function validateEnrolAmountRupee(plan: SchemePlan, amountRupee: number): string | null {
  if (!Number.isFinite(amountRupee) || amountRupee <= 0) return "Enter a valid amount";
  const paise = Math.round(amountRupee * 100);
  if (plan.amountMode === "JEWELLER_SLABS" && plan.slabsPaise?.length) {
    if (!plan.slabsPaise.includes(paise)) return "Choose one of the plan's installment slabs";
  }
  if (plan.fixedAmountPaise && paise !== plan.fixedAmountPaise) {
    return `This plan requires ${plan.fixedAmountPaise / 100} per payment`;
  }
  if (plan.amountMinPaise != null && paise < plan.amountMinPaise) {
    return `Minimum is ₹${Math.round(plan.amountMinPaise / 100).toLocaleString("en-IN")}`;
  }
  if (plan.amountMaxPaise != null && paise > plan.amountMaxPaise) {
    return `Maximum is ₹${Math.round(plan.amountMaxPaise / 100).toLocaleString("en-IN")}`;
  }
  const step = plan.multipleOfPaise ?? 1;
  if (step > 1 && paise % step !== 0) {
    return `Amount must be in multiples of ₹${Math.round(step / 100).toLocaleString("en-IN")}`;
  }
  return null;
}

type CustomerCollectionPreview = {
  blockers?: { code: string; message: string }[];
  preview?: {
    installmentCount: number;
    installmentAmount: { amountPaise: number };
    totalPayable: { amountPaise: number };
    firstDueDate: string;
    maturityDate: string;
    maturityDateProvisional?: boolean;
    oneTimeSchedule?: Array<{ period: number; dueDate: string }>;
  } | null;
};

export function adaptCustomerCollectionPreview(raw: unknown) {
  const { blockers, preview } = (raw ?? {}) as CustomerCollectionPreview;
  return {
    blockers,
    preview: preview ? {
      installmentCount: preview.installmentCount,
      installmentAmount: preview.installmentAmount.amountPaise / 100,
      totalCommitment: preview.totalPayable.amountPaise / 100,
      firstDueDate: preview.firstDueDate,
      maturityDate: preview.maturityDate,
      maturityDateProvisional: preview.maturityDateProvisional,
      oneTimeSchedule: preview.oneTimeSchedule,
    } : undefined,
  };
}
