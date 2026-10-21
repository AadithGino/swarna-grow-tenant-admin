"use client";

import Link from "next/link";
import { AlertTriangle, Banknote, Coins, Package, ShoppingCart } from "lucide-react";
import { StatCard, Surface } from "@/src/components/common/page-parts";
import { money } from "@/src/lib/format";
import { ugToGramsDisplay } from "@/src/lib/digital-metals-display";
import {
  useGetDigitalMetalsCapabilityQuery,
  useGetDigitalMetalsOperationsWorkQueueQuery,
  useGetDigitalMetalsPaymentExceptionsQuery,
  useGetDigitalMetalsPayablesQuery,
  useGetDigitalMetalsRedemptionFulfilmentQueueQuery,
  useGetDigitalMetalsSellOrdersQuery,
} from "@/src/store/api/admin-api";

type SellRow = { id: string; status: string; settlementPaise?: number; quantityUg?: string; metal?: string };

export function DigitalMetalsWorkspaceOverview({ workspaceVisible }: { workspaceVisible: boolean }) {
  const capability = useGetDigitalMetalsCapabilityQuery(undefined, { skip: !workspaceVisible });
  const workQueue = useGetDigitalMetalsOperationsWorkQueueQuery(undefined, {
    skip: !workspaceVisible,
    pollingInterval: 60_000,
  });
  const pendingSells = useGetDigitalMetalsSellOrdersQuery(
    { status: "PENDING_APPROVAL", limit: 8 },
    { skip: !workspaceVisible },
  );
  const paymentExceptions = useGetDigitalMetalsPaymentExceptionsQuery(undefined, { skip: !workspaceVisible });
  const fulfilment = useGetDigitalMetalsRedemptionFulfilmentQueueQuery(undefined, { skip: !workspaceVisible });
  const payables = useGetDigitalMetalsPayablesQuery(undefined, { skip: !workspaceVisible });

  if (!workspaceVisible) return null;

  const pendingCount = pendingSells.data?.items?.length ?? 0;
  const exceptionCount = paymentExceptions.data?.items?.length ?? 0;
  const fulfilmentCount = fulfilment.data?.items?.length ?? 0;
  const openPayables = (payables.data?.items ?? []) as { outstandingPaise?: number }[];
  const payableOutstandingPaise = openPayables.reduce(
    (sum, p) => sum + Number(p.outstandingPaise ?? 0),
    0,
  );
  const wq = workQueue.data?.summary;
  const blockers = capability.data?.blockers ?? [];
  const tradingPaused = capability.data?.pause?.tenantPaused || capability.data?.pause?.platformPaused;

  return (
    <div className="space-y-6" data-testid="digital-metals-workspace-overview">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Sell approvals waiting"
          value={pendingSells.isLoading ? "…" : String(pendingCount)}
          detail="Customer-confirmed sells awaiting metal debit"
          icon={Coins}
        />
        <StatCard
          label="Payment exceptions"
          value={paymentExceptions.isLoading ? "…" : String(exceptionCount)}
          detail="Buy orders needing reconciliation"
          icon={ShoppingCart}
        />
        <StatCard
          label="Redemption fulfilment"
          value={fulfilment.isLoading ? "…" : String(fulfilmentCount)}
          detail="Charge-paid orders in the fulfilment queue"
          icon={Package}
        />
        <StatCard
          label="Open INR payables"
          value={payables.isLoading ? "…" : money(payableOutstandingPaise)}
          detail={`${openPayables.length} payable${openPayables.length === 1 ? "" : "s"} after executed sales`}
          icon={Banknote}
        />
      </div>

      {tradingPaused ? (
        <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Trading is paused
            {capability.data?.pause?.tenantPauseReason
              ? `: ${capability.data.pause.tenantPauseReason}`
              : capability.data?.pause?.platformPauseReason
                ? ` (platform): ${capability.data.pause.platformPauseReason}`
                : "."}
          </span>
        </p>
      ) : null}

      {blockers.length > 0 ? (
        <Surface title="Customer trading blockers" description="From live capability — resolve in Settings or platform tax/terms.">
          <ul className="divide-y px-4 py-2 text-sm">
            {blockers.slice(0, 6).map((b) => (
              <li key={`${b.code}-${b.message}`} className="py-2 text-[#5c3d42]">
                <span className="font-medium text-[#28161a]">{b.code}</span> — {b.message}
              </li>
            ))}
          </ul>
        </Surface>
      ) : null}

      <Surface
        title="Action queues"
        description="Counts above are from the API. Open a queue to work items."
        action={
          <Link href="/digital-metals/sells" className="text-sm font-medium text-[var(--primary)] underline">
            Sell queue
          </Link>
        }
      >
        <div className="divide-y">
          {(pendingSells.data?.items as SellRow[] | undefined)?.length ? (
            (pendingSells.data!.items as SellRow[]).map((o) => (
              <Link
                key={o.id}
                href={`/digital-metals/sells/${o.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-muted/40"
              >
                <span className="font-medium">{o.id}</span>
                <span className="text-muted-foreground">
                  {o.metal} · {ugToGramsDisplay(String(o.quantityUg ?? 0))} · {money(Number(o.settlementPaise ?? 0))}
                </span>
              </Link>
            ))
          ) : (
            <p className="px-4 py-3 text-sm text-muted-foreground">No sells awaiting approval.</p>
          )}
        </div>
        {wq ? (
          <p className="border-t px-4 py-3 text-xs text-muted-foreground">
            Background recovery: {wq.outboxPending} outbox pending · {wq.outboxFailed} failed · {wq.documentsRetryable}{" "}
            documents stuck
          </p>
        ) : null}
      </Surface>
    </div>
  );
}
