import {
  PLATFORM_LIMIT_OVERRIDE_MAX,
  PLATFORM_LIMIT_OVERRIDE_MIN,
  validateLimitOverrideValue,
} from "@/src/lib/platform-tenant-subscription-form-validation";
import {
  PLATFORM_TENANT_TRIAL_DAYS_MAX,
  PLATFORM_TENANT_TRIAL_DAYS_MIN,
} from "@/src/lib/platform-tenant-create-form-validation";
import {
  BUSINESS_NAME_MAX,
  DISPLAY_NAME_MAX,
} from "@/src/lib/settings-form-validation";
import type { BillingCycle, PlatformPlan, SubscriptionTier } from "@/src/types/platform";

export const PLAN_TIERS = ["STARTER", "GROWTH", "PRO", "CUSTOM"] as const;

export const PLAN_PRICE_PAISE_MAX = 999_999_999;
export const PLAN_SORT_ORDER_MIN = 0;
export const PLAN_SORT_ORDER_MAX = 999;

export const DEFAULT_PLAN_LIMIT_KEYS = [
  "activeCustomers",
  "branches",
  "staffSeats",
  "schemePlans",
  "whatsappMessagesPerMonth",
] as const;

export type PlanLimitKey = (typeof DEFAULT_PLAN_LIMIT_KEYS)[number];

export type PlatformSubscriptionPlanForm = {
  tier: SubscriptionTier;
  name: string;
  displayName: string;
  monthlyPricePaise: number;
  yearlyPricePaise: number;
  trialDays: number;
  highlighted: boolean;
  sortOrder: number;
  supportedBillingCycles: BillingCycle[];
  limits: Record<string, number | null>;
  features: Record<string, boolean>;
  displayFeatures: { label: string; value: string }[];
  expectedVersion?: number;
};

export const DEFAULT_PLAN_FEATURES: Record<string, boolean> = {
  multiBranch: true,
  customApp: false,
  flexibleScheme: true,
  goldWeightScheme: true,
  prematureRedemption: true,
  customerSelfEnrol: true,
  advancedReports: false,
};

export const DEFAULT_PLAN_LIMITS: Record<string, number> = {
  activeCustomers: 1000,
  branches: 2,
  staffSeats: 10,
  schemePlans: 10,
  whatsappMessagesPerMonth: 5000,
};

export function emptyPlatformSubscriptionPlanForm(): PlatformSubscriptionPlanForm {
  return {
    tier: "GROWTH",
    name: "",
    displayName: "",
    monthlyPricePaise: 500_000,
    yearlyPricePaise: 5_400_000,
    trialDays: 14,
    highlighted: false,
    sortOrder: 5,
    supportedBillingCycles: ["MONTHLY", "ANNUAL"],
    limits: { ...DEFAULT_PLAN_LIMITS },
    features: { ...DEFAULT_PLAN_FEATURES },
    displayFeatures: [],
  };
}

export function platformSubscriptionPlanFormFromPlan(
  plan: PlatformPlan,
): PlatformSubscriptionPlanForm {
  return {
    tier: plan.tier,
    name: plan.name,
    displayName: plan.displayName,
    monthlyPricePaise: plan.monthlyPrice?.amountPaise ?? 0,
    yearlyPricePaise: plan.yearlyPrice?.amountPaise ?? 0,
    trialDays: plan.trialDays,
    highlighted: plan.highlighted,
    sortOrder: plan.sortOrder,
    supportedBillingCycles: plan.supportedBillingCycles ?? ["MONTHLY", "ANNUAL"],
    limits: { ...plan.limits },
    features: { ...plan.features },
    displayFeatures: plan.displayFeatures ?? [],
    expectedVersion: plan.version ?? 1,
  };
}

export function sanitizePlanPaiseInput(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  if (!Number.isFinite(n)) return 0;
  return Math.min(PLAN_PRICE_PAISE_MAX, n);
}

export function sanitizePlanTrialDaysInput(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return PLATFORM_TENANT_TRIAL_DAYS_MIN;
  const n = Number(digits);
  if (!Number.isFinite(n)) return PLATFORM_TENANT_TRIAL_DAYS_MIN;
  return Math.min(
    PLATFORM_TENANT_TRIAL_DAYS_MAX,
    Math.max(PLATFORM_TENANT_TRIAL_DAYS_MIN, n),
  );
}

export function sanitizePlanSortOrderInput(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return PLAN_SORT_ORDER_MIN;
  const n = Number(digits);
  if (!Number.isFinite(n)) return PLAN_SORT_ORDER_MIN;
  return Math.min(PLAN_SORT_ORDER_MAX, Math.max(PLAN_SORT_ORDER_MIN, n));
}

function validatePlanName(name: string, label: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return `${label} is required.`;
  if (trimmed.length < 2) return `${label} must be at least 2 characters.`;
  const max = label.includes("Display") ? DISPLAY_NAME_MAX : BUSINESS_NAME_MAX;
  if (name.length > max) return `${label} must be ${max} characters or fewer.`;
  return undefined;
}

function validatePricePaise(
  value: number,
  label: string,
  options?: { allowZero?: boolean },
): string | undefined {
  if (!Number.isFinite(value)) return `${label} is required.`;
  if (!Number.isInteger(value)) return `${label} must be a whole number of paise.`;
  if (value < 0) return `${label} cannot be negative.`;
  if (!options?.allowZero && value <= 0) {
    return `${label} must be greater than zero.`;
  }
  if (value > PLAN_PRICE_PAISE_MAX) {
    return `${label} is too large.`;
  }
  return undefined;
}

function validateTrialDays(days: number): string | undefined {
  if (!Number.isFinite(days)) return "Trial days must be a number.";
  if (!Number.isInteger(days)) return "Trial days must be a whole number.";
  if (days < PLATFORM_TENANT_TRIAL_DAYS_MIN || days > PLATFORM_TENANT_TRIAL_DAYS_MAX) {
    return `Trial days must be between ${PLATFORM_TENANT_TRIAL_DAYS_MIN} and ${PLATFORM_TENANT_TRIAL_DAYS_MAX}.`;
  }
  return undefined;
}

function validateSortOrder(sortOrder: number): string | undefined {
  if (!Number.isFinite(sortOrder)) return "Sort order is required.";
  if (!Number.isInteger(sortOrder)) return "Sort order must be a whole number.";
  if (sortOrder < PLAN_SORT_ORDER_MIN || sortOrder > PLAN_SORT_ORDER_MAX) {
    return `Sort order must be between ${PLAN_SORT_ORDER_MIN} and ${PLAN_SORT_ORDER_MAX}.`;
  }
  return undefined;
}

export function limitFieldKey(key: string): string {
  return `limits.${key}`;
}

export function validatePlanLimitValue(
  value: number | null,
  tier: SubscriptionTier,
): string | undefined {
  if (value === null) {
    return tier === "CUSTOM"
      ? undefined
      : "Limit is required for non-custom plans.";
  }
  return validateLimitOverrideValue(value);
}

export function validatePlatformSubscriptionPlanForm(
  form: PlatformSubscriptionPlanForm,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!PLAN_TIERS.includes(form.tier as (typeof PLAN_TIERS)[number])) {
    errors.tier = "Choose a valid tier.";
  }
  const displayErr = validatePlanName(form.displayName, "Display name");
  if (displayErr) errors.displayName = displayErr;
  const nameErr = validatePlanName(
    form.name.trim() || form.displayName.trim(),
    "Internal name",
  );
  if (nameErr) errors.name = nameErr;

  const allowZeroPrice = form.tier === "CUSTOM";
  const monthlyErr = validatePricePaise(form.monthlyPricePaise, "Monthly price (paise)", {
    allowZero: allowZeroPrice,
  });
  if (monthlyErr) errors.monthlyPricePaise = monthlyErr;
  const yearlyErr = validatePricePaise(form.yearlyPricePaise, "Yearly price (paise)", {
    allowZero: allowZeroPrice,
  });
  if (yearlyErr) errors.yearlyPricePaise = yearlyErr;

  const trialErr = validateTrialDays(form.trialDays);
  if (trialErr) errors.trialDays = trialErr;
  const sortErr = validateSortOrder(form.sortOrder);
  if (sortErr) errors.sortOrder = sortErr;

  for (const [key, value] of Object.entries(form.limits)) {
    const err = validatePlanLimitValue(value, form.tier);
    if (err) errors[limitFieldKey(key)] = err;
  }

  return errors;
}

export function livePlatformSubscriptionPlanFieldErrors(
  form: PlatformSubscriptionPlanForm,
  touched: Partial<Record<string, boolean>>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (touched.displayName || form.displayName.trim()) {
    const e = validatePlanName(form.displayName, "Display name");
    if (e) errors.displayName = e;
  }
  if (touched.name && form.name.trim()) {
    const e = validatePlanName(form.name, "Internal name");
    if (e) errors.name = e;
  }
  if (touched.monthlyPricePaise) {
    const e = validatePricePaise(form.monthlyPricePaise, "Monthly price (paise)", {
      allowZero: form.tier === "CUSTOM",
    });
    if (e) errors.monthlyPricePaise = e;
  }
  if (touched.yearlyPricePaise) {
    const e = validatePricePaise(form.yearlyPricePaise, "Yearly price (paise)", {
      allowZero: form.tier === "CUSTOM",
    });
    if (e) errors.yearlyPricePaise = e;
  }
  if (touched.trialDays) {
    const e = validateTrialDays(form.trialDays);
    if (e) errors.trialDays = e;
  }
  if (touched.sortOrder) {
    const e = validateSortOrder(form.sortOrder);
    if (e) errors.sortOrder = e;
  }
  for (const key of Object.keys(form.limits)) {
    if (touched[limitFieldKey(key)]) {
      const err = validatePlanLimitValue(form.limits[key], form.tier);
      if (err) errors[limitFieldKey(key)] = err;
    }
  }
  return errors;
}

export function platformSubscriptionPlanFormReady(
  form: PlatformSubscriptionPlanForm,
): boolean {
  return Object.keys(validatePlatformSubscriptionPlanForm(form)).length === 0;
}

export function platformSubscriptionPlanFormUnchanged(
  form: PlatformSubscriptionPlanForm,
  baseline: PlatformSubscriptionPlanForm,
): boolean {
  return JSON.stringify(form) === JSON.stringify(baseline);
}

export function subscriptionPlanBodyForApi(
  form: PlatformSubscriptionPlanForm,
  options?: { isEdit?: boolean },
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    tier: form.tier,
    name: (form.name.trim() || form.displayName.trim()),
    displayName: form.displayName.trim(),
    monthlyPricePaise: form.monthlyPricePaise,
    yearlyPricePaise: form.yearlyPricePaise,
    trialDays: form.trialDays,
    highlighted: form.highlighted,
    sortOrder: form.sortOrder,
    supportedBillingCycles: form.supportedBillingCycles,
    limits: form.limits,
    features: form.features,
    displayFeatures: form.displayFeatures,
  };
  if (options?.isEdit && form.expectedVersion != null) {
    body.expectedVersion = form.expectedVersion;
  }
  return body;
}

export function parsePlanLimitInput(
  raw: string,
  tier: SubscriptionTier,
): number | null {
  const trimmed = raw.trim();
  if (!trimmed && tier === "CUSTOM") return null;
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return tier === "CUSTOM" ? null : PLATFORM_LIMIT_OVERRIDE_MIN;
  const n = Number(digits);
  if (!Number.isFinite(n)) return PLATFORM_LIMIT_OVERRIDE_MIN;
  return Math.min(
    PLATFORM_LIMIT_OVERRIDE_MAX,
    Math.max(PLATFORM_LIMIT_OVERRIDE_MIN, n),
  );
}
