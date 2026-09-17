const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

import {
  livePasswordPinError,
  passwordPinReady,
  sanitizePasswordPinInput,
  validatePasswordPin,
} from "@/src/lib/password-validation";

export { sanitizePasswordPinInput };

export function validatePlatformLoginEmail(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) return "Email is required.";
  if (/\s/.test(trimmed)) return "Email cannot contain spaces.";
  if (!EMAIL_RE.test(trimmed)) return "Enter a valid email address.";
  return undefined;
}

export function livePlatformLoginEmailError(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) return undefined;
  return validatePlatformLoginEmail(email);
}

export function validatePlatformLoginPassword(
  password: string,
): string | undefined {
  return validatePasswordPin(password);
}

export function livePlatformLoginPasswordError(
  password: string,
): string | undefined {
  return livePasswordPinError(password);
}

export { passwordPinReady };

export function validatePlatformLoginForm(input: {
  email: string;
  password: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  const emailErr = validatePlatformLoginEmail(input.email);
  if (emailErr) errors.email = emailErr;
  const passwordErr = validatePlatformLoginPassword(input.password);
  if (passwordErr) errors.password = passwordErr;
  return errors;
}

export function platformLoginFormReady(input: {
  email: string;
  password: string;
}): boolean {
  return Object.keys(validatePlatformLoginForm(input)).length === 0;
}
