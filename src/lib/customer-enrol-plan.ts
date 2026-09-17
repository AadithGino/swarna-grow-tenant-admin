import type { EnrolPlanRules } from "@/src/lib/enrol-plan-rules";
import { defaultAmountForPlan, mapRawPlanRules } from "@/src/lib/enrol-plan-rules";
import type { SchemePlan } from "@/src/types/customer";

/** Maps portal `SchemePlan` (from customer API adapter) into admin enrol rule shape. */
export function customerPlanEnrolRules(plan: SchemePlan): EnrolPlanRules {
  if (plan.enrolRules) return plan.enrolRules;
  return mapRawPlanRules({
    paymentPattern: plan.model === "FLEXIBLE" ? "FLEXIBLE" : "FIXED",
    amountRules: {
      amountMode: plan.amountMode,
      fixedAmountPaise: plan.fixedAmountPaise,
      slabsPaise: plan.slabsPaise,
      minInstallmentPaise: plan.amountMinPaise,
      maxInstallmentPaise: plan.amountMaxPaise,
      multipleOfPaise: plan.multipleOfPaise,
    },
    scheduleRules: {
      firstInstallmentModeDefault: plan.firstInstallmentModeDefault,
      firstInstallmentModeEditable: plan.firstInstallmentModeEditable,
    },
  });
}

export function defaultCustomerEnrolAmountRupee(plan: SchemePlan): number {
  return defaultAmountForPlan(customerPlanEnrolRules(plan));
}
