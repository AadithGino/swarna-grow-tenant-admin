const STORAGE_KEY = "swarnagrow.customerPaymentSession";

export type CustomerPaymentSessionKind = "intent" | "link";

export type CustomerPaymentSession = {
  kind: CustomerPaymentSessionKind;
  intentId?: string;
  linkToken?: string;
  schemeId?: string;
  schemeName?: string;
  schemeNumber?: string;
  amountPaise?: number;
  cycleLabel?: string;
  startedAt: number;
};

export function saveCustomerPaymentSession(session: Omit<CustomerPaymentSession, "startedAt">) {
  if (typeof window === "undefined") return;
  const payload: CustomerPaymentSession = { ...session, startedAt: Date.now() };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function readCustomerPaymentSession(): CustomerPaymentSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CustomerPaymentSession;
    if (!parsed?.kind) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCustomerPaymentSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

/** Derive poll context from payment initiation responses (fixed link or flexible intent). */
export function pollSessionFromInitResponse(
  response: Record<string, unknown>,
  schemeId?: string,
): Omit<CustomerPaymentSession, "startedAt"> | null {
  const intentId =
    typeof response.id === "string" && (response.paymentUrl || response.statusPollUrl)
      ? response.id
      : undefined;
  const linkToken = typeof response.token === "string" ? response.token : undefined;
  if (intentId) {
    return { kind: "intent", intentId, schemeId };
  }
  if (linkToken) {
    return { kind: "link", linkToken, schemeId };
  }
  return null;
}
