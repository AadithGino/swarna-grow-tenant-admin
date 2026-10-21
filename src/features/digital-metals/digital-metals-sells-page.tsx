"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { toast } from "sonner";
import { toastApiError } from "@/src/lib/api-error";
import { money } from "@/src/lib/format";
import {
  useApproveDigitalMetalsSellOrderMutation,
  useGetDigitalMetalsSellOrderQuery,
  useGetDigitalMetalsSellOrdersQuery,
} from "@/src/store/api/admin-api";
import { useDigitalMetalsServerEntitlement } from "./digital-metals-admin-shared";
import { AdminDigitalMetalsDocumentPanel } from "./digital-metals-admin-document-panel";
import { DigitalMetalsAdminListToolbar } from "./digital-metals-admin-list-toolbar";
import { formatAdminDateTime, SellAdminRow, SellOrderListRow } from "./digital-metals-sell-admin-shared";
import {
  DigitalMetalsSellBankPanel,
  DigitalMetalsSellCustomerPanel,
  DigitalMetalsSellQuotePanel,
} from "./digital-metals-sell-order-detail-parts";

const SELL_STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING_APPROVAL", label: "Pending approval" },
  { value: "PAYABLE_OPEN", label: "Payable open" },
  { value: "SETTLED", label: "Settled" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "EXPIRED", label: "Expired" },
];

export function DigitalMetalsSellsPage() {
  const ent = useDigitalMetalsServerEntitlement();
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [stack, setStack] = useState<SellAdminRow[]>([]);
  const pageSize = 20;
  const q = search.trim().length >= 4 ? search.trim() : undefined;
  const orders = useGetDigitalMetalsSellOrdersQuery(
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
    const batch = (orders.data?.items ?? []) as SellAdminRow[];
    if (!cursor) return batch;
    const ids = new Set(stack.map((r) => String(r.id)));
    return [...stack, ...batch.filter((r) => !ids.has(String(r.id)))];
  }, [orders.data?.items, cursor, stack]);

  if (ent.loading) return <PageSkeleton cards={2} />;
  if (!ent.workspaceVisible) {
    return (
      <div className="p-6">
        <PageHeader title="Sell approvals" />
        <p className="text-sm text-muted-foreground">{ent.disabledMessage ?? "Module not available."}</p>
      </div>
    );
  }
  if (orders.isLoading) return <PageSkeleton cards={2} />;
  if (orders.isError) return <QueryError error={orders.error} onRetry={orders.refetch} />;

  const meta = orders.data?.meta;

  return (
    <div className="space-y-6 p-6" data-testid="digital-metals-sells-list">
      <PageHeader
        eyebrow="Digital metals"
        title="Sell approvals"
        description="Execute sale debits metal; bank payout is a separate payable step."
      />
      <DigitalMetalsAdminListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Order id prefix (4+ characters)"
        status={status}
        onStatusChange={setStatus}
        statusOptions={SELL_STATUS_OPTIONS}
      />
      <Surface title={`Sell orders (${merged.length}${meta?.hasMore ? "+" : ""})`}>
        <div className="divide-y">
          {merged.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No matching sell orders.</p>
          ) : (
            <>
              <div className="hidden border-b bg-muted/30 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto]">
                <span>Customer</span>
                <span>Sale</span>
                <span>Timeline</span>
                <span className="text-right">Status</span>
              </div>
              {merged.map((o) => (
                <SellOrderListRow key={o.id} row={o} href={`/digital-metals/sells/${o.id}`} />
              ))}
            </>
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

export function DigitalMetalsSellDetailPage({ orderId }: { orderId: string }) {
  const ent = useDigitalMetalsServerEntitlement();
  const detail = useGetDigitalMetalsSellOrderQuery(orderId, { skip: !ent.workspaceVisible });
  const [approve, approveState] = useApproveDigitalMetalsSellOrderMutation();
  const [executeAttestation, setExecuteAttestation] = useState(false);

  if (ent.loading || detail.isLoading) return <PageSkeleton cards={2} />;
  if (detail.isError) return <QueryError error={detail.error} onRetry={detail.refetch} />;

  const o = detail.data as
    | (SellAdminRow & {
        version?: number;
        payable?: { outstandingPaise?: number; status?: string };
        sellSummary?: { sellRatePerGramPaise?: number | null };
        snapshot?: { rateSnapshot?: { sellRatePerGramPaise?: number } };
      })
    | undefined;
  if (!o?.id) {
    return (
      <div className="space-y-4 p-6">
        <PageHeader title={`Sell ${orderId}`} />
        <p className="text-sm text-muted-foreground">Sell order not found or still loading.</p>
        <Link href="/digital-metals/sells" className="text-sm underline">
          Back to sell queue
        </Link>
      </div>
    );
  }

  const sellRate =
    o.sellSummary?.sellRatePerGramPaise
    ?? o.snapshot?.rateSnapshot?.sellRatePerGramPaise
    ?? null;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        eyebrow="Digital metals"
        title="Sell order"
        description={`${orderId} · ${o.customer?.name ?? "Customer"}`}
      />
      <DigitalMetalsSellCustomerPanel customer={o.customer} />
      <DigitalMetalsSellQuotePanel
        metal={o.metal ?? null}
        finenessPpm={o.finenessPpm != null ? Number(o.finenessPpm) : null}
        quantityUg={o.quantityUg != null ? String(o.quantityUg) : null}
        settlementPaise={o.settlementPaise ?? null}
        sellRatePerGramPaise={sellRate}
      />
      <DigitalMetalsSellBankPanel bank={o.bankDestination} />
      <Surface title="Order status">
        <dl className="grid gap-2 px-4 py-3 text-sm">
          <div className="flex justify-between">
            <dt>Status</dt>
            <dd>
              <StatusBadge status={o.status} />
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Requested</dt>
            <dd className="text-muted-foreground">{formatAdminDateTime(o.createdAt)}</dd>
          </div>
          {o.approvalExpiresAt ? (
            <div className="flex justify-between gap-4">
              <dt>Approval expires</dt>
              <dd className="text-muted-foreground">{formatAdminDateTime(o.approvalExpiresAt)}</dd>
            </div>
          ) : null}
          {o.executedAt ? (
            <div className="flex justify-between gap-4">
              <dt>Executed (metal debited)</dt>
              <dd className="text-muted-foreground">{formatAdminDateTime(o.executedAt)}</dd>
            </div>
          ) : null}
          {o.payable ? (
            <div className="flex justify-between">
              <dt>INR payable</dt>
              <dd>
                {o.payable.status} · {money(o.payable.outstandingPaise ?? 0)} outstanding
              </dd>
            </div>
          ) : null}
        </dl>
        {o.status === "PENDING_APPROVAL" ? (
          <div className="mt-4 space-y-3 border-t px-4 py-3">
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={executeAttestation}
                onCheckedChange={(v) => setExecuteAttestation(v === true)}
              />
              <span>
                I confirm this sale matches the locked customer quote and I am authorised to debit metal from the
                customer wallet.
              </span>
            </label>
            <Button
              className="min-h-10"
              disabled={approveState.isLoading || !executeAttestation}
              onClick={() => {
                void approve({ orderId, expectedVersion: o.version })
                  .unwrap()
                  .then(() => toast.success("Sale executed — metal debited."))
                  .catch((err) => toastApiError(err));
              }}
            >
              Execute sale (debit metal)
            </Button>
          </div>
        ) : null}
      </Surface>
      {["PAYABLE_OPEN", "SETTLED"].includes(String(o.status ?? "")) ? (
        <AdminDigitalMetalsDocumentPanel
          title="Sale acknowledgement"
          docType="SELL_ACKNOWLEDGEMENT"
          subjectId={orderId}
        />
      ) : null}
      <Link href="/digital-metals/sells" className="text-sm underline">
        Back to sell queue
      </Link>
    </div>
  );
}
