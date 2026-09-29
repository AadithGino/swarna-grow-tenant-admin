export type PostSettlementRefundDisposition = "RECOVERABLE" | "WRITE_OFF";

export const POST_SETTLEMENT_DISPOSITION_OPTIONS: {
  value: PostSettlementRefundDisposition;
  label: string;
  description: string;
}[] = [
  {
    value: "RECOVERABLE",
    label: "Recoverable",
    description: "Track for collection or recovery; does not charge the customer again.",
  },
  {
    value: "WRITE_OFF",
    label: "Write off",
    description: "Accept the loss after settlement; no further cash movement.",
  },
];

export const POST_SETTLEMENT_REASON_MIN = 8;
export const POST_SETTLEMENT_REASON_MAX = 2000;

export type PostSettlementRefundCaseRow = {
  _id?: string;
  id?: string;
  version?: number;
  status?: string;
  refundAmountPaise?: number;
  refundCompletedAt?: string;
  schemeId?: string;
  paymentId?: string;
  paymentRefundId?: string;
  providerRefundId?: string;
  customerId?: string;
  disposition?: string;
  resolutionReason?: string;
  resolvedAt?: string;
  settlementSnapshot?: Record<string, unknown>;
};

export function postSettlementCaseId(row: PostSettlementRefundCaseRow): string {
  return String(row._id ?? row.id ?? "");
}

export function validatePostSettlementResolveReason(reason: string): string | undefined {
  const trimmed = reason.trim();
  if (!trimmed) return "Enter a reason for this disposition.";
  if (trimmed.length < POST_SETTLEMENT_REASON_MIN) {
    return `Reason must be at least ${POST_SETTLEMENT_REASON_MIN} characters.`;
  }
  if (trimmed.length > POST_SETTLEMENT_REASON_MAX) {
    return `Reason must be ${POST_SETTLEMENT_REASON_MAX} characters or fewer.`;
  }
  return undefined;
}

export function buildPostSettlementResolveBody(
  caseRow: PostSettlementRefundCaseRow,
  disposition: PostSettlementRefundDisposition,
  reason: string,
) {
  const reasonError = validatePostSettlementResolveReason(reason);
  if (reasonError) throw new Error(reasonError);
  const caseId = postSettlementCaseId(caseRow);
  const expectedVersion = Number(caseRow.version ?? 1);
  if (!caseId || !Number.isInteger(expectedVersion) || expectedVersion < 0) {
    throw new Error("Case version is missing. Refresh and try again.");
  }
  return {
    caseId,
    disposition,
    reason: reason.trim(),
    expectedVersion,
  };
}

export function isPostSettlementVersionConflict(code?: string): boolean {
  return code === "VERSION_CONFLICT" || code === "CASE_ALREADY_RESOLVED";
}

export function formatIstDateTime(value?: string | Date | null): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}
