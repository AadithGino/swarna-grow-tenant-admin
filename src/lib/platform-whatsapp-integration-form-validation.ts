import { sanitizeIndianPhoneDigits } from "@/src/lib/customer-form";
import { ownerMobileForPlatformApi } from "@/src/lib/platform-tenant-create-form-validation";

export const WHATSAPP_META_ID_MAX = 64;
export const WHATSAPP_SECRET_MIN = 8;
export const WHATSAPP_CALLBACK_URL_MAX = 500;

export type WhatsappIntegrationEnvironment = "PRODUCTION" | "SANDBOX";

export type PlatformWhatsappIntegrationForm = {
  provider: "META_CLOUD";
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
  appSecret: string;
  verifyToken: string;
  environment: WhatsappIntegrationEnvironment;
  callbackUrlOverride: string;
};

export function emptyWhatsappIntegrationForm(): PlatformWhatsappIntegrationForm {
  return {
    provider: "META_CLOUD",
    phoneNumberId: "",
    businessAccountId: "",
    accessToken: "",
    appSecret: "",
    verifyToken: "",
    environment: "PRODUCTION",
    callbackUrlOverride: "",
  };
}

function validateMetaResourceId(
  value: string,
  label: string,
  options?: { required?: boolean },
): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return options?.required ? `${label} is required.` : undefined;
  }
  if (trimmed.length > WHATSAPP_META_ID_MAX) {
    return `${label} must be ${WHATSAPP_META_ID_MAX} characters or fewer.`;
  }
  if (!/^\d+$/.test(trimmed)) {
    return `${label} must contain digits only.`;
  }
  return undefined;
}

function validateRequiredSecret(value: string, label: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  if (trimmed.length < WHATSAPP_SECRET_MIN) {
    return `${label} must be at least ${WHATSAPP_SECRET_MIN} characters.`;
  }
  return undefined;
}

function validateOptionalSecret(value: string, label: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length < WHATSAPP_SECRET_MIN) {
    return `${label} must be at least ${WHATSAPP_SECRET_MIN} characters when provided.`;
  }
  return undefined;
}

export function validateWhatsappCallbackUrl(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > WHATSAPP_CALLBACK_URL_MAX) {
    return `Callback URL must be ${WHATSAPP_CALLBACK_URL_MAX} characters or fewer.`;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "Callback URL must use http or https.";
    }
  } catch {
    return "Enter a valid callback URL.";
  }
  return undefined;
}

export function validatePlatformWhatsappIntegrationForm(
  form: PlatformWhatsappIntegrationForm,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const phoneErr = validateMetaResourceId(form.phoneNumberId, "Phone number ID", {
    required: true,
  });
  if (phoneErr) errors.phoneNumberId = phoneErr;
  const wabaErr = validateMetaResourceId(form.businessAccountId, "Business account ID");
  if (wabaErr) errors.businessAccountId = wabaErr;
  const tokenErr = validateRequiredSecret(form.accessToken, "Access token");
  if (tokenErr) errors.accessToken = tokenErr;
  const secretErr = validateRequiredSecret(form.appSecret, "App secret");
  if (secretErr) errors.appSecret = secretErr;
  const verifyErr = validateOptionalSecret(form.verifyToken, "Verify token");
  if (verifyErr) errors.verifyToken = verifyErr;
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

export function livePlatformWhatsappIntegrationFieldErrors(
  form: PlatformWhatsappIntegrationForm,
  touched: Partial<Record<keyof PlatformWhatsappIntegrationForm, boolean>>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (touched.phoneNumberId || form.phoneNumberId.trim()) {
    const e = validateMetaResourceId(form.phoneNumberId, "Phone number ID", {
      required: true,
    });
    if (e) errors.phoneNumberId = e;
  }
  if (touched.businessAccountId && form.businessAccountId.trim()) {
    const e = validateMetaResourceId(form.businessAccountId, "Business account ID");
    if (e) errors.businessAccountId = e;
  }
  if (touched.accessToken || form.accessToken.trim()) {
    const e = validateRequiredSecret(form.accessToken, "Access token");
    if (e) errors.accessToken = e;
  }
  if (touched.appSecret || form.appSecret.trim()) {
    const e = validateRequiredSecret(form.appSecret, "App secret");
    if (e) errors.appSecret = e;
  }
  if (touched.verifyToken && form.verifyToken.trim()) {
    const e = validateOptionalSecret(form.verifyToken, "Verify token");
    if (e) errors.verifyToken = e;
  }
  if (touched.callbackUrlOverride && form.callbackUrlOverride.trim()) {
    const e = validateWhatsappCallbackUrl(form.callbackUrlOverride);
    if (e) errors.callbackUrlOverride = e;
  }
  return errors;
}

export function platformWhatsappIntegrationFormReady(
  form: PlatformWhatsappIntegrationForm,
): boolean {
  return Object.keys(validatePlatformWhatsappIntegrationForm(form)).length === 0;
}

export function whatsappIntegrationFormHasInput(
  form: PlatformWhatsappIntegrationForm,
): boolean {
  return (
    form.phoneNumberId.trim().length > 0 ||
    form.businessAccountId.trim().length > 0 ||
    form.accessToken.trim().length > 0 ||
    form.appSecret.trim().length > 0 ||
    form.verifyToken.trim().length > 0 ||
    form.callbackUrlOverride.trim().length > 0
  );
}

export function whatsappIntegrationBodyForApi(
  form: PlatformWhatsappIntegrationForm,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    provider: "META_CLOUD",
    phoneNumberId: form.phoneNumberId.trim(),
    environment: form.environment,
  };
  const businessAccountId = form.businessAccountId.trim();
  if (businessAccountId) body.businessAccountId = businessAccountId;
  body.accessToken = form.accessToken.trim();
  body.appSecret = form.appSecret.trim();
  const verifyToken = form.verifyToken.trim();
  if (verifyToken) body.verifyToken = verifyToken;
  const callbackUrlOverride = form.callbackUrlOverride.trim();
  if (callbackUrlOverride) body.callbackUrlOverride = callbackUrlOverride;
  return body;
}

export function validateWhatsappVerifyTestMobile(mobile: string): string | undefined {
  const digits = sanitizeIndianPhoneDigits(mobile);
  if (!digits) return "Test mobile number is required.";
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return "Enter a valid 10-digit Indian mobile for the test message.";
  }
  return undefined;
}

export function whatsappVerifyTestMobileForApi(mobile: string): string {
  return ownerMobileForPlatformApi(mobile);
}
