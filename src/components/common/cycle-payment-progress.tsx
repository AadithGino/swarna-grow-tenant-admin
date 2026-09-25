"use client";

import { cn } from "@/lib/utils";

function progressWidth(percent: number) {
  return `${Math.min(100, Math.max(0, percent))}%`;
}

export function formatCycleMonthLabel(targetCycle?: string | null) {
  if (!targetCycle?.match(/^\d{4}-\d{2}/)) return "This cycle";
  return new Date(`${targetCycle}-01`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function CyclePaymentProgress({
  capPaise,
  paidPaise,
  remainingPaise,
  targetCycle,
  formatMoney,
  className,
  compact,
  audience = "staff",
}: {
  capPaise: number;
  paidPaise: number;
  remainingPaise: number;
  targetCycle?: string | null;
  formatMoney: (paise: number) => string;
  className?: string;
  compact?: boolean;
  audience?: "customer" | "staff";
}) {
  const usedPercent = capPaise > 0 ? Math.round((paidPaise / capPaise) * 100) : 0;
  const labels =
    audience === "customer"
      ? {
          cap: "Monthly limit",
          paid: "Paid this month",
          remaining: "Can still add",
          header: "This month · optional limit",
          sub: "Not your whole-scheme balance.",
        }
      : {
          cap: "Cap",
          paid: "Paid",
          remaining: "Remaining",
          header: `${formatCycleMonthLabel(targetCycle)} cycle`,
          sub: "Resets each calendar month",
        };
  return (
    <div className={cn("space-y-3", className)}>
      {!compact ? (
        <div className="flex items-center justify-between gap-2 text-xs">
          <p className="font-black capitalize text-[#20171a]">{labels.header}</p>
          <p className="text-[#82777a]">{labels.sub}</p>
        </div>
      ) : null}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#978d8f]">{labels.cap}</p>
          <p className="mt-1 text-sm font-black">{formatMoney(capPaise)}</p>
        </div>
        <div className={compact ? undefined : "border-x border-[#ebe4dc]"}>
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#978d8f]">{labels.paid}</p>
          <p className="mt-1 text-sm font-black">{formatMoney(paidPaise)}</p>
        </div>
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#978d8f]">{labels.remaining}</p>
          <p className="mt-1 text-sm font-black text-[#730321]">{formatMoney(remainingPaise)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[#ece8e4]">
          <div className="h-full rounded-full bg-[#730321]" style={{ width: progressWidth(usedPercent) }} />
        </div>
        <span className="text-xs font-bold text-[#706b77]">{usedPercent}%</span>
      </div>
    </div>
  );
}
