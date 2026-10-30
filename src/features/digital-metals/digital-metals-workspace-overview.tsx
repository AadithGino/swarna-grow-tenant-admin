"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Banknote, Coins, Package, ShoppingCart } from "lucide-react";
import { StatCard, Surface } from "@/src/components/common/page-parts";
import { StatusBadge } from "@/src/components/common/status-badge";
import { Notice } from "@/src/components/admin-ui/detail-parts";
import {
  useGetDigitalMetalsBuyOrdersQuery,
  useGetDigitalMetalsCapabilityQuery,
  useGetDigitalMetalsPaymentExceptionsQuery,
  useGetDigitalMetalsPayablesQuery,
  useGetDigitalMetalsRedemptionFulfilmentQueueQuery,
  useGetDigitalMetalsSellOrdersQuery,
} from "@/src/store/api/admin-api";
import { DmCustomerCell, MetalPill, dmInr, dmInrShort, dmWeight, timeAgo } from "./digital-metals-admin-ui";

type ActivityRow = {
  id: string;
  kind: "BUY" | "SELL";
  status: string;
  metal?: string;
  quantityUg?: string;
  amountPaise?: number;
  createdAt?: string | null;
  customer?: { id?: string; name?: string; mobile?: string; customerNumber?: string } | null;
};

/** Action-queue tiles + latest activity for the Digital Gold overview. */
export function DigitalMetalsWorkspaceOverview({ workspaceVisible }: { workspaceVisible: boolean }) {
  const capability = useGetDigitalMetalsCapabilityQuery(undefined, { skip: !workspaceVisible });
  const pendingSells = useGetDigitalMetalsSellOrdersQuery(
    { status: "PENDING_APPROVAL", limit: 20 },
    { skip: !workspaceVisible },
  );
  const paymentExceptions = useGetDigitalMetalsPaymentExceptionsQuery(undefined, { skip: !workspaceVisible });
  const fulfilment = useGetDigitalMetalsRedemptionFulfilmentQueueQuery(undefined, { skip: !workspaceVisible });
  const payables = useGetDigitalMetalsPayablesQuery(undefined, { skip: !workspaceVisible });
  const recentBuys = useGetDigitalMetalsBuyOrdersQuery({ limit: 6 }, { skip: !workspaceVisible });
  const recentSells = useGetDigitalMetalsSellOrdersQuery({ limit: 6 }, { skip: !workspaceVisible });

  if (!workspaceVisible) return null;

  const pendingCount = pendingSells.data?.items?.length ?? 0;
  const exceptionCount = paymentExceptions.data?.items?.length ?? 0;
  const fulfilmentCount = fulfilment.data?.items?.length ?? 0;
  const openPayables = (payables.data?.items ?? []) as { outstandingPaise?: number }[];
  const payableOutstandingPaise = openPayables.reduce((sum, p) => sum + Number(p.outstandingPaise ?? 0), 0);
  const blockers = capability.data?.blockers ?? [];

  const activity: ActivityRow[] = [
    ...((recentBuys.data?.items ?? []) as Record<string, unknown>[]).map((o) => ({
      id: String(o.id),
      kind: "BUY" as const,
      status: String(o.status ?? ""),
      metal: o.metal as string | undefined,
      quantityUg: o.quantityUg as string | undefined,
      amountPaise: Number(o.totalPayablePaise ?? 0),
      createdAt: o.createdAt as string | undefined,
      customer: o.customer as ActivityRow["customer"],
    })),
    ...((recentSells.data?.items ?? []) as Record<string, unknown>[]).map((o) => ({
      id: String(o.id),
      kind: "SELL" as const,
      status: String(o.status ?? ""),
      metal: o.metal as string | undefined,
      quantityUg: o.quantityUg as string | undefined,
      amountPaise: Number(o.settlementPaise ?? 0),
      createdAt: o.createdAt as string | undefined,
      customer: o.customer as ActivityRow["customer"],
    })),
  ]
    .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")))
    .slice(0, 8);

  return (
    <div className="space-y-6" data-testid="digital-metals-workspace-overview">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          href="/digital-metals/sells"
          label="Sells to approve"
          value={String(pendingCount)}
          loading={pendingSells.isLoading}
          detail="Customer-confirmed sales waiting for you"
          icon={Coins}
          tone={pendingCount ? "gold" : "wine"}
        />
        <StatCard
          href="/digital-metals/payment-exceptions"
          label="Payment exceptions"
          value={String(exceptionCount)}
          loading={paymentExceptions.isLoading}
          detail="Late or duplicate payments to reconcile"
          icon={ShoppingCart}
          tone={exceptionCount ? "red" : "wine"}
        />
        <StatCard
          href="/digital-metals/redemption/fulfilment"
          label="Coins to hand over"
          value={String(fulfilmentCount)}
          loading={fulfilment.isLoading}
          detail="Paid redemptions in the fulfilment queue"
          icon={Package}
          tone="cream"
        />
        <StatCard
          href="/digital-metals/payouts"
          label="Owed to customers"
          value={dmInrShort(payableOutstandingPaise)}
          loading={payables.isLoading}
          detail={`${openPayables.length} open payable${openPayables.length === 1 ? "" : "s"} after executed sales`}
          icon={Banknote}
          tone="green"
        />
      </div>

      {blockers.length > 0 ? (
        <Notice tone="amber" icon={AlertTriangle} title="Customers can't trade yet">
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {blockers.slice(0, 6).map((b) => (
              <li key={`${b.code}-${b.message}`}>{b.message}</li>
            ))}
          </ul>
        </Notice>
      ) : null}

      <Surface
        title="Latest activity"
        description="Newest buys and sells across all customers"
        action={
          <Link href="/digital-metals/purchases" className="inline-flex items-center gap-1 text-sm font-semibold text-[#7b0a2b] hover:underline">
            All purchases <ArrowRight className="size-3.5" />
          </Link>
        }
      >
        {activity.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[#7a6d70]">No customer activity yet.</p>
        ) : (
          <ul className="divide-y divide-[#f3eae7]">
            {activity.map((row) => (
              <li key={`${row.kind}-${row.id}`}>
                <Link
                  href={row.kind === "BUY" ? `/digital-metals/purchases/${row.id}` : `/digital-metals/sells/${row.id}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-3 transition-colors hover:bg-[#fcf6f4] sm:grid-cols-[minmax(0,1.3fr)_6rem_minmax(0,1fr)_11rem]"
                >
                  <DmCustomerCell customer={row.customer} fallbackId={row.id} />
                  <span
                    className={`hidden w-fit rounded-full px-2 py-0.5 text-xs font-bold sm:inline-flex ${row.kind === "BUY" ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700"}`}
                  >
                    {row.kind === "BUY" ? "Bought" : "Sold"}
                  </span>
                  <span className="hidden items-center gap-2 text-sm text-[#5c4a4e] sm:flex">
                    <MetalPill metal={row.metal} />
                    <span className="tabular-nums">{dmWeight(row.quantityUg)}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <span className="text-sm font-bold tabular-nums text-[#28161a]">{dmInr(row.amountPaise)}</span>
                    <span className="flex items-center gap-2 text-xs text-[#9a8d90]">
                      <StatusBadge status={row.status} className="py-0 text-[0.68rem]" />
                      {timeAgo(row.createdAt)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Surface>
    </div>
  );
}
