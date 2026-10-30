"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CreditCard,
  IndianRupee,
  PackageOpen,
  RotateCcw,
  ShoppingBag,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChartSeriesView } from "@/src/components/common/chart-series-view";
import { QueryError } from "@/src/components/common/query-state";
import { StatCard, Surface } from "@/src/components/common/page-parts";
import {
  ecommerceInsightsQueryFromDashboard,
  ecommerceOrdersListHref,
} from "@/src/lib/ecommerce-dashboard-period";
import type { ChartSeriesBlock } from "@/src/types/admin-report";
import type { EcommerceWorkspaceSummary } from "@/src/types/ecommerce-order";

function LinkableStatCard({
  href,
  icon,
  label,
  value,
  detail,
  tone,
}: {
  href?: string;
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  tone?: "wine" | "gold" | "red" | "green" | "cream";
}) {
  const card = (
    <StatCard icon={icon} label={label} value={value} detail={detail} tone={tone} />
  );
  if (!href) return card;
  return (
    <Link href={href} className="block transition-opacity hover:opacity-95">
      {card}
    </Link>
  );
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

function EcommerceSectionShell({
  periodLabel,
  action,
  children,
}: {
  periodLabel: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Surface
      title="Online store"
      description={`Storefront money is separate from scheme collections · ${periodLabel}`}
      action={action}
      className="mb-8"
    >
      {children}
    </Surface>
  );
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

  const manageOrdersAction = (
    <Button variant="outline" size="sm" asChild>
      <Link href="/ecommerce/orders">
        Manage orders
        <ArrowRight className="size-4" />
      </Link>
    </Button>
  );

  if (summaryError) {
    return (
      <EcommerceSectionShell periodLabel={periodLabel} action={manageOrdersAction}>
        <QueryError
          error={summaryError}
          onRetry={onRetrySummary ?? (() => undefined)}
        />
      </EcommerceSectionShell>
    );
  }

  if (summaryLoading && !summary?.generatedAt) {
    return (
      <Surface
        title="Online store"
        description={`Storefront money is separate from scheme collections · ${periodLabel}`}
        action={manageOrdersAction}
        className="mb-8 animate-pulse"
      >
        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-[8.5rem] rounded-2xl bg-[#f5ebe6]" />
          ))}
        </div>
      </Surface>
    );
  }

  const c = summary?.collections;
  const p = summary?.placement;
  const pipe = summary?.pipeline;
  const empty =
    !summaryLoading
    && (p?.ordersPlaced ?? 0) === 0
    && (c?.collectedOrderCount ?? 0) === 0;

  if (empty) {
    return (
      <EcommerceSectionShell periodLabel={periodLabel} action={manageOrdersAction}>
        <p className="px-5 pb-5 text-sm text-muted-foreground">
          No storefront activity in this period yet. Publish products in{" "}
          <Link href="/ecommerce/catalog" className="font-semibold text-[#730321]">
            Catalog
          </Link>
          , turn on the customer store in Settings if needed, and share your shop link with
          buyers.
        </p>
      </EcommerceSectionShell>
    );
  }

  return (
    <EcommerceSectionShell periodLabel={periodLabel} action={manageOrdersAction}>
      <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-5">
        <LinkableStatCard
          href={ecommerceOrdersListHref("all", periodQuery)}
          icon={ShoppingBag}
          label="Orders placed"
          value={p?.ordersPlaced ?? "—"}
          detail="Created in period"
          tone="cream"
        />
        <LinkableStatCard
          icon={CreditCard}
          label="Online confirmed (placed)"
          value={p?.onlinePaidOrdersPlacedInPeriod ?? "—"}
          detail="Online + paid when order was placed"
          tone="wine"
        />
        <LinkableStatCard
          icon={IndianRupee}
          label="Online collected"
          value={c?.onlineCollected?.amountDisplay ?? "—"}
          detail="paidAt in period"
          tone="green"
        />
        <LinkableStatCard
          icon={Truck}
          label="COD courier confirmed"
          value={
            c?.codCourierCollectionConfirmed?.amountDisplay
            ?? c?.codCollected?.amountDisplay
            ?? "—"
          }
          detail="Courier POD in period — not bank receipt"
          tone="gold"
        />
        <LinkableStatCard
          icon={Banknote}
          label="COD bank remittance"
          value={c?.codBankRemittanceReconciled?.amountDisplay ?? "—"}
          detail="Reconciled bank credit in period"
          tone="cream"
        />
        <LinkableStatCard
          icon={RotateCcw}
          label="Refund outflow"
          value={c?.refundOutflow?.amountDisplay ?? "—"}
          detail="Provider + manual in period"
          tone="red"
        />
        <LinkableStatCard
          icon={IndianRupee}
          label="Net collections"
          value={c?.netCollected?.amountDisplay ?? "—"}
          detail="Gross collected − refunds"
          tone="green"
        />
        <LinkableStatCard
          href={ecommerceOrdersListHref("to_fulfil", periodQuery)}
          icon={PackageOpen}
          label="Awaiting fulfilment"
          value={pipe?.awaitingFulfilment ?? "—"}
          detail="Live pipeline (not period)"
          tone="gold"
        />
        <LinkableStatCard
          href={ecommerceOrdersListHref("payment_issues", periodQuery)}
          icon={AlertTriangle}
          label="Payment exceptions"
          value={pipe?.paymentExceptionsOpen ?? "—"}
          detail="Needs operator attention"
          tone="red"
        />
      </div>

      {statusChart ? (
        <div className="border-t border-[#eaded9] px-5 pb-6 pt-4">
          <p className="mb-3 text-sm font-bold text-[#2d191d]">Orders placed by status</p>
          <p className="mb-4 text-sm text-muted-foreground">
            Same date range as dashboard · {periodLabel}
          </p>
          <div className="flex min-h-[16rem] flex-col">
            {fulfilmentLoading ? (
              <p className="text-sm text-muted-foreground">Loading status breakdown…</p>
            ) : (
              <ChartSeriesView chart={statusChart} />
            )}
          </div>
        </div>
      ) : null}
    </EcommerceSectionShell>
  );
}
