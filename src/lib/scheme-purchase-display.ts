import { formatShopInr } from "@/src/features/customer/customer-shop-ui";

export type SchemePurchaseSnap = {
  appliedPaise?: number;
  topUpPaise?: number;
  grossPaise?: number;
  remaining?: number;
  basis?: string;
  approvalStatus?: string;
};

export type SchemePurchasePresentation = {
  shortLabel?: string;
  paymentSummary?: string;
  appliedPaise?: number;
  topUpPaise?: number;
  remainingAfterOrder?: number | null;
  basis?: string;
};

export function formatSchemeWeightMg(mg: number) {
  return `${(mg / 1000).toFixed(3)} g`;
}

export function formatSchemeRemaining(basis: string | undefined, remaining: number) {
  return basis === "GOLD_WEIGHT" ? formatSchemeWeightMg(remaining) : formatShopInr(remaining, 2);
}

export function orderSchemeBadge(
  purchase?: SchemePurchaseSnap | null,
  presentation?: SchemePurchasePresentation | null,
): string | null {
  if (presentation?.shortLabel) return presentation.shortLabel;
  if (!purchase) return null;
  return (purchase.topUpPaise ?? 0) > 0 ? "Scheme + cash" : "Paid with scheme";
}

export function orderPayableLabel(
  purchase: SchemePurchaseSnap | null | undefined,
  totalPaise: number,
) {
  if (!purchase) return formatShopInr(totalPaise, 2);
  if ((purchase.topUpPaise ?? 0) > 0) {
    return formatShopInr(purchase.topUpPaise ?? totalPaise, 2);
  }
  return "Covered by scheme";
}