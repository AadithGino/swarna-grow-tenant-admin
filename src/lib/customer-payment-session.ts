const STORAGE_KEY = "swarnagrow.customerPaymentSession";

export type CustomerPaymentSessionKind = "intent" | "link";

export type CustomerPaymentSession = {
  kind: CustomerPaymentSessionKind;
  intentId?: string;
  /** Authenticated poll for fixed-scheme app checkout (`GET /app/payments/:linkId/status`). */
  linkId?: string;
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

function pollTargetFromStatusUrl(
  statusPollUrl: string,
): Pick<CustomerPaymentSession, "kind" | "intentId" | "linkId"> | null {
  const appLink = statusPollUrl.match(/^\/app\/payments\/([^/]+)\/status$/);
  if (appLink?.[1]) {
    return { kind: "link", linkId: appLink[1] };
  }
  const intent = statusPollUrl.match(/^\/app\/payment-intents\/([^/]+)$/);
  if (intent?.[1]) {
    return { kind: "intent", intentId: intent[1] };
  }
  return null;
}

/** Derive poll context from payment initiation responses (fixed link or flexible intent). */
export function pollSessionFromInitResponse(
  response: Record<string, unknown>,
  schemeId?: string,
): Omit<CustomerPaymentSession, "startedAt"> | null {
  const statusPollUrl =
    typeof response.statusPollUrl === "string" ? response.statusPollUrl.trim() : "";
  if (statusPollUrl) {
    const fromUrl = pollTargetFromStatusUrl(statusPollUrl);
    if (fromUrl) {
      const linkToken = typeof response.token === "string" ? response.token : undefined;
      return { ...fromUrl, linkToken, schemeId };
    }
  }

  const linkToken = typeof response.token === "string" ? response.token : undefined;
  if (linkToken) {
    return { kind: "link", linkToken, schemeId };
  }

  const intentId =
    typeof response.intentId === "string"
      ? response.intentId
      : typeof response.id === "string" && String(response.id).startsWith("pmi_")
        ? response.id
        : undefined;
  if (intentId) {
    return { kind: "intent", intentId, schemeId };
  }

  return null;
}
