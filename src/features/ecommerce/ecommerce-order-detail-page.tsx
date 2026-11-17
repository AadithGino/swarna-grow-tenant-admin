"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  detailRecordTabContentClass,
  detailRecordTabsChromeClass,
  PageHeader,
  Surface,
} from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import {
  formatOrderWhen,
  OrderAmountsGrid,
  OrderEventTimeline,
  OrderLineItemsTable,
  OrderProgress,
  OrderSideCards,
} from "@/src/features/ecommerce/ecommerce-order-ui";
import { StatusBadge } from "@/src/components/common/status-badge";
import { Download } from "lucide-react";
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
  useShipEcommerceOrderMutation,
  useConfirmEcommerceOrderDeliveryMutation,
  useReadyEcommerceOrderForPickupMutation,
  useConfirmEcommercePickupCollectionMutation,
  useReissueEcommercePickupCodeMutation,
  useAcceptEcommerceCodOrderMutation,
  useRejectEcommerceCodOrderMutation,
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
import {
  codDeliveredFulfilmentLabel,
  nextFulfilmentTargets,
  orderListPrimaryAction,
} from "@/src/lib/ecommerce-order-presenters";
import {
  ordersListBackHref,
  parseOrdersListFiltersFromSearchParams,
} from "@/src/lib/ecommerce-orders-url-state";
import { toastEcommerceOrderMutationError } from "@/src/lib/ecommerce-order-mutation-error";
import type {
  EcommerceOrderDetail,
  EcommerceOrderPaymentExceptionRefund,
  EcommerceOrderReturnSummary,
} from "@/src/types/ecommerce-order";
import { toastApiError } from "@/src/lib/api-error";
import { EcommerceCourierCodOrderPanel } from "@/src/features/ecommerce/ecommerce-courier-cod-order-panel";
import { EcommercePickupCollectionPanel } from "@/src/features/ecommerce/ecommerce-pickup-collection-panel";
import { EcommerceOrderCancellationJourney } from "@/src/features/ecommerce/ecommerce-order-cancellation-journey";
import { EcommerceOrderReturnJourney } from "@/src/features/ecommerce/ecommerce-order-return-journey";
import { EcommerceOrderRefundsPanel } from "@/src/features/ecommerce/ecommerce-order-refunds-panel";

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
  const [shipOrder, shipOrderState] = useShipEcommerceOrderMutation();
  const [confirmDelivery, confirmDeliveryState] = useConfirmEcommerceOrderDeliveryMutation();
  const [readyPickup, readyPickupState] = useReadyEcommerceOrderForPickupMutation();
  const [reissuePickup, reissuePickupState] = useReissueEcommercePickupCodeMutation();
  const [confirmPickup, confirmPickupState] = useConfirmEcommercePickupCollectionMutation();
  const [acceptCod, acceptCodState] = useAcceptEcommerceCodOrderMutation();
  const [rejectCod, rejectCodState] = useRejectEcommerceCodOrderMutation();
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
  const [deliveryProofReference, setDeliveryProofReference] = useState("");
  const [deliveryRecipientName, setDeliveryRecipientName] = useState("");
  const [codCollectOnDelivery, setCodCollectOnDelivery] = useState(false);
  const [courierCollectionReference, setCourierCollectionReference] = useState("");
  const [courierCollectionNote, setCourierCollectionNote] = useState("");
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
  const schemePurchase = (o.financialSnapshot as { schemePurchase?: Record<string, unknown> } | undefined)?.schemePurchase;
  const fulfilmentMode = String(order.fulfilmentMode ?? "BRANCH_PICKUP");
  const fulfilmentTargets = nextFulfilmentTargets(String(order.status ?? ""), fulfilmentMode);
  const lineItems = order.lines ?? [];
  const refundRow = (exceptionRefund.data as { refund?: EcommerceOrderPaymentExceptionRefund } | undefined)
    ?.refund ?? null;

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
    const version = Number(order.version ?? 1);
    try {
      if (targetStatus === "SHIPPED" && fulfilmentMode === "DELIVERY") {
        await shipOrder({
          orderId,
          expectedVersion: version,
          carrierName: carrierName.trim(),
          trackingNumber: trackingNumber.trim(),
          trackingUrl: trackingUrl.trim() || undefined,
          idempotencyKey: newIdempotencyKey(),
        }).unwrap();
        toast.success("Order shipped with tracking saved.");
      } else if (targetStatus === "DELIVERED" && String(order.status) === "SHIPPED") {
        const cod = order.paymentMethod === "COD";
        if (cod && codCollectOnDelivery && courierCollectionReference.trim().length < 2) {
          toast.error("Enter the courier collection reference to confirm payment with delivery.");
          return;
        }
        await confirmDelivery({
          orderId,
          expectedVersion: version,
          proofReference: deliveryProofReference.trim(),
          recipientName: deliveryRecipientName.trim(),
          courierCollectionReference:
            cod && codCollectOnDelivery ? courierCollectionReference.trim() : undefined,
          courierCollectionEvidenceNote:
            cod && codCollectOnDelivery && courierCollectionNote.trim()
              ? courierCollectionNote.trim()
              : undefined,
          idempotencyKey: newIdempotencyKey(),
        }).unwrap();
        toast.success(
          cod
            ? codCollectOnDelivery
              ? "Delivered & payment collected"
              : "Delivered · Payment unconfirmed."
            : "Delivery confirmed with proof recorded.",
        );
      } else if (targetStatus === "READY_FOR_PICKUP") {
        await readyPickup({
          orderId,
          expectedVersion: version,
          idempotencyKey: newIdempotencyKey(),
        }).unwrap();
        toast.success("Ready for pickup — the customer can see their code in the shop app.");
      } else {
        await transitionFulfilment({ orderId, targetStatus, expectedVersion: version }).unwrap();
        toast.success(schemePurchase?.approvalStatus === "PENDING"
          ? targetStatus === "PAID" ? "Scheme purchase approved" : "Scheme purchase rejected"
          : `Order moved to ${targetStatus}`);
      }
      query.refetch();
      orderEvents.refetch();
    } catch (err) {
      onMutationError(err);
    }
  }

  function fulfilmentActionLabel(target: string) {
    if (target === "SHIPPED") return "Ship order";
    if (target === "DELIVERED" && String(order.status) === "SHIPPED") return "Confirm delivery";
    if (target === "READY_FOR_PICKUP") return "Ready for pickup";
    if (target === "DELIVERED") return "Mark collected";
    return `Mark ${target.replaceAll("_", " ").toLowerCase()}`;
  }

  async function onInitiateRefund() {
    try {
      await initiateRefund({ orderId, refundId: refundRow?._id ?? refundRow?.id }).unwrap();
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
        refundId: refundRow?._id ?? refundRow?.id,
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
    <div className="space-y-6">
      <PageHeader
        back={{ href: listBackHref, label: "Orders" }}
        eyebrow="Online store"
        title={`Order ${String(o.orderNumber ?? o.id ?? "")}`}
        meta={
          <>
            <StatusBadge
              status={String(order.status ?? "")}
              label={
                order.status === "COD_PENDING_ACCEPTANCE"
                  ? "COD to accept"
                  : codDeliveredFulfilmentLabel(order)
              }
            />
            <span className="rounded-full bg-[#f6efec] px-2.5 py-0.5 text-xs font-semibold text-[#5c4a4e]">
              {order.paymentMethod === "COD" ? "Cash on delivery" : "Paid online"}
            </span>
            {order.paymentExceptionStatus ? (
              <StatusBadge status="FAILED" label={String(order.paymentExceptionStatus).replaceAll("_", " ").toLowerCase()} />
            ) : null}
            <span>Placed {formatOrderWhen(order.createdAt)}</span>
          </>
        }
        actions={
          <>
            {primaryAction.label !== "Open" ? (
              <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#ecd3d9] bg-[#fbf1f3] px-3 text-sm font-semibold text-[#5e0a20]">
                Next: {primaryAction.label}
              </span>
            ) : null}
            {o.invoiceAvailable === true ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl"
                disabled={fetchInvoiceState.isFetching}
                onClick={() => void onDownloadInvoice()}
              >
                <Download /> {fetchInvoiceState.isFetching ? "Preparing…" : "Invoice"}
              </Button>
            ) : null}
          </>
        }
      />
      <OrderProgress order={order} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-6">
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Surface title={`Items (${lineItems.length})`}>
          <OrderLineItemsTable lines={lineItems} />
        </Surface>
        <Surface title="Amounts">
          <OrderAmountsGrid order={order} />
        </Surface>
      </div>

      <Surface title="Staff actions" description="Fulfil, handle cancellations and returns, fix payments, and see the full history.">
      <Tabs defaultValue="fulfilment">
        <TabsList variant="detail" className={detailRecordTabsChromeClass}>
          <TabsTrigger value="fulfilment">Fulfilment</TabsTrigger>
          <TabsTrigger value="returns">Returns & cancel</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="fulfilment" className={detailRecordTabContentClass}>
          <div className="space-y-5">
      {schemePurchase?.approvalStatus === "PENDING" && o.status === "PENDING_PAYMENT" && canFulfilmentOperate && (
        <div className="space-y-3 rounded-xl border p-4">
          <h2 className="font-semibold">Scheme purchase approval</h2>
          <p className="text-sm text-muted-foreground">Scheme {String(schemePurchase.schemeId)}. The customer can pay the top-up after approval.</p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={transitionState.isLoading} onClick={() => void onFulfilment("PAID")}>Approve scheme purchase</Button>
            <Button variant="outline" disabled={transitionState.isLoading} onClick={() => void onFulfilment("CANCELLED")}>Reject purchase</Button>
          </div>
        </div>
      )}
      {o.paymentMethod === "COD" && canFulfilmentOperate ? (
        <Surface title="Cash on delivery">
          <div className="flex flex-wrap gap-2 p-5">
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
          </div>
        </Surface>
      ) : null}
      {order.paymentMethod === "COD" ? (
        <EcommerceCourierCodOrderPanel
          order={order}
          canFulfilmentOperate={canFulfilmentOperate}
          onRefresh={refreshOrder}
        />
      ) : null}
      {fulfilmentMode === "DELIVERY" ? (
        <Surface title="Delivery tracking">
          <div className="space-y-3 p-5 text-sm">
            {deliveryTracking?.trackingNumber || deliveryTracking?.carrierName ? (
              <p className="text-muted-foreground">
                {String(deliveryTracking.carrierName ?? "")}{" "}
                {deliveryTracking.trackingNumber ? `· ${String(deliveryTracking.trackingNumber)}` : ""}
              </p>
            ) : (
              <p className="text-muted-foreground">No courier details yet.</p>
            )}
            {String(order.status) === "SHIPPED" && canFulfilmentOperate ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 border-t border-dashed pt-3">
                <div>
                  <Label htmlFor="delivery-proof">Delivery proof reference</Label>
                  <Input
                    id="delivery-proof"
                    value={deliveryProofReference}
                    onChange={(e) => setDeliveryProofReference(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="delivery-recipient">Recipient name</Label>
                  <Input
                    id="delivery-recipient"
                    value={deliveryRecipientName}
                    onChange={(e) => setDeliveryRecipientName(e.target.value)}
                  />
                </div>
                {order.paymentMethod === "COD" ? (
                  <>
                    <label className="sm:col-span-2 flex cursor-pointer items-start gap-2 rounded-lg border border-dashed p-3">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={codCollectOnDelivery}
                        onChange={(e) => setCodCollectOnDelivery(e.target.checked)}
                      />
                      <span className="text-sm">
                        Courier collected payment — record collection in the same step as delivery.
                      </span>
                    </label>
                    {codCollectOnDelivery ? (
                      <>
                        <div>
                          <Label htmlFor="courier-collect-ref">Courier collection reference</Label>
                          <Input
                            id="courier-collect-ref"
                            value={courierCollectionReference}
                            onChange={(e) => setCourierCollectionReference(e.target.value)}
                            placeholder="POD / courier receipt id"
                          />
                        </div>
                        <div>
                          <Label htmlFor="courier-collect-note">Collection evidence note (optional)</Label>
                          <Input
                            id="courier-collect-note"
                            value={courierCollectionNote}
                            onChange={(e) => setCourierCollectionNote(e.target.value)}
                          />
                        </div>
                      </>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}
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
      {fulfilmentMode === "BRANCH_PICKUP" ? (
        <EcommercePickupCollectionPanel
          order={order}
          canOperate={canFulfilmentOperate}
          isConfirming={confirmPickupState.isLoading}
          isReissuing={reissuePickupState.isLoading}
          reissueCode={() => reissuePickup({ orderId: order.id, expectedVersion: Number(order.version ?? 1), idempotencyKey: newIdempotencyKey() }).unwrap()}
          confirmCollection={(args) => confirmPickup(args).unwrap()}
          onSuccess={refreshOrder}
          onError={() => {}}
        />
      ) : null}
      {fulfilmentTargets.length > 0 && canFulfilmentOperate && !o.paymentExceptionStatus ? (
        <Surface title="Fulfilment actions">
          <div className="flex flex-wrap gap-2 p-5">
            {fulfilmentTargets.map((target) => (
              <Button
                key={target}
                type="button"
                className="rounded-xl"
                disabled={
                  transitionState.isLoading
                  || shipOrderState.isLoading
                  || confirmDeliveryState.isLoading
                  || readyPickupState.isLoading
                }
                onClick={() => void onFulfilment(target)}
              >
                {fulfilmentActionLabel(target)}
              </Button>
            ))}
          </div>
          <p className="px-5 pb-4 text-xs text-muted-foreground">
            Uses expectedVersion {String(o.version ?? 1)} — refresh if the server reports a conflict.
          </p>
        </Surface>
      ) : null}
          </div>
        </TabsContent>

        <TabsContent value="returns" className={detailRecordTabContentClass}>
          <div className="space-y-5">
      <Surface title="Cancellation">
        <EcommerceOrderCancellationJourney
          order={order}
          cancellationView={cancellation.data}
          canOperate={canFulfilmentOperate}
          onRefresh={() => {
            query.refetch();
            cancellation.refetch();
          }}
          decideCancellation={decideCancellation}
          decideLoading={decideState.isLoading}
          initiateCancellation={initiateCancellation}
          initiateLoading={initiateCancelState.isLoading}
          recordCodRefund={recordCodRefund}
          recordCodLoading={recordCodRefundState.isLoading}
        />
      </Surface>
      {orderReturn ? (
        <Surface title="Return / exchange request">
          <EcommerceOrderReturnJourney
            order={order}
            orderReturn={orderReturn}
            canFulfilmentOperate={canFulfilmentOperate}
            canRefundOperate={canRefundOperate}
            onRefresh={() => orderReturns.refetch()}
            decideReturn={decideReturn}
            recordReturnReceived={recordReturnReceived}
            recordReturnInspection={recordReturnInspection}
            createReturnRefundCase={createReturnRefundCase}
            createReturnRefundCaseLoading={createReturnRefundCaseState.isLoading}
            resolveReturn={resolveReturn}
            returnDecisionReason={returnDecisionReason}
            setReturnDecisionReason={setReturnDecisionReason}
            inspectionNote={inspectionNote}
            setInspectionNote={setInspectionNote}
            resolutionNote={resolutionNote}
            setResolutionNote={setResolutionNote}
            replacementOrderId={replacementOrderId}
            setReplacementOrderId={setReplacementOrderId}
            codRefundFields={
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Recipient" value={codRefundRecipient} onChange={(e) => setCodRefundRecipient(e.target.value)} />
                <Input placeholder="Method (NEFT/UPI)" value={codRefundMethod} onChange={(e) => setCodRefundMethod(e.target.value)} />
                <Input placeholder="Reference / UTR" value={codRefundReference} onChange={(e) => setCodRefundReference(e.target.value)} />
                <Input placeholder="Proof note" value={codRefundProofNote} onChange={(e) => setCodRefundProofNote(e.target.value)} />
                <Button
                  type="button"
                  size="sm"
                  disabled={recordReturnManualRefundState.isLoading}
                  onClick={() =>
                    void recordReturnManualRefund({
                      returnRequestId: String(orderReturn.id),
                      expectedVersion: Number(orderReturn.version ?? 1),
                      amountPaise: Number(orderReturn.refundEntitlementPaise ?? o.totalPaise ?? 0),
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
            }
          />
        </Surface>
      ) : null}
          </div>
        </TabsContent>

        <TabsContent value="payments" className={detailRecordTabContentClass}>
          <div className="space-y-5">
      <Surface title="Refunds & capture obligations">
        <div className="p-4 sm:p-5">
          <EcommerceOrderRefundsPanel
            order={order}
            refundRow={refundRow}
            attempts={(attempts.data?.items ?? []) as Record<string, unknown>[]}
            paymentExceptionStatus={o.paymentExceptionStatus}
            canRefundOperate={canRefundOperate}
            canPaymentOperate={canPaymentOperate}
            manualRef={manualRef}
            setManualRef={setManualRef}
            manualReason={manualReason}
            setManualReason={setManualReason}
            manualEvidence={manualEvidence}
            setManualEvidence={setManualEvidence}
            manualRefundReviewOpen={manualRefundReviewOpen}
            setManualRefundReviewOpen={setManualRefundReviewOpen}
            onInitiateRefund={onInitiateRefund}
            initiateRefundLoading={initiateRefundState.isLoading}
            onRecordManual={onRecordManual}
            recordManualLoading={recordManualState.isLoading}
            stuckAttempt={stuckAttempt ?? null}
            reconcileReason={reconcileReason}
            setReconcileReason={setReconcileReason}
            onRetryReconcile={onRetryReconcile}
            retryReconcileLoading={retryReconcileState.isLoading}
          />
        </div>
      </Surface>
      <Surface>
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 text-sm font-semibold text-[#5c4a4e] sm:p-5">
            <span>Gateway &amp; payment attempts (technical, read-only)</span>
            <span className="text-xs font-normal text-muted-foreground group-open:hidden">Show</span>
            <span className="hidden text-xs font-normal text-muted-foreground group-open:inline">Hide</span>
          </summary>
          <div className="px-4 pb-4 sm:px-5 sm:pb-5">
            <OrderEventTimeline items={(events.data?.items ?? []).slice(0, 40) as Record<string, unknown>[]} />
          </div>
        </details>
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
      </Surface>
      </div>
      <aside className="min-w-0 space-y-6 xl:sticky xl:top-[6.5rem] xl:self-start">
        <OrderSideCards order={order} />
      </aside>
      </div>
    </div>
  );
}
