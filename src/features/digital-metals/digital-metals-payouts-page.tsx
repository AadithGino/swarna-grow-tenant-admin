"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { money } from "@/src/lib/format";
import {
  useGetDigitalMetalsPayablesQuery,
  useGetDigitalMetalsPayoutsQuery,
} from "@/src/store/api/admin-api";
import { useDigitalMetalsServerEntitlement } from "./digital-metals-admin-shared";

type PayableRow = {
  id: string;
  sellOrderId: string;
  outstandingPaise: number;
  status: string;
};

type PayoutRow = {
  id: string;
  status: string;
  amountPaise: number;
  sellOrderId: string;
};

function useCursorMergedList<T extends { id: string }>(
  items: T[] | undefined,
  cursor: string | undefined,
  stack: T[],
  setStack: (rows: T[]) => void,
) {
  return useMemo(() => {
    const batch = items ?? [];
    if (!cursor) return batch;
    const ids = new Set(stack.map((r) => r.id));
    return [...stack, ...batch.filter((r) => !ids.has(r.id))];
  }, [items, cursor, stack]);
}

export function DigitalMetalsPayoutsPage() {
  const ent = useDigitalMetalsServerEntitlement();
  const pageSize = 25;
  const [payablesCursor, setPayablesCursor] = useState<string | undefined>();
  const [payoutsCursor, setPayoutsCursor] = useState<string | undefined>();
  const [payablesStack, setPayablesStack] = useState<PayableRow[]>([]);
  const [payoutsStack, setPayoutsStack] = useState<PayoutRow[]>([]);

  const payables = useGetDigitalMetalsPayablesQuery(
    { limit: pageSize, cursor: payablesCursor },
    { skip: !ent.workspaceVisible },
  );
  const payouts = useGetDigitalMetalsPayoutsQuery(
    { limit: pageSize, cursor: payoutsCursor },
    { skip: !ent.workspaceVisible },
  );

  const openPayables = useCursorMergedList(
    payables.data?.items as PayableRow[] | undefined,
    payablesCursor,
    payablesStack,
    setPayablesStack,
  );
  const payoutRows = useCursorMergedList(
    payouts.data?.items as PayoutRow[] | undefined,
    payoutsCursor,
    payoutsStack,
    setPayoutsStack,
  );

  if (ent.loading) return <PageSkeleton cards={2} />;
  if (!ent.workspaceVisible) {
    return (
      <div className="p-6">
        <PageHeader title="Payouts" />
        <p className="text-sm text-muted-foreground">{ent.disabledMessage ?? "Module not available."}</p>
      </div>
    );
  }
  if (payables.isLoading || payouts.isLoading) return <PageSkeleton cards={2} />;
  if (payables.isError) return <QueryError error={payables.error} onRetry={payables.refetch} />;
  if (payouts.isError) return <QueryError error={payouts.error} onRetry={payouts.refetch} />;

  const payablesMeta = payables.data?.meta;
  const payoutsMeta = payouts.data?.meta;

  return (
    <div className="space-y-6 p-6" data-testid="digital-metals-payouts-workspace">
      <PageHeader
        title="Payouts & payables"
        description="Manual bank payouts are separate from sale execution. Settlement requires approver attestation and evidence — a reference alone is not proof of credit."
      />
      <Surface title={`Open payables (${openPayables.length}${payablesMeta?.hasMore ? "+" : ""})`}>
        <div className="divide-y">
          {openPayables.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No open payables.</p>
          ) : (
            openPayables.map((p) => (
              <div key={p.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{p.id}</p>
                  <p className="text-xs text-muted-foreground">Sell order {p.sellOrderId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={p.status} />
                  <span className="font-semibold">{money(p.outstandingPaise)}</span>
                </div>
              </div>
            ))
          )}
        </div>
        {payablesMeta?.hasMore ? (
          <div className="border-t px-4 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setPayablesStack(openPayables);
                setPayablesCursor(payablesMeta.nextCursor ?? undefined);
              }}
            >
              Load more payables
            </Button>
          </div>
        ) : null}
      </Surface>
      <Surface title={`Payout instructions (${payoutRows.length}${payoutsMeta?.hasMore ? "+" : ""})`}>
        <div className="divide-y">
          {payoutRows.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No payout instructions yet.</p>
          ) : (
            payoutRows.map((p) => (
              <div key={p.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <Link href={`/digital-metals/payouts/${p.id}`} className="font-medium underline">
                    {p.id}
                  </Link>
                  <p className="text-xs text-muted-foreground">Sell {p.sellOrderId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={p.status} />
                  <span className="font-semibold">{money(p.amountPaise)}</span>
                </div>
              </div>
            ))
          )}
        </div>
        {payoutsMeta?.hasMore ? (
          <div className="border-t px-4 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setPayoutsStack(payoutRows);
                setPayoutsCursor(payoutsMeta.nextCursor ?? undefined);
              }}
            >
              Load more payouts
            </Button>
          </div>
        ) : null}
      </Surface>
      <Link href="/digital-metals" className="text-sm underline">
        Back to workspace
      </Link>
    </div>
  );
}
