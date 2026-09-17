import { sanitizeIndianPhoneDigits } from "@/src/lib/customer-form";
import { sanitizeBranchPincodeInput } from "@/src/lib/access-form-validation";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_COLOR_RE = /^#([0-9A-Fa-f]{6})$/;
/** Indian GSTIN (15 chars) — optional field. */
const GSTIN_RE =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const TENANT_LOGO_MAX_BYTES = 2_000_000;
export const TENANT_LOGO_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const BUSINESS_NAME_MAX = 160;
export const DISPLAY_NAME_MAX = 120;
export const PROFILE_LINE1_MAX = 200;
export const PROFILE_CITY_MAX = 80;
export const PROFILE_STATE_MAX = 80;
export const APP_DISPLAY_NAME_MAX = 80;
export const RECEIPT_PREFIX_MAX = 32;
export const NUMBER_FORMAT_MAX = 200;
export const TERMS_MAX = 10_000;
export const GOLD_PURITY_MAX = 16;
export const PLAN_REQUEST_NOTE_MAX = 500;

export const REVERSAL_WINDOW_MIN = 0;
export const REVERSAL_WINDOW_MAX = 168;

export const REMINDER_OFFSET_MIN = -365;
export const REMINDER_OFFSET_MAX = 365;

export type SettingsProfileForm = {
  businessName: string;
  displayName: string;
  ownerName: string;
  ownerMobile: string;
  ownerEmail: string;
  supportNumber: string;
  gstin: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
};

export type SettingsBrandingForm = {
  primaryColor: string;
  secondaryColor: string;
  appDisplayName: string;
};

export type SettingsOperationsForm = {
  customerLoginMode: "OTP_ONLY" | "PASSWORD_ONLY";
  customerAppWriteEnabled: boolean;
  customerAppPaymentsEnabled: boolean;
  receiptPrefix: string;
  receiptNumberFormat: string;
  passbookNumberFormat: string;
  schemeNumberFormat: string;
  goldPurity: string;
  weightRoundingMode: string;
  paymentReversalWindowHours: number;
  termsAndConditions: string;
};

function validateEmailOptional(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) return undefined;
  if (!EMAIL_RE.test(trimmed)) return "Enter a valid email address.";
  return undefined;
}

function validateIndianMobileOptional(mobile: string): string | undefined {
  const digits = sanitizeIndianPhoneDigits(mobile);
  if (!digits) return undefined;
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return "Enter a valid 10-digit mobile number.";
  }
  return undefined;
}

function validateIndianMobileRequired(mobile: string): string | undefined {
  const digits = sanitizeIndianPhoneDigits(mobile);
  if (!digits) return "Mobile number is required.";
  return validateIndianMobileOptional(mobile);
}

function validatePincodeOptional(pincode: string): string | undefined {
  const digits = sanitizeBranchPincodeInput(pincode);
  if (!digits) return undefined;
  if (digits.length !== 6) return "Pincode must be 6 digits.";
  return undefined;
}

export function validateGstinOptional(gstin: string): string | undefined {
  const trimmed = gstin.trim().toUpperCase();
  if (!trimmed) return undefined;
  if (trimmed.length > 15) return "GSTIN must be 15 characters or fewer.";
  if (!GSTIN_RE.test(trimmed)) {
    return "Enter a valid 15-character GSTIN.";
  }
  return undefined;
}

export function validateHexColor(color: string): string | undefined {
  const trimmed = color.trim();
  if (!trimmed) return "Colour is required.";
  if (!HEX_COLOR_RE.test(trimmed)) {
    return "Use a hex colour like #730321.";
  }
  return undefined;
}

export function validateSettingsProfileForm(
  form: SettingsProfileForm,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const businessName = form.businessName.trim();
  if (!businessName) {
    errors.businessName = "Business name is required.";
  } else if (businessName.length < 2) {
    errors.businessName = "Business name must be at least 2 characters.";
  } else if (form.businessName.length > BUSINESS_NAME_MAX) {
    errors.businessName = `Business name must be ${BUSINESS_NAME_MAX} characters or fewer.`;
  }

  const displayName = form.displayName.trim();
  if (displayName && displayName.length > DISPLAY_NAME_MAX) {
    errors.displayName = `Display name must be ${DISPLAY_NAME_MAX} characters or fewer.`;
  }

  const ownerName = form.ownerName.trim();
  if (ownerName && ownerName.length < 2) {
    errors.ownerName = "Owner name must be at least 2 characters.";
  } else if (form.ownerName.length > DISPLAY_NAME_MAX) {
    errors.ownerName = `Owner name must be ${DISPLAY_NAME_MAX} characters or fewer.`;
  }

  const ownerMobileErr = validateIndianMobileRequired(form.ownerMobile);
  if (ownerMobileErr) errors.ownerMobile = ownerMobileErr;

  const ownerEmailErr = validateEmailOptional(form.ownerEmail);
  if (ownerEmailErr) errors.ownerEmail = ownerEmailErr;

  const supportErr = validateIndianMobileOptional(form.supportNumber);
  if (supportErr) errors.supportNumber = supportErr;

  const gstinErr = validateGstinOptional(form.gstin);
  if (gstinErr) errors.gstin = gstinErr;

  if (form.line1.length > PROFILE_LINE1_MAX) {
    errors.line1 = `Address line must be ${PROFILE_LINE1_MAX} characters or fewer.`;
  }
  if (form.city.length > PROFILE_CITY_MAX) {
    errors.city = `City must be ${PROFILE_CITY_MAX} characters or fewer.`;
  }
  if (form.state.length > PROFILE_STATE_MAX) {
    errors.state = `State must be ${PROFILE_STATE_MAX} characters or fewer.`;
  }
  const pinErr = validatePincodeOptional(form.pincode);
  if (pinErr) errors.pincode = pinErr;

  return errors;
}

export function liveSettingsProfileFieldErrors(
  form: SettingsProfileForm,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.businessName.trim()) {
    const bn = form.businessName.trim();
    if (bn.length < 2) errors.businessName = "Business name must be at least 2 characters.";
    else if (form.businessName.length > BUSINESS_NAME_MAX) {
      errors.businessName = `Business name must be ${BUSINESS_NAME_MAX} characters or fewer.`;
    }
  }
  if (form.displayName.trim() && form.displayName.length > DISPLAY_NAME_MAX) {
    errors.displayName = `Display name must be ${DISPLAY_NAME_MAX} characters or fewer.`;
  }
  if (form.ownerName.trim()) {
    if (form.ownerName.trim().length < 2) {
      errors.ownerName = "Owner name must be at least 2 characters.";
    } else if (form.ownerName.length > DISPLAY_NAME_MAX) {
      errors.ownerName = `Owner name must be ${DISPLAY_NAME_MAX} characters or fewer.`;
    }
  }
  const om = liveIndianMobile(form.ownerMobile);
  if (om) errors.ownerMobile = om;
  const oe = validateEmailOptional(form.ownerEmail);
  if (oe) errors.ownerEmail = oe;
  const sup = validateIndianMobileOptional(form.supportNumber);
  if (sup) errors.supportNumber = sup;
  const gst = validateGstinOptional(form.gstin);
  if (gst) errors.gstin = gst;
  if (form.line1.length > PROFILE_LINE1_MAX) {
    errors.line1 = `Address line must be ${PROFILE_LINE1_MAX} characters or fewer.`;
  }
  if (form.city.length > PROFILE_CITY_MAX) {
    errors.city = `City must be ${PROFILE_CITY_MAX} characters or fewer.`;
  }
  if (form.state.length > PROFILE_STATE_MAX) {
    errors.state = `State must be ${PROFILE_STATE_MAX} characters or fewer.`;
  }
  const pin = validatePincodeOptional(form.pincode);
  if (pin) errors.pincode = pin;
  return errors;
}

function liveIndianMobile(mobile: string): string | undefined {
  const digits = sanitizeIndianPhoneDigits(mobile);
  if (!digits) return undefined;
  if (!/^[6-9]/.test(digits)) {
    return "Mobile must start with 6, 7, 8, or 9.";
  }
  if (digits.length < 10) {
    const left = 10 - digits.length;
    return `${left} more digit${left === 1 ? "" : "s"} needed.`;
  }
  return validateIndianMobileOptional(mobile);
}

export function settingsProfileFormReady(form: SettingsProfileForm): boolean {
  return Object.keys(validateSettingsProfileForm(form)).length === 0;
}

export function validateSettingsBrandingForm(
  form: SettingsBrandingForm,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const primaryErr = validateHexColor(form.primaryColor);
  if (primaryErr) errors.primaryColor = primaryErr;
  const secondaryErr = validateHexColor(form.secondaryColor);
  if (secondaryErr) errors.secondaryColor = secondaryErr;
  const name = form.appDisplayName.trim();
  if (name && name.length > APP_DISPLAY_NAME_MAX) {
    errors.appDisplayName = `App name must be ${APP_DISPLAY_NAME_MAX} characters or fewer.`;
  }
  return errors;
}

export function liveSettingsBrandingFieldErrors(
  form: SettingsBrandingForm,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.primaryColor.trim()) {
    const e = validateHexColor(form.primaryColor);
    if (e) errors.primaryColor = e;
  }
  if (form.secondaryColor.trim()) {
    const e = validateHexColor(form.secondaryColor);
    if (e) errors.secondaryColor = e;
  }
  if (
    form.appDisplayName.trim() &&
    form.appDisplayName.length > APP_DISPLAY_NAME_MAX
  ) {
    errors.appDisplayName = `App name must be ${APP_DISPLAY_NAME_MAX} characters or fewer.`;
  }
  return errors;
}

export function settingsBrandingFormReady(form: SettingsBrandingForm): boolean {
  return Object.keys(validateSettingsBrandingForm(form)).length === 0;
}

export function validateSettingsOperationsForm(
  form: SettingsOperationsForm,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (form.receiptPrefix.length > RECEIPT_PREFIX_MAX) {
    errors.receiptPrefix = `Receipt prefix must be ${RECEIPT_PREFIX_MAX} characters or fewer.`;
  }
  for (const [key, max] of [
    ["receiptNumberFormat", NUMBER_FORMAT_MAX],
    ["passbookNumberFormat", NUMBER_FORMAT_MAX],
    ["schemeNumberFormat", NUMBER_FORMAT_MAX],
  ] as const) {
    const val = form[key];
    if (val.length > max) {
      errors[key] = `Format must be ${max} characters or fewer.`;
    }
  }
  if (form.goldPurity.length > GOLD_PURITY_MAX) {
    errors.goldPurity = `Gold purity must be ${GOLD_PURITY_MAX} characters or fewer.`;
  }
  if (form.weightRoundingMode.length > 32) {
    errors.weightRoundingMode = "Rounding mode is too long.";
  }
  const hours = form.paymentReversalWindowHours;
  if (!Number.isFinite(hours) || !Number.isInteger(hours)) {
    errors.paymentReversalWindowHours =
      "Reversal window must be a whole number of hours.";
  } else if (hours < REVERSAL_WINDOW_MIN || hours > REVERSAL_WINDOW_MAX) {
    errors.paymentReversalWindowHours = `Use ${REVERSAL_WINDOW_MIN}–${REVERSAL_WINDOW_MAX} hours.`;
  }
  if (form.termsAndConditions.length > TERMS_MAX) {
    errors.termsAndConditions = `Terms must be ${TERMS_MAX} characters or fewer.`;
  }
  return errors;
}

export function liveSettingsOperationsFieldErrors(
  form: SettingsOperationsForm,
): Record<string, string> {
  return validateSettingsOperationsForm(form);
}

export function settingsOperationsFormReady(
  form: SettingsOperationsForm,
): boolean {
  return Object.keys(validateSettingsOperationsForm(form)).length === 0;
}

export function validateTenantLogoFile(file: File): string | undefined {
  const type = file.type || "application/octet-stream";
  if (
    !TENANT_LOGO_TYPES.includes(type as (typeof TENANT_LOGO_TYPES)[number])
  ) {
    return "Logo must be PNG, JPEG, or WebP.";
  }
  if (file.size > TENANT_LOGO_MAX_BYTES) {
    return "Logo must be 2 MB or smaller.";
  }
  if (file.name.length > 255) {
    return "File name is too long.";
  }
  return undefined;
}

export type ReminderOffsetRow = {
  key: string;
  days: number;
  enabled?: boolean;
};

export function validateReminderOffsetDays(days: unknown): string | undefined {
  if (typeof days !== "number" || !Number.isFinite(days)) {
    return "Day offset must be a number.";
  }
  if (!Number.isInteger(days)) {
    return "Day offset must be a whole number.";
  }
  if (days < REMINDER_OFFSET_MIN || days > REMINDER_OFFSET_MAX) {
    return `Day offset must be between ${REMINDER_OFFSET_MIN} and ${REMINDER_OFFSET_MAX}.`;
  }
  return undefined;
}

export function validateReminderConfigOffsets(
  offsets: ReminderOffsetRow[],
): string | undefined {
  for (const row of offsets) {
    const err = validateReminderOffsetDays(row.days);
    if (err) return `${row.key}: ${err}`;
  }
  return undefined;
}

export function validatePlanRequestNote(note: string): string | undefined {
  if (note.length > PLAN_REQUEST_NOTE_MAX) {
    return `Note must be ${PLAN_REQUEST_NOTE_MAX} characters or fewer.`;
  }
  return undefined;
}

/** Normalize profile mobiles for API. */
export function profileMobileForApi(raw: string): string {
  return sanitizeIndianPhoneDigits(raw);
}

export function profilePincodeForApi(raw: string): string {
  return sanitizeBranchPincodeInput(raw);
}
