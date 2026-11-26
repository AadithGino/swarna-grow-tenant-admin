import type { CkStepState, CkTone } from "@/src/components/customer/customer-kit";
import { buildShopOrderTimeline } from "@/src/features/customer/customer-shop-order-progress";
import {
  bookingPayAction,
  bookingSteps,
  bookingTimeLeft,
  isOpenBooking,
  type CustomerBooking,
} from "@/src/lib/customer-shop-booking";
import { customerShopBookingPath, customerShopOrderPath } from "@/src/lib/customer-shop-paths";
import { customerDigitalMetalsOrderHref } from "@/src/lib/customer-digital-metals-order-links";
import { formatShopInr } from "@/src/features/customer/customer-shop-ui";

export type ShopActivityFilter = "all" | "bookings" | "delivery" | "pickup" | "wallet";

export type ShopActivityKind = "booking" | "shop-delivery" | "shop-pickup" | "wallet-delivery";

export type ShopActivityItem = {
  key: string;
  kind: ShopActivityKind;
  filter: Exclude<ShopActivityFilter, "all">;
  href: string;
  title: string;
  subtitle: string;
  badge: string;
  tone: CkTone;
  steps: { id: string; label: string; state: CkStepState }[];
  /** One plain sentence for the shop strip (no jargon). */
  plainLine: string;
  active: boolean;
  /** Lower = show first on home / shop strip. */
  sortKey: number;
};

function bookingStepState(state: string): CkStepState {
  if (state === "done") return "complete";
  if (state === "current") return "current";
  if (state === "stopped") return "cancelled";
  return "upcoming";
}

function orderTone(tone: string): CkTone {
  if (tone === "success") return "ok";
  if (tone === "warning") return "warn";
  if (tone === "danger") return "bad";
  return "blue";
}

function redemptionStepIndex(status: string) {
  switch (status) {
    case "CHARGE_PENDING":
      return 0;
    case "CHARGE_PAID":
    case "FULFILMENT_ACCEPTED":
      return 1;
    case "PACKING":
      return 2;
    case "DISPATCHED":
    case "PICKUP_READY":
      return 3;
    default:
      return -1;
  }
}

const DM_STEPS_PICKUP = ["Requested", "Accepted", "Packed", "Ready", "Collected"];
const DM_STEPS_DELIVERY = ["Requested", "Accepted", "Packed", "Shipped", "Delivered"];

const REDEMPTION_LABEL: Record<string, string> = {
  CHARGE_PENDING: "Pay charges",
  CHARGE_PAID: "Preparing",
  FULFILMENT_ACCEPTED: "Accepted",
  PACKING: "Packing",
  DISPATCHED: "Dispatched",
  PICKUP_READY: "Ready for pickup",
};

export function buildBookingActivity(tenantSlug: string, booking: CustomerBooking, now = Date.now()): ShopActivityItem | null {
  if (!isOpenBooking(booking.status)) return null;
  const action = bookingPayAction(booking);
  const steps = bookingSteps(booking).map((s) => ({ id: s.key, label: s.label, state: bookingStepState(s.state) }));
  const dueMs = action?.dueAt ? new Date(action.dueAt).getTime() - now : Number.POSITIVE_INFINITY;
  const left = action?.dueAt ? bookingTimeLeft(action.dueAt, now) : null;
  const plainLine = action
    ? `${action.label} ${formatShopInr(action.amountPaise, 2)}${left ? ` — ${left}` : ""}`
    : "Reserved — store will send your final bill";
  return {
    key: `booking-${booking.id}`,
    kind: "booking",
    filter: "bookings",
    href: customerShopBookingPath(tenantSlug, booking.id),
    title: booking.product?.name ?? "Reserved piece",
    subtitle: action
      ? `${action.label} · ${formatShopInr(action.amountPaise, 2)}${left ? ` · ${left}` : ""}`
      : `${formatShopInr(booking.advance?.capturedPaise, 2)} advance paid · waiting for final bill`,
    badge: action ? (left ? left : "Payment due") : "Reserved",
    tone: action ? "warn" : "brand",
    steps,
    plainLine,
    active: true,
    sortKey: action ? Math.max(0, dueMs) : 50_000_000_000 + dueMs,
  };
}

export function buildShopOrderActivity(tenantSlug: string, order: Record<string, unknown>): ShopActivityItem | null {
  const timeline = buildShopOrderTimeline(order);
  const delivery = String(order.fulfilmentMode ?? "") === "DELIVERY";
  const steps = timeline.steps.map((s) => ({
    id: s.id,
    label: s.label,
    state: s.state as CkStepState,
  }));
  const lines = (order.lines as { name?: string }[] | undefined) ?? [];
  const extra = lines.length > 1 ? ` + ${lines.length - 1} more` : "";
  const headline = String(order.statusLabel ?? timeline.headline);
  const plainLine = delivery ? `Home delivery — ${headline}` : `Branch pickup — ${headline}`;
  return {
    key: `order-${String(order.id)}`,
    kind: delivery ? "shop-delivery" : "shop-pickup",
    filter: delivery ? "delivery" : "pickup",
    href: customerShopOrderPath(tenantSlug, String(order.id)),
    title: `${lines[0]?.name ?? "Order"}${extra}`,
    subtitle: `${String(order.orderNumber ?? "")} · ${formatShopInr(Number(order.totalPaise ?? 0), 2)}`,
    badge: headline,
    tone: orderTone(timeline.tone),
    steps,
    plainLine,
    active: !timeline.terminal,
    sortKey: timeline.terminal ? Number.MAX_SAFE_INTEGER : 20_000_000_000 + (1 - timeline.progressRatio) * 1_000_000,
  };
}

export function buildWalletRedemptionActivity(
  tenantSlug: string,
  row: Record<string, unknown>,
): ShopActivityItem | null {
  const status = String(row.status ?? "");
  const idx = redemptionStepIndex(status);
  if (idx < 0) return null;
  const pickup = String(row.fulfilmentMode ?? "") === "PICKUP";
  const labels = pickup ? DM_STEPS_PICKUP : DM_STEPS_DELIVERY;
  const steps = labels.map((label, i) => ({
    id: `${i}`,
    label,
    state: (i < idx ? "complete" : i === idx ? "current" : "upcoming") as CkStepState,
  }));
  return {
    key: `dm-red-${String(row.id)}`,
    kind: "wallet-delivery",
    filter: "wallet",
    href: customerDigitalMetalsOrderHref(tenantSlug, "redemption", String(row.id)),
    title: `${String(row.itemLabel ?? "Digital gold coin")} · wallet`,
    subtitle: `${pickup ? "Branch pickup" : "Home delivery"} · charges ${formatShopInr(Number(row.chargeTotalPaise ?? 0), 2)}`,
    badge: REDEMPTION_LABEL[status] ?? status,
    tone: status === "CHARGE_PENDING" ? "warn" : "blue",
    steps,
    plainLine: pickup
      ? `Wallet coin — collect at branch (${REDEMPTION_LABEL[status] ?? status})`
      : `Wallet coin — ${REDEMPTION_LABEL[status] ?? status}`,
    active: true,
    sortKey: 30_000_000_000 + idx * 1_000_000,
  };
}

export function mergeShopActivities(input: {
  tenantSlug: string;
  bookings?: CustomerBooking[];
  orders?: Record<string, unknown>[];
  redemptions?: Record<string, unknown>[];
  now?: number;
}): ShopActivityItem[] {
  const { tenantSlug, bookings = [], orders = [], redemptions = [], now = Date.now() } = input;
  const out: ShopActivityItem[] = [];
  for (const b of bookings) {
    const row = buildBookingActivity(tenantSlug, b, now);
    if (row) out.push(row);
  }
  for (const o of orders) {
    const row = buildShopOrderActivity(tenantSlug, o);
    if (row?.active) out.push(row);
  }
  for (const r of redemptions) {
    const row = buildWalletRedemptionActivity(tenantSlug, r);
    if (row) out.push(row);
  }
  return out.sort((a, b) => a.sortKey - b.sortKey);
}

export function filterShopActivities(items: ShopActivityItem[], filter: ShopActivityFilter): ShopActivityItem[] {
  if (filter === "all") return items;
  return items.filter((i) => i.filter === filter);
}

export const SHOP_ACTIVITY_TABS: { id: ShopActivityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "bookings", label: "Bookings" },
  { id: "delivery", label: "Delivery" },
  { id: "pickup", label: "Pickup" },
  { id: "wallet", label: "Wallet" },
];