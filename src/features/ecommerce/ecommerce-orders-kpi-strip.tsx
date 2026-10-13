"use client";

import {
  AlertTriangle,
  IndianRupee,
  PackageOpen,
  ShoppingBag,
} from "lucide-react";
import { StatCard } from "@/src/components/common/page-parts";
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
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((k) => (
          <div key={k} className="h-[8.5rem] animate-pulse rounded-2xl bg-[#f5ebe6]" />
        ))}
      </div>
    );
  }
  if (!summary) return null;

  const attention =
    summary.pipeline.paymentExceptionsOpen + summary.placement.codPendingAcceptancePlacedInPeriod;

  return (
    <div className="mb-5">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#9a6f2a]">
        Orders summary · {periodLabel}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ShoppingBag}
          label="Orders placed"
          value={summary.placement.ordersPlaced}
          detail="In selected period"
          tone="cream"
        />
        <StatCard
          icon={IndianRupee}
          label="Net collected"
          value={summary.collections.netCollected?.amountDisplay ?? formatOrderInr(0)}
          detail={`${summary.collections.collectedOrderCount} collected orders`}
          tone="green"
        />
        <StatCard
          icon={PackageOpen}
          label="Awaiting fulfilment"
          value={summary.pipeline.awaitingFulfilment}
          detail="Live pipeline"
          tone="gold"
        />
        <StatCard
          icon={AlertTriangle}
          label="Needs attention"
          value={attention}
          detail="Exceptions + COD acceptance (period)"
          tone={attention > 0 ? "red" : "wine"}
        />
      </div>
    </div>
  );
}
