"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { EcommerceSectionNav } from "@/src/features/ecommerce/ecommerce-section-nav";
import { useEcommerceAdminAccess } from "@/src/features/ecommerce/ecommerce-admin-shared";
import { formatOrderInr } from "@/src/features/ecommerce/ecommerce-order-ui";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { toastApiError } from "@/src/lib/api-error";
import type { EcommerceCodRemittanceBatch } from "@/src/types/ecommerce-order";
import {
  useAddEcommerceCodRemittanceBatchLineMutation,
  useCreateEcommerceCodRemittanceBatchMutation,
  useGetEcommerceCodRemittanceBatchQuery,
  useGetEcommerceCourierCodSummaryQuery,
  useListCourierCodOrdersQuery,
  useListEcommerceCodRemittanceBatchesQuery,
  useReconcileEcommerceCodRemittanceBatchMutation,
} from "@/src/store/api/admin-api";

type CourierQueue =
  | "awaiting_collection"
  | "awaiting_remittance"
  | "in_draft_batch"
  | "discrepancy";

const QUEUE_TABS: { id: CourierQueue; label: string }[] = [
  { id: "awaiting_collection", label: "Awaiting collection evidence" },
  { id: "awaiting_remittance", label: "Confirmed — owed to bank" },
  { id: "in_draft_batch", label: "In draft batch" },
  { id: "discrepancy", label: "Remittance discrepancies" },
];

function formatAge(iso?: string | null) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

function courierEvidenceLabel(courier: Record<string, unknown> | null | undefined) {
  const src = courier?.collectionSourceLabel ?? courier?.collectionSource;
  if (src) return String(src);
  return "Manual courier evidence";
}

export function EcommerceCourierCodWorkspacePage() {
  const { canRead, canFulfilmentOperate, readBlockedMessage } = useEcommerceAdminAccess();
  const summary = useGetEcommerceCourierCodSummaryQuery(undefined, { skip: !canRead });

  const [batchCursor, setBatchCursor] = useState<string | undefined>();
  const [olderBatches, setOlderBatches] = useState<EcommerceCodRemittanceBatch[]>([]);
  const batchesPage = useListEcommerceCodRemittanceBatchesQuery(
    { limit: 20, cursor: batchCursor },
    { skip: !canRead },
  );
  const batchItems = [
    ...olderBatches,
    ...(batchesPage.data?.items ?? []),
  ];

  const resetBatchList = () => {
    setOlderBatches([]);
    setBatchCursor(undefined);
    void batchesPage.refetch();
  };

  const loadMoreBatches = () => {
    const next = batchesPage.data?.meta.nextCursor;
    if (!next || batchesPage.isFetching) return;
    setOlderBatches((prev) => [...prev, ...(batchesPage.data?.items ?? [])]);
    setBatchCursor(next);
  };

  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const batchDetail = useGetEcommerceCodRemittanceBatchQuery(activeBatchId ?? "", {
    skip: !activeBatchId || !canRead,
  });
  const [createBatch, createBatchState] = useCreateEcommerceCodRemittanceBatchMutation();
  const [addLine, addLineState] = useAddEcommerceCodRemittanceBatchLineMutation();
  const [reconcile, reconcileState] = useReconcileEcommerceCodRemittanceBatchMutation();

  const [queue, setQueue] = useState<CourierQueue>("awaiting_collection");
  const [orderCursor, setOrderCursor] = useState<string | undefined>();
  const [olderOrders, setOlderOrders] = useState<
    Array<{
      orderId: string;
      orderNumber: string;
      status: string;
      expectedCodPaise: number;
      version: number;
      updatedAt?: string;
      courierCod?: Record<string, unknown> | null;
    }>
  >([]);
  const ordersPage = useListCourierCodOrdersQuery(
    { queue, limit: 25, cursor: orderCursor },
    { skip: !canRead },
  );
  const orderItems = useMemo(
    () => [...olderOrders, ...(ordersPage.data?.items ?? [])],
    [olderOrders, ordersPage.data?.items],
  );

  const selectQueue = (next: CourierQueue) => {
    setQueue(next);
    setOrderCursor(undefined);
    setOlderOrders([]);
    setSelectedOrderId(null);
  };

  const loadMoreOrders = () => {
    const next = ordersPage.data?.meta.nextCursor;
    if (!next || ordersPage.isFetching) return;
    setOlderOrders((prev) => [...prev, ...(ordersPage.data?.items ?? [])]);
    setOrderCursor(next);
  };

  const [statementReference, setStatementReference] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [lineGrossPaise, setLineGrossPaise] = useState("");
  const [lineFeePaise, setLineFeePaise] = useState("0");
  const [bankRef, setBankRef] = useState("");
  const [bankPaise, setBankPaise] = useState("");

  const selectedOrder = useMemo(
    () => orderItems.find((o) => o.orderId === selectedOrderId) ?? null,
    [orderItems, selectedOrderId],
  );

  const queues = useMemo(() => {
    const s = summary.data;
    if (!s) return [];
    return [
      { label: "Awaiting courier collection confirmation", count: s.collectionPendingCount },
      { label: "Courier collected — awaiting remittance batch", count: s.remittanceOwedCount },
      { label: "In remittance batch (pending bank reconcile)", count: s.remittanceBatchPendingCount },
      { label: "Bank reconciled", count: s.bankReconciledCount },
      ...(s.remittanceDiscrepancyCount
        ? [{ label: "Remittance discrepancy", count: s.remittanceDiscrepancyCount }]
        : []),
    ];
  }, [summary.data]);

  if (!canRead) {
    return (
      <PageHeader title="Courier COD" description={readBlockedMessage ?? "Ecommerce read access required."} />
    );
  }
  if (summary.isLoading) return <PageSkeleton cards={2} />;
  if (summary.isError) return <QueryError error={summary.error} onRetry={summary.refetch} />;

  const batch = batchDetail.data?.batch;
  const lines = batchDetail.data?.lines ?? [];
  const netExpected = batch?.netExpectedPaise ?? 0;
  const bankCredit = batch?.bankCreditPaise;
  const isDiscrepancy = batch?.status === "DISCREPANCY";

  return (
    <div>
      <PageHeader
        title="Courier COD workspace"
        description="Manual courier POD and statement reconciliation until live courier integration is configured."
      />
      <EcommerceSectionNav />
      <p className="mb-4 text-sm text-muted-foreground">{summary.data?.courierIntegrationLabel}</p>
      <div className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {queues.map((q) => (
          <div key={q.label} className="rounded-xl border bg-muted/20 px-4 py-3">
            <p className="text-xs text-muted-foreground">{q.label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{q.count}</p>
          </div>
        ))}
      </div>
      {summary.data ? (
        <p className="mb-4 text-sm">
          Outstanding courier remittance (owed):{" "}
          <strong>{formatOrderInr(summary.data.remittanceOwedPaise)}</strong>
        </p>
      ) : null}

      <Surface title="Order queues" className="mb-6">
        <div className="space-y-4 p-6 text-sm">
          <div className="flex flex-wrap gap-2">
            {QUEUE_TABS.map((tab) => (
              <Button
                key={tab.id}
                type="button"
                size="sm"
                variant={queue === tab.id ? "default" : "outline"}
                onClick={() => selectQueue(tab.id)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
          {ordersPage.isLoading && !orderItems.length ? (
            <p className="text-muted-foreground">Loading orders…</p>
          ) : ordersPage.isError ? (
            <QueryError error={ordersPage.error} onRetry={ordersPage.refetch} />
          ) : !orderItems.length ? (
            <p className="text-muted-foreground">No orders in this queue.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {orderItems.map((row) => {
                const cc = row.courierCod ?? {};
                const tracking = cc.trackingReference ? String(cc.trackingReference) : "—";
                const batchId = cc.activeRemittanceBatchId ? String(cc.activeRemittanceBatchId) : null;
                return (
                  <li key={row.orderId} className="flex flex-wrap items-center gap-2 px-3 py-2">
                    <button
                      type="button"
                      className={`min-w-0 flex-1 text-left hover:underline ${selectedOrderId === row.orderId ? "font-semibold text-[#730321]" : ""}`}
                      onClick={() => {
                        setSelectedOrderId(row.orderId);
                        setLineGrossPaise(String(row.expectedCodPaise));
                        setLineFeePaise("0");
                      }}
                    >
                      <span className="font-medium">{row.orderNumber}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{row.status.replaceAll("_", " ").toLowerCase()}</span>
                    </button>
                    <span className="text-xs tabular-nums">{formatOrderInr(row.expectedCodPaise)}</span>
                    <span className="text-xs text-muted-foreground">Tracking {tracking}</span>
                    <span className="text-xs text-muted-foreground">{courierEvidenceLabel(cc)}</span>
                    <span className="text-xs text-muted-foreground">Age {formatAge(row.updatedAt)}</span>
                    {batchId ? (
                      <button
                        type="button"
                        className="text-xs text-[#730321] underline"
                        onClick={() => setActiveBatchId(batchId)}
                      >
                        Batch
                      </button>
                    ) : null}
                    <Link
                      href={`/ecommerce/orders/${encodeURIComponent(row.orderId)}`}
                      className="text-xs text-[#730321] underline"
                    >
                      Open
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {ordersPage.data?.meta.hasMore ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={ordersPage.isFetching}
              onClick={loadMoreOrders}
            >
              Load more orders
            </Button>
          ) : null}
        </div>
      </Surface>

      <div className="grid gap-6 lg:grid-cols-2">
        <Surface title="Remittance batches">
          <div className="space-y-3 p-6 text-sm">
            {canFulfilmentOperate ? (
              <div className="flex flex-wrap items-end gap-2 border-b pb-4">
                <div className="space-y-1">
                  <Label htmlFor="stmt">Statement reference</Label>
                  <Input
                    id="stmt"
                    value={statementReference}
                    onChange={(e) => setStatementReference(e.target.value)}
                    placeholder="Courier statement id"
                  />
                </div>
                <Button
                  type="button"
                  disabled={createBatchState.isLoading || statementReference.trim().length < 2}
                  onClick={() =>
                    void createBatch({
                      statementReference: statementReference.trim(),
                      idempotencyKey: newIdempotencyKey(),
                    })
                      .unwrap()
                      .then((b) => {
                        toast.success("Draft batch created");
                        setActiveBatchId(b._id);
                        setStatementReference("");
                        resetBatchList();
                      })
                      .catch(toastApiError)
                  }
                >
                  New draft batch
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Fulfilment operate permission required to create batches.</p>
            )}
            <ul className="space-y-2">
              {batchItems.map((b) => (
                <li key={b._id}>
                  <button
                    type="button"
                    className="w-full rounded-lg border px-3 py-2 text-left hover:bg-muted/30"
                    onClick={() => setActiveBatchId(b._id)}
                  >
                    <span className="font-medium">{b.statementReference ?? b._id}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{b.status}</span>
                  </button>
                </li>
              ))}
            </ul>
            {batchesPage.data?.meta.hasMore ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={batchesPage.isFetching}
                onClick={loadMoreBatches}
              >
                Load more batches
              </Button>
            ) : null}
          </div>
        </Surface>

        <Surface title={activeBatchId ? "Batch detail" : "Select a batch"}>
          <div className="space-y-3 p-6 text-sm">
            {!activeBatchId ? (
              <p className="text-muted-foreground">Choose a batch to add order lines or reconcile bank credit.</p>
            ) : batchDetail.isLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : batchDetail.data && batch ? (
              <>
                <p>
                  Status: <strong>{batch.status}</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  Statement {batch.statementReference ?? "—"} · Gross {formatOrderInr(batch.grossTotalPaise ?? 0)} · Fees{" "}
                  {formatOrderInr(batch.feeTotalPaise ?? 0)} · Net expected {formatOrderInr(netExpected)}
                </p>
                {bankCredit != null ? (
                  <p className={`text-xs ${isDiscrepancy ? "text-amber-900" : "text-muted-foreground"}`}>
                    Bank credit recorded: <strong>{formatOrderInr(bankCredit)}</strong>
                    {batch.bankCreditReference ? ` · Ref ${batch.bankCreditReference}` : null}
                    {isDiscrepancy ? (
                      <span className="block mt-1">
                        Expected net was {formatOrderInr(netExpected)} — batch is not fully settled until the discrepancy is resolved.
                      </span>
                    ) : null}
                  </p>
                ) : null}
                <ul className="text-xs space-y-1">
                  {lines.map((l) => (
                    <li key={l._id} className="flex flex-wrap gap-2">
                      <Link href={`/ecommerce/orders/${l.orderId}`} className="text-[#730321] underline">
                        {"orderNumber" in l && l.orderNumber ? String(l.orderNumber) : l.orderId}
                      </Link>
                      <span>Gross {formatOrderInr(l.grossPaise)}</span>
                      <span>Fee {formatOrderInr(l.feePaise ?? 0)}</span>
                      <span>Net {formatOrderInr((l.grossPaise ?? 0) - (l.feePaise ?? 0))}</span>
                    </li>
                  ))}
                </ul>
                {canFulfilmentOperate && batch.status === "DRAFT" ? (
                  <div className="space-y-2 border-t pt-3">
                    <Label>Add order line</Label>
                    {selectedOrder ? (
                      <p className="text-xs text-muted-foreground">
                        Selected: {selectedOrder.orderNumber} ({selectedOrder.orderId})
                      </p>
                    ) : (
                      <p className="text-xs text-amber-800">Select an order from a queue above, or open the order detail page.</p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Gross paise"
                        value={lineGrossPaise}
                        onChange={(e) => setLineGrossPaise(e.target.value)}
                      />
                      <Input
                        placeholder="Fee paise"
                        value={lineFeePaise}
                        onChange={(e) => setLineFeePaise(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={addLineState.isLoading || !selectedOrderId}
                      onClick={() =>
                        void addLine({
                          batchId: activeBatchId,
                          orderId: selectedOrderId!,
                          grossPaise: Number(lineGrossPaise),
                          feePaise: Number(lineFeePaise) || 0,
                          idempotencyKey: newIdempotencyKey(),
                        })
                          .unwrap()
                          .then(() => {
                            toast.success("Line added");
                            void batchDetail.refetch();
                            void summary.refetch();
                            void ordersPage.refetch();
                          })
                          .catch(toastApiError)
                      }
                    >
                      Add line
                    </Button>
                  </div>
                ) : null}
                {canFulfilmentOperate && batch.status === "DRAFT" && lines.length > 0 ? (
                  <div className="space-y-2 border-t pt-3">
                    <Label>Bank reconcile</Label>
                    <Input
                      placeholder="Bank credit reference"
                      value={bankRef}
                      onChange={(e) => setBankRef(e.target.value)}
                    />
                    <Input
                      placeholder="Bank credit paise"
                      value={bankPaise}
                      onChange={(e) => setBankPaise(e.target.value)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={reconcileState.isLoading}
                      onClick={() =>
                        void reconcile({
                          batchId: activeBatchId,
                          bankCreditReference: bankRef.trim(),
                          bankCreditPaise: Number(bankPaise),
                          idempotencyKey: newIdempotencyKey(),
                        })
                          .unwrap()
                          .then(() => {
                            toast.success("Batch reconciled");
                            void batchDetail.refetch();
                            resetBatchList();
                            void summary.refetch();
                            void ordersPage.refetch();
                          })
                          .catch(toastApiError)
                      }
                    >
                      Reconcile bank credit
                    </Button>
                  </div>
                ) : null}
              </>
            ) : (
              <QueryError error={batchDetail.error} onRetry={batchDetail.refetch} />
            )}
          </div>
        </Surface>
      </div>
    </div>
  );
}
