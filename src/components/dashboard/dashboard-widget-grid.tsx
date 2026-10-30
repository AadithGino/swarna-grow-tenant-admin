"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Gift,
  HandCoins,
  Headphones,
  IndianRupee,
  Scale,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { StatCard } from "@/src/components/common/page-parts";
import { money } from "@/src/lib/format";
import { portalPathFromContract } from "@/src/lib/contract-paths";
import { cn } from "@/lib/utils";
import type { DashboardWidget } from "@/src/store/api/contract-adapters";

const iconFor: Record<string, typeof IndianRupee> = {
  PERIOD_COLLECTION: IndianRupee,
  COLLECTION: HandCoins,
  DUE_TODAY: CalendarDays,
  OVERDUE: AlertTriangle,
  MATURING_THIS_MONTH: Gift,
  ACTIVE_CUSTOMERS: UsersRound,
  ACTIVE_SCHEMES: ClipboardList,
  NEW_ENROLMENTS: UsersRound,
  GOLD_ACCRUED: Scale,
  CASH_IN_HAND: WalletCards,
  PENDING_APPROVALS: Gift,
  PENDING_CASH: WalletCards,
  OPEN_GRIEVANCES: Headphones,
  OPEN_REDEMPTIONS: Gift,
};

function toneFor(key: string, severity?: string) {
  if (severity === "WARNING" || key === "OVERDUE") return "red" as const;
  if (key === "PERIOD_COLLECTION") return "wine" as const;
  if (key === "COLLECTION") return "green" as const;
  if (key === "DUE_TODAY" || key === "CASH_IN_HAND") return "gold" as const;
  if (key === "ACTIVE_CUSTOMERS") return "blue" as const;
  return "cream" as const;
}

/** Compact, link-through card for a work queue. Quiet when the queue is empty. */
function AttentionCard({ widget }: { widget: DashboardWidget }) {
  const Icon = iconFor[widget.key] ?? IndianRupee;
  const empty = (widget.rawValue ?? Number(widget.displayValue)) === 0;
  const urgent = !empty && (widget.severity === "WARNING" || widget.key === "OVERDUE");
  const body = (
    <>
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg",
            empty
              ? "bg-emerald-50 text-emerald-700"
              : urgent
                ? "bg-red-50 text-red-700"
                : "bg-[#fbf1dc] text-[#8a5a00]",
          )}
        >
          {empty ? <CheckCircle2 className="size-4" aria-hidden /> : <Icon className="size-4" aria-hidden />}
        </span>
        <span
          className={cn(
            "text-2xl font-extrabold tabular-nums leading-none",
            empty ? "text-[#a3979a]" : urgent ? "text-red-700" : "text-[#2d191d]",
          )}
        >
          {widget.displayValue}
        </span>
        {widget.actionPath ? (
          <ArrowUpRight className="ml-auto size-4 shrink-0 text-[#b9a7aa] transition-colors group-hover:text-[#7b0a2b]" aria-hidden />
        ) : null}
      </div>
      <span className="mt-2 block text-sm font-semibold leading-snug text-[#2d191d]">{widget.label}</span>
      <span className="mt-0.5 block text-[0.8rem] leading-snug text-[#6b5d60]">
        {empty ? "All clear" : widget.secondaryLabel}
      </span>
    </>
  );
  const cls = cn(
    "group block rounded-2xl border bg-white p-4 transition-[border-color,box-shadow]",
    urgent ? "border-red-200 bg-red-50/30" : "border-[#e8dcd7]",
    widget.actionPath &&
      "hover:border-[#d6bfc2] hover:shadow-[0_10px_28px_-18px_rgb(94_10_32/45%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7b0a2b]/40",
  );
  return widget.actionPath ? (
    <Link href={portalPathFromContract(widget.actionPath)} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function DashboardWidgetGrid({ widgets }: { widgets: DashboardWidget[] }) {
  if (!widgets.length) return null;
  const kpis = widgets.filter((w) => w.group !== "attention");
  const attention = widgets.filter((w) => w.group === "attention");
  const openQueues = attention.filter((w) => (w.rawValue ?? Number(w.displayValue)) > 0).length;
  return (
    <div className="space-y-5">
      {kpis.length ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(14.5rem,1fr))] gap-4">
          {kpis.map((w) => (
            <StatCard
              key={w.key}
              icon={iconFor[w.key] ?? IndianRupee}
              label={w.label}
              value={w.displayValue}
              detail={w.secondaryLabel}
              tone={toneFor(w.key, w.severity)}
              href={w.actionPath ? portalPathFromContract(w.actionPath) : undefined}
            />
          ))}
        </div>
      ) : null}
      {attention.length ? (
        <section aria-labelledby="dash-attention-title">
          <div className="mb-2.5 flex items-baseline justify-between gap-3">
            <h2 id="dash-attention-title" className="text-base font-bold text-[#2d191d]">
              Needs attention
            </h2>
            <p className="text-sm text-[#6b5d60]">
              {openQueues ? `${openQueues} of ${attention.length} queues have items` : "Nothing waiting — all queues are clear"}
            </p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(12.5rem,1fr))] gap-3">
            {attention.map((w) => (
              <AttentionCard key={w.key} widget={w} />
            ))}
          </div>
        </section>
      ) : null}
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
