"use client";

import {
  BadgeCheck,
  Ban,
  Gift,
  IndianRupee,
  Scale,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  UsersRound,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { StatCard } from "@/src/components/common/page-parts";
import { money } from "@/src/lib/format";
import type { ReportSummaryItem } from "@/src/types/admin-report";

function formatSummaryValue(item: ReportSummaryItem): string {
  const v = item.value;
  if (item.valueType === "currency") {
    if (typeof v === "number") return money(v);
    if (v && typeof v === "object") {
      const o = v as { amountDisplay?: string; amountPaise?: number };
      return o.amountDisplay ?? money((o.amountPaise ?? 0) / 100);
    }
  }
  if (item.valueType === "weight") {
    if (v && typeof v === "object") {
      const o = v as { weightDisplay?: string; weightMg?: number };
      return o.weightDisplay ?? `${((o.weightMg ?? 0) / 1000).toFixed(3)} g`;
    }
  }
  if (item.valueType === "percent") return `${v}%`;
  return String(v ?? "—");
}

function iconForSummaryItem(item: ReportSummaryItem): LucideIcon {
  const key = item.key.toUpperCase();
  if (item.valueType === "currency") return IndianRupee;
  if (item.valueType === "weight" || key.includes("GOLD")) return Scale;
  if (key.includes("BLOCK") || key.includes("SUSPEND")) return Ban;
  if (key.includes("KYC") || key.includes("VERIFIED")) return BadgeCheck;
  if (key.includes("SCHEME") || key.includes("ENROL")) return Gift;
  if (key === "ACTIVE" || key.includes("ACTIVE_CUSTOMER")) return UserCheck;
  if (key.includes("TOTAL") || key.includes("CUSTOMER")) return UsersRound;
  if (key.includes("ALERT") || key.includes("OVERDUE") || key.includes("RISK"))
    return ShieldAlert;
  if (item.change?.direction === "down") return TrendingDown;
  if (item.change?.direction === "up") return TrendingUp;
  if (item.valueType === "count") return UsersRound;
  return IndianRupee;
}

function toneForSummaryItem(item: ReportSummaryItem) {
  if (item.severity === "WARNING" || item.severity === "HIGH") return "red" as const;
  const key = item.key.toUpperCase();
  if (key.includes("GOLD") || key.includes("LIABILITY")) return "gold" as const;
  if (key.includes("BLOCK")) return "red" as const;
  if (key === "ACTIVE" || key.includes("VERIFIED")) return "wine" as const;
  if (key.includes("SCHEME")) return "cream" as const;
  return undefined;
}

export function ReportSummaryStrip({ items }: { items: ReportSummaryItem[] }) {
  if (!items.length) return null;
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => {
        const change = item.change;
        const detail = change
          ? `${change.direction === "up" ? "+" : "-"}${Math.abs(change.percent)}% vs prior period`
          : item.note ?? item.severity ?? undefined;
        return (
          <StatCard
            key={item.key}
            icon={iconForSummaryItem(item)}
            label={item.label}
            value={formatSummaryValue(item)}
            detail={detail}
            tone={toneForSummaryItem(item)}
          />
        );
      })}
    </div>
  );
}
