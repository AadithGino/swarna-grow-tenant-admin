import { toast } from "sonner";
import { parseApiError, toastApiError } from "@/src/lib/api-error";

export function isEcommerceOrderVersionConflict(err: unknown) {
  const parsed = parseApiError(err);
  if (parsed.httpStatus === 409) return true;
  const code = String(parsed.code ?? "").toUpperCase();
  return code.includes("VERSION") || code.includes("CONFLICT");
}

export function toastEcommerceOrderMutationError(
  err: unknown,
  opts?: { onVersionConflict?: () => void; fallback?: string },
) {
  if (isEcommerceOrderVersionConflict(err)) {
    toast.error("Order changed on the server. Refreshing…");
    opts?.onVersionConflict?.();
    return;
  }
  toastApiError(err, opts?.fallback);
}
