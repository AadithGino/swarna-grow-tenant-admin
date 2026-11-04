"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Banknote, Coins, Scale, Store, TrendingUp, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { QueryError } from "@/src/components/common/query-state";
import { Surface } from "@/src/components/common/page-parts";
import { TrendChart } from "@/src/components/admin-ui/trend-chart";
import type { DigitalMetalsDashboardSummary } from "@/src/lib/counter-trade-types";
import { MetalPill, dmInr, dmInrShort, dmWeight } from "@/src/features/digital-metals/digital-metals-admin-ui";

function Figure({
  icon: Icon,
  label,
  value,
  detail,
  href,
}: {
  icon: typeof Coins;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  href?: string;
}) {
  const body = (
    <>
      <p className="flex items-center gap-1.5 text-xs font-medium text-[#8a7c80]">
        <Icon className="size-3.5 text-[#b08a3e]" aria-hidden />
        {label}
      </p>
      <p className="mt-1 truncate text-[1.35rem] font-extrabold tabular-nums tracking-tight text-[#28161a]">{value}</p>
      {detail ? <p className="mt-0.5 truncate text-xs text-[#8a7c80]">{detail}</p> : null}
    </>
  );
  const cls = "block min-w-0 bg-white px-5 py-4";
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:bg-[#fdfafb]")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** "Gold 2.5 g · Silver 100 g" — falls back to the combined weight for older APIs. */
function weightByMetal(
  byMetal: Record<string, { quantityUg: string; count: number }> | undefined,
  combinedUg: string | number,
) {
  const parts = Object.entries(byMetal ?? {})
    .filter(([, v]) => Number(v.quantityUg) > 0)
    .map(([metal, v]) => `${metal === "SILVER" ? "Silver" : "Gold"} ${dmWeight(v.quantityUg)}`);
  return parts.length ? parts.join(" · ") : dmWeight(combinedUg);
}

function QueueLink({ href, label, value, urgent }: { href: string; label: string; value: ReactNode; urgent?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors",
        urgent ? "border-[#ecd3d9] bg-[#fbf3f5] hover:border-[#c9a3ad]" : "border-[#efe5e1] bg-white hover:border-[#dcc3c3]",
      )}
    >
      <span className="text-[#5d4f53]">{label}</span>
      <span className={cn("font-bold tabular-nums", urgent ? "text-[#7b0a2b]" : "text-[#28161a]")}>{value}</span>
    </Link>
  );
}

const dayLabel = (ymd: string) =>
  new Date(`${ymd}T12:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

/** Dashboard block for Digital Gold & Silver: vault value, period flows, 14-day trend and what needs action. */
export function DigitalMetalsDashboardSection({
  summary,
  loading,
  error,
  onRetry,
  periodLabel,
}: {
  summary?: DigitalMetalsDashboardSummary;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  periodLabel: string;
}) {
  const action = (
    <Button variant="outline" size="sm" asChild>
      <Link href="/digital-metals">
        Open Digi Gold
        <ArrowRight className="size-4" />
      </Link>
    </Button>
  );
  const shell = (children: ReactNode) => (
    <Surface
      icon={Coins}
      title="Digi Gold & Silver"
      description={`Customer vault and trading · ${periodLabel}`}
      action={action}
      data-testid="dashboard-digital-metals-section"
    >
      {children}
    </Surface>
  );

  if (error) return shell(<QueryError error={error} onRetry={onRetry ?? (() => undefined)} />);
  if (loading && !summary) {
    return shell(
      <div className="grid animate-pulse gap-4 p-5 lg:grid-cols-[1fr_2fr]">
        <div className="h-40 rounded-2xl bg-[#f5ebe6]" />
        <div className="h-40 rounded-2xl bg-[#f5ebe6]" />
      </div>,
    );
  }
  if (!summary) return null;

  const gold = summary.holdings.find((h) => h.metal === "GOLD");
  const silver = summary.holdings.find((h) => h.metal === "SILVER");
  const goldRate = summary.rates.find((r) => r.metal === "GOLD");
  const silverRate = summary.rates.find((r) => r.metal === "SILVER");
  const buyPoints = summary.trend.map((t) => ({ label: dayLabel(t.date), value: t.buyPaise }));
  const sellPoints = summary.trend.map((t) => ({ label: dayLabel(t.date), value: t.sellPaise }));
  const trendBuy = summary.trend.reduce((s, t) => s + t.buyPaise, 0);
  const trendSell = summary.trend.reduce((s, t) => s + t.sellPaise, 0);
  const q = summary.queues;

  return shell(
    <>
      <div className="grid gap-px bg-[#f1e8e5] lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="relative isolate overflow-hidden bg-[#fbf6ec] px-5 py-5">
          <div
            aria-hidden
            className="absolute -right-16 -top-20 -z-10 size-56 rounded-full bg-[radial-gradient(circle,rgba(214,180,110,0.35),rgba(214,180,110,0)_65%)]"
          />
          <p className="text-sm font-semibold text-[#7a5a1e]">Held for customers</p>
          <p className="mt-1 text-[2rem] font-extrabold tabular-nums leading-tight tracking-tight text-[#28161a]">
            {dmInrShort(summary.totals.valuePaise)}
          </p>
          <p className="text-xs text-[#8a7c80]">at today&apos;s sell rate · {summary.totals.customersHolding} customers</p>
          <ul className="mt-4 space-y-2.5">
            {[gold, silver].filter(Boolean).map((h) => (
              <li key={h!.metal} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <MetalPill metal={h!.metal} />
                  <span className="text-sm font-bold tabular-nums text-[#28161a]">{dmWeight(h!.heldUg)}</span>
                </span>
                <span className="text-sm tabular-nums text-[#5d4f53]">{dmInrShort(h!.valuePaise)}</span>
              </li>
            ))}
            {!gold && !silver ? <li className="text-sm text-[#8a7c80]">No grams held yet.</li> : null}
          </ul>
          {summary.paused ? (
            <p className="mt-4 rounded-lg bg-amber-100/70 px-3 py-2 text-xs font-semibold text-amber-900">Trading is paused</p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-px bg-[#f1e8e5] xl:grid-cols-4">
          <Figure
            icon={Coins}
            label="Bought (incl. GST)"
            value={dmInrShort(summary.buys.amountPaise)}
            detail={`${summary.buys.count} buys · ${weightByMetal(summary.buys.byMetal, summary.buys.quantityUg)}`}
            href="/digital-metals/purchases"
          />
          <Figure
            icon={Scale}
            label="Sold back"
            value={dmInrShort(summary.sells.amountPaise)}
            detail={`${summary.sells.count} sells · ${weightByMetal(summary.sells.byMetal, summary.sells.quantityUg)}`}
            href="/digital-metals/sells"
          />
          <Figure
            icon={TrendingUp}
            label="Net inflow"
            value={dmInrShort(summary.netInflowPaise)}
            detail="Money in from buys minus payouts for sells"
          />
          <Figure
            icon={UserPlus}
            label="New investors"
            value={String(summary.newInvestors)}
            detail={`${summary.buys.customers} customers bought`}
          />
          <Figure
            icon={Store}
            label="Bought at the counter"
            value={dmInrShort(summary.buys.counterAmountPaise)}
            detail={`${summary.buys.counterCount} counter buys`}
          />
          <Figure
            icon={Banknote}
            label="Owed to customers"
            value={dmInrShort(q.outstandingPaise)}
            detail={`${q.openPayables} open payouts`}
            href="/digital-metals/payouts"
          />
          <Figure
            icon={Coins}
            label="Gold buy rate"
            value={goldRate?.buyRatePerGramPaise ? `${dmInr(goldRate.buyRatePerGramPaise)}` : "Not set"}
            detail={goldRate?.sellRatePerGramPaise ? `Sell back at ${dmInr(goldRate.sellRatePerGramPaise)}` : "Publish today's rate"}
            href="/digital-metals/settings"
          />
          <Figure
            icon={Coins}
            label="Silver buy rate"
            value={silverRate?.buyRatePerGramPaise ? `${dmInr(silverRate.buyRatePerGramPaise)}` : "Not set"}
            detail={silverRate?.sellRatePerGramPaise ? `Sell back at ${dmInr(silverRate.sellRatePerGramPaise)}` : "Publish today's rate"}
            href="/digital-metals/settings"
          />
        </div>
      </div>

      <div className="grid gap-6 border-t border-[#f1e8e5] p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_17rem]">
        <div className="min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-[#2d191d]">Bought per day</p>
            <p className="text-xs text-[#8a7c80]">Last 14 days · {dmInrShort(trendBuy)}</p>
          </div>
          <TrendChart ariaLabel="Digi Gold bought per day" bars points={buyPoints} format={(v) => dmInrShort(v)} height={150} tone="gold" />
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-[#2d191d]">Sold back per day</p>
            <p className="text-xs text-[#8a7c80]">Last 14 days · {dmInrShort(trendSell)}</p>
          </div>
          <TrendChart ariaLabel="Digi Gold sold back per day" bars points={sellPoints} format={(v) => dmInrShort(v)} height={150} tone="wine" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-bold text-[#2d191d]">Needs you</p>
          <QueueLink href="/digital-metals/sells" label="Sell payments pending" value={q.openPayables} urgent={q.openPayables > 0} />
          <QueueLink href="/digital-metals/payouts" label="Bank payouts to make" value={Math.max(0, q.openPayables - q.cashPayoutsDue)} urgent={q.openPayables - q.cashPayoutsDue > 0} />
          <QueueLink href="/digital-metals/sells" label="Cash to hand over" value={q.cashPayoutsDue} urgent={q.cashPayoutsDue > 0} />
        </div>
      </div>
    </>,
  );
}
