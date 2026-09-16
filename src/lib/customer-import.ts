import { parseApiError } from "@/src/lib/api-error";
import {
  phoneToIndianFormDigits,
  validateCustomerForm,
  type CustomerFormFields,
} from "@/src/lib/customer-form";

export type CustomerImportRawRow = {
  lineNumber: number;
  name: string;
  mobileRaw: string;
  branchCode: string;
  email: string;
};

export type CustomerImportRow = CustomerImportRawRow & {
  mobile: string;
  branchId?: string;
  errors: string[];
  valid: boolean;
};

export type CustomerImportParseResult = {
  rows: CustomerImportRawRow[];
  headerDetected: boolean;
};

export type CustomerImportValidateOptions = {
  branchCodeToId: Map<string, string>;
  requireBranch: boolean;
};

function splitCsvLine(line: string): string[] {
  return line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
}

/** Parse CSV; keeps every data row (including incomplete) for per-row validation. */
export function parseCustomerImportCsv(text: string): CustomerImportParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    return { rows: [], headerDetected: false };
  }
  const header = lines[0].toLowerCase();
  const headerDetected =
    header.includes("name") &&
    (header.includes("mobile") || header.includes("phone"));
  const dataLines = headerDetected ? lines.slice(1) : lines;
  const rows = dataLines.map((line, index) => {
    const lineNumber = headerDetected ? index + 2 : index + 1;
    const [name = "", mobileRaw = "", branchCode = "", email = ""] =
      splitCsvLine(line);
    return { lineNumber, name, mobileRaw, branchCode, email };
  });
  return { rows, headerDetected };
}

function formErrorsToMessages(errors: Record<string, string>): string[] {
  const order: (keyof CustomerFormFields)[] = [
    "name",
    "phone",
    "email",
    "branchId",
    "address",
  ];
  const out: string[] = [];
  for (const key of order) {
    const msg = errors[key];
    if (msg) out.push(msg);
  }
  for (const [key, msg] of Object.entries(errors)) {
    if (!order.includes(key as keyof CustomerFormFields)) out.push(msg);
  }
  return out;
}

function validateSingleImportRow(
  raw: CustomerImportRawRow,
  options: CustomerImportValidateOptions,
): Omit<CustomerImportRow, "valid"> {
  const { branchCodeToId, requireBranch } = options;
  const errors: string[] = [];
  const mobile = phoneToIndianFormDigits(raw.mobileRaw);
  let branchId: string | undefined;

  const branchTrimmed = raw.branchCode.trim();
  if (branchTrimmed) {
    const resolved = branchCodeToId.get(branchTrimmed.toUpperCase());
    if (!resolved) {
      errors.push(`Unknown branch code "${branchTrimmed}".`);
    } else {
      branchId = resolved;
    }
  }

  const form: CustomerFormFields = {
    name: raw.name,
    phone: mobile,
    email: raw.email.trim(),
    branchId: branchId ?? "",
    address: "",
  };
  errors.push(
    ...formErrorsToMessages(validateCustomerForm(form, { requireBranch })),
  );

  if (!raw.mobileRaw.trim()) {
    if (!errors.some((e) => /mobile|phone/i.test(e))) {
      errors.unshift("Mobile number is required.");
    }
  }

  const unique = [...new Set(errors)];
  return {
    ...raw,
    mobile,
    branchId,
    errors: unique,
  };
}

export function validateCustomerImportRows(
  rawRows: CustomerImportRawRow[],
  options: CustomerImportValidateOptions,
): CustomerImportRow[] {
  const pass1 = rawRows.map((raw) => validateSingleImportRow(raw, options));
  const mobileFirstLine = new Map<string, number>();

  return pass1.map((row) => {
    const errors = [...row.errors];
    if (
      errors.length === 0 &&
      row.mobile.length === 10 &&
      /^[6-9]\d{9}$/.test(row.mobile)
    ) {
      const prev = mobileFirstLine.get(row.mobile);
      if (prev != null) {
        errors.push(`Duplicate mobile in file (also on row ${prev}).`);
      } else {
        mobileFirstLine.set(row.mobile, row.lineNumber);
      }
    }
    return {
      ...row,
      errors,
      valid: errors.length === 0,
    };
  });
}

export function importRowApiErrorMessage(err: unknown): string {
  const parsed = parseApiError(err, "Could not create customer");
  const fieldParts = Object.entries(parsed.fieldErrors).map(
    ([field, msg]) => `${field}: ${msg}`,
  );
  if (fieldParts.length) return fieldParts.join("; ");
  return parsed.message;
}

export function summarizeCustomerImport(rows: CustomerImportRow[]): {
  validCount: number;
  invalidCount: number;
} {
  let validCount = 0;
  let invalidCount = 0;
  for (const row of rows) {
    if (row.valid) validCount += 1;
    else invalidCount += 1;
  }
  return { validCount, invalidCount };
}
