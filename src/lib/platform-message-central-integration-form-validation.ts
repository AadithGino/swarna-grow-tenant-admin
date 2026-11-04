export type MessageCentralFlowType = "SMS" | "WHATSAPP";

export type PlatformMessageCentralIntegrationForm = {
  provider: "MESSAGE_CENTRAL";
  customerId: string;
  key: string;
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
  if (!form.key.trim()) errors.key = "Encrypted password key is required.";
  if (form.key.trim() && form.key.trim().length < 8) {
    errors.key = "Key must be at least 8 characters.";
  }
  if (!form.email.trim()) {
    errors.email = "Account email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
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
