export const PHONEPE_CLIENT_ID_MAX = 128;
export const PHONEPE_CLIENT_SECRET_MIN = 8;
export const PHONEPE_WEBHOOK_USERNAME_MAX = 64;
export const PHONEPE_WEBHOOK_PASSWORD_MIN = 8;
export const PHONEPE_CLIENT_VERSION_MIN = 1;
export const PHONEPE_CLIENT_VERSION_MAX = 999;

export type PhonePeIntegrationEnvironment = "PRODUCTION" | "SANDBOX";

export type PlatformPhonePeIntegrationForm = {
  provider: "PHONEPE";
  clientId: string;
  clientSecret: string;
  clientVersion: number;
  webhookUsername: string;
  webhookPassword: string;
  environment: PhonePeIntegrationEnvironment;
};

export function emptyPhonePeIntegrationForm(
  environment: PhonePeIntegrationEnvironment = "PRODUCTION",
): PlatformPhonePeIntegrationForm {
  return {
    provider: "PHONEPE",
    clientId: "",
    clientSecret: "",
    clientVersion: 1,
    webhookUsername: "",
    webhookPassword: "",
    environment,
  };
}

function validateClientId(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Client ID is required.";
  if (trimmed.length > PHONEPE_CLIENT_ID_MAX) {
    return `Client ID must be ${PHONEPE_CLIENT_ID_MAX} characters or fewer.`;
  }
  return undefined;
}

function validateClientSecret(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Client secret is required.";
  if (trimmed.length < PHONEPE_CLIENT_SECRET_MIN) {
    return `Client secret must be at least ${PHONEPE_CLIENT_SECRET_MIN} characters.`;
  }
  return undefined;
}

function validateWebhookUsername(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Webhook username is required.";
  if (trimmed.length > PHONEPE_WEBHOOK_USERNAME_MAX) {
    return `Webhook username must be ${PHONEPE_WEBHOOK_USERNAME_MAX} characters or fewer.`;
  }
  return undefined;
}

function validateWebhookPassword(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Webhook password is required.";
  if (trimmed.length < PHONEPE_WEBHOOK_PASSWORD_MIN) {
    return `Webhook password must be at least ${PHONEPE_WEBHOOK_PASSWORD_MIN} characters.`;
  }
  return undefined;
}

export function validatePhonePeClientVersion(value: number): string | undefined {
  if (!Number.isFinite(value)) return "Client version must be a number.";
  if (!Number.isInteger(value)) return "Client version must be a whole number.";
  if (value < PHONEPE_CLIENT_VERSION_MIN || value > PHONEPE_CLIENT_VERSION_MAX) {
    return `Client version must be between ${PHONEPE_CLIENT_VERSION_MIN} and ${PHONEPE_CLIENT_VERSION_MAX}.`;
  }
  return undefined;
}

export function sanitizePhonePeClientVersionInput(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return PHONEPE_CLIENT_VERSION_MIN;
  const n = Number(digits);
  if (!Number.isFinite(n)) return PHONEPE_CLIENT_VERSION_MIN;
  return Math.min(PHONEPE_CLIENT_VERSION_MAX, Math.max(PHONEPE_CLIENT_VERSION_MIN, n));
}

export function validatePlatformPhonePeIntegrationForm(
  form: PlatformPhonePeIntegrationForm,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const clientIdErr = validateClientId(form.clientId);
  if (clientIdErr) errors.clientId = clientIdErr;
  const clientSecretErr = validateClientSecret(form.clientSecret);
  if (clientSecretErr) errors.clientSecret = clientSecretErr;
  const versionErr = validatePhonePeClientVersion(form.clientVersion);
  if (versionErr) errors.clientVersion = versionErr;
  const usernameErr = validateWebhookUsername(form.webhookUsername);
  if (usernameErr) errors.webhookUsername = usernameErr;
  const passwordErr = validateWebhookPassword(form.webhookPassword);
  if (passwordErr) errors.webhookPassword = passwordErr;
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
  if (touched.clientId || form.clientId.trim()) {
    const e = validateClientId(form.clientId);
    if (e) errors.clientId = e;
  }
  if (touched.clientSecret || form.clientSecret.trim()) {
    const e = validateClientSecret(form.clientSecret);
    if (e) errors.clientSecret = e;
  }
  if (touched.clientVersion) {
    const e = validatePhonePeClientVersion(form.clientVersion);
    if (e) errors.clientVersion = e;
  }
  if (touched.webhookUsername || form.webhookUsername.trim()) {
    const e = validateWebhookUsername(form.webhookUsername);
    if (e) errors.webhookUsername = e;
  }
  if (touched.webhookPassword || form.webhookPassword.trim()) {
    const e = validateWebhookPassword(form.webhookPassword);
    if (e) errors.webhookPassword = e;
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
    form.clientId.trim().length > 0 ||
    form.clientSecret.trim().length > 0 ||
    form.clientVersion !== baseline.clientVersion ||
    form.webhookUsername.trim().length > 0 ||
    form.webhookPassword.trim().length > 0 ||
    form.environment !== baseline.environment
  );
}

export function phonePeIntegrationBodyForApi(
  form: PlatformPhonePeIntegrationForm,
): Record<string, unknown> {
  return {
    provider: "PHONEPE",
    clientId: form.clientId.trim(),
    clientSecret: form.clientSecret.trim(),
    clientVersion: form.clientVersion,
    webhookUsername: form.webhookUsername.trim(),
    webhookPassword: form.webhookPassword.trim(),
    environment: form.environment,
  };
}

export function phonePeWebhookUrl(apiOrigin: string, tenantId: string): string {
  const base = apiOrigin.replace(/\/$/, "");
  return `${base}/api/v1/webhooks/phonepe/${tenantId}`;
}
