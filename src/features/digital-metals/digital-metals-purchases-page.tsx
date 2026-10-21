"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { money } from "@/src/lib/format";
import { ugToGramsDisplay } from "@/src/lib/digital-metals-display";
import {
  useGetDigitalMetalsBuyOrderQuery,
  useGetDigitalMetalsBuyOrdersQuery,
} from "@/src/store/api/admin-api";
import { useDigitalMetalsServerEntitlement } from "./digital-metals-admin-shared";
import { DigitalMetalsAdminListToolbar } from "./digital-metals-admin-list-toolbar";

type BuyOrderRow = {
  id: string;
  status: string;
  metal: string;
  quantityUg: string;
  totalPayablePaise: number;
  paymentExceptionStatus?: string | null;
  invoiceStatus?: string;
};

const BUY_STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "PAYMENT_PENDING", label: "Payment pending" },
  { value: "CREDITED", label: "Credited" },
  { value: "PAYMENT_FAILED", label: "Payment failed" },
  { value: "REFUND_REVIEW", label: "Refund review" },
];

export function DigitalMetalsPurchasesPage() {
  const ent = useDigitalMetalsServerEntitlement();
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [stack, setStack] = useState<BuyOrderRow[]>([]);
  const pageSize = 20;
  const q = search.trim().length >= 4 ? search.trim() : undefined;
  const orders = useGetDigitalMetalsBuyOrdersQuery(
    {
      ...(status !== "ALL" ? { status } : {}),
      limit: pageSize,
      cursor,
      ...(q ? { q } : {}),
    },
    { skip: !ent.workspaceVisible },
  );

  useEffect(() => {
    setCursor(undefined);
    setStack([]);
  }, [status, q]);

  const merged = useMemo(() => {
    const batch = (orders.data?.items ?? []) as BuyOrderRow[];
    if (!cursor) return batch;
    const ids = new Set(stack.map((r) => r.id));
    return [...stack, ...batch.filter((r) => !ids.has(r.id))];
  }, [orders.data?.items, cursor, stack]);

  if (ent.loading) return <PageSkeleton cards={2} />;
  if (!ent.workspaceVisible) {
    return (
      <div className="p-6">
        <PageHeader title="Digital metal purchases" />
        <p className="text-sm text-muted-foreground">{ent.disabledMessage ?? "Module not available."}</p>
      </div>
    );
  }
  if (orders.isLoading) return <PageSkeleton cards={2} />;
  if (orders.isError) return <QueryError error={orders.error} onRetry={orders.refetch} />;

  const meta = orders.data?.meta;

  return (
    <div className="space-y-6 p-6" data-testid="digital-metals-purchases-list">
      <PageHeader
        eyebrow="Digital metals"
        title="Purchases"
        description="Customer buy orders, gateway payment state, and metal credit."
      />
      <DigitalMetalsAdminListToolbar
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        statusOptions={BUY_STATUS_OPTIONS}
      />
      <Surface title={`Buy orders (${merged.length}${meta?.hasMore ? "+" : ""})`}>
        <div className="divide-y">
          {merged.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No matching purchases.</p>
          ) : (
            merged.map((o) => (
              <Link
                key={o.id}
                href={`/digital-metals/purchases/${o.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-muted/40"
              >
                <div>
                  <p className="font-medium">{o.id}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.metal} · {ugToGramsDisplay(String(o.quantityUg))}
                    {o.paymentExceptionStatus ? ` · exception ${o.paymentExceptionStatus}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={o.status} />
                  <span className="text-sm font-semibold">{money(o.totalPayablePaise)}</span>
                </div>
              </Link>
            ))
          )}
        </div>
        {meta?.hasMore ? (
          <div className="border-t px-4 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setStack(merged);
                setCursor(meta.nextCursor ?? undefined);
              }}
            >
              Load more
            </Button>
          </div>
        ) : null}
      </Surface>
    </div>
  );
}

export function DigitalMetalsPurchaseDetailPage({ orderId }: { orderId: string }) {
  const ent = useDigitalMetalsServerEntitlement();
  const detail = useGetDigitalMetalsBuyOrderQuery(orderId, { skip: !ent.workspaceVisible });

  if (ent.loading || detail.isLoading) return <PageSkeleton cards={2} />;
  if (detail.isError) return <QueryError error={detail.error} onRetry={detail.refetch} />;
  const o = detail.data as BuyOrderRow & { paymentAttempts?: { id: string; status: string }[] };

  return (
    <div className="space-y-6 p-6" data-testid="digital-metals-purchase-detail">
      <PageHeader eyebrow="Purchase" title={orderId} description="Immutable order snapshot from the server." />
      <Surface title="Order">
        <dl className="space-y-2 px-4 py-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt>Status</dt>
            <dd>
              <StatusBadge status={o.status} />
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Metal quantity</dt>
            <dd>{ugToGramsDisplay(String(o.quantityUg))}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Total payable</dt>
            <dd className="font-semibold">{money(o.totalPayablePaise)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Invoice</dt>
            <dd>{o.invoiceStatus ?? "PENDING"}</dd>
          </div>
        </dl>
      </Surface>
      {o.paymentExceptionStatus ? (
        <Surface title="Payment exception">
          <p className="px-4 py-3 text-sm text-amber-900">{o.paymentExceptionStatus}</p>
        </Surface>
      ) : null}
      <Surface title="Payment attempts">
        <ul className="divide-y px-4 py-2 text-sm">
          {(o.paymentAttempts ?? []).length === 0 ? (
            <li className="py-2 text-muted-foreground">No attempts recorded.</li>
          ) : (
            (o.paymentAttempts ?? []).map((a) => (
              <li key={a.id} className="flex justify-between py-2">
                <span className="font-mono text-xs">{a.id}</span>
                <StatusBadge status={a.status} />
              </li>
            ))
          )}
        </ul>
      </Surface>
      <Link href="/digital-metals/purchases" className="text-sm underline">
        Back to list
      </Link>
    </div>
  );
}
