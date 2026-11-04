import type { LucideIcon } from "lucide-react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Coins,
  Gem,
  Layers3,
  ShoppingBag,
  Truck,
} from "lucide-react";
import type { CustomerRecentActivityItem } from "@/src/lib/customer-recent-activity";
import { ugToGramsDisplay } from "@/src/lib/digital-metals-display";

export function activityIsMetalLine(item: CustomerRecentActivityItem): boolean {
  if (item.lineType === "METAL") return true;
  const delta = Number(item.metalDeltaUg);
  return Number.isFinite(delta) && delta !== 0;
}

export function activityDirection(item: CustomerRecentActivityItem): "IN" | "OUT" {
  if (item.direction === "IN" || item.direction === "OUT") return item.direction;
  const kind = String(item.kind);
  if (kind === "DIGITAL_METALS_BUY_METAL") return "IN";
  if (kind === "DIGITAL_METALS_SELL_METAL" || kind === "DIGITAL_METALS_REDEMPTION_METAL") return "OUT";
  if (kind === "DIGITAL_METALS_SELL") return "IN";
  const delta = Number(item.metalDeltaUg);
  if (Number.isFinite(delta) && delta !== 0) return delta > 0 ? "IN" : "OUT";
  return "OUT";
}

export function activityIcon(item: CustomerRecentActivityItem): LucideIcon {
  const kind = String(item.kind);
  const metal = String(item.metal ?? "").toUpperCase();
  if (kind === "SHOP_ORDER") return ShoppingBag;
  if (kind === "SCHEME_PAYMENT") return Layers3;
  if (kind === "DIGITAL_METALS_SELL") return Banknote;
  if (kind === "DIGITAL_METALS_REDEMPTION") return Truck;
  if (
    kind === "DIGITAL_METALS_BUY_METAL"
    || kind === "DIGITAL_METALS_SELL_METAL"
    || kind === "DIGITAL_METALS_REDEMPTION_METAL"
  ) {
    return metal === "SILVER" ? Coins : Gem;
  }
  if (kind === "DIGITAL_METALS_BUY") return Banknote;
  return Coins;
}

export function activityIconStyles(item: CustomerRecentActivityItem): {
  circleClass: string;
  iconClass: string;
} {
  const dir = activityDirection(item);
  if (dir === "IN") {
    return {
      circleClass: "bg-emerald-600 text-white shadow-[0_4px_12px_rgba(11,152,96,0.28)]",
      iconClass: "",
    };
  }
  return {
    circleClass: "bg-red-600 text-white shadow-[0_4px_12px_rgba(220,38,38,0.25)]",
    iconClass: "",
  };
}

export function activityAmountClass(item: CustomerRecentActivityItem): string {
  return activityDirection(item) === "IN"
    ? "font-bold text-emerald-700"
    : "font-bold text-red-700";
}

function formatActivityMetalAmount(item: CustomerRecentActivityItem): string {
  const delta = Number(item.metalDeltaUg);
  if (!Number.isFinite(delta) || delta === 0) return "—";
  const metal = String(item.metal ?? "gold").toLowerCase();
  return `${ugToGramsDisplay(Math.abs(delta))} ${metal}`;
}

/** Passbook amount: colour shows in/out — no leading +/− on the figure. */
export function formatActivityAmount(item: CustomerRecentActivityItem): string {
  if (activityIsMetalLine(item)) {
    return formatActivityMetalAmount(item);
  }
  const paise = Number(item.amount?.amountPaise ?? 0);
  const display = item.amount?.amountDisplay ?? "₹0";
  if (paise === 0) return "—";
  return display;
}

/** @deprecated use formatActivityAmount */
export const formatSignedActivityAmount = formatActivityAmount;

export function ActivityDirectionBadge({ item }: { item: CustomerRecentActivityItem }) {
  const dir = activityDirection(item);
  const Icon = dir === "IN" ? ArrowDownLeft : ArrowUpRight;
  const metalLine = activityIsMetalLine(item);
  const label = metalLine
    ? dir === "IN"
      ? "Metal added to wallet"
      : "Metal removed from wallet"
    : dir === "IN"
      ? "Money in"
      : "Money out";
  const short = metalLine ? (dir === "IN" ? "Metal in" : "Metal out") : dir === "IN" ? "In" : "Out";
  return (
    <span
      className={
        dir === "IN"
          ? "inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200/80"
          : "inline-flex items-center gap-0.5 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700 ring-1 ring-red-200/80"
      }
      title={label}
    >
      <Icon className="size-3" strokeWidth={2.5} aria-hidden />
      {short}
    </span>
  );
}
