import type { NomineeRelationship } from "@/src/types/domain";
import {
  normalizeCustomerMobileInput,
  phoneToIndianFormDigits,
  sanitizeIndianPhoneDigits,
} from "@/src/lib/customer-form";

export const NOMINEE_NOTES_MAX = 500;

export type NomineeFormFields = {
  name: string;
  relationship: NomineeRelationship;
  mobile: string;
  notes: string;
};

const MOBILE_RE = /^\+?[1-9]\d{9,14}$/;

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

function liveNotesError(notes: string): string | undefined {
  if (notes.length > NOMINEE_NOTES_MAX) {
    return `Notes must be ${NOMINEE_NOTES_MAX} characters or fewer.`;
  }
  return undefined;
}

export function liveNomineeFieldErrors(
  form: NomineeFormFields,
): Partial<Record<keyof NomineeFormFields, string>> {
  const out: Partial<Record<keyof NomineeFormFields, string>> = {};
  const nameErr = liveNameError(form.name);
  if (nameErr) out.name = nameErr;
  const phoneErr = livePhoneError(form.mobile);
  if (phoneErr) out.mobile = phoneErr;
  const notesErr = liveNotesError(form.notes);
  if (notesErr) out.notes = notesErr;
  return out;
}

export function validateNomineeForm(
  form: NomineeFormFields,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = form.name.trim();
  const mobile = normalizeCustomerMobileInput(form.mobile);
  const notes = form.notes;

  if (!name) {
    errors.name = "Full name is required.";
  } else if (name.length < 2) {
    errors.name = "Name must be at least 2 characters.";
  } else if (name.length > 120) {
    errors.name = "Name must be 120 characters or fewer.";
  }

  if (!mobile) {
    errors.mobile = "Mobile number is required.";
  } else if (/^[6-9]\d{9}$/.test(mobile)) {
    // Indian 10-digit UI
  } else if (!MOBILE_RE.test(mobile)) {
    errors.mobile =
      "Enter a valid mobile number (10 digits, or include country code).";
  }

  if (notes.length > NOMINEE_NOTES_MAX) {
    errors.notes = `Notes must be ${NOMINEE_NOTES_MAX} characters or fewer.`;
  }

  return errors;
}

export function nomineeFormReadyForSubmit(form: NomineeFormFields): boolean {
  return Object.keys(validateNomineeForm(form)).length === 0;
}

export function nomineeFormFieldsFromDetail(
  detail: {
    name?: string;
    relationship?: NomineeRelationship;
    mobile?: string;
    notes?: string;
  } | null
  | undefined,
): NomineeFormFields {
  return {
    name: detail?.name ?? "",
    relationship: detail?.relationship ?? "SPOUSE",
    mobile: phoneToIndianFormDigits(detail?.mobile ?? ""),
    notes: detail?.notes ?? "",
  };
}

export function nomineeFormUnchanged(
  form: NomineeFormFields,
  baseline: NomineeFormFields,
): boolean {
  const snap = (f: NomineeFormFields) => ({
    name: f.name.trim(),
    relationship: f.relationship,
    mobile: normalizeCustomerMobileInput(f.mobile),
    notes: f.notes.trim(),
  });
  const a = snap(form);
  const b = snap(baseline);
  return (
    a.name === b.name &&
    a.relationship === b.relationship &&
    a.mobile === b.mobile &&
    a.notes === b.notes
  );
}

export function clearNomineeFieldError(
  prev: Record<string, string>,
  field: keyof NomineeFormFields,
): Record<string, string> {
  if (!prev[field]) return prev;
  const next = { ...prev };
  delete next[field];
  return next;
}
