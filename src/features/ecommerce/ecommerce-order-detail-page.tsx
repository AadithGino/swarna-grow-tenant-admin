"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DetailRecordTabsHeader,
  detailRecordTabContentClass,
  detailRecordTabsChromeClass,
  PageHeader,
  Surface,
} from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { EcommerceSectionNav } from "@/src/features/ecommerce/ecommerce-section-nav";
import { EcommerceOrderFinancialReviewDialog } from "@/src/features/ecommerce/ecommerce-order-financial-review-dialog";
import {
  formatOrderInr,
  OrderAmountsGrid,
  OrderDetailHero,
  OrderEventTimeline,
  OrderLineItemsTable,
  OrderPaymentAttemptsList,
} from "@/src/features/ecommerce/ecommerce-order-ui";
import {
  useGetEcommerceOrderEventsQuery,
  useGetEcommerceOrderPaymentAttemptEventsQuery,
  useGetEcommerceOrderPaymentAttemptsQuery,
  useGetEcommerceOrderPaymentExceptionRefundQuery,
  useGetEcommerceOrderQuery,
  useGetEcommerceOrderReturnsQuery,
  useInitiateEcommerceOrderPaymentExceptionRefundMutation,
  useRecordEcommerceOrderPaymentExceptionRefundManualMutation,
  useRetryEcommerceOrderPaymentAttemptReconcileMutation,
  useTransitionEcommerceOrderFulfilmentMutation,
  useAcceptEcommerceCodOrderMutation,
  useRejectEcommerceCodOrderMutation,
  useRecordEcommerceCodCollectionMutation,
  useLazyDownloadEcommerceOrderInvoiceQuery,
  useGetEcommerceOrderCancellationQuery,
  useDecideEcommerceOrderCancellationMutation,
  useInitiateEcommerceOrderCancellationMutation,
  useRecordEcommerceCodCancellationManualRefundMutation,
  usePatchEcommerceOrderDeliveryTrackingMutation,
  useDecideEcommerceReturnRequestMutation,
  useRecordEcommerceReturnReceivedMutation,
  useRecordEcommerceReturnInspectionMutation,
  useCreateEcommerceReturnRefundCaseMutation,
  useRecordEcommerceReturnManualRefundMutation,
  useResolveEcommerceReturnRequestMutation,
} from "@/src/store/api/admin-api";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { useEcommerceAdminAccess } from "@/src/features/ecommerce/ecommerce-admin-shared";
import { downloadBlobUrl } from "@/src/lib/download";
import { Textarea } from "@/components/ui/textarea";
import {
  nextFulfilmentTargets,
  orderListPrimaryAction,
} from "@/src/lib/ecommerce-order-presenters";
import {
  ordersListBackHref,
  parseOrdersListFiltersFromSearchParams,
} from "@/src/lib/ecommerce-orders-url-state";
import {
  cancelStockDispositionError,
  cancelStockDispositionRequired,
  type EcommerceCancelStockDispositionChoice,
} from "@/src/lib/ecommerce-order-stock-disposition";
import { toastEcommerceOrderMutationError } from "@/src/lib/ecommerce-order-mutation-error";
import type {
  EcommerceOrderDetail,
  EcommerceOrderPaymentExceptionRefund,
  EcommerceOrderReturnSummary,
} from "@/src/types/ecommerce-order";
import { toastApiError } from "@/src/lib/api-error";

export function EcommerceOrderDetailPage({ orderId }: { orderId: string }) {
  const searchParams = useSearchParams();
  const listBackHref = useMemo(
    () =>
      ordersListBackHref(
        parseOrdersListFiltersFromSearchParams(searchParams),
        searchParams.get("cursor") ?? undefined,
      ),
    [searchParams],
  );
  const {
    canRead,
    canPaymentOperate,
    canRefundOperate,
    canFulfilmentOperate,
    readBlockedMessage,
  } = useEcommerceAdminAccess();
  const query = useGetEcommerceOrderQuery(orderId, { skip: !canRead });
  const attempts = useGetEcommerceOrderPaymentAttemptsQuery(orderId, { skip: !canRead });
  const events = useGetEcommerceOrderPaymentAttemptEventsQuery({ orderId }, { skip: !canRead });
  const orderEvents = useGetEcommerceOrderEventsQuery(orderId, { skip: !canRead });
  const exceptionRefund = useGetEcommerceOrderPaymentExceptionRefundQuery(orderId, {
    skip: !canRead,
  });
  const [transitionFulfilment, transitionState] = useTransitionEcommerceOrderFulfilmentMutation();
  const [acceptCod, acceptCodState] = useAcceptEcommerceCodOrderMutation();
  const [rejectCod, rejectCodState] = useRejectEcommerceCodOrderMutation();
  const [recordCodCollection, recordCodState] = useRecordEcommerceCodCollectionMutation();
  const [codReference, setCodReference] = useState("");
  const [initiateRefund, initiateRefundState] =
    useInitiateEcommerceOrderPaymentExceptionRefundMutation();
  const [recordManual, recordManualState] =
    useRecordEcommerceOrderPaymentExceptionRefundManualMutation();
  const [retryReconcile, retryReconcileState] =
    useRetryEcommerceOrderPaymentAttemptReconcileMutation();
  const [manualRef, setManualRef] = useState("");
  const [manualReason, setManualReason] = useState("");
  const [manualEvidence, setManualEvidence] = useState("");
  const [reconcileReason, setReconcileReason] = useState("");
  const [fetchInvoice, fetchInvoiceState] = useLazyDownloadEcommerceOrderInvoiceQuery();
  const cancellation = useGetEcommerceOrderCancellationQuery(orderId, { skip: !canRead });
  const [decideCancellation, decideState] = useDecideEcommerceOrderCancellationMutation();
  const [initiateCancellation, initiateCancelState] = useInitiateEcommerceOrderCancellationMutation();
  const [recordCodRefund, recordCodRefundState] = useRecordEcommerceCodCancellationManualRefundMutation();
  const [adminCancelReason, setAdminCancelReason] = useState("");
  const [stockDisposition, setStockDisposition] = useState<EcommerceCancelStockDispositionChoice>("");
  const [rejectDecisionReason, setRejectDecisionReason] = useState("");
  const [codRefundRecipient, setCodRefundRecipient] = useState("");
  const [codRefundMethod, setCodRefundMethod] = useState("");
  const [codRefundReference, setCodRefundReference] = useState("");
  const [codRefundProofNote, setCodRefundProofNote] = useState("");
  const [patchDelivery, patchDeliveryState] = usePatchEcommerceOrderDeliveryTrackingMutation();
  const orderReturns = useGetEcommerceOrderReturnsQuery(orderId, { skip: !canRead });
  const refreshOrder = () => {
    void query.refetch();
    void orderEvents.refetch();
    void orderReturns.refetch();
  };
  const onMutationError = (err: unknown) =>
    toastEcommerceOrderMutationError(err, { onVersionConflict: refreshOrder });
  const [codCollectionReviewOpen, setCodCollectionReviewOpen] = useState(false);
  const [codCancelRefundReviewOpen, setCodCancelRefundReviewOpen] = useState(false);
  const [manualRefundReviewOpen, setManualRefundReviewOpen] = useState(false);
  const [decideReturn] = useDecideEcommerceReturnRequestMutation();
  const [recordReturnReceived] = useRecordEcommerceReturnReceivedMutation();
  const [recordReturnInspection] = useRecordEcommerceReturnInspectionMutation();
  const [createReturnRefundCase, createReturnRefundCaseState] =
    useCreateEcommerceReturnRefundCaseMutation();
  const [recordReturnManualRefund, recordReturnManualRefundState] =
    useRecordEcommerceReturnManualRefundMutation();
  const [resolveReturn] = useResolveEcommerceReturnRequestMutation();
  const [carrierName, setCarrierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [returnDecisionReason, setReturnDecisionReason] = useState("");
  const [inspectionNote, setInspectionNote] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [replacementOrderId, setReplacementOrderId] = useState("");
  if (!canRead) {
    return (
      <PageHeader title="Order" description={readBlockedMessage ?? "Ecommerce read access required."} />
    );
  }
  if (query.isLoading) return <PageSkeleton cards={2} />;
  if (query.isError) return <QueryError error={query.error} onRetry={query.refetch} />;
  const o = query.data;
  if (!o) return null;
  const order: EcommerceOrderDetail = o;
  const fulfilmentMode = String(order.fulfilmentMode ?? "BRANCH_PICKUP");
  const fulfilmentTargets = nextFulfilmentTargets(String(order.status ?? ""), fulfilmentMode);
  const lineItems = order.lines ?? [];
  const refundRow = (exceptionRefund.data as { refund?: EcommerceOrderPaymentExceptionRefund } | undefined)
    ?.refund ?? null;
  const activeCancellation = cancellation.data?.activeRequest ?? null;
  const cancelCapabilities = cancellation.data?.capabilities;
  const codRefundAmountPaise = Number(order.totalPaise ?? 0);
  const codRefundFormValid =
    codRefundRecipient.trim().length >= 2
    && codRefundMethod.trim().length >= 2
    && codRefundReference.trim().length >= 2
    && codRefundProofNote.trim().length >= 8;
  const stockDispositionValid = cancelStockDispositionRequired(stockDisposition);
  const stockDispositionHint = cancelStockDispositionError(stockDisposition);

  const deliveryTracking =
    order.deliveryTracking && typeof order.deliveryTracking === "object"
      ? order.deliveryTracking
      : null;
  const orderReturn: EcommerceOrderReturnSummary | null =
    orderReturns.data?.activeRequest
    ?? order.returnSummary?.activeRequest
    ?? null;
  const primaryAction = orderListPrimaryAction(order);

  const stuckAttempt = (attempts.data?.items ?? []).find(
    (row) =>
      String(row.operationalStatus ?? "") === "STUCK_RECONCILE"
      || String(row.operationalStatus ?? "") === "INITIATION_UNCERTAIN",
  ) as Record<string, unknown> | undefined;

  async function onFulfilment(targetStatus: string) {
    try {
      await transitionFulfilment({
        orderId,
        targetStatus,
        expectedVersion: Number(order.version ?? 1),
      }).unwrap();
      toast.success(`Order moved to ${targetStatus}`);
      query.refetch();
      orderEvents.refetch();
    } catch (err) {
      onMutationError(err);
    }
  }

  async function onInitiateRefund() {
    try {
      await initiateRefund(orderId).unwrap();
      toast.success("Refund initiated with provider");
      exceptionRefund.refetch();
      orderEvents.refetch();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function onRecordManual() {
    try {
      await recordManual({
        orderId,
        providerRefundReference: manualRef.trim(),
        reason: manualReason.trim(),
        evidenceNote: manualEvidence.trim(),
      }).unwrap();
      toast.success("Manual refund recorded");
      setManualRef("");
      setManualReason("");
      setManualEvidence("");
      exceptionRefund.refetch();
      orderEvents.refetch();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function onDownloadInvoice() {
    try {
      const result = await fetchInvoice({
        orderId,
        orderNumber: order.orderNumber ? String(order.orderNumber) : undefined,
      }).unwrap();
      downloadBlobUrl(result.filename, result.blobUrl);
      toast.success("Invoice downloaded");
    } catch (err) {
      toastApiError(err, "Could not download invoice");
    }
  }

  async function onRetryReconcile() {
    const attemptId = String(stuckAttempt?.id ?? stuckAttempt?._id ?? "");
    if (!attemptId) return;
    try {
      await retryReconcile({
        orderId,
        paymentAttemptId: attemptId,
        reason: reconcileReason.trim(),
      }).unwrap();
      toast.message("Reconcile retry finished");
      attempts.refetch();
      query.refetch();
      orderEvents.refetch();
    } catch (err) {
      toastApiError(err);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Online store"
        title={String(o.orderNumber ?? "Order")}
        description="Order detail, fulfilment, payments, and staff actions."
        actions={
          <Link href={listBackHref} className="text-sm font-medium text-[#730321] underline-offset-4 hover:underline">
            Back to orders
          </Link>
        }
      />
      <EcommerceSectionNav />
      <OrderDetailHero
        order={order}
        primaryAction={
          <span className="rounded-lg border border-[#e4d7d2] bg-[#faf7f5] px-3 py-1.5 text-sm font-medium text-[#28161a]">
            Suggested: {primaryAction.label}
          </span>
        }
        actions={
          o.invoiceAvailable === true ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={fetchInvoiceState.isFetching}
              onClick={() => void onDownloadInvoice()}
            >
              {fetchInvoiceState.isFetching ? "Preparing…" : "Download invoice"}
            </Button>
          ) : null
        }
      />
      <div className="mb-8 grid gap-5 lg:grid-cols-2">
        <Surface title="Line items">
          <div className="p-4 sm:p-5">
            <OrderLineItemsTable lines={lineItems} />
          </div>
        </Surface>
        <Surface title="Amounts">
          <div className="p-4 sm:p-5">
            <OrderAmountsGrid order={order} />
          </div>
        </Surface>
      </div>

      <DetailRecordTabsHeader label="Staff tools & audit" />
      <Tabs defaultValue="fulfilment" className="mb-8">
        <TabsList variant="detail" className={detailRecordTabsChromeClass}>
          <TabsTrigger value="fulfilment">Fulfilment</TabsTrigger>
          <TabsTrigger value="returns">Returns & cancel</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="fulfilment" className={detailRecordTabContentClass}>
          <div className="space-y-5">
      {o.paymentMethod === "COD" && canFulfilmentOperate ? (
        <Surface title="Cash on delivery">
          <div className="flex flex-wrap gap-2 p-6">
            {o.status === "COD_PENDING_ACCEPTANCE" ? (
              <>
                <Button
                  type="button"
                  disabled={acceptCodState.isLoading}
                  onClick={() =>
                    void acceptCod({
                      orderId,
                      expectedVersion: Number(order.version ?? 1),
                    })
                      .unwrap()
                      .then(() => {
                        toast.success("COD order accepted");
                        query.refetch();
                        orderEvents.refetch();
                      })
                      .catch(toastApiError)
                  }
                >
                  Accept COD order
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={rejectCodState.isLoading}
                  onClick={() =>
                    void rejectCod({
                      orderId,
                      expectedVersion: Number(order.version ?? 1),
                    })
                      .unwrap()
                      .then(() => {
                        toast.success("COD order rejected");
                        query.refetch();
                        orderEvents.refetch();
                      })
                      .catch(toastApiError)
                  }
                >
                  Reject
                </Button>
              </>
            ) : null}
            {o.codCollectionStatus !== "COLLECTED" &&
            ["PROCESSING", "SHIPPED", "READY_FOR_PICKUP", "DELIVERED"].includes(
              String(o.status ?? ""),
            ) ? (
              <div className="flex w-full flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label htmlFor="cod-ref">Receipt / reference</Label>
                  <Input
                    id="cod-ref"
                    value={codReference}
                    onChange={(e) => setCodReference(e.target.value)}
                    placeholder="RCPT-1001"
                  />
                </div>
                <Button
                  type="button"
                  disabled={recordCodState.isLoading || !codReference.trim()}
                  onClick={() => setCodCollectionReviewOpen(true)}
                >
                  Record cash collected…
                </Button>
                <EcommerceOrderFinancialReviewDialog
                  open={codCollectionReviewOpen}
                  onOpenChange={setCodCollectionReviewOpen}
                  title="Record COD cash collection"
                  amountPaise={Number(o.totalPaise ?? 0)}
                  recipient={order.customerDisplay?.name ?? "Customer"}
                  consequence="Marks this order as cash collected in your books. Only record after physical cash is in hand."
                  permissionNote="Requires ecommerce fulfilment permission."
                  actionLabel="Confirm collection"
                  submitDisabled={!codReference.trim()}
                  onConfirm={async () => {
                    await recordCodCollection({
                      orderId,
                      expectedVersion: Number(order.version ?? 1),
                      amountPaise: Number(o.totalPaise ?? 0),
                      reference: codReference.trim(),
                      idempotencyKey: newIdempotencyKey(),
                    }).unwrap();
                    toast.success("Cash collection recorded");
                    setCodReference("");
                    setCodCollectionReviewOpen(false);
                    refreshOrder();
                  }}
                />
              </div>
            ) : null}
          </div>
        </Surface>
      ) : null}
      {fulfilmentMode === "DELIVERY" ? (
        <Surface title="Delivery tracking">
          <div className="space-y-3 p-6 text-sm">
            {deliveryTracking?.trackingNumber || deliveryTracking?.carrierName ? (
              <p className="text-muted-foreground">
                {String(deliveryTracking.carrierName ?? "")}{" "}
                {deliveryTracking.trackingNumber ? `· ${String(deliveryTracking.trackingNumber)}` : ""}
              </p>
            ) : (
              <p className="text-muted-foreground">No courier details yet.</p>
            )}
            {canFulfilmentOperate ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label htmlFor="carrier">Carrier</Label>
                  <Input id="carrier" value={carrierName} onChange={(e) => setCarrierName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="tracking">Tracking number</Label>
                  <Input
                    id="tracking"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="tracking-url">Tracking URL (https, optional)</Label>
                  <Input
                    id="tracking-url"
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    placeholder="https://…"
                  />
                </div>
                <Button
                  type="button"
                  disabled={patchDeliveryState.isLoading}
                  onClick={() =>
                    void patchDelivery({
                      orderId,
                      expectedVersion: Number(order.version ?? 1),
                      carrierName: carrierName.trim(),
                      trackingNumber: trackingNumber.trim(),
                      trackingUrl: trackingUrl.trim() || undefined,
                    })
                      .unwrap()
                      .then(() => {
                        toast.success("Delivery tracking saved");
                        query.refetch();
                      })
                      .catch(toastApiError)
                  }
                >
                  Save tracking
                </Button>
              </div>
            ) : null}
          </div>
        </Surface>
      ) : null}
      {fulfilmentTargets.length > 0 && canFulfilmentOperate && !o.paymentExceptionStatus ? (
        <Surface title="Fulfilment actions">
          <div className="flex flex-wrap gap-2 p-6">
            {fulfilmentTargets.map((target) => (
              <Button
                key={target}
                type="button"
                variant="secondary"
                disabled={transitionState.isLoading}
                onClick={() => void onFulfilment(target)}
              >
                Mark {target.replaceAll("_", " ").toLowerCase()}
              </Button>
            ))}
          </div>
          <p className="px-6 pb-4 text-xs text-muted-foreground">
            Uses expectedVersion {String(o.version ?? 1)} — refresh if the server reports a conflict.
          </p>
        </Surface>
      ) : null}
          </div>
        </TabsContent>

        <TabsContent value="returns" className={detailRecordTabContentClass}>
          <div className="space-y-5">
      <Surface title="Cancellation">
        <div className="space-y-3 p-6 text-sm">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-3">
            <Label htmlFor="cancel-stock-disposition" className="shrink-0 text-muted-foreground">
              Stock when approving cancel
            </Label>
            <Select
              value={stockDisposition || undefined}
              onValueChange={(value) =>
                setStockDisposition(value as EcommerceCancelStockDispositionChoice)
              }
            >
              <SelectTrigger id="cancel-stock-disposition" className="w-[240px]" aria-required>
                <SelectValue placeholder="Choose stock outcome…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RESTOCK_CONFIRMED">Restock confirmed</SelectItem>
                <SelectItem value="STOCK_EXCEPTION">Stock exception (no restock)</SelectItem>
              </SelectContent>
            </Select>
            {stockDispositionHint ? (
              <p className="text-xs text-amber-800">{stockDispositionHint}</p>
            ) : null}
          </div>
          {activeCancellation ? (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="font-semibold">
                Active request · {String(activeCancellation.status ?? "")}
              </p>
              <p className="mt-1 text-muted-foreground">{String(activeCancellation.reason ?? "")}</p>
              {String(activeCancellation.status) === "PENDING_DECISION" ? (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={decideState.isLoading || !stockDispositionValid}
                      onClick={() =>
                        void decideCancellation({
                          orderId,
                          decision: "APPROVE",
                          expectedVersion: Number(activeCancellation.version ?? 1),
                          stockDisposition: stockDisposition as "RESTOCK_CONFIRMED" | "STOCK_EXCEPTION",
                        })
                          .unwrap()
                          .then(() => {
                            toast.success("Cancellation approved");
                            query.refetch();
                            cancellation.refetch();
                          })
                          .catch((err) => toastApiError(err))
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={decideState.isLoading || rejectDecisionReason.trim().length < 8}
                      onClick={() =>
                        void decideCancellation({
                          orderId,
                          decision: "REJECT",
                          expectedVersion: Number(activeCancellation.version ?? 1),
                          decisionReason: rejectDecisionReason.trim(),
                        })
                          .unwrap()
                          .then(() => {
                            toast.success("Request rejected");
                            setRejectDecisionReason("");
                            cancellation.refetch();
                          })
                          .catch((err) => toastApiError(err))
                      }
                    >
                      Reject
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Rejection reason (required to reject, min 8 characters)"
                    value={rejectDecisionReason}
                    onChange={(e) => setRejectDecisionReason(e.target.value)}
                    rows={2}
                    className="max-w-md text-xs"
                  />
                </div>
              ) : null}
              {o.paymentMethod === "COD"
              && ["APPROVED_PROCESSING", "COMPLETED"].includes(String(activeCancellation.status ?? ""))
              && !activeCancellation.codManualRefund ? (
                <div className="mt-3 space-y-2 rounded-md border border-dashed p-3">
                  <p className="text-xs text-muted-foreground">
                    Record COD cancellation refund once ({formatOrderInr(codRefundAmountPaise)}).
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      placeholder="Recipient"
                      value={codRefundRecipient}
                      onChange={(e) => setCodRefundRecipient(e.target.value)}
                    />
                    <Input
                      placeholder="Method (NEFT/UPI)"
                      value={codRefundMethod}
                      onChange={(e) => setCodRefundMethod(e.target.value)}
                    />
                    <Input
                      placeholder="Reference / UTR"
                      value={codRefundReference}
                      onChange={(e) => setCodRefundReference(e.target.value)}
                    />
                    <Input
                      placeholder="Proof note (min 8 chars)"
                      value={codRefundProofNote}
                      onChange={(e) => setCodRefundProofNote(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={recordCodRefundState.isLoading || !codRefundFormValid}
                    onClick={() => setCodCancelRefundReviewOpen(true)}
                  >
                    Record COD cancellation refund…
                  </Button>
                  <EcommerceOrderFinancialReviewDialog
                    open={codCancelRefundReviewOpen}
                    onOpenChange={setCodCancelRefundReviewOpen}
                    title="Record COD cancellation refund"
                    amountPaise={codRefundAmountPaise}
                    recipient={codRefundRecipient.trim()}
                    consequence="Audited manual refund for a cancelled COD order. Cannot be undone."
                    permissionNote="Requires ecommerce refund permission."
                    actionLabel="Record refund"
                    submitDisabled={!codRefundFormValid}
                    onConfirm={async () => {
                      await recordCodRefund({
                        orderId,
                        idempotencyKey: newIdempotencyKey(),
                        amountPaise: codRefundAmountPaise,
                        recipient: codRefundRecipient.trim(),
                        method: codRefundMethod.trim(),
                        reference: codRefundReference.trim(),
                        proofNote: codRefundProofNote.trim(),
                      }).unwrap();
                      toast.success("COD cancellation refund recorded");
                      cancellation.refetch();
                      refreshOrder();
                      setCodCancelRefundReviewOpen(false);
                    }}
                  />
                </div>
              ) : activeCancellation.codManualRefund ? (
                <p className="mt-2 text-xs text-muted-foreground">COD cancellation refund already recorded.</p>
              ) : null}
            </div>
          ) : (
            <p className="text-muted-foreground">No open cancellation request.</p>
          )}
          {cancelCapabilities?.adminCancelAllowed ? (
            <div className="space-y-2">
              <Textarea
                value={adminCancelReason}
                onChange={(e) => setAdminCancelReason(e.target.value)}
                placeholder="Staff cancellation reason (min 8 chars)"
                rows={3}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={initiateCancelState.isLoading || !stockDispositionValid}
                onClick={() =>
                  void initiateCancellation({
                    orderId,
                    reason: adminCancelReason.trim(),
                    expectedVersion: Number(order.version ?? 1),
                    idempotencyKey: newIdempotencyKey(),
                    stockDisposition: stockDisposition as "RESTOCK_CONFIRMED" | "STOCK_EXCEPTION",
                  })
                    .unwrap()
                    .then(() => {
                      toast.success("Cancellation initiated");
                      query.refetch();
                      cancellation.refetch();
                    })
                    .catch(toastApiError)
                }
              >
                Staff-initiated cancellation
              </Button>
            </div>
          ) : null}
        </div>
      </Surface>
      {orderReturn ? (
        <Surface title="Return / exchange request">
          <div className="space-y-3 p-6 text-sm">
            <p>
              Status: <strong>{String(orderReturn.status ?? "")}</strong> ·{" "}
              {String(orderReturn.kind ?? "RETURN")}
            </p>
            <p className="text-muted-foreground">{String(orderReturn.reason ?? "")}</p>
            {canFulfilmentOperate && orderReturn.status === "PENDING_REVIEW" ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    void decideReturn({
                      returnRequestId: String(orderReturn.id),
                      decision: "APPROVE",
                      expectedVersion: Number(orderReturn.version ?? 1),
                      decisionReason: returnDecisionReason.trim() || undefined,
                    })
                      .unwrap()
                      .then(() => {
                        toast.success("Return approved");
                        orderReturns.refetch();
                      })
                      .catch(toastApiError)
                  }
                >
                  Approve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void decideReturn({
                      returnRequestId: String(orderReturn.id),
                      decision: "REJECT",
                      expectedVersion: Number(orderReturn.version ?? 1),
                      decisionReason: returnDecisionReason.trim() || undefined,
                    })
                      .unwrap()
                      .then(() => {
                        toast.success("Return rejected");
                        orderReturns.refetch();
                      })
                      .catch(toastApiError)
                  }
                >
                  Reject
                </Button>
                <Input
                  className="max-w-md"
                  placeholder="Decision note (optional)"
                  value={returnDecisionReason}
                  onChange={(e) => setReturnDecisionReason(e.target.value)}
                />
              </div>
            ) : null}
            {canFulfilmentOperate && orderReturn.status === "APPROVED" ? (
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  void recordReturnReceived({
                    returnRequestId: String(orderReturn.id),
                    expectedVersion: Number(orderReturn.version ?? 1),
                  })
                    .unwrap()
                    .then(() => {
                      toast.success("Return parcel receipt recorded (no restock yet)");
                      orderReturns.refetch();
                    })
                    .catch(toastApiError)
                }
              >
                Confirm physical return received
              </Button>
            ) : null}
            {canFulfilmentOperate && orderReturn.status === "RECEIVED" ? (
              <div className="flex flex-col gap-2 border-t pt-3">
                <p className="text-xs text-muted-foreground">
                  Restock only after inspection approves the item for resale. Receipt alone does not restock.
                </p>
                <Textarea
                  rows={2}
                  className="max-w-md"
                  placeholder="Inspection note"
                  value={inspectionNote}
                  onChange={(e) => setInspectionNote(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      void recordReturnInspection({
                        returnRequestId: String(orderReturn.id),
                        expectedVersion: Number(orderReturn.version ?? 1),
                        inspectionNote: inspectionNote.trim(),
                        inspectionOutcome: "APPROVED_FOR_RESALE",
                        confirmRestockInventory: true,
                      })
                        .unwrap()
                        .then(() => {
                          toast.success("Approved for resale; inventory restocked once if evidence allows");
                          orderReturns.refetch();
                        })
                        .catch(toastApiError)
                    }
                  >
                    Approve for resale + restock
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void recordReturnInspection({
                        returnRequestId: String(orderReturn.id),
                        expectedVersion: Number(orderReturn.version ?? 1),
                        inspectionNote: inspectionNote.trim(),
                        inspectionOutcome: "REJECTED_NOT_RESALABLE",
                      })
                        .unwrap()
                        .then(() => {
                          toast.success("Inspection recorded — not restocked");
                          orderReturns.refetch();
                        })
                        .catch(toastApiError)
                    }
                  >
                    Reject for resale (no restock)
                  </Button>
                </div>
              </div>
            ) : null}
            {canFulfilmentOperate && orderReturn.status === "INSPECTED" ? (
              <div className="space-y-2 border-t pt-3">
                {orderReturn.kind === "RETURN" && canRefundOperate ? (
                  <div className="space-y-2 rounded-md border border-dashed p-3">
                    <p className="text-xs text-muted-foreground">
                      Refunds are separate from resolution. Online orders open an ORDER_RETURN refund case;
                      COD uses auditable manual proof (exactly once).
                    </p>
                    {orderReturn.onlineRefundId ? (
                      <p className="text-xs font-mono">
                        Refund case: {String(orderReturn.onlineRefundId)}
                      </p>
                    ) : orderReturn.manualRefundRecordedAt ? (
                      <p className="text-xs text-muted-foreground">Manual return refund recorded.</p>
                    ) : o.paymentMethod === "COD" ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          placeholder="Recipient"
                          value={codRefundRecipient}
                          onChange={(e) => setCodRefundRecipient(e.target.value)}
                        />
                        <Input
                          placeholder="Method (NEFT/UPI)"
                          value={codRefundMethod}
                          onChange={(e) => setCodRefundMethod(e.target.value)}
                        />
                        <Input
                          placeholder="Reference / UTR"
                          value={codRefundReference}
                          onChange={(e) => setCodRefundReference(e.target.value)}
                        />
                        <Input
                          placeholder="Proof note"
                          value={codRefundProofNote}
                          onChange={(e) => setCodRefundProofNote(e.target.value)}
                        />
                        <Button
                          type="button"
                          size="sm"
                          disabled={recordReturnManualRefundState.isLoading}
                          onClick={() =>
                            void recordReturnManualRefund({
                              returnRequestId: String(orderReturn.id),
                              expectedVersion: Number(orderReturn.version ?? 1),
                              amountPaise: Number(o.totalPaise ?? 0),
                              recipient: codRefundRecipient.trim(),
                              method: codRefundMethod.trim(),
                              reference: codRefundReference.trim(),
                              proofNote: codRefundProofNote.trim(),
                            })
                              .unwrap()
                              .then(() => {
                                toast.success("Manual return refund recorded");
                                orderReturns.refetch();
                              })
                              .catch(toastApiError)
                          }
                        >
                          Record manual return refund
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={createReturnRefundCaseState.isLoading}
                        onClick={() =>
                          void createReturnRefundCase({
                            returnRequestId: String(orderReturn.id),
                            expectedVersion: Number(orderReturn.version ?? 1),
                          })
                            .unwrap()
                            .then((res) => {
                              toast.success(
                                (res as { created?: boolean }).created === false
                                  ? "Refund case already exists"
                                  : "Return refund case created — initiate provider refund from payment tools",
                              );
                              orderReturns.refetch();
                            })
                            .catch(toastApiError)
                        }
                      >
                        Open return refund case
                      </Button>
                    )}
                  </div>
                ) : null}
                <Textarea
                  rows={2}
                  placeholder="Resolution summary"
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                />
                <Input
                  placeholder="Linked replacement order ID (exchange, optional)"
                  value={replacementOrderId}
                  onChange={(e) => setReplacementOrderId(e.target.value)}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    void resolveReturn({
                      returnRequestId: String(orderReturn.id),
                      expectedVersion: Number(orderReturn.version ?? 1),
                      resolutionNote: resolutionNote.trim(),
                      replacementOrderId: replacementOrderId.trim() || undefined,
                    })
                      .unwrap()
                      .then(() => {
                        toast.success("Return resolved");
                        orderReturns.refetch();
                      })
                      .catch(toastApiError)
                  }
                >
                  Mark resolved
                </Button>
              </div>
            ) : null}
          </div>
        </Surface>
      ) : null}
          </div>
        </TabsContent>

        <TabsContent value="payments" className={detailRecordTabContentClass}>
          <div className="space-y-5">
      {(o.paymentExceptionStatus || refundRow) && (
        <Surface title="Payment exception refund">
          <div className="space-y-3 p-6 text-sm">
            {refundRow ? (
              <>
                <div>
                  Case status: <strong>{String(refundRow.status ?? "")}</strong>
                </div>
                {refundRow.providerRefundId ? (
                  <div className="font-mono text-xs">Provider ref: {String(refundRow.providerRefundId)}</div>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground">No refund case row yet.</p>
            )}
            {canRefundOperate ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={initiateRefundState.isLoading}
                  onClick={() => void onInitiateRefund()}
                >
                  Initiate provider refund
                </Button>
              </div>
            ) : null}
            {canRefundOperate ? (
              <div className="mt-4 space-y-2 border-t pt-4">
                <p className="text-xs font-medium text-muted-foreground">Record manual resolution</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="manual-ref">Provider reference</Label>
                    <Input id="manual-ref" value={manualRef} onChange={(e) => setManualRef(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="manual-reason">Reason</Label>
                    <Input
                      id="manual-reason"
                      value={manualReason}
                      onChange={(e) => setManualReason(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="manual-evidence">Evidence note</Label>
                  <Input
                    id="manual-evidence"
                    value={manualEvidence}
                    onChange={(e) => setManualEvidence(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={recordManualState.isLoading}
                  onClick={() => setManualRefundReviewOpen(true)}
                >
                  Record manual refund…
                </Button>
                <EcommerceOrderFinancialReviewDialog
                  open={manualRefundReviewOpen}
                  onOpenChange={setManualRefundReviewOpen}
                  title="Record manual payment exception refund"
                  amountPaise={Number(order.totalPaise ?? 0)}
                  consequence="Closes the exception with manual proof. Do not use if provider refund already succeeded."
                  permissionNote="Requires ecommerce refund permission."
                  actionLabel="Record manual refund"
                  onConfirm={async () => {
                    await onRecordManual();
                    setManualRefundReviewOpen(false);
                  }}
                />
              </div>
            ) : null}
          </div>
        </Surface>
      )}
      {stuckAttempt && canPaymentOperate ? (
        <Surface title="Operator reconcile">
          <div className="space-y-3 p-6 text-sm">
            <p>
              Attempt {String(stuckAttempt.id ?? stuckAttempt._id)} ·{" "}
              {String(stuckAttempt.operationalStatus ?? "")}
            </p>
            <div>
              <Label htmlFor="reconcile-reason">Reason for retry</Label>
              <Input
                id="reconcile-reason"
                value={reconcileReason}
                onChange={(e) => setReconcileReason(e.target.value)}
              />
            </div>
            <Button
              type="button"
              size="sm"
              disabled={retryReconcileState.isLoading || reconcileReason.trim().length < 8}
              onClick={() => void onRetryReconcile()}
            >
              Safe reconcile retry
            </Button>
          </div>
        </Surface>
      ) : null}
      <Surface title="Payment attempts">
        <div className="p-4 sm:p-5">
          <OrderPaymentAttemptsList items={(attempts.data?.items ?? []) as Record<string, unknown>[]} />
        </div>
      </Surface>
      <Surface title="Gateway audit (read-only)">
        <div className="p-4 sm:p-5">
          <OrderEventTimeline items={(events.data?.items ?? []).slice(0, 40) as Record<string, unknown>[]} />
        </div>
      </Surface>
          </div>
        </TabsContent>

        <TabsContent value="activity" className={detailRecordTabContentClass}>
          <Surface title="Order timeline">
            <div className="p-4 sm:p-5">
              <OrderEventTimeline
                items={(orderEvents.data?.items ?? []).slice(0, 80) as Record<string, unknown>[]}
              />
            </div>
          </Surface>
        </TabsContent>
      </Tabs>
    </>
  );
}
