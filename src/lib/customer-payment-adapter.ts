import type {
  CustomerSchemeDetail,
  CustomerSettlementPreview,
  MoneyRef,
  PaymentListItem,
} from "@/src/types/customer";
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
  if (channel === "CASH" || channel === "UPI" || channel === "CARD" || channel === "BANK_TRANSFER" || channel === "PHONEPE") {
    return channel;
  }
  const mode = String(raw.mode ?? raw.source ?? "").toUpperCase();
  if (mode.includes("CASH")) return "CASH";
  if (mode.includes("UPI")) return "UPI";
  if (mode.includes("CARD") || mode.includes("POS")) return "CARD";
  if (mode.includes("BANK")) return "BANK_TRANSFER";
  return "PHONEPE";
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    SUCCESS: "Successful",
    PARTIALLY_REFUNDED: "Partially refunded",
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
  if (channel === "CARD") return "Card / POS";
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
  const grossAmount = readMoney(row.grossAmount, Number(row.grossAmountPaise ?? row.amountPaise ?? 0));
  const refundedAmount = readMoney(row.refundedAmount, Number(row.refundedAmountPaise ?? 0));
  const netAmount = readMoney(
    row.netAmount ?? row.amount,
    Number(row.netAmountPaise ?? (grossAmount.amountPaise - refundedAmount.amountPaise)),
  );
  const amount = netAmount;
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
    grossAmount,
    refundedAmount,
    netAmount,
    grossAmountPaise: grossAmount.amountPaise,
    refundedAmountPaise: refundedAmount.amountPaise,
    netAmountPaise: netAmount.amountPaise,
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

function settlementPreviewPayload(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && "success" in raw && "data" in raw) {
    return (raw as { data: Record<string, unknown> }).data ?? {};
  }
  return (raw ?? {}) as Record<string, unknown>;
}

function normalizeSettlementLine(line: unknown) {
  const row = (line ?? {}) as Record<string, unknown>;
  const amountRaw = row.amount;
  const paise =
    amountRaw && typeof amountRaw === "object"
      ? Number((amountRaw as MoneyRef).amountPaise ?? 0)
      : Number(row.amountPaise ?? 0);
  const sign: "+" | "-" = row.sign === "-" ? "-" : "+";
  return {
    key: String(row.key ?? ""),
    label: String(row.label ?? ""),
    amount: readMoney(amountRaw, paise),
    sign,
    forfeited: row.forfeited as boolean | undefined,
  };
}

function isValidMoneyRef(raw: unknown): raw is MoneyRef {
  if (!raw || typeof raw !== "object") return false;
  const row = raw as MoneyRef;
  const paise = Number(row.amountPaise);
  return Number.isFinite(paise) && paise >= 0 && typeof row.amountDisplay === "string";
}

function unavailableSettlementPreview(): CustomerSettlementPreview {
  const emptyMoney: MoneyRef = { amountPaise: 0, amountDisplay: "—" };
  return {
    previewAvailable: false,
    eligible: false,
    blockers: [],
    computation: { lines: [], finalValue: emptyMoney, goldWeight: null },
    allowedModes: [],
    principalPaise: 0,
    benefitPaise: 0,
    penaltyPaise: 0,
    settlementPaise: 0,
    mode: null,
  };
}

function validateSettlementPayload(payload: Record<string, unknown>): boolean {
  if (typeof payload.eligible !== "boolean") return false;
  const computationRaw = payload.computation;
  if (!computationRaw || typeof computationRaw !== "object") return false;
  const finalRaw =
    (computationRaw as Record<string, unknown>).finalValue ?? payload.finalValue;
  if (!isValidMoneyRef(finalRaw)) return false;
  if (!Array.isArray(payload.allowedModes)) return false;
  for (const modeRow of payload.allowedModes) {
    if (!modeRow || typeof modeRow !== "object") return false;
    const mode = (modeRow as { mode?: unknown }).mode;
    if (typeof mode !== "string" || !mode.trim()) return false;
  }
  if (payload.eligible && (finalRaw as MoneyRef).amountPaise <= 0) return false;
  return true;
}

/** Normalizes GET /app/schemes/:id/settlement-preview for the customer redemption dialog. */
export function adaptCustomerSettlementPreview(raw: unknown): CustomerSettlementPreview {
  if (raw == null || typeof raw !== "object") return unavailableSettlementPreview();
  const payload = settlementPreviewPayload(raw);
  if (!validateSettlementPayload(payload)) return unavailableSettlementPreview();

  const blockers = Array.isArray(payload.blockers)
    ? (payload.blockers as CustomerSettlementPreview["blockers"])
    : [];
  const eligible = payload.eligible === true;

  const computationRaw = payload.computation as Record<string, unknown>;
  const lineSource = Array.isArray(computationRaw.lines)
    ? computationRaw.lines
    : Array.isArray(payload.lines)
      ? payload.lines
      : [];
  const finalValue = computationRaw.finalValue as MoneyRef;
  const finalPaise = Number(finalValue.amountPaise);
  const goldWeight =
    (computationRaw.goldWeight as CustomerSettlementPreview["computation"]["goldWeight"]) ??
    null;

  return {
    previewAvailable: true,
    eligible,
    blockers,
    computation: {
      lines: lineSource.map(normalizeSettlementLine),
      finalValue,
      goldWeight,
    },
    allowedModes: payload.allowedModes as CustomerSettlementPreview["allowedModes"],
    modePreviews: payload.modePreviews as CustomerSettlementPreview["modePreviews"],
    warningText: typeof payload.warningText === "string" ? payload.warningText : undefined,
    valuationNote: typeof payload.valuationNote === "string" ? payload.valuationNote : undefined,
    cashSettlementBasis: payload.cashSettlementBasis as CustomerSettlementPreview["cashSettlementBasis"],
    paidAmountBenefitTreatment:
      payload.paidAmountBenefitTreatment as CustomerSettlementPreview["paidAmountBenefitTreatment"],
    valuationRatePerGramPaise: payload.valuationRatePerGramPaise as number | undefined,
    valuationRateEffectiveDate: payload.valuationRateEffectiveDate as string | undefined,
    principalPaise: Number(payload.principalPaise ?? 0),
    benefitPaise: Number(payload.benefitPaise ?? 0),
    penaltyPaise: Number(payload.penaltyPaise ?? 0),
    settlementPaise: Number(payload.settlementPaise ?? finalPaise),
    weightMg: payload.weightMg as number | undefined,
    mode: typeof payload.mode === "string" ? payload.mode : null,
  };
}

/** GET /app/schemes list — live API unwrap yields `{ items, meta }`; mocks return arrays. */
export function normalizeCustomerSchemeList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)) {
    return (raw as { items: T[] }).items;
  }
  return [];
}

/** Normalizes GET /app/schemes/:id (payments need gold accrual flattening). */
export function adaptCustomerSchemeDetail(raw: unknown): CustomerSchemeDetail {
  const dto = (raw ?? {}) as CustomerSchemeDetail;
  const payments = Array.isArray(dto.payments) ? dto.payments.map((p) => adaptCustomerPayment(p)) : [];
  return { ...dto, payments };
}

export type CustomerPaymentsSummary = {
  totalPaidPaise: number;
  successCount: number;
};

export function summarizeCustomerPayments(items: PaymentListItem[]): CustomerPaymentsSummary {
  const success = items.filter((p) => p.status === "SUCCESS" || p.status === "PARTIALLY_REFUNDED");
  return {
    totalPaidPaise: success.reduce((sum, p) => sum + p.amount.amountPaise, 0),
    successCount: success.length,
  };
}
