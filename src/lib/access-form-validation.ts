import {
  normalizeCustomerMobileInput,
  sanitizeIndianPhoneDigits,
} from "@/src/lib/customer-form";

const MOBILE_RE = /^\+?[1-9]\d{9,14}$/;
const BRANCH_CODE_RE = /^[A-Z0-9]{2,6}$/;
const PINCODE_RE = /^\d{6}$/;

export const BRANCH_NAME_MAX = 160;
export const BRANCH_LINE1_MAX = 200;
export const BRANCH_CITY_MAX = 80;
export const STAFF_NAME_MAX = 120;
export const STAFF_PASSWORD_MIN = 8;
export const STAFF_PASSWORD_MAX = 128;
export const STAFF_DEACTIVATE_REASON_MAX = 500;

export type BranchFormFields = {
  name: string;
  code: string;
  line1: string;
  city: string;
  pincode: string;
  contactNumber: string;
};

export type CreateStaffFormFields = {
  name: string;
  mobile: string;
  password: string;
  role:
    | "BRANCH_STAFF"
    | "BRANCH_MANAGER"
    | "COLLECTION_AGENT"
    | "TENANT_ADMIN";
  branchId: string;
  scope: "BRANCH" | "TENANT";
};

export function sanitizeBranchCodeInput(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

export function sanitizeBranchPincodeInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 6);
}

export function sanitizeOptionalContactDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 15);
}

function validateBranchName(name: string, required = true): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) {
    return required ? "Branch name is required." : undefined;
  }
  if (trimmed.length < 2) {
    return "Branch name must be at least 2 characters.";
  }
  if (name.length > BRANCH_NAME_MAX) {
    return `Branch name must be ${BRANCH_NAME_MAX} characters or fewer.`;
  }
  return undefined;
}

export function validateBranchCode(code: string): string | undefined {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return "Branch code is required.";
  if (!BRANCH_CODE_RE.test(trimmed)) {
    return "Use 2–6 uppercase letters or numbers (e.g. PMN).";
  }
  return undefined;
}

function validateOptionalPincode(pincode: string): string | undefined {
  const digits = sanitizeBranchPincodeInput(pincode);
  if (!digits) return undefined;
  if (!PINCODE_RE.test(digits)) {
    return "Pincode must be 6 digits.";
  }
  return undefined;
}

function validateOptionalContact(contactNumber: string): string | undefined {
  const digits = contactNumber.replace(/\D/g, "");
  if (!digits) return undefined;
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return undefined;
  }
  const normalized = normalizeCustomerMobileInput(contactNumber);
  if (!MOBILE_RE.test(normalized)) {
    return "Enter a valid contact number (10-digit Indian mobile).";
  }
  return undefined;
}

function validateOptionalLine1(line1: string): string | undefined {
  if (line1.length > BRANCH_LINE1_MAX) {
    return `Address line must be ${BRANCH_LINE1_MAX} characters or fewer.`;
  }
  return undefined;
}

function validateOptionalCity(city: string): string | undefined {
  if (city.length > BRANCH_CITY_MAX) {
    return `City must be ${BRANCH_CITY_MAX} characters or fewer.`;
  }
  return undefined;
}

export function validateBranchCreateForm(
  form: BranchFormFields,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const nameErr = validateBranchName(form.name);
  if (nameErr) errors.name = nameErr;
  const codeErr = validateBranchCode(form.code);
  if (codeErr) errors.code = codeErr;
  const line1Err = validateOptionalLine1(form.line1);
  if (line1Err) errors.line1 = line1Err;
  const cityErr = validateOptionalCity(form.city);
  if (cityErr) errors.city = cityErr;
  const pinErr = validateOptionalPincode(form.pincode);
  if (pinErr) errors.pincode = pinErr;
  const contactErr = validateOptionalContact(form.contactNumber);
  if (contactErr) errors.contactNumber = contactErr;
  return errors;
}

export function liveBranchFieldErrors(
  form: BranchFormFields,
  options?: { requireCode?: boolean },
): Record<string, string> {
  const errors: Record<string, string> = {};
  const nameErr = validateBranchName(form.name, false);
  if (nameErr && form.name.trim()) errors.name = nameErr;
  if (options?.requireCode !== false) {
    const codeErr = validateBranchCode(form.code);
    if (codeErr && form.code.trim()) errors.code = codeErr;
  } else {
    const codeErr = validateBranchCode(form.code);
    if (codeErr && form.code.trim().length >= 2) errors.code = codeErr;
  }
  const line1Err = validateOptionalLine1(form.line1);
  if (line1Err) errors.line1 = line1Err;
  const cityErr = validateOptionalCity(form.city);
  if (cityErr) errors.city = cityErr;
  const pinErr = validateOptionalPincode(form.pincode);
  if (pinErr) errors.pincode = pinErr;
  const contactErr = validateOptionalContact(form.contactNumber);
  if (contactErr) errors.contactNumber = contactErr;
  return errors;
}

export function branchCreateFormReady(form: BranchFormFields): boolean {
  return Object.keys(validateBranchCreateForm(form)).length === 0;
}

export function validateBranchPatchForm(form: {
  name: string;
  line1: string;
  city: string;
  pincode: string;
  contactNumber: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  const nameErr = validateBranchName(form.name);
  if (nameErr) errors.name = nameErr;
  const line1Err = validateOptionalLine1(form.line1);
  if (line1Err) errors.line1 = line1Err;
  const cityErr = validateOptionalCity(form.city);
  if (cityErr) errors.city = cityErr;
  const pinErr = validateOptionalPincode(form.pincode);
  if (pinErr) errors.pincode = pinErr;
  const contactErr = validateOptionalContact(form.contactNumber);
  if (contactErr) errors.contactNumber = contactErr;
  return errors;
}

export function branchPatchFormReady(form: {
  name: string;
  line1: string;
  city: string;
  pincode: string;
  contactNumber: string;
}): boolean {
  return Object.keys(validateBranchPatchForm(form)).length === 0;
}

export function validateStaffName(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return "Full name is required.";
  if (trimmed.length < 2) return "Name must be at least 2 characters.";
  if (name.length > STAFF_NAME_MAX) {
    return `Name must be ${STAFF_NAME_MAX} characters or fewer.`;
  }
  return undefined;
}

export function liveStaffNameError(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return undefined;
  return validateStaffName(name);
}

export function validateStaffMobile(mobile: string): string | undefined {
  const digits = sanitizeIndianPhoneDigits(mobile);
  if (!digits) return "Mobile number is required.";
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

export function liveStaffMobileError(mobile: string): string | undefined {
  const digits = sanitizeIndianPhoneDigits(mobile);
  if (!digits) return undefined;
  return validateStaffMobile(mobile);
}

export function validateTemporaryPassword(password: string): string | undefined {
  if (!password) return "Temporary password is required.";
  if (password.length < STAFF_PASSWORD_MIN) {
    return `Password must be at least ${STAFF_PASSWORD_MIN} characters.`;
  }
  if (password.length > STAFF_PASSWORD_MAX) {
    return `Password must be ${STAFF_PASSWORD_MAX} characters or fewer.`;
  }
  return undefined;
}

export function liveTemporaryPasswordError(
  password: string,
): string | undefined {
  if (!password) return undefined;
  return validateTemporaryPassword(password);
}

export function staffRequiresBranch(
  role: CreateStaffFormFields["role"],
  scope: CreateStaffFormFields["scope"],
): boolean {
  return (
    role === "BRANCH_STAFF" ||
    role === "BRANCH_MANAGER" ||
    role === "COLLECTION_AGENT" ||
    (role === "TENANT_ADMIN" && scope === "BRANCH")
  );
}

export function validateCreateStaffForm(
  form: CreateStaffFormFields,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const nameErr = validateStaffName(form.name);
  if (nameErr) errors.name = nameErr;
  const mobileErr = validateStaffMobile(form.mobile);
  if (mobileErr) errors.mobile = mobileErr;
  const passwordErr = validateTemporaryPassword(form.password);
  if (passwordErr) errors.password = passwordErr;
  if (staffRequiresBranch(form.role, form.scope) && !form.branchId.trim()) {
    errors.branchId = "Select a branch for this role.";
  }
  return errors;
}

export function liveCreateStaffFieldErrors(
  form: CreateStaffFormFields,
  options?: { branchTouched?: boolean },
): Record<string, string> {
  const errors: Record<string, string> = {};
  const nameErr = liveStaffNameError(form.name);
  if (nameErr) errors.name = nameErr;
  const mobileErr = liveStaffMobileError(form.mobile);
  if (mobileErr) errors.mobile = mobileErr;
  const passwordErr = liveTemporaryPasswordError(form.password);
  if (passwordErr) errors.password = passwordErr;
  if (
    options?.branchTouched &&
    staffRequiresBranch(form.role, form.scope) &&
    !form.branchId.trim()
  ) {
    errors.branchId = "Select a branch for this role.";
  }
  return errors;
}

export function createStaffFormReady(form: CreateStaffFormFields): boolean {
  return Object.keys(validateCreateStaffForm(form)).length === 0;
}

export function validateStaffDeactivateReason(
  reason: string,
): string | undefined {
  if (reason.length > STAFF_DEACTIVATE_REASON_MAX) {
    return `Reason must be ${STAFF_DEACTIVATE_REASON_MAX} characters or fewer.`;
  }
  return undefined;
}

export function liveStaffDeactivateReasonError(
  reason: string,
): string | undefined {
  return validateStaffDeactivateReason(reason);
}
