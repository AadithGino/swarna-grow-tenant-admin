export type MessageCentralFlowType = "SMS" | "WHATSAPP";

export type PlatformMessageCentralIntegrationForm = {
  provider: "MESSAGE_CENTRAL";
  customerId: string;
  /** Password key from Message Central (key + email flow). */
  key: string;
  /** Pre-issued auth JWT when Message Central does not provide a password key. */
  authToken: string;
  email: string;
  countryCode: string;
  flowType: MessageCentralFlowType;
  otpLength: number;
};

export function emptyMessageCentralIntegrationForm(): PlatformMessageCentralIntegrationForm {
  return {
    provider: "MESSAGE_CENTRAL",
    customerId: "",
    key: "",
    authToken: "",
    email: "",
    countryCode: "91",
    flowType: "SMS",
    otpLength: 6,
  };
}

export function validatePlatformMessageCentralIntegrationForm(
  form: PlatformMessageCentralIntegrationForm,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.customerId.trim()) errors.customerId = "Customer ID is required.";
  const hasKey = Boolean(form.key.trim());
  const hasAuthToken = Boolean(form.authToken.trim());
  if (!hasKey && !hasAuthToken) {
    errors.authToken = "Auth token or password key is required.";
  }
  if (hasKey && form.key.trim().length < 8) {
    errors.key = "Key must be at least 8 characters.";
  }
  if (hasAuthToken && form.authToken.trim().length < 8) {
    errors.authToken = "Auth token must be at least 8 characters.";
  }
  if (!hasAuthToken) {
    if (!form.email.trim()) {
      errors.email = "Account email is required when using a password key.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = "Enter a valid email address.";
    }
  } else if (
    form.email.trim()
    && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
  ) {
    errors.email = "Enter a valid email address.";
  }
  const cc = form.countryCode.trim();
  if (!cc || !/^\d{1,4}$/.test(cc)) errors.countryCode = "Country code must be 1–4 digits.";
  if (!Number.isInteger(form.otpLength) || form.otpLength < 4 || form.otpLength > 8) {
    errors.otpLength = "OTP length must be between 4 and 8.";
  }
  return errors;
}

export function livePlatformMessageCentralIntegrationFieldErrors(
  form: PlatformMessageCentralIntegrationForm,
  touched: Partial<Record<keyof PlatformMessageCentralIntegrationForm, boolean>>,
): Record<string, string> {
  const all = validatePlatformMessageCentralIntegrationForm(form);
  const out: Record<string, string> = {};
  for (const [key, message] of Object.entries(all)) {
    if (touched[key as keyof PlatformMessageCentralIntegrationForm]) out[key] = message;
  }
  return out;
}

export function platformMessageCentralIntegrationFormReady(
  form: PlatformMessageCentralIntegrationForm,
): boolean {
  return Object.keys(validatePlatformMessageCentralIntegrationForm(form)).length === 0;
}

export function messageCentralIntegrationFormHasInput(
  form: PlatformMessageCentralIntegrationForm,
): boolean {
  return Boolean(
    form.customerId.trim()
      || form.key.trim()
      || form.authToken.trim()
      || form.email.trim()
      || form.countryCode.trim() !== "91"
      || form.flowType !== "SMS"
      || form.otpLength !== 6,
  );
}

export function messageCentralIntegrationBodyForApi(
  form: PlatformMessageCentralIntegrationForm,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    customerId: form.customerId.trim(),
    email: form.email.trim(),
    countryCode: form.countryCode.trim(),
    flowType: form.flowType,
    otpLength: form.otpLength,
  };
  if (form.key.trim()) body.key = form.key.trim();
  if (form.authToken.trim()) body.authToken = form.authToken.trim();
  return body;
}

export function validateMessageCentralVerifyTestMobile(raw: string): string | undefined {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 10) return "Enter a 10-digit Indian mobile number.";
  if (!/^[6-9]/.test(digits)) return "Mobile must start with 6–9.";
  return undefined;
}

export function messageCentralVerifyTestMobileForApi(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 10 ? `+91${digits}` : raw.trim();
}
