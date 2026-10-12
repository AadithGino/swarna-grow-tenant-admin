"use client";

import type { EcommerceWorkspaceSummary } from "@/src/types/ecommerce-order";
import { formatOrderInr } from "@/src/lib/ecommerce-order-presenters";

export function EcommerceOrdersKpiStrip({
  summary,
  periodLabel,
  loading,
}: {
  summary?: EcommerceWorkspaceSummary;
  periodLabel: string;
  loading?: boolean;
}) {
  if (loading && !summary) {
    return (
      <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((k) => (
          <div key={k} className="h-20 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
    );
  }
  if (!summary) return null;
  const cells = [
    { label: "Orders placed", value: String(summary.placement.ordersPlaced) },
    {
      label: "Net collected",
      value: summary.collections.netCollected?.amountDisplay ?? formatOrderInr(0),
      hint: `${summary.collections.collectedOrderCount} collected orders`,
    },
    {
      label: "Awaiting fulfilment",
      value: String(summary.pipeline.awaitingFulfilment),
    },
    {
      label: "Needs attention",
      value: String(
        summary.pipeline.paymentExceptionsOpen
          + summary.placement.codPendingAcceptancePlacedInPeriod,
      ),
      hint: "Exceptions + COD acceptance (period)",
    },
  ];
  return (
    <div className="mb-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9a6f2a]">
        Summary · {periodLabel}
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className="rounded-xl border border-[#e4d7d2] bg-[#faf7f5] px-4 py-3"
          >
            <p className="text-xs text-muted-foreground">{cell.label}</p>
            <p className="mt-1 font-semibold tabular-nums text-[#28161a]">{cell.value}</p>
            {cell.hint ? <p className="mt-0.5 text-[10px] text-muted-foreground">{cell.hint}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
