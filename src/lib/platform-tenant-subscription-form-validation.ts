import { formatLocalYmd } from "@/src/lib/list-date-range";

export const SUBSCRIPTION_EXTENSION_DAYS_MIN = 1;
export const SUBSCRIPTION_EXTENSION_DAYS_MAX = 90;

export const PLATFORM_LIMIT_OVERRIDE_MIN = 1;
export const PLATFORM_LIMIT_OVERRIDE_MAX = 10_000_000;

export const PLATFORM_INVOICE_AMOUNT_RUPEES_MIN = 1;
export const PLATFORM_INVOICE_AMOUNT_RUPEES_MAX = 100_000_000;
export const PLATFORM_INVOICE_TAX_PERCENT_MAX = 100;
export const PLATFORM_INVOICE_DESCRIPTION_MAX = 200;
export const PLATFORM_FLAGS_REASON_MAX = 500;

export const BILLING_CYCLES = ["MONTHLY", "ANNUAL"] as const;
export type PlatformBillingCycle = (typeof BILLING_CYCLES)[number];

export const SUBSCRIPTION_EXTENSION_TYPES = ["SUBSCRIPTION", "GRACE"] as const;
export type SubscriptionExtensionType =
  (typeof SUBSCRIPTION_EXTENSION_TYPES)[number];

export type ChangePlanForm = {
  planId: string;
  billingCycle: PlatformBillingCycle;
};

export type ExtendSubscriptionForm = {
  extensionType: SubscriptionExtensionType;
  days: number;
};

export type CreatePlatformInvoiceForm = {
  amountRupees: number;
  dueDate: string;
  description: string;
  taxPercent: number;
};

export function defaultPlatformInvoiceDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return formatLocalYmd(d);
}

export function emptyCreatePlatformInvoiceForm(): CreatePlatformInvoiceForm {
  return {
    amountRupees: 5000,
    dueDate: defaultPlatformInvoiceDueDate(),
    description: "Platform subscription",
    taxPercent: 18,
  };
}

export function validateChangePlanForm(form: ChangePlanForm): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.planId.trim()) {
    errors.planId = "Select a target plan.";
  }
  if (!BILLING_CYCLES.includes(form.billingCycle)) {
    errors.billingCycle = "Choose monthly or annual billing.";
  }
  return errors;
}

export function validateExtendSubscriptionForm(
  form: ExtendSubscriptionForm,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!SUBSCRIPTION_EXTENSION_TYPES.includes(form.extensionType)) {
    errors.extensionType = "Choose an extension type.";
  }
  const daysErr = validateExtensionDays(form.days);
  if (daysErr) errors.days = daysErr;
  return errors;
}

export function validateExtensionDays(days: number): string | undefined {
  if (!Number.isFinite(days)) return "Days must be a number.";
  if (!Number.isInteger(days)) return "Days must be a whole number.";
  if (days < SUBSCRIPTION_EXTENSION_DAYS_MIN) {
    return `Enter at least ${SUBSCRIPTION_EXTENSION_DAYS_MIN} day.`;
  }
  if (days > SUBSCRIPTION_EXTENSION_DAYS_MAX) {
    return `Days cannot exceed ${SUBSCRIPTION_EXTENSION_DAYS_MAX}.`;
  }
  return undefined;
}

export function sanitizeExtensionDaysInput(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return SUBSCRIPTION_EXTENSION_DAYS_MIN;
  const n = Number(digits);
  if (!Number.isFinite(n)) return SUBSCRIPTION_EXTENSION_DAYS_MIN;
  return Math.min(
    SUBSCRIPTION_EXTENSION_DAYS_MAX,
    Math.max(SUBSCRIPTION_EXTENSION_DAYS_MIN, n),
  );
}

function validateIsoDateField(value: string, label: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${label} must use YYYY-MM-DD format.`;
  }
  const [y, m, d] = trimmed.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    return `${label} is not a valid calendar date.`;
  }
  return undefined;
}

export function validateCreatePlatformInvoiceForm(
  form: CreatePlatformInvoiceForm,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!Number.isFinite(form.amountRupees)) {
    errors.amountRupees = "Amount is required.";
  } else if (
    form.amountRupees < PLATFORM_INVOICE_AMOUNT_RUPEES_MIN ||
    form.amountRupees > PLATFORM_INVOICE_AMOUNT_RUPEES_MAX
  ) {
    errors.amountRupees = `Amount must be between ₹${PLATFORM_INVOICE_AMOUNT_RUPEES_MIN.toLocaleString("en-IN")} and ₹${PLATFORM_INVOICE_AMOUNT_RUPEES_MAX.toLocaleString("en-IN")}.`;
  }
  const dueErr = validateIsoDateField(form.dueDate, "Due date");
  if (dueErr) errors.dueDate = dueErr;
  if (form.description.length > PLATFORM_INVOICE_DESCRIPTION_MAX) {
    errors.description = `Description must be ${PLATFORM_INVOICE_DESCRIPTION_MAX} characters or fewer.`;
  }
  if (!Number.isFinite(form.taxPercent)) {
    errors.taxPercent = "Tax percent is required.";
  } else if (
    form.taxPercent < 0 ||
    form.taxPercent > PLATFORM_INVOICE_TAX_PERCENT_MAX
  ) {
    errors.taxPercent = `Tax percent must be between 0 and ${PLATFORM_INVOICE_TAX_PERCENT_MAX}.`;
  }
  return errors;
}

export function liveCreatePlatformInvoiceFieldErrors(
  form: CreatePlatformInvoiceForm,
  touched: Partial<Record<keyof CreatePlatformInvoiceForm, boolean>>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (touched.amountRupees) {
    if (
      !Number.isFinite(form.amountRupees) ||
      form.amountRupees < PLATFORM_INVOICE_AMOUNT_RUPEES_MIN
    ) {
      errors.amountRupees = "Enter a valid amount in rupees.";
    }
  }
  if (touched.dueDate && form.dueDate.trim()) {
    const e = validateIsoDateField(form.dueDate, "Due date");
    if (e) errors.dueDate = e;
  }
  if (touched.taxPercent) {
    if (
      !Number.isFinite(form.taxPercent) ||
      form.taxPercent < 0 ||
      form.taxPercent > PLATFORM_INVOICE_TAX_PERCENT_MAX
    ) {
      errors.taxPercent = "Enter a tax percent between 0 and 100.";
    }
  }
  return errors;
}

export function validateLimitOverrideValue(value: number): string | undefined {
  if (!Number.isFinite(value)) return "Enter a valid number.";
  if (!Number.isInteger(value)) return "Use a whole number.";
  if (value < PLATFORM_LIMIT_OVERRIDE_MIN) {
    return `Minimum is ${PLATFORM_LIMIT_OVERRIDE_MIN.toLocaleString("en-IN")}.`;
  }
  if (value > PLATFORM_LIMIT_OVERRIDE_MAX) {
    return `Maximum is ${PLATFORM_LIMIT_OVERRIDE_MAX.toLocaleString("en-IN")}.`;
  }
  return undefined;
}

export function validateLimitOverridesRecord(
  limits: Record<string, number>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [key, value] of Object.entries(limits)) {
    const err = validateLimitOverrideValue(value);
    if (err) errors[key] = err;
  }
  return errors;
}

export function sanitizeLimitOverrideInput(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return PLATFORM_LIMIT_OVERRIDE_MIN;
  const n = Number(digits);
  if (!Number.isFinite(n)) return PLATFORM_LIMIT_OVERRIDE_MIN;
  return Math.min(PLATFORM_LIMIT_OVERRIDE_MAX, Math.max(PLATFORM_LIMIT_OVERRIDE_MIN, n));
}

export function limitOverridesUnchanged(
  current: Record<string, number>,
  baseline: Record<string, number>,
): boolean {
  const keys = new Set([...Object.keys(current), ...Object.keys(baseline)]);
  for (const key of keys) {
    if ((current[key] ?? 0) !== (baseline[key] ?? 0)) return false;
  }
  return true;
}

export function flagsRecordUnchanged(
  current: Record<string, boolean>,
  baseline: Record<string, boolean>,
): boolean {
  const keys = new Set([...Object.keys(current), ...Object.keys(baseline)]);
  for (const key of keys) {
    if (Boolean(current[key]) !== Boolean(baseline[key])) return false;
  }
  return true;
}

export function validatePlatformFlagsReason(reason: string): string | undefined {
  if (reason.length > PLATFORM_FLAGS_REASON_MAX) {
    return `Reason must be ${PLATFORM_FLAGS_REASON_MAX} characters or fewer.`;
  }
  return undefined;
}

export function createPlatformInvoiceBodyForApi(
  form: CreatePlatformInvoiceForm,
): Record<string, unknown> {
  return {
    amountPaise: Math.round(form.amountRupees * 100),
    dueDate: form.dueDate.trim(),
    description: form.description.trim() || "Platform subscription",
    taxPercent: form.taxPercent,
  };
}
