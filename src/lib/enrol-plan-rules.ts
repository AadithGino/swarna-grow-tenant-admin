import type { SchemePlan } from "@/src/types/domain";
import { fromPaise } from "@/src/store/api/contract-adapters";

export type EnrolPlanRules = Pick<
  SchemePlan,
  | "amountMode"
  | "fixedAmount"
  | "slabs"
  | "minAmount"
  | "maxAmount"
  | "amountStep"
  | "firstInstallmentModeDefault"
  | "firstInstallmentModeEditable"
  | "paymentPattern"
>;

export function defaultAmountForPlan(plan: EnrolPlanRules): number {
  if (plan.amountMode === "JEWELLER_FIXED" && plan.fixedAmount != null) {
    return plan.fixedAmount;
  }
  if (plan.amountMode === "JEWELLER_SLABS" && plan.slabs?.length) {
    return plan.slabs[0];
  }
  if (plan.minAmount != null && plan.minAmount > 0) return plan.minAmount;
  return plan.fixedAmount ?? 0;
}

export function amountFieldLocked(plan: EnrolPlanRules | undefined): boolean {
  return plan?.amountMode === "JEWELLER_FIXED";
}

export function amountUsesSlabs(plan: EnrolPlanRules | undefined): boolean {
  return plan?.amountMode === "JEWELLER_SLABS";
}

export function isFlexibleEnrolPlan(
  plan: Pick<EnrolPlanRules, "paymentPattern"> | undefined,
): boolean {
  return plan?.paymentPattern === "FLEXIBLE_AVERAGE";
}

export function resolvedFirstInstallmentMode(
  plan: EnrolPlanRules | undefined,
  selected: "COLLECT_NOW" | "START_NEXT_CYCLE",
): "COLLECT_NOW" | "START_NEXT_CYCLE" {
  if (!plan) return selected;
  if (plan.firstInstallmentModeEditable === false) {
    return plan.firstInstallmentModeDefault ?? "COLLECT_NOW";
  }
  return selected;
}

export function mapRawPlanRules(item: any): EnrolPlanRules {
  const rules = item.amountRules ?? {};
  const schedule = item.scheduleRules ?? {};
  const paymentPattern =
    item.paymentPattern === "FIXED"
      ? "FIXED_DATE"
      : item.paymentPattern === "FLEXIBLE"
        ? "FLEXIBLE_AVERAGE"
        : item.paymentPattern;
  return {
    amountMode: rules.amountMode ?? item.amountMode ?? "CUSTOMER_CHOSEN",
    fixedAmount: fromPaise(rules.fixedAmountPaise),
    slabs: Array.isArray(rules.slabsPaise)
      ? rules.slabsPaise.map((p: number) => fromPaise(p))
      : [],
    minAmount: fromPaise(rules.minInstallmentPaise),
    maxAmount: fromPaise(rules.maxInstallmentPaise),
    amountStep: fromPaise(rules.multipleOfPaise) || undefined,
    firstInstallmentModeDefault:
      schedule.firstInstallmentModeDefault ?? "COLLECT_NOW",
    firstInstallmentModeEditable: schedule.firstInstallmentModeEditable !== false,
    paymentPattern,
  };
}
