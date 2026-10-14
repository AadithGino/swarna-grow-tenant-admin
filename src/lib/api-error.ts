import { toast } from "sonner";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import {
  contractErrorFromHttpStatus,
  normalizeFetchBaseQueryError,
} from "@/src/lib/contract-response";

type RtkErrorShape = {
  data?:
    | string
    | {
        success?: boolean;
        error?: {
          code?: string;
          message?: string;
          details?: unknown;
          traceId?: string;
          fields?: unknown;
        };
        code?: string;
        message?: string;
        details?: unknown;
        traceId?: string;
        httpStatus?: number | string;
      };
  error?: string;
  message?: string;
  status?: number | string;
  originalStatus?: number;
};

export type ParsedApiError = {
  code?: string;
  message: string;
  traceId?: string;
  fieldErrors: Record<string, string>;
  httpStatus?: number | string;
  details?: unknown;
};

function isFetchBaseQueryError(err: unknown): err is FetchBaseQueryError {
  return (
    !!err &&
    typeof err === "object" &&
    "status" in err &&
    (typeof (err as FetchBaseQueryError).status === "number" ||
      typeof (err as FetchBaseQueryError).status === "string")
  );
}

function errorPayload(err: unknown): RtkErrorShape["data"] | undefined {
  if (!err || typeof err !== "object") return undefined;
  return (err as RtkErrorShape).data;
}

function objectErrorPayload(
  payload: RtkErrorShape["data"],
): Exclude<RtkErrorShape["data"], string | undefined> | undefined {
  return payload && typeof payload === "object" ? payload : undefined;
}

/** Strip Zod / express-validator style path prefixes for form binding. */
export function normalizeApiField(field: string): string {
  return field.replace(/^(body|query|params)\./, "");
}

function humanizeValidationMessage(message: string, fieldKey: string): string {
  const mobileField = fieldKey === "mobile" || fieldKey.endsWith(".mobile");
  if (
    mobileField &&
    (/\d{10}/.test(message) || /must match pattern/i.test(message))
  ) {
    return "Enter a valid mobile number (10 digits, or include country code).";
  }
  if (fieldKey === "email" && /invalid email/i.test(message)) {
    return "Enter a valid email address.";
  }
  if (fieldKey === "name") {
    if (/at least 2/i.test(message) || /too small/i.test(message)) {
      return "Name must be at least 2 characters.";
    }
    if (/at most 120|max/i.test(message)) {
      return "Name must be 120 characters or fewer.";
    }
  }
  if (fieldKey === "address" && /at most|max/i.test(message)) {
    return "Address must be 1000 characters or fewer.";
  }
  if (fieldKey === "branchId" && /required/i.test(message)) {
    return "Select a primary branch.";
  }
  if (
    mobileField &&
    /already registered|already exists|CUSTOMER_MOBILE/i.test(message)
  ) {
    return "This mobile number is already registered for a customer in this jewellery.";
  }
  if (
    fieldKey === "email" &&
    /already registered|already exists|CUSTOMER_EMAIL/i.test(message)
  ) {
    return "This email is already registered for a customer in this jewellery.";
  }
  if (message.startsWith("Invalid string: ")) {
    const rest = message.slice("Invalid string: ".length);
    if (/must match pattern/i.test(rest) && mobileField) {
      return "Enter a valid mobile number (10 digits, or include country code).";
    }
    if (/email/i.test(rest) && fieldKey === "email") {
      return "Enter a valid email address.";
    }
    return rest.charAt(0).toUpperCase() + rest.slice(1);
  }
  return message;
}

function fieldErrorsFromObjectDetails(
  details: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (details.mobile != null && details.mobile !== "") {
    out.mobile = humanizeValidationMessage(
      "This mobile number is already registered for a customer in this jewellery.",
      "mobile",
    );
  }
  if (details.email != null && details.email !== "") {
    out.email = humanizeValidationMessage(
      "This email is already registered for a customer in this jewellery.",
      "email",
    );
  }
  return out;
}

/** Map contract `error.details` array to form field keys. */
export function fieldErrorsFromDetails(
  details: unknown,
): Record<string, string> {
  if (Array.isArray(details)) {
    const out: Record<string, string> = {};
    for (const item of details) {
      if (!item || typeof item !== "object") continue;
      const row = item as { field?: unknown; message?: unknown };
      if (typeof row.field !== "string" || typeof row.message !== "string") {
        continue;
      }
      const key = normalizeApiField(row.field);
      out[key] = humanizeValidationMessage(row.message, key);
    }
    return out;
  }
  if (details && typeof details === "object") {
    return fieldErrorsFromObjectDetails(details as Record<string, unknown>);
  }
  return {};
}

const CODE_FIELD_HINTS: Record<string, string> = {
  CUSTOMER_MOBILE_EXISTS: "mobile",
  CUSTOMER_EMAIL_EXISTS: "email",
  CUSTOMER_PASSBOOK_EXISTS: "passbookNumber",
};

function inferFieldErrorsFromCode(
  code: string | undefined,
  message: string,
  existing: Record<string, string>,
): Record<string, string> {
  if (!code || existing[CODE_FIELD_HINTS[code] ?? ""]) return existing;
  const field = CODE_FIELD_HINTS[code];
  if (!field) return existing;
  return {
    ...existing,
    [field]: humanizeValidationMessage(message, field),
  };
}

function messageFromRtk(err: RtkErrorShape, fallback: string): string {
  const payload = err.data;
  const nested =
    payload && typeof payload === "object" ? payload.error : undefined;

  if (typeof nested?.message === "string" && nested.message.trim()) {
    return nested.message.trim();
  }
  const payloadObj = objectErrorPayload(payload);
  if (typeof payloadObj?.message === "string" && payloadObj.message.trim()) {
    return payloadObj.message.trim();
  }
  if (typeof err.error === "string" && err.error.trim()) {
    const text = err.error.trim();
    if (
      text.includes("SyntaxError") &&
      typeof payload === "string" &&
      payload.trim()
    ) {
      return payload.trim();
    }
    if (!text.includes("SyntaxError") || !text.includes("valid JSON")) {
      return text;
    }
  }
  if (typeof err.message === "string" && err.message.trim()) {
    return err.message.trim();
  }
  if (typeof payload === "string" && payload.trim()) {
    const status =
      typeof err.status === "number"
        ? err.status
        : typeof err.originalStatus === "number"
          ? err.originalStatus
          : 0;
    return contractErrorFromHttpStatus(status, payload.trim()).message;
  }
  return fallback;
}

/** Parse RTK Query / contract envelope errors (normalized or raw). */
export function parseApiError(
  err: unknown,
  fallback = "Something went wrong. Try again.",
): ParsedApiError {
  const normalized = isFetchBaseQueryError(err)
    ? normalizeFetchBaseQueryError(err)
    : err;

  const rtk = normalized as RtkErrorShape;
  const payload = errorPayload(normalized);
  const payloadObj = objectErrorPayload(payload);
  const nested = payloadObj?.error;

  const code = nested?.code ?? payloadObj?.code;
  const message = messageFromRtk(rtk, fallback);
  const traceId =
    nested?.traceId ??
    (typeof payloadObj?.traceId === "string" ? payloadObj.traceId : undefined);
  const details = nested?.details ?? nested?.fields ?? payloadObj?.details;
  let fieldErrors = fieldErrorsFromDetails(details);
  fieldErrors = inferFieldErrorsFromCode(code, message, fieldErrors);
  const httpStatus = payloadObj?.httpStatus ?? rtk.status;

  return { code, message, traceId, fieldErrors, httpStatus, details };
}

/** Extract user-facing text from RTK Query / contract envelope errors. */
export function apiErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Try again.",
): string {
  const { message, fieldErrors } = parseApiError(err, fallback);
  const values = Object.values(fieldErrors);
  if (values.length === 1) return values[0]!;
  if (values.length > 1) {
    return message.includes("highlighted") ? message : values.join(" ");
  }
  return message;
}

/** Inline alert copy: message plus optional error code / trace for support. */
export function apiErrorDetailLines(err: unknown): string[] {
  const parsed = parseApiError(err);
  const lines = [apiErrorMessage(err, parsed.message)];
  if (parsed.code && parsed.code !== "REQUEST_FAILED") {
    lines.push(`Error code: ${parsed.code}`);
  }
  if (parsed.traceId) {
    lines.push(`Reference: ${parsed.traceId}`);
  }
  return lines;
}

/** Show backend contract error message in a toast; returns the message shown. */
export function toastApiError(
  err: unknown,
  fallback = "Something went wrong. Try again.",
): string {
  const message = apiErrorMessage(err, fallback);
  toast.error(message);
  return message;
}

export function apiErrorCode(err: unknown): string | undefined {
  return parseApiError(err).code;
}

export { normalizeFetchBaseQueryError };
