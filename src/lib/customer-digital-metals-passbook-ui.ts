import { customerPath } from "@/src/lib/customer-tenant";
import type { DigitalMetalsPurchaseSummary } from "@/src/lib/customer-digital-metals-purchase-receipt";
import type { DigitalMetalsSellSummary } from "@/src/lib/customer-digital-metals-sell-receipt";
import { formatAssetLabel } from "@/src/lib/digital-metals-asset-ui";
import {
  formatInrFromPaise,
  formatInrPerGramFromPaise,
  ugToGramsDisplay,
} from "@/src/lib/digital-metals-display";

export function passbookEntryTitle(entryType: string): string {
  switch (entryType) {
    case "CREDIT":
      return "Metal added to wallet";
    case "DEBIT":
      return "Metal removed from wallet";
    case "RESERVE":
      return "Metal reserved for an order";
    case "RELEASE":
      return "Reservation released";
    case "REVERSAL":
      return "Correction";
    default:
      return "Wallet update";
  }
}

export function passbookReferenceLabel(referenceType: string | null | undefined): string | null {
  if (!referenceType) return null;
  switch (referenceType) {
    case "PURCHASE":
      return "Purchase";
    case "SELL":
      return "Sale";
    case "REDEMPTION":
      return "Physical redemption";
    case "RESERVATION":
      return "Order reservation";
    default:
      return null;
  }
}

export function passbookOrderHref(
  tenantSlug: string | null,
  referenceId: string | null | undefined,
): string | null {
  if (!tenantSlug || !referenceId) return null;
  const id = String(referenceId);
  if (id.startsWith("dmbo_")) {
    return customerPath(tenantSlug, "digital-metals", "order", id);
  }
  if (id.startsWith("dmso_")) {
    return customerPath(tenantSlug, "digital-metals", "sell-order", id);
  }
  if (id.startsWith("dmro_")) {
    return customerPath(tenantSlug, "digital-metals", "redeem-order", id);
  }
  return null;
}

export function formatPassbookQuantityDelta(quantityUgDelta: string | number): string {
  const n = Number(quantityUgDelta);
  if (!Number.isFinite(n) || n === 0) return "—";
  const sign = n > 0 ? "+" : "−";
  return `${sign}${ugToGramsDisplay(String(Math.abs(n)))}`;
}

export function formatPassbookRowQuantity(row: {
  quantityUgDelta?: string | number;
  reservedUgDelta?: string | number;
  entryType?: string;
  sellSummary?: DigitalMetalsSellSummary | null;
  purchaseSummary?: DigitalMetalsPurchaseSummary | null;
}): string {
  const delta = Number(row.quantityUgDelta);
  if (Number.isFinite(delta) && delta !== 0) {
    return formatPassbookQuantityDelta(delta);
  }
  const reserved = Number(row.reservedUgDelta);
  if (Number.isFinite(reserved) && reserved !== 0) {
    const grams = ugToGramsDisplay(String(Math.abs(reserved)));
    if (row.entryType === "RESERVE") return `${grams} held`;
    if (row.entryType === "RELEASE") return `${grams} released`;
  }
  if (row.sellSummary?.quantityUg && row.entryType === "RESERVE") {
    return `${ugToGramsDisplay(String(row.sellSummary.quantityUg))} held`;
  }
  return "—";
}

export type DigitalMetalsRedemptionPassbookSummary = {
  orderId?: string;
  status?: string;
  metal?: string;
  finenessPpm?: number;
  quantityUg?: string;
  fulfilmentMode?: string | null;
  chargeTotalPaise?: number;
  createdAt?: string | null;
};

const REDEMPTION_STATUS_LABEL: Record<string, string> = {
  CHARGE_PENDING: "Awaiting charge payment",
  CHARGE_PAID: "Preparing your order",
  FULFILMENT_ACCEPTED: "Order accepted",
  PACKING: "Packing",
  DISPATCHED: "Dispatched",
  PICKUP_READY: "Ready for pickup",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function passbookRedemptionActivityLines(
  summary: DigitalMetalsRedemptionPassbookSummary | null | undefined,
): string[] {
  if (!summary?.metal) return [];
  const lines: string[] = [];
  const asset = formatAssetLabel(String(summary.metal), Number(summary.finenessPpm ?? 0));
  lines.push(asset);
  if (summary.status) {
    lines.push(REDEMPTION_STATUS_LABEL[String(summary.status)] ?? String(summary.status));
  }
  if (summary.fulfilmentMode === "DELIVERY") lines.push("Home delivery");
  if (summary.fulfilmentMode === "PICKUP") lines.push("Branch pickup");
  if (summary.chargeTotalPaise != null && summary.chargeTotalPaise > 0) {
    lines.push(`Charges ${formatInrFromPaise(summary.chargeTotalPaise)}`);
  }
  if (summary.createdAt) lines.push(`Ordered ${formatPassbookWhen(summary.createdAt)}`);
  return lines;
}

export function passbookOrderLinkLabel(referenceType: string | null | undefined): string {
  if (referenceType === "REDEMPTION") return "Track redemption";
  if (referenceType === "SELL") return "View sell order";
  if (referenceType === "PURCHASE") return "View order";
  return "View order";
}

export function passbookActivityTitle(row: {
  entryType?: string;
  referenceType?: string | null;
  purchaseSummary?: DigitalMetalsPurchaseSummary | null;
  sellSummary?: DigitalMetalsSellSummary | null;
  redemptionSummary?: DigitalMetalsRedemptionPassbookSummary | null;
}): string {
  const redemption = row.redemptionSummary;
  if (row.referenceType === "REDEMPTION" && redemption?.metal) {
    const asset = formatAssetLabel(String(redemption.metal), Number(redemption.finenessPpm ?? 0));
    if (row.entryType === "RELEASE") return `${asset} redemption cancelled`;
    return `${asset} physical redemption`;
  }
  const purchase = row.purchaseSummary;
  if (row.referenceType === "PURCHASE" && purchase?.metal) {
    return `${formatAssetLabel(String(purchase.metal), Number(purchase.finenessPpm ?? 0))} purchase`;
  }
  const sell = row.sellSummary;
  if ((row.referenceType === "SELL" || sell?.metal) && sell?.metal) {
    const asset = formatAssetLabel(String(sell.metal), Number(sell.finenessPpm ?? 0));
    if (row.entryType === "DEBIT" || sell.executedAt) return `${asset} sale`;
    if (row.entryType === "RESERVE") return `${asset} sale (pending approval)`;
    return `${asset} sale`;
  }
  return passbookEntryTitle(String(row.entryType ?? ""));
}

export function passbookSellActivityLines(
  summary: DigitalMetalsSellSummary | null | undefined,
): string[] {
  if (!summary) return [];
  const lines: string[] = [];
  if (summary.sellRatePerGramPaise != null) {
    lines.push(`Rate ${formatInrPerGramFromPaise(summary.sellRatePerGramPaise)}`);
  }
  if (summary.settlementPaise != null) {
    lines.push(`Payout ${formatInrFromPaise(summary.settlementPaise)}`);
  }
  const bank = summary.bankDestination;
  if (bank?.accountLast4) {
    lines.push(
      `Bank ****${bank.accountLast4}${bank.ifsc ? ` · ${bank.ifsc}` : ""}`,
    );
  }
  const when = summary.executedAt ?? summary.confirmedAt;
  if (when) lines.push(`Submitted ${formatPassbookWhen(when)}`);
  return lines;
}

export function dedupePassbookRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const executedSellIds = new Set(
    rows
      .filter(
        (r) =>
          r.referenceType === "SELL"
          && r.entryType === "DEBIT"
          && r.referenceId,
      )
      .map((r) => String(r.referenceId)),
  );
  return rows.filter((r) => {
    const sellOrderId = r.sellOrderId ? String(r.sellOrderId) : String(r.referenceId ?? "");
    if (r.referenceType === "SELL" && r.entryType === "RESERVE" && executedSellIds.has(sellOrderId)) {
      return false;
    }
    if (r.referenceType === "RESERVATION" && r.entryType === "DEBIT" && r.sellOrderId) {
      if (executedSellIds.has(String(r.sellOrderId))) return false;
    }
    return true;
  });
}

export function passbookPurchaseActivityLines(
  summary: DigitalMetalsPurchaseSummary | null | undefined,
): string[] {
  if (!summary) return [];
  const lines: string[] = [];
  if (summary.buyRatePerGramPaise != null) {
    lines.push(`Rate ${formatInrPerGramFromPaise(summary.buyRatePerGramPaise)}`);
  }
  if (summary.totalPayablePaise != null) {
    lines.push(`Paid ${formatInrFromPaise(summary.totalPayablePaise)}`);
  }
  const when = summary.creditedAt ?? summary.bookedAt;
  if (when) lines.push(`Booked ${formatPassbookWhen(when)}`);
  return lines;
}

export function formatPassbookWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}
