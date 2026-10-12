"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, MapPin, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { toastApiError } from "@/src/lib/api-error";
import { openCustomerPaymentTarget } from "@/src/lib/customer-payment-redirect";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import {
  readShopPaymentAttemptId,
  readShopPaymentIdempotencyKey,
  saveShopPaymentAttemptId,
  saveShopPaymentIdempotencyKey,
} from "@/src/lib/shop-payment-idempotency";
import { env } from "@/src/config/env";
import { customerShopOrderPath, customerShopOrdersPath } from "@/src/lib/customer-shop-paths";
import {
  useCancelShopOrderMutation,
  useCompleteShopTestHarnessPaymentMutation,
  useCreateShopCancellationRequestMutation,
  useCreateShopOrderPaymentIntentMutation,
  useGetShopOrderQuery,
  useLazyPollShopOrderPaymentIntentQuery,
  useGetShopOrderReturnQuery,
  useCreateShopReturnRequestMutation,
} from "@/src/store/api/customer-api";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProfileSubpageHeader } from "@/src/features/customer/customer-profile-shared";
import {
  buildShopOrderTimeline,
  formatAddressBlock,
  formatShopOrderDate,
  ShopOrderProgressStepper,
  ShopOrderStatusHero,
} from "@/src/features/customer/customer-shop-order-progress";
import { downloadCustomerShopOrderInvoice } from "@/src/lib/customer-shop-order-invoice";
import { CustomerShopPoliciesLinks } from "@/src/features/customer/customer-shop-policies";

function formatInr(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function paymentUiState(order: Record<string, unknown>, attempt?: Record<string, unknown> | null) {
  if (order.paymentExceptionStatus) {
    return { canPay: false, detail: "This order needs staff review after a payment exception." };
  }
  if (order.paymentMethod === "COD") {
    return { canPay: false, detail: null };
  }
  if (order.paymentCompleted === true || order.status === "PAID") {
    return { canPay: false, detail: null };
  }
  const operational = String(attempt?.operationalStatus ?? "");
  if (operational === "INITIATION_UNCERTAIN") {
    return { canPay: false, detail: "Payment may still be processing." };
  }
  const status = String(attempt?.status ?? "");
  if (status === "INITIATED" || status === "PENDING") {
    return { canPay: false, detail: "Complete payment in the gateway." };
  }
  if (status === "FAILED") {
    return {
      canPay: order.paymentAllowed === true && order.status === "PENDING_PAYMENT",
      detail: attempt?.failureReason ? String(attempt.failureReason) : null,
    };
  }
  if (order.status === "PAYMENT_EXPIRED" || order.status === "PAYMENT_FAILED") {
    return { canPay: false, detail: null };
  }
  if (order.paymentAllowed === true && order.status === "PENDING_PAYMENT") {
    return { canPay: true, detail: "You are charged only after the gateway confirms success." };
  }
  return { canPay: false, detail: null };
}

export function CustomerShopOrderPage({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { tenantSlug } = useCustomerTenant();
  const order = useGetShopOrderQuery(orderId, { pollingInterval: 5_000 });
  const [createIntent, createState] = useCreateShopOrderPaymentIntentMutation();
  const [cancelOrder, cancelOrderState] = useCancelShopOrderMutation();
  const [createCancellationRequest, requestState] = useCreateShopCancellationRequestMutation();
  const [cancelDialog, setCancelDialog] = useState<"direct" | "request" | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const orderReturn = useGetShopOrderReturnQuery(orderId);
  const [createReturnRequest, returnRequestState] = useCreateShopReturnRequestMutation();
  const [completeHarness, completeHarnessState] = useCompleteShopTestHarnessPaymentMutation();
  const [pollIntent] = useLazyPollShopOrderPaymentIntentQuery();
  const [polledAttempt, setPolledAttempt] = useState<Record<string, unknown> | null>(null);
  const [storedAttemptId] = useState(() =>
    typeof window !== "undefined" ? readShopPaymentAttemptId(orderId) : null,
  );

  const serverAttempt = useMemo(() => {
    const raw = order.data?.activePaymentAttempt;
    return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  }, [order.data?.activePaymentAttempt]);

  const serverAttemptId = serverAttempt?.id ? String(serverAttempt.id) : null;
  const polledAttemptId = polledAttempt?.id ? String(polledAttempt.id) : null;
  const pollAttemptId = serverAttemptId ?? polledAttemptId ?? storedAttemptId;
  const effectiveAttempt = polledAttempt ?? serverAttempt;

  const refreshAttempt = useCallback(async () => {
    if (!pollAttemptId) return;
    try {
      const res = await pollIntent({ orderId, paymentAttemptId: pollAttemptId }).unwrap();
      setPolledAttempt(res.paymentIntent);
      saveShopPaymentAttemptId(orderId, String(res.paymentIntent.id));
      if (res.paymentIntent.idempotencyKey) {
        saveShopPaymentIdempotencyKey(orderId, String(res.paymentIntent.idempotencyKey));
      }
    } catch {
      /* ignore */
    }
  }, [orderId, pollAttemptId, pollIntent]);

  useEffect(() => {
    if (!pollAttemptId) return;
    if (order.data?.paymentCompleted === true || order.data?.status === "PAID") return;
    const t = window.setInterval(() => {
      void refreshAttempt();
      void order.refetch();
    }, 4_000);
    return () => window.clearInterval(t);
  }, [pollAttemptId, refreshAttempt, order]);

  if (order.isLoading) return <PageSkeleton cards={2} />;
  if (order.isError) return <QueryError error={order.error} onRetry={order.refetch} />;
  const o = order.data;
  if (!o) return null;
  const orderRow = o;

  const timeline = buildShopOrderTimeline(orderRow);
  const ui = paymentUiState(orderRow, effectiveAttempt);
  const lines = (orderRow.lines as Record<string, unknown>[]) ?? [];
  const address = formatAddressBlock(orderRow.addressSnapshot);
  const delivery = String(orderRow.fulfilmentMode ?? "") === "DELIVERY";

  const harnessMeta =
    orderRow.testPaymentHarness && typeof orderRow.testPaymentHarness === "object"
      ? (orderRow.testPaymentHarness as Record<string, unknown>)
      : null;
  const showTestHarness =
    env.ecommercePaymentTestUi === true
    && harnessMeta?.available === true
    && orderRow.status === "PENDING_PAYMENT";
  const invoiceAvailable = orderRow.invoiceAvailable === true;
  const cancellation = orderRow.cancellation as
    | {
        capabilities?: {
          directCancelAllowed?: boolean;
          cancellationRequestAllowed?: boolean;
          contactStoreForReturn?: boolean;
        };
      }
    | undefined;
  const caps = cancellation?.capabilities;

  async function onDownloadInvoice() {
    try {
      await downloadCustomerShopOrderInvoice(
        orderId,
        orderRow.orderNumber ? String(orderRow.orderNumber) : undefined,
      );
      toast.success("Invoice downloaded");
    } catch {
      toast.error("Invoice is not available yet");
    }
  }

  async function onHarnessComplete(outcome: "COMPLETED" | "FAILED") {
    try {
      await completeHarness({
        orderId,
        idempotencyKey: newIdempotencyKey(),
        outcome,
        paymentAttemptId: pollAttemptId ?? undefined,
      }).unwrap();
      void order.refetch();
      void refreshAttempt();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function submitCancellation() {
    const reason = cancelReason.trim();
    if (reason.length < 8) {
      toast.error("Please enter a reason (at least 8 characters).");
      return;
    }
    try {
      if (cancelDialog === "direct") {
        await cancelOrder({ orderId, reason }).unwrap();
        toast.success("Order cancelled");
      } else {
        await createCancellationRequest({
          orderId,
          reason,
          idempotencyKey: newIdempotencyKey(),
        }).unwrap();
        toast.success("Cancellation request sent to the store");
      }
      setCancelDialog(null);
      setCancelReason("");
      void order.refetch();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function onPay() {
    const redirectUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${customerShopOrderPath(tenantSlug, orderId)}`
        : `https://localhost${customerShopOrderPath(tenantSlug, orderId)}`;
    const idempotencyKey =
      readShopPaymentIdempotencyKey(orderId)
      ?? (serverAttempt?.idempotencyKey ? String(serverAttempt.idempotencyKey) : null)
      ?? newIdempotencyKey();
    saveShopPaymentIdempotencyKey(orderId, idempotencyKey);
    try {
      const res = await createIntent({ orderId, idempotencyKey, redirectUrl }).unwrap();
      const pi = res.paymentIntent;
      setPolledAttempt(pi);
      saveShopPaymentAttemptId(orderId, String(pi.id));
      const token = typeof pi.token === "string" ? pi.token : null;
      const gatewayUrl = token
        ? `https://mercury.phonepe.com/transact/pg?token=${encodeURIComponent(token)}`
        : "";
      await openCustomerPaymentTarget(
        { token, redirectUrl: gatewayUrl || redirectUrl, paymentUrl: gatewayUrl || undefined },
        {
          tenantSlug,
          statusRedirectUrl: redirectUrl,
          initiateLink: async () => ({ redirectUrl, gatewayUrl }),
          navigate: (path) => router.push(path),
        },
      );
      void order.refetch();
    } catch (err) {
      toastApiError(err);
      void refreshAttempt();
      void order.refetch();
    }
  }

  return (
    <div className="mx-auto max-w-lg pb-10">
      <ProfileSubpageHeader
        tenantSlug={tenantSlug}
        title={String(o.orderNumber ?? "Order details")}
        backHref={customerShopOrdersPath(tenantSlug)}
        preferHistoryBack={false}
      />

      <p className="text-xs font-semibold text-[#777280]">
        Placed {formatShopOrderDate(o.createdAt)}
        {o.paymentMethod === "COD" ? " · Cash on delivery" : " · Online payment"}
      </p>

      <div className="mt-4 space-y-4">
        <ShopOrderStatusHero timeline={timeline} />

        <section className="customer-surface p-4">
          <h2 className="text-xs font-black uppercase tracking-wide text-[#999]">Order progress</h2>
          <div className="mt-4">
            <ShopOrderProgressStepper timeline={timeline} />
          </div>
          {o.expiresAt && o.status === "PENDING_PAYMENT" ? (
            <p className="mt-3 text-xs text-amber-900">
              Pay before {new Date(String(o.expiresAt)).toLocaleString()}
            </p>
          ) : null}
          {o.expiresAt && o.status === "COD_PENDING_ACCEPTANCE" ? (
            <p className="mt-3 text-xs text-amber-900">
              Store must confirm by {new Date(String(o.expiresAt)).toLocaleString()}
            </p>
          ) : null}
        </section>

        {o.fulfilmentMode === "DELIVERY" &&
        o.deliveryTracking &&
        typeof o.deliveryTracking === "object" ? (
          <section className="customer-surface space-y-2 p-4">
            <h2 className="text-xs font-black uppercase tracking-wide text-[#999]">Delivery</h2>
            {(() => {
              const t = o.deliveryTracking as Record<string, unknown>;
              const url = t.trackingUrl ? String(t.trackingUrl) : "";
              const safeUrl = url.startsWith("https://") ? url : "";
              return (
                <>
                  {t.carrierName || t.trackingNumber ? (
                    <p className="text-sm text-[#444]">
                      {[t.carrierName, t.trackingNumber].filter(Boolean).map(String).join(" · ")}
                    </p>
                  ) : (
                    <p className="text-sm text-[#777280]">Courier details will appear when the store adds them.</p>
                  )}
                  {safeUrl ? (
                    <a
                      href={safeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      Track shipment
                    </a>
                  ) : null}
                </>
              );
            })()}
          </section>
        ) : null}

        {String(o.status) === "DELIVERED" ? (
          <section className="customer-surface space-y-3 p-4">
            <h2 className="text-xs font-black uppercase tracking-wide text-[#999]">Returns & exchanges</h2>
            {orderReturn.data?.request ? (
              <div className="text-sm text-[#444]">
                <p>
                  Request status: <strong>{String(orderReturn.data.request.status)}</strong>
                </p>
                <p className="mt-1 text-xs text-[#777280]">{String(orderReturn.data.request.reason ?? "")}</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-[#777280]">
                  Submit a return or exchange request. Approval and refunds are handled separately by the store.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-xl font-bold"
                  onClick={() => setReturnDialogOpen(true)}
                >
                  Request return or exchange
                </Button>
              </>
            )}
          </section>
        ) : null}

        {(caps?.directCancelAllowed || caps?.cancellationRequestAllowed || caps?.contactStoreForReturn) ? (
          <section className="customer-surface space-y-3 p-4">
            <h2 className="text-xs font-black uppercase tracking-wide text-[#999]">Cancellation</h2>
            {caps?.contactStoreForReturn && String(o.status) !== "DELIVERED" ? (
              <p className="text-sm text-[#555]">
                This order has shipped. It cannot be cancelled here — contact the store if you need help.
              </p>
            ) : null}
            {caps?.directCancelAllowed ? (
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl font-bold"
                disabled={cancelOrderState.isLoading}
                onClick={() => setCancelDialog("direct")}
              >
                Cancel order
              </Button>
            ) : null}
            {caps?.cancellationRequestAllowed ? (
              <>
                <p className="text-xs text-[#777280]">
                  Submitting a request does not cancel the order or refund payment until staff approve.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-xl font-bold"
                  disabled={requestState.isLoading}
                  onClick={() => setCancelDialog("request")}
                >
                  Request cancellation
                </Button>
              </>
            ) : null}
          </section>
        ) : null}

        {(ui.canPay || showTestHarness) && (
          <section className="customer-surface space-y-3 p-4">
            <h2 className="text-xs font-black uppercase tracking-wide text-[#999]">Payment</h2>
            {ui.detail ? <p className="text-sm text-[#555]">{ui.detail}</p> : null}
            {ui.canPay ? (
              <Button
                type="button"
                className="w-full rounded-xl font-bold"
                disabled={createState.isLoading}
                onClick={() => void onPay()}
              >
                {createState.isLoading ? "Starting payment…" : "Pay now"}
              </Button>
            ) : null}
            {showTestHarness ? (
              <div className="rounded-xl border border-dashed border-amber-400 bg-amber-50 p-3 text-sm">
                <p className="font-bold text-amber-950">Test payment (dev only)</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={completeHarnessState.isLoading || !pollAttemptId}
                    onClick={() => void onHarnessComplete("COMPLETED")}
                  >
                    Mock success
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={completeHarnessState.isLoading || !pollAttemptId}
                    onClick={() => void onHarnessComplete("FAILED")}
                  >
                    Mock failed
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        )}

        <section className="customer-surface overflow-hidden">
          <h2 className="border-b border-[#ece6e1] px-4 py-3 text-xs font-black uppercase tracking-wide text-[#999]">
            Items ({lines.length})
          </h2>
          <ul className="divide-y divide-[#f0ebe6]">
            {lines.map((line) => (
              <li key={String(line.productId)} className="flex gap-3 px-4 py-4">
                <span
                  className="grid size-14 shrink-0 place-items-center rounded-xl text-[var(--customer-primary,#730321)]"
                  style={{ background: "rgba(var(--customer-primary-rgb, 115, 3, 33), 0.08)" }}
                >
                  <Package className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[#171722]">{String(line.name ?? "Item")}</p>
                  <p className="text-sm text-[#777280]">Quantity: {String(line.quantity ?? 1)}</p>
                  {line.sku ? (
                    <p className="text-[10px] text-[#aaa]">SKU {String(line.sku)}</p>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatInr(Number(line.lineTotalPaise ?? 0))}</p>
                  {line.unitPricePaise != null ? (
                    <p className="text-[10px] text-[#999]">
                      {formatInr(Number(line.unitPricePaise))} / unit
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="customer-surface p-4">
          <h2 className="text-xs font-black uppercase tracking-wide text-[#999]">
            {delivery ? "Delivery address" : "Fulfilment"}
          </h2>
          {delivery && address ? (
            <div className="mt-3 flex gap-3 text-sm">
              <MapPin className="mt-0.5 size-5 shrink-0 text-[var(--customer-primary,#730321)]" />
              <div className="text-[#444]">
                {address.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
                {address.mobile ? <p className="mt-1 text-[#777280]">Phone: {address.mobile}</p> : null}
              </div>
            </div>
          ) : !delivery ? (
            <p className="mt-2 text-sm text-[#555]">
              Branch pickup
              {o.pickupBranchId ? (
                <span className="ml-1 font-mono text-xs">({String(o.pickupBranchId)})</span>
              ) : null}
            </p>
          ) : (
            <p className="mt-2 text-sm text-[#777280]">No address on file for this order.</p>
          )}
        </section>

        {invoiceAvailable ? (
          <section className="customer-surface p-4">
            <h2 className="text-xs font-black uppercase tracking-wide text-[#999]">Invoice</h2>
            <p className="mt-2 text-sm text-[#555]">
              Download a PDF tax invoice for this order (seller GSTIN and line items from checkout).
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full rounded-xl font-bold"
              onClick={() => void onDownloadInvoice()}
            >
              <Download className="mr-2 size-4" />
              Download invoice (PDF)
            </Button>
          </section>
        ) : null}

        <section className="customer-surface p-4">
          <h2 className="text-xs font-black uppercase tracking-wide text-[#999]">Order summary</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-[#777280]">Subtotal</dt>
              <dd>{formatInr(Number(o.subtotalPaise ?? 0))}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#777280]">Tax</dt>
              <dd>{formatInr(Number(o.taxPaise ?? 0))}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#777280]">Delivery / fulfilment</dt>
              <dd>{formatInr(Number(o.fulfilmentChargePaise ?? 0))}</dd>
            </div>
            <div className="flex justify-between border-t border-[#ece6e1] pt-2 text-base font-black">
              <dt>Total</dt>
              <dd>{formatInr(Number(o.totalPaise ?? 0))}</dd>
            </div>
          </dl>
        </section>

        <CustomerShopPoliciesLinks className="customer-surface p-4" />

        <Link
          href={customerShopOrdersPath(tenantSlug)}
          className="block text-center text-sm font-bold text-[var(--customer-primary,#730321)]"
        >
          ← Back to all orders
        </Link>
      </div>

      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return or exchange request</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This sends a request to the store. Refunds and exchanges are confirmed separately — nothing is
            refunded automatically.
          </p>
          <Textarea
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            placeholder="Reason (at least 8 characters)"
            rows={4}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReturnDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={returnRequestState.isLoading || returnReason.trim().length < 8}
              onClick={() =>
                void createReturnRequest({
                  orderId,
                  reason: returnReason.trim(),
                  idempotencyKey: newIdempotencyKey(),
                })
                  .unwrap()
                  .then(() => {
                    toast.success("Return request submitted");
                    setReturnDialogOpen(false);
                    setReturnReason("");
                    void orderReturn.refetch();
                  })
                  .catch(toastApiError)
              }
            >
              Submit request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelDialog != null} onOpenChange={(open) => !open && setCancelDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {cancelDialog === "direct" ? "Cancel this order?" : "Request cancellation"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {cancelDialog === "direct"
              ? "Stock reserved for this order will be released. You have not been charged if payment was not completed."
              : "The store will review your request. Your order stays active and payment is not refunded until they approve."}
          </p>
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation (required)"
            rows={4}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCancelDialog(null)}>
              Keep order
            </Button>
            <Button
              type="button"
              disabled={cancelOrderState.isLoading || requestState.isLoading}
              onClick={() => void submitCancellation()}
            >
              {cancelDialog === "direct" ? "Confirm cancel" : "Submit request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
