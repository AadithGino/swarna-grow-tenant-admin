import type { Dispatch, SetStateAction } from "react";
import {
  parseApiError,
  toastApiError,
  type ParsedApiError,
} from "@/src/lib/api-error";

/** Map API field keys to form state keys (e.g. mobile → phone). */
export type FieldAliasMap = Record<string, string>;

export function apiFieldErrorsForForm(
  err: unknown,
  aliases?: FieldAliasMap,
): Record<string, string> {
  const { fieldErrors } = parseApiError(err);
  if (!aliases || !Object.keys(aliases).length) return { ...fieldErrors };

  const out: Record<string, string> = {};
  for (const [key, message] of Object.entries(fieldErrors)) {
    out[aliases[key] ?? key] = message;
  }
  return out;
}

/** Apply API validation/conflict errors to form state + toast. */
export function handleFormApiError(
  err: unknown,
  options: {
    setFieldErrors?: Dispatch<SetStateAction<Record<string, string>>>;
    fieldAliases?: FieldAliasMap;
    fallback?: string;
    toast?: boolean;
  } = {},
): ParsedApiError & { fieldErrors: Record<string, string> } {
  const parsed = parseApiError(err, options.fallback);
  const mapped = apiFieldErrorsForForm(err, options.fieldAliases);

  if (options.setFieldErrors && Object.keys(mapped).length) {
    options.setFieldErrors((prev) => ({ ...prev, ...mapped }));
  }
  if (options.toast !== false) {
    toastApiError(err, options.fallback);
  }
  return { ...parsed, fieldErrors: mapped };
}
