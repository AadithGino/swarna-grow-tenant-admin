const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PLATFORM_LOGIN_PASSWORD_MIN = 8;
export const PLATFORM_LOGIN_PASSWORD_MAX = 128;

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
  if (!password) return "Password is required.";
  if (password.length < PLATFORM_LOGIN_PASSWORD_MIN) {
    return `Password must be at least ${PLATFORM_LOGIN_PASSWORD_MIN} characters.`;
  }
  if (password.length > PLATFORM_LOGIN_PASSWORD_MAX) {
    return `Password must be ${PLATFORM_LOGIN_PASSWORD_MAX} characters or fewer.`;
  }
  return undefined;
}

export function livePlatformLoginPasswordError(
  password: string,
): string | undefined {
  if (!password) return undefined;
  return validatePlatformLoginPassword(password);
}

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
