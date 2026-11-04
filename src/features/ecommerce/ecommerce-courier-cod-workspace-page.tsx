"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, StatCard, Surface } from "@/src/components/common/page-parts";
import { EmptyState, PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { FilterBar, QuickViews } from "@/src/components/admin-ui/filter-bar";
import { Notice } from "@/src/components/admin-ui/detail-parts";
import { AlertTriangle, Banknote, Package, Truck } from "lucide-react";
import { useEcommerceAdminAccess } from "@/src/features/ecommerce/ecommerce-admin-shared";
import { formatOrderInr } from "@/src/features/ecommerce/ecommerce-order-ui";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { toastApiError } from "@/src/lib/api-error";
import type { EcommerceCodRemittanceBatch } from "@/src/types/ecommerce-order";
import { EcommerceRecordMoneyReceivedPanel } from "@/src/features/ecommerce/ecommerce-record-money-received-panel";
import {
  useAddEcommerceCodRemittanceBatchLineMutation,
  useCreateEcommerceCodRemittanceBatchMutation,
  useGetEcommerceCodRemittanceBatchQuery,
  useGetEcommerceCourierCodSummaryQuery,
  useListCourierCodOrdersQuery,
  useListEcommerceCodRemittanceBatchesQuery,
  useReconcileEcommerceCodRemittanceBatchMutation,
  useRecordEcommerceCourierMoneyReceivedMutation,
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
  const [recordMoney, recordMoneyState] = useRecordEcommerceCourierMoneyReceivedMutation();

  const [queue, setQueue] = useState<CourierQueue>("awaiting_collection");
  const [selectedForRemittance, setSelectedForRemittance] = useState<Set<string>>(() => new Set());
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
    setSelectedForRemittance(new Set());
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

  const selectedRemittanceOrders = useMemo(
    () =>
      orderItems
        .filter((o) => selectedForRemittance.has(o.orderId))
        .map((o) => ({
          orderId: o.orderId,
          orderNumber: o.orderNumber,
          expectedCodPaise: o.expectedCodPaise,
        })),
    [orderItems, selectedForRemittance],
  );

  const toggleRemittanceSelection = (orderId: string) => {
    setSelectedForRemittance((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

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
      <PageHeader title="Courier cash" description={readBlockedMessage ?? "Ecommerce read access required."} />
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Online store"
        icon={Truck}
        title="Courier cash"
        description="Record the cash couriers collected on delivery. Remittance batches and bank matching are handled below when you need them."
        meta={summary.data?.courierIntegrationLabel ? <span>{summary.data.courierIntegrationLabel}</span> : undefined}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {queues.map((q, i) => {
          const icons = [Truck, Package, Banknote, Package];
          const tones = ["gold", "cream", "wine", "green"] as const;
          const Icon = icons[i] ?? Truck;
          const tone = tones[i] ?? "wine";
          return (
            <StatCard
              key={q.label}
              icon={q.label.includes("discrepancy") ? AlertTriangle : Icon}
              tone={q.label.includes("discrepancy") ? "red" : tone}
              label={q.label}
              value={q.count}
            />
          );
        })}
      </div>
      {summary.data ? (
        <Notice tone="wine" icon={Banknote}>
          Courier still owes you <strong className="tabular-nums">{formatOrderInr(summary.data.remittanceOwedPaise)}</strong> for confirmed COD collections.
        </Notice>
      ) : null}

      <section className="overflow-hidden rounded-[1.15rem] border border-[#e8dcd7] bg-white">
        <FilterBar
          quickViews={<QuickViews value={queue} onChange={(v) => selectQueue(v as CourierQueue)} options={QUEUE_TABS.map((t) => ({ value: t.id, label: t.label }))} ariaLabel="COD queue" />}
          resultLabel={
            queue === "awaiting_remittance"
              ? `${orderItems.length}${ordersPage.data?.meta.hasMore ? "+" : ""} orders · select orders then record bank deposit`
              : `${orderItems.length}${ordersPage.data?.meta.hasMore ? "+" : ""} orders · pick one to add it to a batch`
          }
        />
        <div className="text-sm">
          {ordersPage.isLoading && !orderItems.length ? (
            <p className="px-5 py-6 text-muted-foreground">Loading orders…</p>
          ) : ordersPage.isError ? (
            <QueryError error={ordersPage.error} onRetry={ordersPage.refetch} />
          ) : !orderItems.length ? (
            <EmptyState icon={Truck} title="Nothing in this queue" detail="Orders move here as couriers collect cash and remittances arrive." />
          ) : (
            <ul className="divide-y divide-[#f3eae7]">
              {orderItems.map((row) => {
                const cc = row.courierCod ?? {};
                const tracking = cc.trackingReference ? String(cc.trackingReference) : "—";
                const batchId = cc.activeRemittanceBatchId ? String(cc.activeRemittanceBatchId) : null;
                const selected =
                  queue === "awaiting_remittance"
                    ? selectedForRemittance.has(row.orderId)
                    : selectedOrderId === row.orderId;
                return (
                  <li
                    key={row.orderId}
                    className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-3 sm:grid-cols-[auto_minmax(0,1.1fr)_minmax(0,1fr)_7rem_8rem_auto] ${selected ? "bg-[#fbf1f3]" : "hover:bg-[#fcf6f4]"}`}
                  >
                    {queue === "awaiting_remittance" ? (
                      <input
                        type="checkbox"
                        className="size-4 accent-[#7b0a2b]"
                        aria-label={`Select ${row.orderNumber} for remittance`}
                        checked={selectedForRemittance.has(row.orderId)}
                        onChange={() => toggleRemittanceSelection(row.orderId)}
                      />
                    ) : null}
                    <button
                      type="button"
                      aria-pressed={selected}
                      className="min-w-0 text-left"
                      onClick={() => {
                        if (queue === "awaiting_remittance") {
                          toggleRemittanceSelection(row.orderId);
                          return;
                        }
                        setSelectedOrderId(row.orderId);
                        setLineGrossPaise(String(row.expectedCodPaise));
                        setLineFeePaise("0");
                      }}
                    >
                      <span className={`block font-semibold ${selected ? "text-[#5e0a20]" : "text-[#28161a]"}`}>{row.orderNumber}</span>
                      <span className="block text-xs text-[#857a7d]">{row.status.replaceAll("_", " ").toLowerCase()}</span>
                    </button>
                    <span className="hidden min-w-0 text-xs text-[#6f6265] sm:block">
                      <span className="block truncate">Tracking {tracking}</span>
                      <span className="block truncate">{courierEvidenceLabel(cc)}</span>
                    </span>
                    <span className="hidden text-xs text-[#857a7d] sm:block">{formatAge(row.updatedAt)}</span>
                    <span className="text-right font-bold tabular-nums">{formatOrderInr(row.expectedCodPaise)}</span>
                    <span className="col-span-2 flex justify-end gap-3 text-xs sm:col-span-1">
                      {batchId ? (
                        <button type="button" className="font-semibold text-[#7b0a2b] hover:underline" onClick={() => setActiveBatchId(batchId)}>
                          Batch
                        </button>
                      ) : null}
                      <Link href={`/ecommerce/orders/${encodeURIComponent(row.orderId)}`} className="font-semibold text-[#7b0a2b] hover:underline">
                        Open
                      </Link>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {ordersPage.data?.meta.hasMore ? (
            <div className="border-t border-[#efe5e1] bg-[#fbf8f6] px-5 py-3">
              <Button type="button" variant="outline" size="sm" className="rounded-lg" disabled={ordersPage.isFetching} onClick={loadMoreOrders}>
                Load more orders
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      {queue === "awaiting_remittance" ? (
        <EcommerceRecordMoneyReceivedPanel
          selectedOrders={selectedRemittanceOrders}
          canOperate={canFulfilmentOperate}
          isSubmitting={recordMoneyState.isLoading}
          onSubmit={(payload) =>
            recordMoney({
              ...payload,
              idempotencyKey: newIdempotencyKey(),
            }).unwrap()
          }
          onSuccess={({ outcomeLabel }) => {
            toast.success(
              outcomeLabel && outcomeLabel !== "Matched"
                ? `Money recorded — ${outcomeLabel}.`
                : "Money recorded and matched to the bank deposit.",
            );
            setSelectedForRemittance(new Set());
            void ordersPage.refetch();
            void summary.refetch();
            resetBatchList();
          }}
          onError={toastApiError}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Surface title="Remittance batches (advanced)">
          <div className="space-y-3 p-5 text-sm">
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
          <div className="space-y-3 p-5 text-sm">
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
