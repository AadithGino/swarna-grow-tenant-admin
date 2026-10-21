"use client";

import { formatAssetLabel } from "@/src/lib/digital-metals-asset-ui";
import {
  formatInrFromPaise,
  formatInrPerGramFromPaise,
  ugToGramsDisplay,
} from "@/src/lib/digital-metals-display";
import { formatPassbookWhen } from "@/src/lib/customer-digital-metals-passbook-ui";

export type DigitalMetalsSellSummary = {
  orderId?: string;
  metal?: string;
  finenessPpm?: number;
  quantityUg?: string;
  settlementPaise?: number;
  sellRatePerGramPaise?: number | null;
  confirmedAt?: string | null;
  executedAt?: string | null;
  bankDestination?: {
    accountHolderName?: string;
    accountLast4?: string;
    ifsc?: string;
    bankName?: string;
    status?: string | null;
  } | null;
};

export function sellSummaryFromOrder(order: Record<string, unknown> | null | undefined) {
  if (!order) return null;
  const embedded = order.sellSummary as DigitalMetalsSellSummary | undefined;
  if (embedded?.orderId || embedded?.quantityUg) return embedded;
  const snapshot = (order.snapshot ?? {}) as Record<string, unknown>;
  const rateSnapshot = (snapshot.rateSnapshot ?? {}) as Record<string, unknown>;
  const bank =
    (order.bankDestination as DigitalMetalsSellSummary["bankDestination"])
    ?? null;
  return {
    orderId: String(order.id ?? ""),
    metal: String(order.metal ?? "GOLD"),
    finenessPpm: Number(order.finenessPpm ?? 0),
    quantityUg: String(order.quantityUg ?? snapshot.quantityUg ?? ""),
    settlementPaise: Number(order.settlementPaise ?? snapshot.settlementPaise ?? 0),
    sellRatePerGramPaise: rateSnapshot.sellRatePerGramPaise != null
      ? Number(rateSnapshot.sellRatePerGramPaise)
      : null,
    confirmedAt: (order.confirmedAt ?? null) as string | null,
    executedAt: (order.executedAt ?? null) as string | null,
    bankDestination: bank,
  } satisfies DigitalMetalsSellSummary;
}

function receiptDetail(label: string, value: string) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-[#8a6a70]">{label}</dt>
      <dd className="max-w-[58%] text-right font-medium text-[#28161a]">{value}</dd>
    </div>
  );
}

export function CustomerDigitalMetalsSellReceiptBody({
  summary,
  compact = false,
}: {
  summary: DigitalMetalsSellSummary;
  compact?: boolean;
}) {
  const asset = formatAssetLabel(String(summary.metal ?? "GOLD"), Number(summary.finenessPpm ?? 0));
  const bank = summary.bankDestination;
  return (
    <dl className={compact ? "space-y-0" : "divide-y divide-[#f0e8e5]"}>
      {receiptDetail("Asset", asset)}
      {receiptDetail("Weight sold", ugToGramsDisplay(String(summary.quantityUg ?? 0)))}
      {summary.sellRatePerGramPaise != null
        ? receiptDetail("Rate locked", formatInrPerGramFromPaise(summary.sellRatePerGramPaise))
        : null}
      {receiptDetail("Net payout", formatInrFromPaise(summary.settlementPaise))}
      {summary.confirmedAt
        ? receiptDetail("Submitted at", formatPassbookWhen(summary.confirmedAt))
        : null}
      {summary.executedAt
        ? receiptDetail("Sale executed", formatPassbookWhen(summary.executedAt))
        : null}
      {bank?.accountHolderName
        ? receiptDetail(
            "Payout account",
            `${bank.accountHolderName} · ****${bank.accountLast4 ?? "****"} · ${bank.ifsc ?? ""}`,
          )
        : null}
      {bank?.bankName ? receiptDetail("Bank", String(bank.bankName)) : null}
    </dl>
  );
}
