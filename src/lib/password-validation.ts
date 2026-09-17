export const PASSWORD_PIN_MIN = 4;
export const PASSWORD_PIN_MAX = 128;
export const PASSWORD_PIN_RE = /^\d{4,128}$/;
export const PASSWORD_PIN_MESSAGE =
  "Password must be at least 4 digits (numbers only).";

export function sanitizePasswordPinInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, PASSWORD_PIN_MAX);
}

export function validatePasswordPin(password: string): string | undefined {
  if (!password) return "Password is required.";
  if (!/^\d+$/.test(password)) return PASSWORD_PIN_MESSAGE;
  if (password.length < PASSWORD_PIN_MIN) {
    return `Password must be at least ${PASSWORD_PIN_MIN} digits.`;
  }
  if (password.length > PASSWORD_PIN_MAX) {
    return `Password must be ${PASSWORD_PIN_MAX} digits or fewer.`;
  }
  return undefined;
}

export function livePasswordPinError(password: string): string | undefined {
  if (!password) return undefined;
  return validatePasswordPin(password);
}

export function passwordPinReady(password: string): boolean {
  return validatePasswordPin(password) === undefined;
}
