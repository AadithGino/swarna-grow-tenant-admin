import type { PlanBuilderFormState } from "@/src/features/schemes/plan-builder-form";
import type { StepId } from "@/src/features/schemes/plan-builder-wizard-types";

export const PLAN_CODE_PATTERN = /^[A-Z0-9_-]{2,20}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseSlabAmounts(csv: string): number[] {
  return csv
    .split(/[,;\s]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export function validatePlanBasics(
  form: PlanBuilderFormState,
  options?: { isEdit?: boolean },
): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = form.name.trim();
  if (name.length < 2) {
    errors.name = "Plan name must be at least 2 characters.";
  } else if (name.length > 120) {
    errors.name = "Plan name must be 120 characters or fewer.";
  }
  if (!options?.isEdit) {
    const code = form.code.trim().toUpperCase();
    if (!PLAN_CODE_PATTERN.test(code)) {
      errors.code = "Code must be 2–20 characters (A–Z, 0–9, _, -).";
    }
  }
  if (form.displayName.length > 120) {
    errors.displayName = "Display name must be 120 characters or fewer.";
  }
  if (form.description.length > 2000) {
    errors.description = "Description must be 2000 characters or fewer.";
  }
  if (form.termsText.length > 10000) {
    errors.termsText = "Terms must be 10000 characters or fewer.";
  }
  return errors;
}

export function validatePlanDuration(
  form: PlanBuilderFormState,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.durationMonths < 1 || form.durationMonths > 120) {
    errors.durationMonths = "Duration must be between 1 and 120 months.";
  }
  if (form.installmentCount < 1 || form.installmentCount > 120) {
    errors.installmentCount = "Installment count must be between 1 and 120.";
  }
  return errors;
}

export function validatePlanGoldRules(
  form: PlanBuilderFormState,
): Record<string, string> {
  if (form.valueBasis !== "GOLD_WEIGHT") return {};
  if (!Number.isInteger(form.weightPrecisionMg) || form.weightPrecisionMg < 1) {
    return { weightPrecisionMg: "Weight precision must be a positive whole milligram." };
  }
  return {};
}

export function validatePlanAmountRules(
  form: PlanBuilderFormState,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.paymentPattern !== "FIXED_DATE") return errors;

  if (form.amountMode === "JEWELLER_FIXED") {
    if (form.fixedAmount <= 0) {
      errors.fixedAmount = "Fixed installment must be greater than zero.";
    }
  } else if (form.amountMode === "JEWELLER_SLABS") {
    if (parseSlabAmounts(form.slabsCsv).length === 0) {
      errors.slabsCsv = "Enter at least one positive slab amount.";
    }
  } else {
    if (form.minAmount <= 0) {
      errors.minAmount = "Minimum amount must be greater than zero.";
    }
    if (form.maxAmount < form.minAmount) {
      errors.maxAmount = "Maximum must be at least the minimum.";
    }
    if (form.multipleOf > 0 && form.minAmount > 0) {
      const step = form.multipleOf;
      if (Math.round(form.minAmount * 100) % Math.round(step * 100) !== 0) {
        errors.multipleOf = "Minimum should align with the step multiple.";
      }
    }
  }
  return errors;
}

export function validatePlanSchedule(
  form: PlanBuilderFormState,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.paymentPattern !== "FIXED_DATE") return errors;
  if (form.dueDay < 1 || form.dueDay > 31) {
    errors.dueDay = "Due day must be between 1 and 31.";
  }
  if (form.graceDays < 0 || form.graceDays > 90) {
    errors.graceDays = "Grace days must be between 0 and 90.";
  }
  if (form.advancePaymentAllowed && form.maxAdvanceInstallments < 1) {
    errors.maxAdvanceInstallments =
      "Choose at least one future installment when advance payment is enabled.";
  }
  return errors;
}

export function validatePlanFlexible(
  form: PlanBuilderFormState,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.paymentPattern !== "FLEXIBLE_AVERAGE") return errors;

  if (form.flexiblePhaseCycles < 1 || form.cappedPhaseCycles < 1) {
    errors.flexiblePhaseCycles = "Free and capped phases must each be at least 1 month.";
  }
  if (
    form.flexiblePhaseCycles + form.cappedPhaseCycles !==
    form.installmentCount
  ) {
    errors.installmentCount =
      "Free + capped months must equal the contribution-cycle count.";
  }
  if (form.flexMinPayment <= 0) {
    errors.flexMinPayment = "Minimum free-window payment must be greater than zero.";
  }
  if (form.flexMaxPayment < form.flexMinPayment) {
    errors.flexMaxPayment = "Maximum must be at least the minimum payment.";
  }
  if (form.cappedMinPayment <= 0) {
    errors.cappedMinPayment = "Capped-phase minimum must be greater than zero.";
  }
  if (form.capMinCycle <= 0 || form.capMaxCycle < form.capMinCycle) {
    errors.capMaxCycle = "Cap band min/max must be valid.";
  }
  if (form.flexPaymentIncrement <= 0) {
    errors.flexPaymentIncrement = "Payment increment must be greater than zero.";
  }
  if (
    !form.allowFinalRemainderBelowMinimum &&
    form.cappedMinPayment > form.capMinCycle
  ) {
    errors.cappedMinPayment =
      "Capped minimum cannot exceed the minimum cycle cap unless final remainder is allowed.";
  }
  return errors;
}

export function validatePlanBenefit(
  form: PlanBuilderFormState,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const label = form.benefitDisplayLabel.trim();
  if (!label) {
    errors.benefitDisplayLabel = "Benefit display label is required.";
  } else if (label.length > 160) {
    errors.benefitDisplayLabel = "Label must be 160 characters or fewer.";
  }
  if (form.benefitType === "FIXED_BONUS_AMOUNT") {
    if (form.bonusBasis === "FLAT" && form.bonusValue < 1) {
      errors.bonusValue = "Bonus amount must be at least ₹1.";
    }
    if (form.bonusBasis === "PERCENT_OF_PAID" && form.bonusValue < 1) {
      errors.bonusValue = "Bonus percent must be at least 1.";
    }
  }
  if (form.benefitType === "TEXT_ONLY" && !form.textBenefit.trim()) {
    errors.textBenefit = "Enter benefit text or switch benefit type.";
  }
  return errors;
}

export function validatePlanRedemption(
  form: PlanBuilderFormState,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.allowedRedemptionModes.length === 0) {
    errors.allowedRedemptionModes = "Select at least one redemption mode.";
  }
  if (form.prematureClosureAllowed && form.lockInMonths < 0) {
    errors.lockInMonths = "Lock-in months cannot be negative.";
  }
  return errors;
}

export function validatePlanAvailability(
  form: PlanBuilderFormState,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.enrolmentOpenFrom && !ISO_DATE.test(form.enrolmentOpenFrom)) {
    errors.enrolmentOpenFrom = "Use date format YYYY-MM-DD.";
  }
  if (form.enrolmentOpenTo && !ISO_DATE.test(form.enrolmentOpenTo)) {
    errors.enrolmentOpenTo = "Use date format YYYY-MM-DD.";
  }
  if (
    form.enrolmentOpenFrom &&
    form.enrolmentOpenTo &&
    ISO_DATE.test(form.enrolmentOpenFrom) &&
    ISO_DATE.test(form.enrolmentOpenTo) &&
    form.enrolmentOpenFrom > form.enrolmentOpenTo
  ) {
    errors.enrolmentOpenTo = "End date must be on or after start date.";
  }
  if (form.maxEnrolments !== "" && Number(form.maxEnrolments) < 1) {
    errors.maxEnrolments = "Max enrolments must be at least 1.";
  }
  if (!form.allBranches && form.branchIds.length === 0) {
    errors.branchIds = "Select branches or allow all branches.";
  }
  return errors;
}

export function validatePlanBuilderStep(
  stepId: StepId,
  form: PlanBuilderFormState,
  options?: { isEdit?: boolean },
): Record<string, string> {
  switch (stepId) {
    case "basics":
      return validatePlanBasics(form, options);
    case "type":
      return validatePlanGoldRules(form);
    case "duration":
      return validatePlanDuration(form);
    case "amount":
      return validatePlanAmountRules(form);
    case "schedule":
      return validatePlanSchedule(form);
    case "flexible":
      return validatePlanFlexible(form);
    case "benefit":
      return validatePlanBenefit(form);
    case "redemption":
      return validatePlanRedemption(form);
    case "availability":
      return validatePlanAvailability(form);
    case "review":
      return {};
    default:
      return {};
  }
}

export function validatePlanBuilderFull(
  form: PlanBuilderFormState,
  options?: { isEdit?: boolean },
): Record<string, string> {
  return {
    ...validatePlanBasics(form, options),
    ...validatePlanDuration(form),
    ...validatePlanGoldRules(form),
    ...validatePlanAmountRules(form),
    ...validatePlanSchedule(form),
    ...validatePlanFlexible(form),
    ...validatePlanBenefit(form),
    ...validatePlanRedemption(form),
    ...validatePlanAvailability(form),
  };
}

/** Quick create on schemes list (name, code, tenure, amount). */
export function validateQuickPlanDraft(input: {
  name: string;
  code: string;
  tenure: number;
  amount: number;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = input.name.trim();
  if (name.length < 2) errors.name = "Plan name must be at least 2 characters.";
  const code = input.code.trim().toUpperCase();
  if (!PLAN_CODE_PATTERN.test(code)) {
    errors.code = "Code must be 2–20 characters (A–Z, 0–9, _, -).";
  }
  if (input.tenure < 1 || input.tenure > 120) {
    errors.tenure = "Tenure must be between 1 and 120 months.";
  }
  if (input.amount <= 0) {
    errors.amount = "Default amount must be greater than zero.";
  }
  return errors;
}
