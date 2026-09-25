/** Backend uses `mobile`; forms use `phone`. */
export type CustomerFormFields = {
  name: string;
  phone: string;
  email: string;
  branchId: string;
  address: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Matches backend `mobile` zod: optional +, then 10–15 digits starting 1–9. */
const MOBILE_RE = /^\+?[1-9]\d{9,14}$/;

export function normalizeCustomerMobileInput(raw: string): string {
  return raw.replace(/\s/g, "").trim();
}

/** Tenant UI: Indian mobile — digits only, max 10. */
export function sanitizeIndianPhoneDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 10);
}

/** Map API `mobile` (+91 / 10-digit) into the tenant create/edit phone field. */
export function phoneToIndianFormDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("91")) {
    return digits.slice(-10);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  return digits.slice(0, 10);
}

export function customerFormFieldsFromCustomer(customer: {
  name: string;
  phone: string;
  email: string;
  branchId: string;
  address: string;
}): CustomerFormFields {
  return {
    name: customer.name,
    phone: phoneToIndianFormDigits(customer.phone),
    email: customer.email ?? "",
    branchId: customer.branchId || "",
    address: customer.address ?? "",
  };
}

export function customerFormUnchanged(
  form: CustomerFormFields,
  baseline: CustomerFormFields,
): boolean {
  const snap = (f: CustomerFormFields) => ({
    name: f.name.trim(),
    phone: normalizeCustomerMobileInput(f.phone),
    email: f.email.trim(),
    branchId: f.branchId.trim(),
    address: f.address.trim(),
  });
  const a = snap(form);
  const b = snap(baseline);
  return (
    a.name === b.name &&
    a.phone === b.phone &&
    a.email === b.email &&
    a.branchId === b.branchId &&
    a.address === b.address
  );
}

export type CustomerFormValidateOptions = {
  requireBranch?: boolean;
};

function liveNameError(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return undefined;
  if (trimmed.length < 2) return "Name must be at least 2 characters.";
  if (name.length > 120) return "Name must be 120 characters or fewer.";
  return undefined;
}

function livePhoneError(phone: string): string | undefined {
  const digits = sanitizeIndianPhoneDigits(phone);
  if (!digits) return undefined;
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

function liveEmailError(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) return undefined;
  if (/\s/.test(email)) return "Email cannot contain spaces.";
  if (trimmed.includes("@")) {
    if (!EMAIL_RE.test(trimmed)) return "Enter a valid email address.";
  } else if (trimmed.length > 64) {
    return "Email is too long.";
  }
  return undefined;
}

function liveAddressError(address: string): string | undefined {
  const trimmed = address.trim();
  if (trimmed && trimmed.length < 3) {
    return "Address must be at least 3 characters.";
  }
  if (address.length > 1000) {
    return "Address must be 1000 characters or fewer.";
  }
  return undefined;
}

/** Inline validation while typing (before submit). */
export function liveCustomerFieldErrors(
  form: CustomerFormFields,
  options?: CustomerFormValidateOptions & {
    branchTouched?: boolean;
  },
): Partial<Record<keyof CustomerFormFields, string>> {
  const out: Partial<Record<keyof CustomerFormFields, string>> = {};
  const nameErr = liveNameError(form.name);
  if (nameErr) out.name = nameErr;
  const phoneErr = livePhoneError(form.phone);
  if (phoneErr) out.phone = phoneErr;
  const emailErr = liveEmailError(form.email);
  if (emailErr) out.email = emailErr;
  const addressErr = liveAddressError(form.address);
  if (addressErr) out.address = addressErr;
  if (
    options?.requireBranch &&
    options.branchTouched &&
    !form.branchId.trim()
  ) {
    out.branchId = "Select a primary branch.";
  }
  return out;
}

export function customerFormReadyForSubmit(
  form: CustomerFormFields,
  options?: CustomerFormValidateOptions,
): boolean {
  return Object.keys(validateCustomerForm(form, options)).length === 0;
}

export function validateCustomerForm(
  form: CustomerFormFields,
  options?: { requireBranch?: boolean },
): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = form.name.trim();
  const phone = normalizeCustomerMobileInput(form.phone);
  const email = form.email.trim();
  const address = form.address.trim();

  if (!name) {
    errors.name = "Full name is required.";
  } else if (name.length < 2) {
    errors.name = "Name must be at least 2 characters.";
  } else if (name.length > 120) {
    errors.name = "Name must be 120 characters or fewer.";
  }

  if (!phone) {
    errors.phone = "Mobile number is required.";
  } else if (/^[6-9]\d{9}$/.test(phone)) {
    // Indian 10-digit UI (canonicalized on API)
  } else if (!MOBILE_RE.test(phone)) {
    errors.phone =
      "Enter a valid mobile number (10 digits, or include country code).";
  }

  if (email && !EMAIL_RE.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (options?.requireBranch && !form.branchId.trim()) {
    errors.branchId = "Select a primary branch.";
  }

  if (!address) {
    errors.address = "Address is required.";
  } else if (address.length < 3) {
    errors.address = "Address must be at least 3 characters.";
  } else if (address.length > 1000) {
    errors.address = "Address must be 1000 characters or fewer.";
  }

  return errors;
}

/** Map API validation keys to customer form field names. */
export function customerFieldErrorsFromApi(
  fieldErrors: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, message] of Object.entries(fieldErrors)) {
    const formKey = key === "mobile" ? "phone" : key;
    out[formKey] = message;
  }
  return out;
}

export function clearCustomerFieldError(
  prev: Record<string, string>,
  field: keyof CustomerFormFields,
): Record<string, string> {
  if (!prev[field]) return prev;
  const next = { ...prev };
  delete next[field];
  return next;
}
