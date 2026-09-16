import { validateWhatsappCallbackUrl } from "@/src/lib/platform-whatsapp-integration-form-validation";

export const PHONEPE_MERCHANT_ID_MAX = 64;
export const PHONEPE_SALT_KEY_MIN = 8;
export const PHONEPE_SALT_INDEX_MIN = 1;
export const PHONEPE_SALT_INDEX_MAX = 99;

export type PhonePeIntegrationEnvironment = "PRODUCTION" | "SANDBOX";

export type PlatformPhonePeIntegrationForm = {
  provider: "PHONEPE";
  merchantId: string;
  saltKey: string;
  saltIndex: number;
  environment: PhonePeIntegrationEnvironment;
  callbackUrlOverride: string;
};

export function emptyPhonePeIntegrationForm(
  environment: PhonePeIntegrationEnvironment = "PRODUCTION",
): PlatformPhonePeIntegrationForm {
  return {
    provider: "PHONEPE",
    merchantId: "",
    saltKey: "",
    saltIndex: 1,
    environment,
    callbackUrlOverride: "",
  };
}

function validateMerchantId(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Merchant ID is required.";
  if (trimmed.length > PHONEPE_MERCHANT_ID_MAX) {
    return `Merchant ID must be ${PHONEPE_MERCHANT_ID_MAX} characters or fewer.`;
  }
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    return "Merchant ID may only contain letters, numbers, hyphens, and underscores.";
  }
  return undefined;
}

function validateSaltKey(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Salt key is required.";
  if (trimmed.length < PHONEPE_SALT_KEY_MIN) {
    return `Salt key must be at least ${PHONEPE_SALT_KEY_MIN} characters.`;
  }
  return undefined;
}

export function validatePhonePeSaltIndex(value: number): string | undefined {
  if (!Number.isFinite(value)) return "Salt index must be a number.";
  if (!Number.isInteger(value)) return "Salt index must be a whole number.";
  if (value < PHONEPE_SALT_INDEX_MIN || value > PHONEPE_SALT_INDEX_MAX) {
    return `Salt index must be between ${PHONEPE_SALT_INDEX_MIN} and ${PHONEPE_SALT_INDEX_MAX}.`;
  }
  return undefined;
}

export function sanitizePhonePeSaltIndexInput(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return PHONEPE_SALT_INDEX_MIN;
  const n = Number(digits);
  if (!Number.isFinite(n)) return PHONEPE_SALT_INDEX_MIN;
  return Math.min(PHONEPE_SALT_INDEX_MAX, Math.max(PHONEPE_SALT_INDEX_MIN, n));
}

export function validatePlatformPhonePeIntegrationForm(
  form: PlatformPhonePeIntegrationForm,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const merchantErr = validateMerchantId(form.merchantId);
  if (merchantErr) errors.merchantId = merchantErr;
  const saltErr = validateSaltKey(form.saltKey);
  if (saltErr) errors.saltKey = saltErr;
  const indexErr = validatePhonePeSaltIndex(form.saltIndex);
  if (indexErr) errors.saltIndex = indexErr;
  const urlErr = validateWhatsappCallbackUrl(form.callbackUrlOverride);
  if (urlErr) errors.callbackUrlOverride = urlErr;
  if (
    form.environment !== "PRODUCTION" &&
    form.environment !== "SANDBOX"
  ) {
    errors.environment = "Choose production or sandbox.";
  }
  return errors;
}

export function livePlatformPhonePeIntegrationFieldErrors(
  form: PlatformPhonePeIntegrationForm,
  touched: Partial<Record<keyof PlatformPhonePeIntegrationForm, boolean>>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (touched.merchantId || form.merchantId.trim()) {
    const e = validateMerchantId(form.merchantId);
    if (e) errors.merchantId = e;
  }
  if (touched.saltKey || form.saltKey.trim()) {
    const e = validateSaltKey(form.saltKey);
    if (e) errors.saltKey = e;
  }
  if (touched.saltIndex) {
    const e = validatePhonePeSaltIndex(form.saltIndex);
    if (e) errors.saltIndex = e;
  }
  if (touched.callbackUrlOverride && form.callbackUrlOverride.trim()) {
    const e = validateWhatsappCallbackUrl(form.callbackUrlOverride);
    if (e) errors.callbackUrlOverride = e;
  }
  return errors;
}

export function platformPhonePeIntegrationFormReady(
  form: PlatformPhonePeIntegrationForm,
): boolean {
  return Object.keys(validatePlatformPhonePeIntegrationForm(form)).length === 0;
}

export function phonePeIntegrationFormHasInput(
  form: PlatformPhonePeIntegrationForm,
  baseline: PlatformPhonePeIntegrationForm,
): boolean {
  return (
    form.merchantId.trim().length > 0 ||
    form.saltKey.trim().length > 0 ||
    form.saltIndex !== baseline.saltIndex ||
    form.environment !== baseline.environment ||
    form.callbackUrlOverride.trim().length > 0
  );
}

export function phonePeIntegrationBodyForApi(
  form: PlatformPhonePeIntegrationForm,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    provider: "PHONEPE",
    merchantId: form.merchantId.trim(),
    saltKey: form.saltKey.trim(),
    saltIndex: form.saltIndex,
    environment: form.environment,
  };
  const callbackUrlOverride = form.callbackUrlOverride.trim();
  if (callbackUrlOverride) body.callbackUrlOverride = callbackUrlOverride;
  return body;
}
