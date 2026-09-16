import type { SchemePlan } from "@/src/types/domain";
import {
  buildPlanCreatePayload,
  defaultPlanBuilderForm,
  type PlanBuilderFormState,
} from "@/src/features/schemes/plan-builder-form";

type PlanProfile = Partial<PlanBuilderFormState> & {
  displayName?: string;
  amountSummaryLabel?: string;
};

const PROFILES: Record<string, PlanProfile> = {
  pln_01: {
    displayName: "Akshaya Gold Savings",
    description:
      "Pay a flexible monthly amount for 12 months. Complete all installments and receive the 13th month as a benefit credit at maturity.",
    benefitDisplayLabel: "13th month installment free",
    benefitType: "ONE_FREE_INSTALLMENT",
    minAmount: 2000,
    maxAmount: 50000,
    multipleOf: 500,
    amountSummaryLabel:
      "₹2,000 – ₹50,000 per month (in multiples of ₹500)",
    enrolmentOpenFrom: "2026-01-01",
    enrolmentOpenTo: "2027-12-31",
  },
  pln_02: {
    displayName: "Suvarna Gold Weight Plan",
    description:
      "Build gold weight at the tenant daily rate. Each payment locks grams at that day's rate on your passbook.",
    valueBasis: "GOLD_WEIGHT",
    benefitDisplayLabel: "5% bonus gold at maturity (max 2 g)",
    benefitType: "FIXED_BONUS_AMOUNT",
    bonusBasis: "PERCENT_OF_PAID",
    bonusValue: 5,
    maxBonus: 2000,
    minAmount: 3000,
    maxAmount: 25000,
    multipleOf: 100,
    amountSummaryLabel:
      "₹3,000 – ₹25,000 per month (in multiples of ₹100)",
  },
  pln_03: {
    displayName: "Sampoorna Flexible Savings",
    description:
      "Six months to pay freely, then five capped cycles based on your average. Ideal for irregular earners.",
    paymentPattern: "FLEXIBLE_AVERAGE",
    benefitDisplayLabel: "One free capped cycle at maturity",
    flexMinPayment: 500,
    flexMaxPayment: 50000,
    amountSummaryLabel: "Flexible free window · capped phase follows",
  },
  pln_05: {
    displayName: "Golden Average 11",
    description: "Eleven-month flexible-average plan with festival redemption perks.",
    paymentPattern: "FLEXIBLE_AVERAGE",
    durationMonths: 11,
    installmentCount: 11,
    flexiblePhaseCycles: 6,
    cappedPhaseCycles: 5,
    textBenefit: "Zero making charges on select ornament purchases at maturity.",
    benefitType: "TEXT_ONLY",
    benefitDisplayLabel: "Making charges waived on maturity purchase",
    amountSummaryLabel: "Pay freely for 6 cycles · 5 capped cycles follow",
  },
  pln_04: {
    displayName: "Festival Gold 10",
    description: "Fixed slab plan for festival season — choose ₹5k, ₹10k or ₹20k at enrolment.",
    valueBasis: "GOLD_WEIGHT",
    amountMode: "JEWELLER_SLABS",
    slabsCsv: "5000,10000,20000",
    benefitDisplayLabel: "Bonus ₹1,000 on maturity",
    benefitType: "FIXED_BONUS_AMOUNT",
    bonusBasis: "FLAT",
    bonusValue: 1000,
    amountSummaryLabel: "Slabs ₹5,000 · ₹10,000 · ₹20,000 per installment",
  },
};

function buildAmountSummaryLabel(
  plan: SchemePlan,
  form: PlanBuilderFormState,
  override?: string,
) {
  if (override) return override;
  if (form.paymentPattern === "FLEXIBLE_AVERAGE") {
    return `Free ${form.flexiblePhaseCycles} cycles · capped ${form.cappedPhaseCycles} cycles (avg ÷ ${form.averagingDivisor})`;
  }
  if (form.amountMode === "JEWELLER_FIXED") {
    return `₹${form.fixedAmount.toLocaleString("en-IN")} fixed per installment`;
  }
  if (form.amountMode === "JEWELLER_SLABS") {
    const slabs = form.slabsCsv
      .split(/[,;\s]+/)
      .filter(Boolean)
      .map((s) => `₹${Number(s.trim()).toLocaleString("en-IN")}`)
      .join(" · ");
    return `Slabs ${slabs} per installment`;
  }
  return `₹${form.minAmount.toLocaleString("en-IN")} – ₹${form.maxAmount.toLocaleString("en-IN")} (in multiples of ₹${form.multipleOf.toLocaleString("en-IN")})`;
}

export function synthesizePlanDetail(plan: SchemePlan) {
  const profile = PROFILES[plan.id] ?? {};
  const form = defaultPlanBuilderForm();
  form.name = plan.name;
  form.code = plan.code;
  form.displayName = profile.displayName ?? plan.name;
  form.description = profile.description ?? form.description;
  form.valueBasis = plan.valueBasis;
  form.paymentPattern =
    plan.paymentPattern === "FLEXIBLE_AVERAGE"
      ? "FLEXIBLE_AVERAGE"
      : "FIXED_DATE";
  form.durationMonths = plan.tenure;
  form.installmentCount = plan.tenure;
  form.amountMode = (profile.amountMode ??
    plan.amountMode) as PlanBuilderFormState["amountMode"];
  form.fixedAmount = plan.amount;
  form.minAmount = profile.minAmount ?? plan.amount;
  form.maxAmount = profile.maxAmount ?? Math.max(plan.amount * 10, plan.amount);
  form.multipleOf = profile.multipleOf ?? 500;
  form.slabsCsv = profile.slabsCsv ?? form.slabsCsv;
  form.editLocked = plan.editLocked ?? false;
  if (profile.benefitType) form.benefitType = profile.benefitType;
  if (profile.benefitDisplayLabel)
    form.benefitDisplayLabel = profile.benefitDisplayLabel;
  if (profile.bonusBasis) form.bonusBasis = profile.bonusBasis;
  if (profile.bonusValue != null) form.bonusValue = profile.bonusValue;
  if (profile.maxBonus != null) form.maxBonus = profile.maxBonus;
  if (profile.textBenefit) form.textBenefit = profile.textBenefit;
  if (profile.flexMinPayment) form.flexMinPayment = profile.flexMinPayment;
  if (profile.flexMaxPayment) form.flexMaxPayment = profile.flexMaxPayment;
  if (profile.durationMonths) form.durationMonths = profile.durationMonths;
  if (profile.installmentCount)
    form.installmentCount = profile.installmentCount;
  if (profile.flexiblePhaseCycles)
    form.flexiblePhaseCycles = profile.flexiblePhaseCycles;
  if (profile.cappedPhaseCycles)
    form.cappedPhaseCycles = profile.cappedPhaseCycles;
  if (profile.enrolmentOpenFrom)
    form.enrolmentOpenFrom = profile.enrolmentOpenFrom;
  if (profile.enrolmentOpenTo) form.enrolmentOpenTo = profile.enrolmentOpenTo;

  const body = buildPlanCreatePayload(form) as Record<string, unknown>;
  if (!String(body.termsText ?? "").trim()) {
    body.termsText = form.termsText;
  }
  const minPaise = Math.round(form.minAmount * 100);
  const maxPaise = Math.round(form.maxAmount * 100);
  const active = plan.activeEnrollments;
  const totalEnrolments = active + Math.max(12, Math.floor(active * 0.15));

  return {
    ...body,
    id: plan.id,
    status: plan.status,
    version: plan.id === "pln_01" ? 3 : 1,
    editLocked: plan.editLocked ?? false,
    amountSummary: {
      amountMode: form.amountMode,
      min: {
        amountPaise: minPaise,
        amountDisplay: `₹${form.minAmount.toLocaleString("en-IN")}`,
      },
      max: {
        amountPaise: maxPaise,
        amountDisplay: `₹${form.maxAmount.toLocaleString("en-IN")}`,
      },
      multipleOf: form.multipleOf
        ? {
            amountPaise: Math.round(form.multipleOf * 100),
            amountDisplay: `₹${form.multipleOf.toLocaleString("en-IN")}`,
          }
        : null,
      label: buildAmountSummaryLabel(plan, form, profile.amountSummaryLabel),
    },
    benefit: body.benefit,
    stats: {
      activeSchemes: active,
      totalEnrolments,
      collectedThisMonth: {
        amountPaise: active * minPaise,
        amountDisplay: `₹${(active * form.minAmount).toLocaleString("en-IN")}`,
      },
    },
  };
}

export function synthesizePlanStats(plan: SchemePlan) {
  const active = plan.activeEnrollments;
  const total = active + Math.max(20, Math.floor(active * 0.18));
  return {
    enrolments: {
      total,
      active,
      locked: Math.floor(active * 0.04),
      matured: Math.max(8, Math.floor(total * 0.08)),
      redeemed: Math.max(5, Math.floor(total * 0.12)),
      closedPremature: Math.max(2, Math.floor(total * 0.02)),
      defaulted: Math.max(1, Math.floor(total * 0.03)),
    },
    financials: {
      totalCollected: {
        amountPaise: active * plan.amount * 100 * 11,
        amountDisplay: `₹${(active * plan.amount * 11).toLocaleString("en-IN")}`,
      },
      outstandingExpected: {
        amountPaise: active * plan.amount * 100 * 2,
        amountDisplay: `₹${(active * plan.amount * 2).toLocaleString("en-IN")}`,
      },
      goldLiability:
        plan.valueBasis === "GOLD_WEIGHT"
          ? {
              weightMg: active * 420,
              weightDisplay: `${((active * 420) / 1000).toFixed(3)} g`,
            }
          : { weightMg: 0, weightDisplay: "0.000 g" },
      benefitLiability: {
        amountPaise: active * plan.amount * 100,
        amountDisplay: `₹${(active * plan.amount).toLocaleString("en-IN")}`,
      },
    },
    charts: {
      enrolmentTrend: {
        chartType: "bar",
        title: "New enrolments",
        yAxis: { type: "count" },
        series: [
          {
            key: "enrolments",
            name: "Enrolments",
            data: [
              { x: "Jun", y: Math.max(8, Math.floor(active * 0.12)) },
              { x: "Jul", y: Math.max(12, Math.floor(active * 0.18)) },
              { x: "Aug", y: Math.max(15, Math.floor(active * 0.22)) },
              { x: "Sep", y: Math.max(18, active) },
            ],
          },
        ],
      },
      statusDistribution: {
        chartType: "donut",
        title: "Enrolment status",
        yAxis: { type: "count" },
        series: [
          {
            key: "status",
            name: "Status",
            data: [
              { x: "Active", y: active },
              { x: "Redeemed", y: Math.max(5, Math.floor(total * 0.12)) },
              { x: "Matured", y: Math.max(3, Math.floor(total * 0.06)) },
              { x: "Defaulted", y: Math.max(1, Math.floor(total * 0.03)) },
            ],
          },
        ],
      },
    },
  };
}
