import type { CustomerSchemeDetail, MoneyRef, PaymentListItem } from "@/src/types/customer";
import { readGoldAccrual } from "@/src/lib/gold-payment-display";

function formatInr(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function readMoney(raw: unknown, paiseFallback?: number): MoneyRef {
  if (raw && typeof raw === "object") {
    const row = raw as MoneyRef;
    const amountPaise = Number(row.amountPaise ?? paiseFallback ?? 0);
    return {
      amountPaise,
      amountDisplay: row.amountDisplay ?? formatInr(amountPaise),
    };
  }
  const amountPaise = Number(paiseFallback ?? 0);
  return { amountPaise, amountDisplay: formatInr(amountPaise) };
}

function readChannel(raw: Record<string, unknown>): PaymentListItem["channel"] {
  const channel = String(raw.channel ?? "").toUpperCase();
  if (channel === "CASH" || channel === "UPI" || channel === "BANK_TRANSFER" || channel === "PHONEPE") {
    return channel;
  }
  const mode = String(raw.mode ?? raw.source ?? "").toUpperCase();
  if (mode.includes("CASH")) return "CASH";
  if (mode.includes("UPI")) return "UPI";
  if (mode.includes("BANK")) return "BANK_TRANSFER";
  return "PHONEPE";
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    SUCCESS: "Successful",
    PENDING: "Processing",
    FAILED: "Failed",
    REVERSED: "Reversed",
    UNALLOCATED_PENDING_REVIEW: "Under review",
  };
  return map[status] ?? status;
}

function channelLabel(channel: PaymentListItem["channel"]): string {
  if (channel === "CASH") return "Cash at branch";
  if (channel === "PHONEPE") return "PhonePe";
  if (channel === "UPI") return "UPI";
  return "Bank transfer";
}

function sanitizeReceipt(status: string, receiptNumber?: string): string | undefined {
  if (status !== "SUCCESS") return undefined;
  if (!receiptNumber || receiptNumber.startsWith("PENDING-")) return undefined;
  return receiptNumber;
}

/** Normalizes GET /app/payments rows (mapped DTO or legacy admin shape). */
export function adaptCustomerPayment(raw: unknown): PaymentListItem {
  const row = (raw ?? {}) as Record<string, unknown>;
  const scheme = row.scheme as Record<string, unknown> | undefined;
  const planSnapshot = scheme?.planSnapshot as Record<string, unknown> | undefined;
  const id = String(row.id ?? row._id ?? "");
  const status = String(row.status ?? "SUCCESS").toUpperCase() as PaymentListItem["status"];
  const amount = readMoney(row.amount, Number(row.amountPaise ?? 0));
  const channel = readChannel(row);
  const schemeId = String(row.schemeId ?? scheme?.id ?? scheme?._id ?? "");
  const schemeName = String(
    row.schemeName ?? planSnapshot?.displayName ?? planSnapshot?.name ?? "Savings scheme",
  );
  const schemeNumber = String(row.schemeNumber ?? scheme?.enrollmentNumber ?? "");
  const receiptNumber =
    sanitizeReceipt(status, String(row.receiptNumber ?? "")) ??
    (row.receiptNumber && status === "SUCCESS" && !String(row.receiptNumber).startsWith("PENDING-")
      ? String(row.receiptNumber)
      : undefined);
  const receiptDownloadPath =
    row.receiptDownloadPath != null
      ? String(row.receiptDownloadPath)
      : status === "SUCCESS" && id
        ? `/app/payments/${id}/receipt`
        : undefined;

  return {
    id,
    amount,
    status,
    statusLabel: String(row.statusLabel ?? statusLabel(status)),
    paidAt: row.paidAt ? String(row.paidAt) : undefined,
    createdAt: String(row.createdAt ?? row.paidAt ?? new Date().toISOString()),
    schemeId,
    schemeNumber,
    schemeName,
    receiptNumber,
    receiptDownloadPath,
    channel,
    channelLabel: String(row.channelLabel ?? row.recordedByLabel ?? channelLabel(channel)),
    recordedByLabel: row.recordedByLabel != null ? String(row.recordedByLabel) : undefined,
    paymentPattern:
      String(row.paymentPattern ?? scheme?.paymentPattern ?? "FIXED").toUpperCase() === "FLEXIBLE"
        ? "FLEXIBLE"
        : "FIXED",
    targetCycle: row.targetCycle ? String(row.targetCycle) : undefined,
    valueBasis:
      row.valueBasis === "GOLD_WEIGHT" || row.valueBasis === "CASH"
        ? row.valueBasis
        : undefined,
    goldAccrual: readGoldAccrual(row),
    transactionId:
      row.transactionId != null
        ? String(row.transactionId)
        : row.providerTransactionId != null
          ? String(row.providerTransactionId)
          : undefined,
  };
}

export function adaptCustomerPaymentList(raw: unknown): PaymentListItem[] {
  if (Array.isArray(raw)) return raw.map(adaptCustomerPayment);
  if (raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown[] }).data)) {
    return (raw as { data: unknown[] }).data.map(adaptCustomerPayment);
  }
  return [];
}

function readTotalPaidFromPayments(payments: PaymentListItem[]): number {
  return payments
    .filter((p) => p.status === "SUCCESS")
    .reduce((sum, p) => sum + p.amount.amountPaise, 0);
}

/** Normalizes GET /app/schemes/:id (payments need gold accrual flattening). */
export function adaptCustomerSchemeDetail(raw: unknown): CustomerSchemeDetail {
  const dto = (raw ?? {}) as CustomerSchemeDetail;
  const payments = Array.isArray(dto.payments)
    ? dto.payments.map((p) => adaptCustomerPayment(p))
    : [];

  const paidFromLedger =
    dto.totalPaid?.amountPaise ??
    dto.passbookSummary?.totalPaid?.amountPaise ??
    readTotalPaidFromPayments(payments);
  const totalPaid = readMoney(dto.totalPaid, paidFromLedger);

  const progressCard = dto.progressCard
    ? {
        ...dto.progressCard,
        freeWindowMonth:
          dto.progressCard.freeWindowMonth ?? dto.freeWindowMonth,
        freeWindowMonths:
          dto.progressCard.freeWindowMonths ?? dto.freeWindowMonths,
        cycleCap: dto.progressCard.cycleCap ?? dto.cycleCap,
        remainingThisCycle:
          dto.progressCard.remainingThisCycle ?? dto.remainingThisCycle,
      }
    : dto.progressCard;

  return {
    ...dto,
    payments,
    totalPaid,
    progressCard,
    passbookSummary: dto.passbookSummary
      ? {
          ...dto.passbookSummary,
          totalPaid: readMoney(dto.passbookSummary.totalPaid, paidFromLedger),
        }
      : dto.passbookSummary,
  };
}

export type CustomerPaymentsSummary = {
  totalPaidPaise: number;
  successCount: number;
};

export function summarizeCustomerPayments(items: PaymentListItem[]): CustomerPaymentsSummary {
  const success = items.filter((p) => p.status === "SUCCESS");
  return {
    totalPaidPaise: success.reduce((sum, p) => sum + p.amount.amountPaise, 0),
    successCount: success.length,
  };
}
