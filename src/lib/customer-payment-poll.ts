export type CustomerPaymentPollStatus =
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED";

export type CustomerPaymentPollResult = {
  status: CustomerPaymentPollStatus;
  processing: boolean;
  paid: boolean;
  failed: boolean;
  retryAfterSeconds?: number | null;
  receipt?: {
    paymentId: string;
    receiptNumber: string;
    paidAt: string;
  } | null;
};

export function adaptCustomerPaymentPoll(raw: unknown): CustomerPaymentPollResult {
  const row = (raw ?? {}) as Record<string, unknown>;
  const status = String(row.status ?? "PROCESSING").toUpperCase() as CustomerPaymentPollStatus;
  const receiptRaw = row.receipt as Record<string, unknown> | null | undefined;
  return {
    status,
    processing: Boolean(row.processing ?? status === "PROCESSING"),
    paid: Boolean(row.paid ?? status === "PAID"),
    failed: Boolean(row.failed ?? status === "FAILED"),
    retryAfterSeconds:
      row.retryAfterSeconds == null ? null : Number(row.retryAfterSeconds),
    receipt: receiptRaw
      ? {
          paymentId: String(receiptRaw.paymentId ?? ""),
          receiptNumber: String(receiptRaw.receiptNumber ?? ""),
          paidAt: String(receiptRaw.paidAt ?? ""),
        }
      : null,
  };
}

export function isTerminalPaymentPoll(result: CustomerPaymentPollResult): boolean {
  return !result.processing && (result.paid || result.failed || result.status === "EXPIRED" || result.status === "CANCELLED");
}
