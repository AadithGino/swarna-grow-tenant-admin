import { sanitizeIndianPhoneDigits } from "@/src/lib/customer-form";
import { validatePlatformLoginEmail } from "@/src/lib/platform-login-form-validation";
import {
  BUSINESS_NAME_MAX,
  DISPLAY_NAME_MAX,
  PROFILE_CITY_MAX,
} from "@/src/lib/settings-form-validation";

const MOBILE_RE = /^\+?[1-9]\d{9,14}$/;

export const PLATFORM_TENANT_ADDRESS_MAX = 500;
export const PLATFORM_TENANT_OWNER_NAME_MAX = 120;
export const PLATFORM_TENANT_TRIAL_DAYS_MIN = 0;
export const PLATFORM_TENANT_TRIAL_DAYS_MAX = 90;
export const PLATFORM_DEFAULT_BRANCH_NAME_MAX = 120;

export type PlatformTenantCreateForm = {
  businessName: string;
  displayName: string;
  city: string;
  address: string;
  supportNumber: string;
  ownerName: string;
  ownerMobile: string;
  ownerEmail: string;
  subscriptionPlanId: string;
  billingCycle: string;
  trialDays: number;
  skipPayment: boolean;
  createDefaultBranch: boolean;
  defaultBranchName: string;
  sendWelcomeMessage: boolean;
};

export function validateBusinessName(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return "Legal business name is required.";
  if (trimmed.length < 2) return "Business name must be at least 2 characters.";
  if (name.length > BUSINESS_NAME_MAX) {
    return `Business name must be ${BUSINESS_NAME_MAX} characters or fewer.`;
  }
  return undefined;
}

export function validateDisplayName(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return "Display name is required.";
  if (trimmed.length < 2) return "Display name must be at least 2 characters.";
  if (name.length > DISPLAY_NAME_MAX) {
    return `Display name must be ${DISPLAY_NAME_MAX} characters or fewer.`;
  }
  return undefined;
}

export function validateCity(city: string): string | undefined {
  const trimmed = city.trim();
  if (!trimmed) return "City is required.";
  if (trimmed.length < 2) return "City must be at least 2 characters.";
  if (city.length > PROFILE_CITY_MAX) {
    return `City must be ${PROFILE_CITY_MAX} characters or fewer.`;
  }
  return undefined;
}

export function validateOptionalAddress(address: string): string | undefined {
  if (address.length > PLATFORM_TENANT_ADDRESS_MAX) {
    return `Address must be ${PLATFORM_TENANT_ADDRESS_MAX} characters or fewer.`;
  }
  return undefined;
}

export function validateOptionalSupportNumber(mobile: string): string | undefined {
  const digits = sanitizeIndianPhoneDigits(mobile);
  if (!digits) return undefined;
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) return undefined;
  const normalized = mobile.replace(/\s/g, "").trim();
  if (MOBILE_RE.test(normalized)) return undefined;
  return "Enter a valid support number (10-digit Indian mobile).";
}

export function validateOwnerMobile(mobile: string): string | undefined {
  const digits = sanitizeIndianPhoneDigits(mobile);
  if (!digits) return "Owner mobile is required.";
  if (!/^[6-9]/.test(digits)) {
    return "Mobile must start with 6, 7, 8, or 9.";
  }
  if (digits.length < 10) {
    const left = 10 - digits.length;
    return `${left} more digit${left === 1 ? "" : "s"} needed.`;
  }
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return "Enter a valid 10-digit mobile number.";
  }
  return undefined;
}

function validateOwnerName(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return "Owner name is required.";
  if (trimmed.length < 2) return "Owner name must be at least 2 characters.";
  if (name.length > PLATFORM_TENANT_OWNER_NAME_MAX) {
    return `Owner name must be ${PLATFORM_TENANT_OWNER_NAME_MAX} characters or fewer.`;
  }
  return undefined;
}

export function validateTrialDays(trialDays: number): string | undefined {
  if (!Number.isFinite(trialDays)) {
    return "Trial days must be a number.";
  }
  if (!Number.isInteger(trialDays)) {
    return "Trial days must be a whole number.";
  }
  if (trialDays < PLATFORM_TENANT_TRIAL_DAYS_MIN) {
    return `Trial days cannot be less than ${PLATFORM_TENANT_TRIAL_DAYS_MIN}.`;
  }
  if (trialDays > PLATFORM_TENANT_TRIAL_DAYS_MAX) {
    return `Trial days cannot exceed ${PLATFORM_TENANT_TRIAL_DAYS_MAX}.`;
  }
  return undefined;
}

function validateBillingCycle(cycle: string): string | undefined {
  if (cycle !== "MONTHLY" && cycle !== "ANNUAL") {
    return "Choose monthly or annual billing.";
  }
  return undefined;
}

export function validatePlatformTenantCreateStep(
  step: number,
  form: PlatformTenantCreateForm,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (step === 0) {
    const bn = validateBusinessName(form.businessName);
    if (bn) errors.businessName = bn;
    const dn = validateDisplayName(form.displayName);
    if (dn) errors.displayName = dn;
    const cityErr = validateCity(form.city);
    if (cityErr) errors.city = cityErr;
    const sup = validateOptionalSupportNumber(form.supportNumber);
    if (sup) errors.supportNumber = sup;
    const addr = validateOptionalAddress(form.address);
    if (addr) errors.address = addr;
  }
  if (step === 1) {
    const on = validateOwnerName(form.ownerName);
    if (on) errors.ownerName = on;
    const om = validateOwnerMobile(form.ownerMobile);
    if (om) errors.ownerMobile = om;
    const oe = validatePlatformLoginEmail(form.ownerEmail);
    if (oe) errors.ownerEmail = oe;
  }
  if (step === 2) {
    if (!form.subscriptionPlanId.trim()) {
      errors.subscriptionPlanId = "Select a subscription plan.";
    }
    const bc = validateBillingCycle(form.billingCycle);
    if (bc) errors.billingCycle = bc;
    const td = validateTrialDays(form.trialDays);
    if (td) errors.trialDays = td;
  }
  return errors;
}

export function validatePlatformTenantCreateForm(
  form: PlatformTenantCreateForm,
): Record<string, string> {
  return {
    ...validatePlatformTenantCreateStep(0, form),
    ...validatePlatformTenantCreateStep(1, form),
    ...validatePlatformTenantCreateStep(2, form),
  };
}

export function platformTenantCreateStepReady(
  step: number,
  form: PlatformTenantCreateForm,
): boolean {
  return Object.keys(validatePlatformTenantCreateStep(step, form)).length === 0;
}

export function platformTenantCreateFormReady(
  form: PlatformTenantCreateForm,
): boolean {
  return Object.keys(validatePlatformTenantCreateForm(form)).length === 0;
}

export function livePlatformTenantFieldErrors(
  form: PlatformTenantCreateForm,
  touched: Partial<Record<keyof PlatformTenantCreateForm, boolean>>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (touched.businessName || form.businessName.trim()) {
    const e = validateBusinessName(form.businessName);
    if (e) errors.businessName = e;
  }
  if (touched.displayName || form.displayName.trim()) {
    const e = validateDisplayName(form.displayName);
    if (e) errors.displayName = e;
  }
  if (touched.city || form.city.trim()) {
    const e = validateCity(form.city);
    if (e) errors.city = e;
  }
  if (touched.supportNumber || form.supportNumber.replace(/\D/g, "")) {
    const e = validateOptionalSupportNumber(form.supportNumber);
    if (e) errors.supportNumber = e;
  }
  if (touched.address && form.address) {
    const e = validateOptionalAddress(form.address);
    if (e) errors.address = e;
  }
  if (touched.ownerName || form.ownerName.trim()) {
    const e = validateOwnerName(form.ownerName);
    if (e) errors.ownerName = e;
  }
  if (touched.ownerMobile || form.ownerMobile.replace(/\D/g, "")) {
    const e = validateOwnerMobile(form.ownerMobile);
    if (e) errors.ownerMobile = e;
  }
  if (touched.ownerEmail || form.ownerEmail.trim()) {
    const e = validatePlatformLoginEmail(form.ownerEmail);
    if (e) errors.ownerEmail = e;
  }
  if (touched.trialDays) {
    const e = validateTrialDays(form.trialDays);
    if (e) errors.trialDays = e;
  }
  return errors;
}

export function ownerMobileForPlatformApi(raw: string): string {
  return sanitizeIndianPhoneDigits(raw);
}

export function supportNumberForPlatformApi(raw: string): string | undefined {
  const digits = sanitizeIndianPhoneDigits(raw);
  return digits || undefined;
}
