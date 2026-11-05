/** Normalized PhonePe checkout fields returned by the customer API. */
export type CustomerPhonePeCheckoutKind = "SDK_ORDER" | "HOSTED_REDIRECT";

export type CustomerPhonePeCheckout = {
  checkoutKind: CustomerPhonePeCheckoutKind | null;
  provider: "PHONEPE" | null;
  token: string | null;
  paymentUrl: string | null;
  merchantOrderId: string | null;
  providerOrderId: string | null;
  statusPollUrl: string | null;
};

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function firstHttpUrl(...candidates: Array<string | null | undefined>): string | null {
  for (const value of candidates) {
    if (typeof value === "string" && value.startsWith("http")) return value;
  }
  return null;
}

/** Map scheme / shop / digital-metals init responses to a single checkout shape. */
export function normalizePhonePeCheckout(
  raw: Record<string, unknown> | null | undefined,
): CustomerPhonePeCheckout {
  const row = raw ?? {};
  const linkToken = typeof row.token === "string" && row.token ? row.token : null;
  const sdkToken =
    (typeof row.sdkToken === "string" && row.sdkToken)
    || (row.checkoutKind === "SDK_ORDER" && linkToken ? linkToken : null)
    || null;
  const paymentUrl =
    firstHttpUrl(
      readOptionalString(row.paymentUrl),
      readOptionalString(row.redirectUrl),
      readOptionalString(row.gatewayUrl),
    )
    || readOptionalString(row.paymentUrl)
    || readOptionalString(row.gatewayUrl)
    || null;
  const explicitKind =
    row.checkoutKind === "SDK_ORDER" || row.checkoutKind === "HOSTED_REDIRECT"
      ? row.checkoutKind
      : null;
  const checkoutKind =
    explicitKind
    ?? (firstHttpUrl(
      readOptionalString(row.paymentUrl),
      readOptionalString(row.redirectUrl),
      readOptionalString(row.gatewayUrl),
    )
      ? "HOSTED_REDIRECT"
      : null)
    ?? (sdkToken ? "SDK_ORDER" : null);
  return {
    checkoutKind,
    provider: row.provider === "PHONEPE" ? "PHONEPE" : checkoutKind ? "PHONEPE" : null,
    token: sdkToken ?? linkToken,
    paymentUrl,
    merchantOrderId:
      typeof row.merchantOrderId === "string"
        ? row.merchantOrderId
        : typeof row.intentId === "string"
          ? row.intentId
          : typeof row.paymentLinkId === "string"
            ? row.paymentLinkId
            : typeof row.id === "string"
              ? row.id
              : null,
    providerOrderId: typeof row.providerOrderId === "string" ? row.providerOrderId : null,
    statusPollUrl: typeof row.statusPollUrl === "string" ? row.statusPollUrl : null,
  };
}
