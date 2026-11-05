"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  customerPollIntervalMs,
  SHOP_ORDER_POLL_TERMINAL,
} from "@/src/lib/customer-payment-polling";
import { ArrowLeft, Download, Headphones, MapPin, Store, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { toastApiError } from "@/src/lib/api-error";
import {
  openCustomerPaymentTarget,
  pickPhonePeGatewayUrl,
} from "@/src/lib/customer-payment-redirect";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import {
  readShopPaymentAttemptId,
  saveShopPaymentAttemptId,
  saveShopPaymentIdempotencyKey,
} from "@/src/lib/shop-payment-idempotency";
import { env } from "@/src/config/env";
import { customerShopOrderPath, customerShopOrdersPath } from "@/src/lib/customer-shop-paths";
import { customerPath } from "@/src/lib/customer-tenant";
import {
  useCancelShopOrderMutation,
  useCreateCustomerGrievanceMutation,
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
import {
  buildShopOrderTimeline,
  formatAddressBlock,
  formatShopOrderDate,
  ShopOrderProgressStepper,
  ShopOrderStatusHero,
} from "@/src/features/customer/customer-shop-order-progress";
import { downloadCustomerShopOrderInvoice } from "@/src/lib/customer-shop-order-invoice";
import { CustomerShopPoliciesLinks } from "@/src/features/customer/customer-shop-policies";
import { ShopProductArt } from "@/src/features/customer/customer-shop-ui";
import { cn } from "@/lib/utils";

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
    if (order.paymentAllowed === true && order.status === "PENDING_PAYMENT") {
      return { canPay: true, detail: "Retry opens a fresh PhonePe checkout if needed." };
    }
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
  const [shopOrderPollMs, setShopOrderPollMs] = useState(5_000);
  const order = useGetShopOrderQuery(orderId, { pollingInterval: shopOrderPollMs });
  useEffect(() => {
    const next = customerPollIntervalMs(order.data?.status, SHOP_ORDER_POLL_TERMINAL, 5_000);
    if (next !== shopOrderPollMs) setShopOrderPollMs(next);
  }, [order.data?.status, shopOrderPollMs]);
  const [createIntent, createState] = useCreateShopOrderPaymentIntentMutation();
  const [cancelOrder, cancelOrderState] = useCancelShopOrderMutation();
  const [createCancellationRequest, requestState] = useCreateShopCancellationRequestMutation();
  const [cancelDialog, setCancelDialog] = useState<"direct" | "request" | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpSubject, setHelpSubject] = useState("");
  const [helpDescription, setHelpDescription] = useState("");
  const [createGrievance, helpState] = useCreateCustomerGrievanceMutation();
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
    const st = String(order.data?.status ?? "");
    if (
      order.data?.paymentCompleted === true
      || st === "PAID"
      || SHOP_ORDER_POLL_TERMINAL.has(st)
    ) {
      return;
    }
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
    const idempotencyKey = newIdempotencyKey();
    saveShopPaymentIdempotencyKey(orderId, idempotencyKey);
    try {
      const res = await createIntent({ orderId, idempotencyKey, redirectUrl }).unwrap();
      const pi = res.paymentIntent;
      setPolledAttempt(pi);
      saveShopPaymentAttemptId(orderId, String(pi.id));
      const gatewayUrl = pickPhonePeGatewayUrl(pi);
      const token = typeof pi.token === "string" ? pi.token : null;
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

  const sectionTitle = "text-[15px] font-semibold text-[#221a1d]";
  const card = "rounded-[1.25rem] border border-[#ecdfd8] bg-white p-5";
  const tracking =
    o.fulfilmentMode === "DELIVERY" && o.deliveryTracking && typeof o.deliveryTracking === "object"
      ? (o.deliveryTracking as Record<string, unknown>)
      : null;
  const trackingUrl = tracking?.trackingUrl ? String(tracking.trackingUrl) : "";
  const safeTrackingUrl = trackingUrl.startsWith("https://") ? trackingUrl : "";
  const showCancellation = Boolean(caps?.directCancelAllowed || caps?.cancellationRequestAllowed || caps?.contactStoreForReturn);

  return (
    <div className="mx-auto max-w-5xl pb-10">
      <Link
        href={customerShopOrdersPath(tenantSlug)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--customer-primary,#730321)] underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" /> All orders
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-[2rem] leading-tight text-[#221a1d]">Order {String(o.orderNumber ?? "details")}</h1>
          <p className="mt-1 text-sm text-[#7a6f72]">
            Placed {formatShopOrderDate(o.createdAt)}
            {o.paymentMethod === "COD" ? " · Cash on delivery" : " · Online payment"}
            {delivery ? " · Delivery" : " · Branch pickup"}
          </p>
        </div>
        {invoiceAvailable ? (
          <Button type="button" variant="outline" className="h-10 rounded-full" onClick={() => void onDownloadInvoice()}>
            <Download className="mr-2 size-4" />
            Invoice (PDF)
          </Button>
        ) : null}
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-6">
          <ShopOrderStatusHero timeline={timeline}>
            <ShopOrderProgressStepper timeline={timeline} horizontal />
            {o.expiresAt && o.status === "PENDING_PAYMENT" ? (
              <p className="mt-4 text-xs text-amber-900">
                Pay before {new Date(String(o.expiresAt)).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            ) : null}
            {o.expiresAt && o.status === "COD_PENDING_ACCEPTANCE" ? (
              <p className="mt-4 text-xs text-amber-900">
                Store must confirm by {new Date(String(o.expiresAt)).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            ) : null}
          </ShopOrderStatusHero>

          {String(o.status) === "READY_FOR_PICKUP" && o.pickupCode ? (
            <section className={cn(card, "text-center")}>
              <span className="mx-auto grid size-11 place-items-center rounded-xl customer-accent-tint-surface">
                <Store className="size-5 customer-gold-copy" />
              </span>
              <h2 className={cn(sectionTitle, "mt-3")}>Show this code at the store</h2>
              <p className="mt-1 text-sm text-[#7a6f72]">Staff will enter it to confirm your collection.</p>
              <p className="mt-4 font-mono text-2xl tracking-[0.35em] text-[#221a1d]">{String(o.pickupCode)}</p>
              {o.fulfilmentHandover &&
              typeof o.fulfilmentHandover === "object" &&
              (o.fulfilmentHandover as { pickupCodeExpiresAt?: string }).pickupCodeExpiresAt ? (
                <p className="mt-3 text-xs text-amber-900">
                  Valid until{" "}
                  {new Date(
                    String((o.fulfilmentHandover as { pickupCodeExpiresAt: string }).pickupCodeExpiresAt),
                  ).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              ) : null}
            </section>
          ) : null}

          {tracking ? (
            <section className={cn(card, "flex flex-wrap items-center gap-4")}>
              <span className="grid size-11 shrink-0 place-items-center rounded-xl customer-accent-tint-surface">
                <Truck className="size-5 customer-gold-copy" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className={sectionTitle}>Shipment</h2>
                {tracking.carrierName || tracking.trackingNumber ? (
                  <p className="mt-0.5 text-sm text-[#4d4245]">
                    {[tracking.carrierName, tracking.trackingNumber].filter(Boolean).map(String).join(" · ")}
                  </p>
                ) : (
                  <p className="mt-0.5 text-sm text-[#7a6f72]">Courier details will appear when the store adds them.</p>
                )}
              </div>
              {safeTrackingUrl ? (
                <a
                  href={safeTrackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center rounded-full border border-[#e3d6ce] px-4 text-sm font-semibold text-[var(--customer-primary,#730321)] hover:bg-[#faf5f2]"
                >
                  Track shipment
                </a>
              ) : null}
            </section>
          ) : null}

          <section className="overflow-hidden rounded-[1.25rem] border border-[#ecdfd8] bg-white">
            <h2 className={cn(sectionTitle, "border-b border-[#ecdfd8] px-5 py-4")}>Items ({lines.length})</h2>
            <ul className="divide-y divide-[#f0e6e0]">
              {lines.map((line) => (
                <li key={String(line.productId)} className="flex items-center gap-4 px-5 py-4">
                  <ShopProductArt uploadId={(line.imageUploadId as string | undefined) ?? null} alt="" className="size-16 sm:size-20" rounded="rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-serif text-base leading-snug text-[#221a1d]">{String(line.name ?? "Item")}</p>
                    <p className="mt-0.5 text-xs text-[#7a6f72]">
                      Qty {String(line.quantity ?? 1)}
                      {line.sku ? ` · ${String(line.sku)}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums text-[#221a1d]">{formatInr(Number(line.lineTotalPaise ?? 0))}</p>
                    {line.unitPricePaise != null && Number(line.quantity ?? 1) > 1 ? (
                      <p className="text-[11px] text-[#9a8d90]">{formatInr(Number(line.unitPricePaise))} each</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            <dl className="space-y-2 border-t border-[#ecdfd8] bg-[#fcfaf8] px-5 py-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#7a6f72]">Subtotal</dt>
                <dd className="tabular-nums">{formatInr(Number(o.subtotalPaise ?? 0))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#7a6f72]">Tax</dt>
                <dd className="tabular-nums">{formatInr(Number(o.taxPaise ?? 0))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#7a6f72]">{delivery ? "Delivery" : "Pickup"}</dt>
                <dd className="tabular-nums">{Number(o.fulfilmentChargePaise ?? 0) ? formatInr(Number(o.fulfilmentChargePaise)) : "Free"}</dd>
              </div>
              <div className="flex justify-between border-t border-[#ecdfd8] pt-2 text-base font-semibold text-[#221a1d]">
                <dt>Total</dt>
                <dd className="tabular-nums text-[var(--customer-primary,#730321)]">{formatInr(Number(o.totalPaise ?? 0))}</dd>
              </div>
            </dl>
          </section>

          {String(o.status) === "DELIVERED" ? (
            <section className={cn(card, "space-y-3")}>
              <h2 className={sectionTitle}>Returns & exchanges</h2>
              {orderReturn.data?.request ? (
                <div className="text-sm text-[#4d4245]">
                  <p>
                    Request status: <strong>{String(orderReturn.data.request.status)}</strong>
                  </p>
                  <p className="mt-1 text-xs text-[#7a6f72]">{String(orderReturn.data.request.reason ?? "")}</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-[#7a6f72]">
                    Not quite right? Send a return or exchange request. The store approves it and confirms any refund separately.
                  </p>
                  <Button type="button" variant="outline" className="h-10 rounded-full" onClick={() => setReturnDialogOpen(true)}>
                    Request return or exchange
                  </Button>
                </>
              )}
            </section>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-28">
          {(ui.canPay || showTestHarness) && (
            <section className={cn(card, "space-y-3")} style={{ borderColor: "rgba(var(--customer-primary-rgb, 115, 3, 33), 0.35)" }}>
              <h2 className={sectionTitle}>Payment due</h2>
              <p className="text-2xl font-bold tabular-nums text-[var(--customer-primary,#730321)]">{formatInr(Number(o.totalPaise ?? 0))}</p>
              {ui.detail ? <p className="text-xs leading-5 text-[#7a6f72]">{ui.detail}</p> : null}
              {ui.canPay ? (
                <Button
                  type="button"
                  className="h-12 w-full rounded-full text-[15px] font-semibold text-white"
                  style={{ background: "var(--customer-primary, #730321)" }}
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

          <section className={card}>
            <h2 className={sectionTitle}>{delivery ? "Delivery address" : "Pickup"}</h2>
            {delivery && address ? (
              <div className="mt-3 flex gap-3 text-sm">
                <MapPin className="mt-0.5 size-5 shrink-0 customer-gold-copy" />
                <div className="text-[#4d4245]">
                  {address.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                  {address.mobile ? <p className="mt-1 text-[#7a6f72]">Phone: {address.mobile}</p> : null}
                </div>
              </div>
            ) : !delivery ? (
              <div className="mt-3 flex gap-3 text-sm">
                <Store className="mt-0.5 size-5 shrink-0 customer-gold-copy" />
                <p className="text-[#4d4245]">
                  {o.pickupBranchName ? String(o.pickupBranchName) : "Branch pickup"}
                  {!o.pickupBranchName && o.pickupBranchId ? <span className="ml-1 font-mono text-xs">({String(o.pickupBranchId)})</span> : null}
                  <span className="mt-1 block text-xs text-[#7a6f72]">Bring a photo ID when you collect.</span>
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-[#7a6f72]">No address on file for this order.</p>
            )}
          </section>

          <section className={cn(card, "space-y-3")}>
            <h2 className={sectionTitle}>Need help?</h2>
            <p className="text-xs leading-5 text-[#7a6f72]">Open a ticket linked to this order so staff can see your order number and history.</p>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full rounded-full"
              onClick={() => {
                setHelpSubject(`Help with order ${String(o.orderNumber ?? orderId)}`);
                setHelpDescription("");
                setHelpOpen(true);
              }}
            >
              <Headphones className="mr-2 size-4" />
              Get help with this order
            </Button>
          </section>

          {showCancellation ? (
            <section className={cn(card, "space-y-3")}>
              <h2 className={sectionTitle}>Cancellation</h2>
              {caps?.contactStoreForReturn && String(o.status) !== "DELIVERED" ? (
                <p className="text-sm text-[#5c4f52]">This order has shipped. It can&apos;t be cancelled here — contact the store if you need help.</p>
              ) : null}
              {caps?.directCancelAllowed ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 w-full rounded-full text-red-700 hover:bg-red-50 hover:text-red-800"
                  disabled={cancelOrderState.isLoading}
                  onClick={() => setCancelDialog("direct")}
                >
                  Cancel order
                </Button>
              ) : null}
              {caps?.cancellationRequestAllowed ? (
                <>
                  <p className="text-xs text-[#7a6f72]">A request doesn&apos;t cancel or refund anything until the store approves it.</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full rounded-full"
                    disabled={requestState.isLoading}
                    onClick={() => setCancelDialog("request")}
                  >
                    Request cancellation
                  </Button>
                </>
              ) : null}
            </section>
          ) : null}

          <CustomerShopPoliciesLinks className="px-1" />
        </aside>
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

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Get help with this order</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-bold uppercase text-[#999]">Subject</Label>
              <Input
                className="mt-1"
                value={helpSubject}
                onChange={(e) => setHelpSubject(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs font-bold uppercase text-[#999]">What do you need help with?</Label>
              <Textarea
                className="mt-1 min-h-28"
                value={helpDescription}
                onChange={(e) => setHelpDescription(e.target.value)}
                placeholder="Describe the issue (delivery, payment, items, etc.)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setHelpOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                helpState.isLoading
                || helpSubject.trim().length < 5
                || helpDescription.trim().length < 10
              }
              onClick={() =>
                void createGrievance({
                  category: "OTHER",
                  subject: helpSubject.trim(),
                  description: helpDescription.trim(),
                  relatedEntity: { type: "ORDER", id: orderId },
                })
                  .unwrap()
                  .then((ticket) => {
                    toast.success("Support ticket created");
                    setHelpOpen(false);
                    router.push(customerPath(tenantSlug, "support", ticket.id));
                  })
                  .catch(toastApiError)
              }
            >
              Submit ticket
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
