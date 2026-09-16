/** Extract user-facing text from RTK Query / contract envelope errors. */
export function apiErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Try again.",
): string {
  if (!err || typeof err !== "object") return fallback;
  const e = err as {
    data?: { message?: string; code?: string };
    error?: string;
    message?: string;
  };
  if (typeof e.data?.message === "string" && e.data.message.trim()) {
    return e.data.message.trim();
  }
  if (typeof e.error === "string" && e.error.trim()) return e.error.trim();
  if (typeof e.message === "string" && e.message.trim()) return e.message.trim();
  return fallback;
}

import { toast } from "sonner";

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
  if (!err || typeof err !== "object") return undefined;
  const code = (err as { data?: { code?: string } }).data?.code;
  return typeof code === "string" ? code : undefined;
}
