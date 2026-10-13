"use client";

import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { ChartSeriesView } from "@/src/components/common/chart-series-view";
import { QueryError } from "@/src/components/common/query-state";
import { Surface } from "@/src/components/common/page-parts";
import {
  ecommerceInsightsQueryFromDashboard,
  ecommerceOrdersListHref,
} from "@/src/lib/ecommerce-dashboard-period";
import type { ChartSeriesBlock } from "@/src/types/admin-report";
import type { EcommerceWorkspaceSummary } from "@/src/types/ecommerce-order";
import { cn } from "@/lib/utils";

function MetricCard({
  label,
  value,
  hint,
  href,
  emphasis,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  emphasis?: "money" | "action";
}) {
  const inner = (
    <div
      className={cn(
        "flex h-full flex-col rounded-xl border border-[#dcc9c0] bg-white p-4 shadow-[0_2px_5px_rgb(67_15_25/4%)]",
        href && "transition-colors hover:border-[#730321]/40 hover:bg-[#fffdfb]",
      )}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-[#9a6f2a]">{label}</p>
      <p
        className={cn(
          "mt-2 font-semibold text-[#28161a]",
          emphasis === "money" && "font-mono text-xl tabular-nums",
          emphasis === "action" && "text-2xl tabular-nums",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      {href ? (
        <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-medium text-[#730321]">
          View orders <ArrowRight className="size-3.5" />
        </span>
      ) : null}
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block h-full min-h-[7rem]">
        {inner}
      </Link>
    );
  }
  return inner;
}

function statusChartFromRows(
  rows: { label?: string; count?: number }[] | undefined,
): ChartSeriesBlock | null {
  if (!rows?.length) return null;
  const data = rows
    .filter((r) => Number(r.count) > 0)
    .map((r) => ({
      x: String(r.label ?? "—"),
      y: Number(r.count ?? 0),
    }));
  if (!data.length) return null;
  return {
    chartType: "donut",
    title: "Orders placed by status",
    series: [{ key: "count", name: "Orders", data }],
  };
}

export function EcommerceDashboardSection({
  periodQuery,
  periodLabel,
  summary,
  summaryLoading,
  summaryError,
  onRetrySummary,
  fulfilmentRows,
  fulfilmentLoading,
}: {
  periodQuery: ReturnType<typeof ecommerceInsightsQueryFromDashboard>;
  periodLabel: string;
  summary?: EcommerceWorkspaceSummary;
  summaryLoading?: boolean;
  summaryError?: unknown;
  onRetrySummary?: () => void;
  fulfilmentRows?: { label?: string; count?: number }[];
  fulfilmentLoading?: boolean;
}) {
  const statusChart = statusChartFromRows(fulfilmentRows);

  if (summaryError) {
    return (
      <section
        aria-labelledby="ecommerce-dashboard-heading"
        className="mb-8 overflow-hidden rounded-2xl border-2 border-[#dcc9c0] bg-gradient-to-br from-[#fff9f5] to-[#faf3ee]"
      >
        <div className="border-b border-[#eaded9] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-5 text-[#730321]" aria-hidden />
            <h2 id="ecommerce-dashboard-heading" className="font-serif text-lg font-semibold text-[#28161a]">
              Online store
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Storefront money is separate from scheme collections · {periodLabel}
          </p>
        </div>
        <div className="p-5">
          <QueryError
            error={summaryError}
            onRetry={onRetrySummary ?? (() => undefined)}
          />
        </div>
      </section>
    );
  }

  if (summaryLoading && !summary?.generatedAt) {
    return (
      <section className="mb-8 animate-pulse rounded-2xl border-2 border-[#dcc9c0] bg-[#faf7f5] p-8">
        <div className="h-6 w-48 rounded bg-[#eaded9]" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-[#eaded9]/60" />
          ))}
        </div>
      </section>
    );
  }

  const c = summary?.collections;
  const p = summary?.placement;
  const pipe = summary?.pipeline;
  const empty =
    !summaryLoading
    && (p?.ordersPlaced ?? 0) === 0
    && (c?.collectedOrderCount ?? 0) === 0;

  return (
    <section
      aria-labelledby="ecommerce-dashboard-heading"
      className="mb-8 overflow-hidden rounded-2xl border-2 border-[#dcc9c0] bg-gradient-to-br from-[#fff9f5] to-[#faf3ee]"
    >
      <div className="border-b border-[#eaded9] px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShoppingBag className="size-5 text-[#730321]" aria-hidden />
              <h2 id="ecommerce-dashboard-heading" className="font-serif text-lg font-semibold text-[#28161a]">
                Online store
              </h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Storefront money is separate from scheme collections · {periodLabel}
            </p>
          </div>
          <Link
            href="/ecommerce/orders"
            className="text-sm font-medium text-[#730321] underline-offset-4 hover:underline"
          >
            Manage orders
          </Link>
        </div>
      </div>

      {empty ? (
        <div className="space-y-2 px-5 py-8 text-sm text-[#5c4a50] sm:px-6">
          <p className="font-medium text-[#28161a]">No storefront activity in this period yet.</p>
          <p>
            Publish products in{" "}
            <Link href="/ecommerce" className="font-medium text-[#730321] underline-offset-2 hover:underline">
              Catalog
            </Link>
            , turn on the customer store in Settings if needed, and share your shop link with buyers.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
            <MetricCard
              label="Orders placed"
              value={String(p?.ordersPlaced ?? "—")}
              hint="Created in period"
              href={ecommerceOrdersListHref("all", periodQuery)}
              emphasis="action"
            />
            <MetricCard
              label="Online confirmed (placed)"
              value={String(p?.onlinePaidOrdersPlacedInPeriod ?? "—")}
              hint="Online + paidAt when order was placed"
            />
            <MetricCard
              label="Online collected"
              value={c?.onlineCollected?.amountDisplay ?? "—"}
              hint="paidAt in period"
              emphasis="money"
            />
            <MetricCard
              label="COD courier confirmed"
              value={c?.codCourierCollectionConfirmed?.amountDisplay ?? c?.codCollected?.amountDisplay ?? "—"}
              hint="Courier POD in period — not bank receipt or scheme cash"
              emphasis="money"
            />
            <MetricCard
              label="COD bank remittance"
              value={c?.codBankRemittanceReconciled?.amountDisplay ?? "—"}
              hint="Reconciled bank credit in period"
              emphasis="money"
            />
            <MetricCard
              label="Refund outflow"
              value={c?.refundOutflow?.amountDisplay ?? "—"}
              hint="Provider + manual in period"
              emphasis="money"
            />
            <MetricCard
              label="Net collections"
              value={c?.netCollected?.amountDisplay ?? "—"}
              hint="Gross collected − refunds"
              emphasis="money"
            />
            <MetricCard
              label="Awaiting fulfilment"
              value={String(pipe?.awaitingFulfilment ?? "—")}
              hint="Live pipeline (not period)"
              href={ecommerceOrdersListHref("to_fulfil", periodQuery)}
              emphasis="action"
            />
            <MetricCard
              label="Payment exceptions"
              value={String(pipe?.paymentExceptionsOpen ?? "—")}
              hint="Needs operator attention"
              href={ecommerceOrdersListHref("payment_issues", periodQuery)}
              emphasis="action"
            />
          </div>

          {statusChart ? (
            <div className="border-t border-[#eaded9] px-5 pb-6 pt-4 sm:px-6">
              <Surface
                title="Orders placed by status"
                description={`Same date range as dashboard · ${periodLabel}`}
                className="border-[#e4d7d2] bg-white"
              >
                <div className="flex min-h-[16rem] flex-col p-5">
                  {fulfilmentLoading ? (
                    <p className="text-sm text-muted-foreground">Loading status breakdown…</p>
                  ) : (
                    <ChartSeriesView chart={statusChart} />
                  )}
                </div>
              </Surface>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
