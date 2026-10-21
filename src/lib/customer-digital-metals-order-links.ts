import { customerPath } from "@/src/lib/customer-tenant";

export type CustomerDmOrderKind = "buy" | "sell" | "redemption";

export function customerDigitalMetalsOrderHref(
  tenantSlug: string | null | undefined,
  kind: CustomerDmOrderKind,
  orderId: string,
): string {
  if (kind === "buy") return customerPath(tenantSlug, "digital-metals", "order", orderId);
  if (kind === "sell") return customerPath(tenantSlug, "digital-metals", "sell-order", orderId);
  return customerPath(tenantSlug, "digital-metals", "redeem-order", orderId);
}

export function customerDigitalMetalsOrdersHubHref(
  tenantSlug: string | null | undefined,
  tab?: CustomerDmOrderKind,
): string {
  const base = customerPath(tenantSlug, "digital-metals", "orders");
  if (!tab) return base;
  return `${base}?tab=${tab}`;
}

export function customerDigitalMetalsOrderActionLabel(status: string, kind: CustomerDmOrderKind): string {
  const s = String(status ?? "").toUpperCase();
  if (kind === "buy") {
    if (["QUOTE_ACCEPTED", "PAYMENT_PENDING", "PAYMENT_FAILED"].includes(s)) return "Resume payment";
    if (s === "CREDITED") return "View purchase";
    return "View details";
  }
  if (kind === "sell") {
    if (s === "PENDING_APPROVAL") return "Review sell";
    if (s === "PAYABLE_OPEN") return "Track payout";
    return "View sale";
  }
  if (["CHARGE_PAYMENT_PENDING", "CHARGE_PAYMENT_FAILED"].includes(s)) return "Pay charge";
  if (["CHARGE_PAID", "FULFILMENT_ACCEPTED", "PACKING", "DISPATCHED", "PICKUP_READY"].includes(s)) {
    return "Track delivery";
  }
  return "View redemption";
}
