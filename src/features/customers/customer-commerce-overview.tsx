"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Coins, Plus, Scale, ShoppingBag, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Surface } from "@/src/components/common/page-parts";
import { StatusBadge } from "@/src/components/common/status-badge";
import { Notice } from "@/src/components/admin-ui/detail-parts";
import type { CustomerDigitalMetalsSummary, CustomerEcommerceSummary } from "@/src/lib/counter-trade-types";
import { MetalPill, dmInr, dmInrShort, dmWeight, timeAgo } from "@/src/features/digital-metals/digital-metals-admin-ui";

/* ───────────── Overview cards (top of the customer page) ───────────── */

function PortfolioShell({
  icon: Icon,
  title,
  accent,
  actions,
  children,
  footer,
}: {
  icon: LucideIcon;
  title: string;
  accent: "gold" | "wine";
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="relative flex min-w-0 flex-col overflow-hidden rounded-[1.15rem] border border-[#e8dcd7] bg-white shadow-[0_1px_2px_rgb(67_15_25/4%)]">
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 h-[3px]",
          accent === "gold" ? "bg-gradient-to-r from-[#c99a3c] via-[#e7cd8e] to-transparent" : "bg-gradient-to-r from-[#7b0a2b] via-[#b0485f] to-transparent",
        )}
      />
      <div className="flex flex-wrap items-center gap-3 px-5 pb-1 pt-4">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl",
            accent === "gold" ? "bg-[#fbf1dc] text-[#9a6200]" : "bg-[#f7ecee] text-[#7b0a2b]",
          )}
        >
          <Icon className="size-[1.05rem]" aria-hidden />
        </span>
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-[#6f6265]">{title}</h2>
        {actions ? <div className="flex flex-wrap items-center gap-1.5">{actions}</div> : null}
      </div>
      <div className="flex-1 px-5 pb-4">{children}</div>
      {footer ? <div className="border-t border-[#f3eae7] bg-[#fdfafb] px-5 py-2.5 text-xs text-[#857a7d]">{footer}</div> : null}
    </section>
  );
}

function MiniFact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs text-[#8a7c80]">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-bold tabular-nums text-[#28161a]">{value}</dd>
    </div>
  );
}

export function DigiGoldPortfolioCard({
  summary,
  loading,
  canTrade,
  onBuy,
  onSell,
}: {
  summary?: CustomerDigitalMetalsSummary;
  loading?: boolean;
  canTrade: boolean;
  onBuy: () => void;
  onSell: () => void;
}) {
  const goldUg = Number(summary?.totals.goldUg ?? 0);
  const silverUg = Number(summary?.totals.silverUg ?? 0);
  const hasHoldings = goldUg > 0 || silverUg > 0;
  const tradable = canTrade && summary?.moduleActive !== false;
  return (
    <PortfolioShell
      icon={Coins}
      title="Digi Gold"
      accent="gold"
      actions={
        tradable ? (
          <>
            <Button size="sm" variant="outline" className="h-8" onClick={onBuy}>
              <Plus />
              Buy
            </Button>
            <Button size="sm" variant="outline" className="h-8" onClick={onSell} disabled={!hasHoldings}>
              <Scale />
              Sell
            </Button>
          </>
        ) : null
      }
      footer={
        summary?.lastActivityAt
          ? `Last trade ${timeAgo(summary.lastActivityAt)}${summary.bought.counterCount ? ` · ${summary.bought.counterCount} bought at the counter` : ""}`
          : "No Digi Gold trades yet"
      }
    >
      {loading ? (
        <span className="mt-2 block h-9 w-32 animate-pulse rounded-lg bg-[#f2e9e6]" />
      ) : (
        <>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[1.65rem] font-extrabold tabular-nums tracking-tight text-[#28161a]">
              {hasHoldings ? dmWeight(goldUg) : "0 g"}
            </span>
            <span className="text-sm text-[#857a7d]">
              gold{silverUg > 0 ? ` · ${dmWeight(silverUg)} silver` : ""}
            </span>
          </div>
          <p className="text-[0.84rem] text-[#857a7d]">
            Worth {dmInrShort(summary?.totals.valuePaise ?? 0)} at today&apos;s sell rate
          </p>
          <dl className="mt-3 grid grid-cols-3 gap-3">
            <MiniFact label="Invested" value={dmInrShort(summary?.bought.paidPaise ?? 0)} />
            <MiniFact label="Sold for" value={dmInrShort(summary?.sold.settlementPaise ?? 0)} />
            <MiniFact
              label={summary?.openPayables.count ? "Owed to customer" : "Sells waiting"}
              value={summary?.openPayables.count ? dmInrShort(summary.openPayables.outstandingPaise) : String(summary?.pendingSells ?? 0)}
            />
          </dl>
        </>
      )}
    </PortfolioShell>
  );
}

export function StorePortfolioCard({
  summary,
  loading,
  canOrder,
  onNewOrder,
}: {
  summary?: CustomerEcommerceSummary;
  loading?: boolean;
  canOrder: boolean;
  onNewOrder: () => void;
}) {
  return (
    <PortfolioShell
      icon={ShoppingBag}
      title="Store orders"
      accent="wine"
      actions={
        canOrder ? (
          <Button size="sm" variant="outline" className="h-8" onClick={onNewOrder}>
            <Plus />
            New order
          </Button>
        ) : null
      }
      footer={
        summary?.lastOrder ? (
          <span className="flex items-center gap-2">
            Last order{" "}
            <Link href={`/ecommerce/orders/${encodeURIComponent(summary.lastOrder.id)}`} className="font-semibold text-[#7b0a2b] hover:underline">
              {summary.lastOrder.orderNumber}
            </Link>
            {summary.lastOrder.createdAt ? `· ${timeAgo(summary.lastOrder.createdAt)}` : null}
          </span>
        ) : (
          "No store orders yet"
        )
      }
    >
      {loading ? (
        <span className="mt-2 block h-9 w-32 animate-pulse rounded-lg bg-[#f2e9e6]" />
      ) : (
        <>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[1.65rem] font-extrabold tabular-nums tracking-tight text-[#28161a]">
              {dmInrShort(summary?.netCollectedPaise ?? 0)}
            </span>
            <span className="text-sm text-[#857a7d]">spent in the store</span>
          </div>
          <p className="text-[0.84rem] text-[#857a7d]">
            {summary?.orderCount ?? 0} order{summary?.orderCount === 1 ? "" : "s"} · {summary?.itemsBought ?? 0} piece
            {summary?.itemsBought === 1 ? "" : "s"} bought
          </p>
          <dl className="mt-3 grid grid-cols-3 gap-3">
            <MiniFact label="Open orders" value={String(summary?.openOrders ?? 0)} />
            <MiniFact label="At the counter" value={String(summary?.counterOrders.count ?? 0)} />
            <MiniFact label="Refunded" value={dmInrShort(summary?.refundOutflowPaise ?? 0)} />
          </dl>
        </>
      )}
    </PortfolioShell>
  );
}

/* ───────────── Summary tab panels ───────────── */

export function DigiGoldSummaryPanel({
  summary,
  onOpenTab,
}: {
  summary: CustomerDigitalMetalsSummary;
  onOpenTab?: () => void;
}) {
  const rateFor = (metal: string) => summary.rates.find((r) => r.metal === metal);
  return (
    <Surface
      icon={Coins}
      title="Digi Gold holdings"
      description="Grams in the customer's vault, valued at today's sell rate"
      action={
        onOpenTab ? (
          <Button size="sm" variant="ghost" onClick={onOpenTab}>
            Details
            <ArrowUpRight />
          </Button>
        ) : null
      }
    >
      {summary.holdings.length === 0 ? (
        <p className="px-5 py-6 text-sm text-[#857a7d]">No grams held right now.</p>
      ) : (
        <ul className="divide-y divide-[#f3eae7]">
          {summary.holdings.map((h) => {
            const reserved = Number(h.reservedUg);
            return (
              <li key={`${h.metal}-${h.finenessPpm}`} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3.5">
                <div className="flex min-w-[9rem] items-center gap-2">
                  <MetalPill metal={h.metal} />
                  <span className="text-xs text-[#8a7c80]">99.9</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[1.05rem] font-bold tabular-nums text-[#28161a]">{dmWeight(h.heldUg)}</p>
                  <p className="text-xs text-[#8a7c80]">
                    {reserved > 0 ? `${dmWeight(h.availableUg)} free · ${dmWeight(reserved)} in pending sells` : "All available to sell or redeem"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[1.05rem] font-bold tabular-nums text-[#28161a]">{dmInr(h.valuePaise)}</p>
                  <p className="text-xs text-[#8a7c80]">at {dmInr(rateFor(h.metal)?.sellRatePerGramPaise ?? h.sellRatePerGramPaise)}/g</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <dl className="grid grid-cols-2 gap-px border-t border-[#f1e8e5] bg-[#f1e8e5] sm:grid-cols-4">
        {[
          ["Bought", `${summary.bought.count} · ${dmInrShort(summary.bought.paidPaise)}`],
          ["Sold", `${summary.sold.count} · ${dmInrShort(summary.sold.settlementPaise)}`],
          ["Sells to approve", String(summary.pendingSells)],
          [
            "Payout due",
            summary.openPayables.count
              ? `${dmInrShort(summary.openPayables.outstandingPaise)}${summary.openPayables.cashDueCount ? " · cash" : ""}`
              : "None",
          ],
        ].map(([label, value]) => (
          <div key={label} className="bg-white px-5 py-3">
            <dt className="text-xs text-[#8a7c80]">{label}</dt>
            <dd className="mt-0.5 font-bold tabular-nums text-[#28161a]">{value}</dd>
          </div>
        ))}
      </dl>
      {summary.openPayables.cashDueCount ? (
        <div className="border-t border-[#f1e8e5] p-4">
          <Notice tone="wine" title="Cash to hand over">
            {summary.openPayables.cashDueCount === 1 ? "An approved counter sell is" : `${summary.openPayables.cashDueCount} approved counter sells are`} waiting for cash. Pay it from the Digital metals tab.
          </Notice>
        </div>
      ) : null}
    </Surface>
  );
}

export function StoreSummaryPanel({ summary, onOpenTab }: { summary: CustomerEcommerceSummary; onOpenTab?: () => void }) {
  return (
    <Surface
      icon={ShoppingBag}
      title="Store activity"
      description="Online and counter orders for this customer"
      action={
        onOpenTab ? (
          <Button size="sm" variant="ghost" onClick={onOpenTab}>
            All orders
            <ArrowUpRight />
          </Button>
        ) : null
      }
    >
      <dl className="grid grid-cols-2 gap-px bg-[#f1e8e5]">
        {[
          ["Orders", String(summary.orderCount)],
          ["Spent", dmInrShort(summary.netCollectedPaise)],
          ["Open orders", String(summary.openOrders)],
          ["Pieces bought", String(summary.itemsBought)],
        ].map(([label, value]) => (
          <div key={label} className="bg-white px-5 py-3">
            <dt className="text-xs text-[#8a7c80]">{label}</dt>
            <dd className="mt-0.5 text-[1.05rem] font-bold tabular-nums text-[#28161a]">{value}</dd>
          </div>
        ))}
      </dl>
      {summary.lastOrder ? (
        <Link
          href={`/ecommerce/orders/${encodeURIComponent(summary.lastOrder.id)}`}
          className="flex items-center justify-between gap-3 border-t border-[#f1e8e5] px-5 py-3.5 hover:bg-[#fdfafb]"
        >
          <span className="min-w-0">
            <span className="block text-xs text-[#8a7c80]">Latest order</span>
            <span className="block truncate font-semibold text-[#28161a]">
              {summary.lastOrder.orderNumber} · {dmInr(summary.lastOrder.totalPaise)}
            </span>
          </span>
          <StatusBadge status={summary.lastOrder.status} />
        </Link>
      ) : (
        <p className="border-t border-[#f1e8e5] px-5 py-4 text-sm text-[#857a7d]">No orders yet.</p>
      )}
    </Surface>
  );
}
