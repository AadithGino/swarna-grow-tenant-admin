"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Clock3, Gem, IndianRupee, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { CustomerDisplayMode, CustomerSchemeDetail, SchemeCard } from "@/src/types/customer";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";

export function CustomerPageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-5 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-end sm:justify-between"><div>{eyebrow && <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[.18em] text-[#9b7224]">{eyebrow}</p>}<h1 className="text-[1.65rem] font-black tracking-tight sm:text-3xl">{title}</h1>{description && <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}</div>{action}</div>;
}

function normalizeDisplayMode(mode: CustomerDisplayMode): CustomerDisplayMode {
  return mode === "FLEXIBLE_CAPPED_WINDOW" ? "FLEXIBLE_LOCK_WINDOW" : mode;
}

export function SchemeModePill({ mode }: { mode: SchemeCard["displayMode"] }) {
  const normalized = normalizeDisplayMode(mode);
  const map: Record<CustomerDisplayMode, string> = {
    FIXED: "Fixed",
    FLEXIBLE_FREE_WINDOW: "Flexible · Free window",
    FLEXIBLE_LOCK_WINDOW: "Flexible · Capped",
    FLEXIBLE_CAPPED_WINDOW: "Flexible · Capped",
  };
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider", normalized === "FIXED" ? "bg-[#f2e8eb] text-[#730321]" : "bg-[#fff2ce] text-[#805d18]")}>{map[normalized] ?? mode}</span>;
}

function formatCustomerDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso.includes("T") ? iso : `${iso}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function SchemeProgressRing({
  percent,
  size = 80,
  className,
}: {
  percent: number;
  size?: number;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const center = size / 2;

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#eee5e2"
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#730321"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-sm font-extrabold text-[#730321]">
        {clamped}%
      </span>
    </div>
  );
}

export function CustomerSchemeCard({ scheme, featured = false }: { scheme: SchemeCard; featured?: boolean }) {
  const { tenantSlug } = useCustomerTenant();
  const totalPaid = scheme.totalPaid ?? { amountPaise: 0, amountDisplay: "₹0" };
  const progressPercent = scheme.progressPercent ?? 0;
  const href = customerPath(tenantSlug, "schemes", scheme.id);
  return (
    <article className={cn("group relative overflow-hidden rounded-[1.4rem] border bg-white p-5 shadow-[0_10px_30px_rgba(77,24,36,.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(77,24,36,.1)]", featured && "border-[#dac17e] bg-gradient-to-br from-white via-white to-[#fff8e6]")}>
      {featured && <div className="absolute right-0 top-0 rounded-bl-2xl bg-[#d5a52e] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">Next action</div>}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-muted-foreground">{scheme.schemeNumber}</p>
        </div>
        <SchemeModePill mode={scheme.displayMode} />
      </div>
      <h3 className="mt-3 text-lg font-extrabold">{scheme.planName}</h3>
      {scheme.subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{scheme.subtitle}</p> : null}
      <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
        <CalendarDays className="size-3.5 shrink-0 text-[#9a6f2a]" />
        <span>
          Matures <b className="font-bold text-foreground">{formatCustomerDate(scheme.maturityDate)}</b>
        </span>
      </div>
      <div className="mt-5 flex items-center gap-4 rounded-2xl border border-[#f0e8e4] bg-[#fbf7f4] p-4">
        <SchemeProgressRing percent={progressPercent} size={84} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-muted-foreground">Saved so far</p>
          <p className="mt-0.5 text-2xl font-black tracking-tight">{totalPaid.amountDisplay}</p>
          <p className="mt-2 text-[11px] font-semibold leading-snug text-foreground">{scheme.progressLabel ?? ""}</p>
          {scheme.progressDetail ? (
            <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{scheme.progressDetail}</p>
          ) : null}
          <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {scheme.statusLabel ?? scheme.status}
          </p>
        </div>
      </div>
      {scheme.canPay && (scheme.nextActionLabel || scheme.nextActionAmount) ? (
        <div className="mt-4 rounded-xl bg-[#fff8e7] px-3.5 py-2.5 text-[11px] font-semibold text-[#6d551e]">
          {scheme.nextActionAmount?.amountDisplay
            ? `${scheme.nextActionLabel} · ${scheme.nextActionAmount.amountDisplay}`
            : scheme.nextActionLabel}
        </div>
      ) : null}
      <Button asChild className="mt-4 h-11 w-full rounded-xl bg-[#730321] font-bold hover:bg-[#5b021a]"><Link href={href}>{scheme.canPay ? "View & pay" : "View details"}<ArrowRight className="ml-auto size-4" /></Link></Button>
    </article>
  );
}

export function SchemeProgressVisual({ scheme }: { scheme: CustomerSchemeDetail }) {
  if (scheme.displayMode === "FIXED") {
    const paid = scheme.progressCard.installmentsPaid ?? 0;
    const total = scheme.progressCard.installmentsTotal ?? 0;
    return <div><div className="grid grid-cols-6 gap-2 sm:grid-cols-12">{Array.from({ length: total }).map((_, i) => <div key={i} className={cn("grid aspect-square place-items-center rounded-xl border text-xs font-bold", i < paid ? "border-[#730321] bg-[#730321] text-white" : "bg-white text-muted-foreground")} >{i < paid ? <Check className="size-4" /> : i + 1}</div>)}</div><p className="mt-3 text-sm text-muted-foreground">{paid} instalments completed · {total - paid} remaining</p></div>;
  }
  const mode = scheme.displayMode === "FLEXIBLE_CAPPED_WINDOW" ? "FLEXIBLE_LOCK_WINDOW" : scheme.displayMode;
  if (mode === "FLEXIBLE_FREE_WINDOW") {
    const month = scheme.progressCard.freeWindowMonth ?? 1;
    const total = scheme.progressCard.freeWindowMonths ?? 6;
    const completed =
      scheme.progressCard.freeWindowMonthsCompleted ?? Math.max(0, month - 1);
    const phaseCopy =
      completed === 0
        ? `You're in month ${month} of ${total} in your free window.`
        : `${completed} of ${total} free-window month${completed === 1 ? "" : "s"} completed · now in month ${month}.`;
    return (
      <div>
        <div className="flex gap-2">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-3 flex-1 rounded-full",
                i < completed ? "bg-[#d5a52e]" : i === completed && completed < total ? "bg-[#d5a52e]/35 ring-1 ring-[#d5a52e]/50" : "bg-[#eee6da]",
              )}
            />
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#fff8e7] p-4 text-sm">
          <Sparkles className="size-5 shrink-0 text-[#a67614]" />
          <p>
            <b>{phaseCopy}</b>
            <br />
            <span className="text-muted-foreground">
              Contributions in this period set your monthly cap when the capped phase starts.
            </span>
          </p>
        </div>
      </div>
    );
  }
  const cap = scheme.progressCard.cycleCap?.amountPaise ?? 0;
  const remaining = scheme.progressCard.remainingThisCycle?.amountPaise ?? 0;
  const used = cap ? Math.round(((cap - remaining) / cap) * 100) : 0;
  return <div><div className="flex items-center justify-between"><span className="text-sm font-semibold">This cycle</span><span className="text-sm font-black">{scheme.progressCard.remainingThisCycle?.amountDisplay} available</span></div><Progress value={used} className="mt-3 h-3 [&>div]:bg-[#d5a52e]"/><div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>{used}% used</span><span>Limit {scheme.progressCard.cycleCap?.amountDisplay}</span></div><p className="mt-4 rounded-xl bg-[#f9f1df] p-3 text-xs leading-5 text-[#6d551e]">Unused room resets at cycle end. Your paid balance remains permanently in the ledger.</p></div>;
}

export const quickActionIcons = { PAY: IndianRupee, ENROL: Sparkles, PASSBOOK: WalletCards };
export const summaryIcons = [WalletCards, Gem, ShieldCheck, CalendarDays, Clock3];
