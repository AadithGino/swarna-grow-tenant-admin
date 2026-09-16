import { money } from "@/src/lib/format";
import type { SchemePlan } from "@/src/types/domain";

function amountToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function validateEnrolPlanId(planId: string): string | undefined {
  if (!planId.trim()) return "Choose a scheme plan.";
  return undefined;
}

export function validateEnrolCustomerId(customerId: string): string | undefined {
  if (!customerId.trim()) return "Select a customer.";
  return undefined;
}

/** Client-side installment rules (rupees); server validate remains authoritative. */
export function validateEnrolAmount(
  plan: SchemePlan | undefined,
  amountRupee: number,
): string | undefined {
  if (!plan) return undefined;
  if (!Number.isFinite(amountRupee) || amountRupee <= 0) {
    return "Enter an installment amount greater than zero.";
  }
  const paise = amountToPaise(amountRupee);

  if (plan.amountMode === "JEWELLER_FIXED" && plan.fixedAmount != null) {
    if (amountToPaise(plan.fixedAmount) !== paise) {
      return `Installment must be ${money(plan.fixedAmount)} for this plan.`;
    }
  }

  if (plan.amountMode === "JEWELLER_SLABS") {
    const slabs = plan.slabs ?? [];
    if (
      !slabs.some((slab) => amountToPaise(slab) === paise)
    ) {
      return "Choose one of the plan's installment slabs.";
    }
  }

  if (plan.minAmount != null && amountRupee + 1e-9 < plan.minAmount) {
    return `Minimum installment is ${money(plan.minAmount)}.`;
  }
  if (plan.maxAmount != null && amountRupee - 1e-9 > plan.maxAmount) {
    return `Maximum installment is ${money(plan.maxAmount)}.`;
  }
  if (plan.amountStep != null && plan.amountStep > 0) {
    const stepPaise = amountToPaise(plan.amountStep);
    if (stepPaise > 0 && paise % stepPaise !== 0) {
      return `Amount must be a multiple of ${money(plan.amountStep)}.`;
    }
  }

  return undefined;
}

export function liveEnrolAmountError(
  plan: SchemePlan | undefined,
  amountRupee: number,
): string | undefined {
  if (!plan) return undefined;
  if (amountRupee === 0) return undefined;
  return validateEnrolAmount(plan, amountRupee);
}

export type EnrolSubmitReadinessInput = {
  planId: string;
  customerId?: string;
  plan: SchemePlan | undefined;
  amount: number;
  apiBlockers: unknown[];
  validateLoading: boolean;
  plansLoading?: boolean;
};

export function enrolSubmitReady(input: EnrolSubmitReadinessInput): boolean {
  if (input.plansLoading || input.validateLoading) return false;
  if (input.customerId !== undefined && validateEnrolCustomerId(input.customerId)) {
    return false;
  }
  if (validateEnrolPlanId(input.planId)) return false;
  if (!input.plan) return false;
  if (validateEnrolAmount(input.plan, input.amount)) return false;
  if (input.apiBlockers.length > 0) return false;
  return true;
}
