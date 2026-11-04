import { customerPath } from "@/src/lib/customer-tenant";
import { customerShopOrderPath } from "@/src/lib/customer-shop-paths";

export type CustomerRecentActivityKind =
  | "SCHEME_PAYMENT"
  | "SHOP_ORDER"
  | "DIGITAL_METALS_BUY"
  | "DIGITAL_METALS_BUY_METAL"
  | "DIGITAL_METALS_SELL"
  | "DIGITAL_METALS_SELL_METAL"
  | "DIGITAL_METALS_REDEMPTION"
  | "DIGITAL_METALS_REDEMPTION_METAL";

export type CustomerRecentActivityItem = {
  id: string;
  kind: CustomerRecentActivityKind | string;
  direction?: "IN" | "OUT";
  lineType?: "CASH" | "METAL";
  title: string;
  subtitle?: string;
  amount: { amountPaise: number; amountDisplay: string };
  /** Signed micrograms; positive = wallet credit, negative = debit. */
  metalDeltaUg?: number;
  finenessPpm?: number;
  occurredAt: string;
  statusLabel?: string;
  entityId: string;
  metal?: string;
};

export type CustomerActivityListPage = {
  items: CustomerRecentActivityItem[];
  page: { nextCursor?: string | null; hasMore?: boolean };
};

export function customerRecentActivityHref(
  tenantSlug: string | null,
  item: CustomerRecentActivityItem,
): string {
  const kind = String(item.kind);
  const entityId = String(item.entityId);
  switch (kind) {
    case "SHOP_ORDER":
      return customerShopOrderPath(tenantSlug, entityId);
    case "DIGITAL_METALS_BUY":
    case "DIGITAL_METALS_BUY_METAL":
      return customerPath(tenantSlug, "digital-metals", "order", entityId);
    case "DIGITAL_METALS_SELL":
    case "DIGITAL_METALS_SELL_METAL":
      return customerPath(tenantSlug, "digital-metals", "sell-order", entityId);
    case "DIGITAL_METALS_REDEMPTION":
    case "DIGITAL_METALS_REDEMPTION_METAL":
      return customerPath(tenantSlug, "digital-metals", "redeem-order", entityId);
    case "SCHEME_PAYMENT":
    default:
      return customerPath(tenantSlug, "payments", entityId);
  }
}

export function customerRecentActivityHeadline(item: CustomerRecentActivityItem): string {
  const kind = String(item.kind);
  if (kind === "SCHEME_PAYMENT") return item.subtitle ? `Scheme · ${item.subtitle}` : item.title;
  if (kind === "SHOP_ORDER") return item.subtitle ? `Shop · ${item.subtitle}` : item.title;
  return item.subtitle ? `${item.title} · ${item.subtitle}` : item.title;
}

/** Normalizes GET /app/activity after customerApi unwrap. */
export function normalizeCustomerActivityPage(raw: unknown): CustomerActivityListPage {
  if (raw && typeof raw === "object" && "items" in raw && Array.isArray((raw as CustomerActivityListPage).items)) {
    const row = raw as CustomerActivityListPage & {
      meta?: { nextCursor?: string | null; hasMore?: boolean };
    };
    const nextCursor = row.meta?.nextCursor ?? row.page?.nextCursor ?? null;
    const hasMore = row.meta?.hasMore ?? row.page?.hasMore ?? Boolean(nextCursor);
    return {
      items: row.items,
      page: { nextCursor, hasMore },
    };
  }
  if (Array.isArray(raw)) {
    return { items: raw as CustomerRecentActivityItem[], page: { nextCursor: null } };
  }
  if (raw && typeof raw === "object" && "data" in raw) {
    const envelope = raw as {
      data: CustomerRecentActivityItem[] | CustomerActivityListPage;
      meta?: { nextCursor?: string | null; hasMore?: boolean };
    };
    if (Array.isArray(envelope.data)) {
      return {
        items: envelope.data,
        page: { nextCursor: envelope.meta?.nextCursor ?? null, hasMore: envelope.meta?.hasMore },
      };
    }
  }
  return { items: [], page: { nextCursor: null } };
}
