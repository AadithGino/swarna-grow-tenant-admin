"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarClock, IndianRupee, LockKeyhole, Scale, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/src/components/common/status-badge";
import { money } from "@/src/lib/format";
import type { SchemePlan } from "@/src/types/domain";

/**
 * The plan's instalment calendar drawn as a row of beads — one per month. The last bead (maturity)
 * is set in gold. Long plans compress to at most 24 beads so the card keeps its width.
 */
function InstalmentTrack({ months, gold }: { months: number; gold: boolean }) {
  const total = Math.max(1, Math.min(months || 1, 60));
  const shown = Math.min(total, 24);
  return (
    <div className="flex items-center gap-[3px]" aria-hidden>
      {Array.from({ length: shown }, (_, i) => {
        const last = i === shown - 1;
        return (
          <span
            key={i}
            className={cn(
              "h-2 flex-1 rounded-full",
              last
                ? "bg-gradient-to-r from-[#e7cd8e] to-[#b8862f] shadow-[0_0_0_2px_rgba(231,205,142,0.35)]"
                : gold
                  ? "bg-[#ead9b4]"
                  : "bg-[#ecd6dc]",
            )}
          />
        );
      })}
    </div>
  );
}

export function PlanCard({
  plan,
  share,
  actions,
}: {
  plan: SchemePlan & { displayName?: string };
  /** This plan's active enrollments relative to the biggest plan on the page (0–1). */
  share: number;
  actions?: ReactNode;
}) {
  const gold = plan.valueBasis === "GOLD_WEIGHT";
  const flexible = plan.paymentPattern === "FLEXIBLE_AVERAGE";
  const enrollments = Number(plan.activeEnrollments ?? 0);
  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[1.15rem] border bg-white transition-shadow hover:shadow-[0_16px_32px_-22px_rgb(67_15_25/45%)]",
        plan.status === "ACTIVE" ? "border-[#ebe1dc]" : "border-dashed border-[#e2d4d0]",
      )}
    >
      <Link href={`/schemes/${plan.id}`} className="flex flex-1 flex-col gap-4 p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7b0a2b]/30">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl",
              gold ? "bg-gradient-to-br from-[#fbf1dc] to-[#f1dfb4] text-[#8a5a10]" : "bg-[#f7ecee] text-[#7b0a2b]",
            )}
          >
            {gold ? <Scale className="size-[1.1rem]" aria-hidden /> : <IndianRupee className="size-[1.1rem]" aria-hidden />}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[1.02rem] font-bold leading-snug text-[#28161a] group-hover:text-[#5e0a20]">{plan.name}</h3>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-[#857a7d]">
              <span className="font-mono tracking-wide">{plan.code}</span>
              {plan.editLocked ? (
                <span className="inline-flex items-center gap-0.5 font-medium text-amber-800">
                  <LockKeyhole className="size-3" aria-hidden /> Rules locked
                </span>
              ) : null}
            </p>
          </div>
          <StatusBadge status={plan.status} />
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[0.72rem] text-[#9a8d90]">{flexible ? "Pay any amount from" : "Monthly instalment"}</p>
            <p className="text-[1.5rem] font-extrabold tabular-nums tracking-tight text-[#28161a]">
              {money(plan.amount)}
              <span className="ml-1 text-sm font-medium text-[#9a8d90]">/ mo</span>
            </p>
          </div>
          <div className="text-right text-xs text-[#6f6265]">
            <p className="flex items-center justify-end gap-1">
              <CalendarClock className="size-3.5 text-[#b08a3e]" aria-hidden />
              {plan.tenure} months
            </p>
            <p className="mt-0.5 flex items-center justify-end gap-1">
              <Shuffle className="size-3.5 text-[#b08a3e]" aria-hidden />
              {flexible ? "Flexible" : "Fixed date"} · {gold ? "Gold weight" : "Cash value"}
            </p>
          </div>
        </div>

        <div>
          <InstalmentTrack months={plan.tenure} gold={gold} />
          <p className="mt-1.5 text-[0.7rem] text-[#a2969a]">
            {plan.tenure} instalments, then maturity
          </p>
        </div>

        <div className="mt-auto">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-medium text-[#6f6265]">Active enrollments</span>
            <span className="font-bold tabular-nums text-[#28161a]">{enrollments.toLocaleString("en-IN")}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#f4ece9]">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-[#7b0a2b] to-[#b0485f]"
              style={{ width: `${Math.max(enrollments > 0 ? 4 : 0, Math.round(share * 100))}%` }}
            />
          </div>
        </div>
      </Link>
      {actions ? (
        <div className="flex items-center justify-end gap-1 border-t border-[#f3eae7] bg-[#fdfafb] px-3 py-2">{actions}</div>
      ) : null}
    </article>
  );
}
