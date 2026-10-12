const KEY_PREFIX = "swarnagrow.shopPaymentIdempotency";

function storageKey(orderId: string) {
  return `${KEY_PREFIX}:${orderId}`;
}

export function readShopPaymentIdempotencyKey(orderId: string): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(storageKey(orderId));
  return raw && raw.length >= 8 ? raw : null;
}

export function saveShopPaymentIdempotencyKey(orderId: string, idempotencyKey: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(storageKey(orderId), idempotencyKey);
}

export function readShopPaymentAttemptId(orderId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(`${KEY_PREFIX}:attempt:${orderId}`);
}

export function saveShopPaymentAttemptId(orderId: string, paymentAttemptId: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(`${KEY_PREFIX}:attempt:${orderId}`, paymentAttemptId);
}
