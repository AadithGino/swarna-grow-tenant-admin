"use client";

import Link from "next/link";
import {
  CalendarDays,
  Gift,
  HandCoins,
  IndianRupee,
  Scale,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { StatCard } from "@/src/components/common/page-parts";
import { money } from "@/src/lib/format";
import { portalPathFromContract } from "@/src/lib/contract-paths";
import type { DashboardWidget } from "@/src/store/api/contract-adapters";

const iconFor: Record<string, typeof IndianRupee> = {
  COLLECTION: HandCoins,
  DUE_TODAY: CalendarDays,
  OVERDUE: IndianRupee,
  MATURING_THIS_MONTH: Gift,
  ACTIVE_CUSTOMERS: UsersRound,
  ACTIVE_SCHEMES: Gift,
  NEW_ENROLMENTS: UsersRound,
  GOLD_ACCRUED: Scale,
  CASH_IN_HAND: WalletCards,
  PENDING_APPROVALS: Gift,
  PENDING_CASH: WalletCards,
  OPEN_GRIEVANCES: UsersRound,
  OPEN_REDEMPTIONS: Gift,
};

function toneFor(key: string, severity?: string) {
  if (severity === "WARNING" || key === "OVERDUE") return "red" as const;
  if (key === "DUE_TODAY" || key === "CASH_IN_HAND" || key === "OPEN_REDEMPTIONS")
    return "gold" as const;
  if (key === "MATURING_THIS_MONTH") return "wine" as const;
  if (key === "ACTIVE_CUSTOMERS") return "cream" as const;
  return undefined;
}

export function DashboardWidgetGrid({ widgets }: { widgets: DashboardWidget[] }) {
  if (!widgets.length) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {widgets.map((w) => {
        const Icon = iconFor[w.key] ?? IndianRupee;
        const card = (
          <StatCard
            icon={Icon}
            label={w.label}
            value={w.displayValue}
            detail={w.secondaryLabel}
            tone={toneFor(w.key, w.severity)}
          />
        );
        if (!w.actionPath) return <div key={w.key}>{card}</div>;
        return (
          <Link
            key={w.key}
            href={portalPathFromContract(w.actionPath)}
            className="block transition-opacity hover:opacity-95"
          >
            {card}
          </Link>
        );
      })}
    </div>
  );
}

export function formatWidgetDisplay(
  value: unknown,
  valueType?: string,
): string {
  if (valueType === "currency") {
    if (typeof value === "number") return money(value);
    if (value && typeof value === "object") {
      const v = value as { amountDisplay?: string; amountPaise?: number };
      return v.amountDisplay ?? money((v.amountPaise ?? 0) / 100);
    }
  }
  if (valueType === "weight") {
    if (value && typeof value === "object") {
      const v = value as { weightDisplay?: string };
      return v.weightDisplay ?? "—";
    }
  }
  if (valueType === "percent") return `${value}%`;
  if (typeof value === "number") return String(value);
  return String(value ?? "—");
}
