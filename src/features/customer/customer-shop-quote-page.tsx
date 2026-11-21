"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Banknote, Clock3, CreditCard, Loader2, MapPin, PiggyBank, Store, Truck } from "lucide-react";
import type { SchemeCard } from "@/src/types/customer";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { parseApiError, toastApiError } from "@/src/lib/api-error";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { customerShopOrderPath } from "@/src/lib/customer-shop-paths";
import { customerBrandStyle } from "@/src/lib/customer-brand-styles";
import {
  useCancelShopQuoteMutation,
  useCreateShopOrderMutation,
  useGetShopQuoteQuery,
  useGetCustomerSchemesQuery,
  useGetShopSchemePurchasePreviewQuery,
} from "@/src/store/api/customer-api";
import { CustomerShopPoliciesLinks } from "@/src/features/customer/customer-shop-policies";
import { formatAddressBlock } from "@/src/features/customer/customer-shop-order-progress";
import {
  formatShopInr,
  SHOP_HAIRLINE,
  SHOP_INK,
  SHOP_MUTED,
  ShopCheckoutSteps,
  ShopPanel,
  ShopProductArt,
} from "@/src/features/customer/customer-shop-ui";

function useCountdown(expiresAt: Date | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [expiresAt]);
  if (!expiresAt) return null;
  const ms = Math.max(0, expiresAt.getTime() - now);
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return { ms, label: `${m}:${String(s).padStart(2, "0")}` };
}

type SchemeChoice = NonNullable<Parameters<ReturnType<typeof useCreateShopOrderMutation>[0]>[0]["schemePurchase"]>;

function schemeValueLabel(scheme: SchemeCard): string {
  if (scheme.valueBasis === "GOLD_WEIGHT") {
    const w = scheme.goldAccumulated ?? scheme.goldAccrued;
    if (w?.weightDisplay) return w.weightDisplay;
  }
  return (scheme.currentValuation ?? scheme.totalPaid)?.amountDisplay ?? "";
}

function SchemePurchaseEstimate({ quoteId, totalPaise, placing, onPlace }: {
  quoteId: string; totalPaise: number; placing: boolean; onPlace: (choice: SchemeChoice) => void;
}) {
  const schemes = useGetCustomerSchemesQuery();
  const [schemeId, setSchemeId] = useState("");
  const [basis, setBasis] = useState<"CASH_VALUE" | "GOLD_WEIGHT">("CASH_VALUE");
  const matured = (schemes.data ?? []).filter((scheme) => scheme.status === "MATURED");
  const scheme = matured.find((item) => item.id === schemeId) ?? matured[0];
  const activeId = scheme?.id ?? "";
  const selectedBasis = scheme?.valueBasis === "GOLD_WEIGHT" ? basis : "CASH_VALUE";

  // The split is worked out as soon as a scheme is picked; the customer should not have to ask for it.
  const preview = useGetShopSchemePurchasePreviewQuery({ quoteId, schemeId: activeId, basis: selectedBasis }, { skip: !activeId });

  if (!scheme) return null;
  const current = !preview.isFetching;
  const estimate = current && !preview.error ? preview.currentData : undefined;
  return (
    <section className="overflow-hidden rounded-[1.4rem] border border-[#e6d3a8] bg-white">
      <div className="flex items-start gap-3 bg-gradient-to-br from-[#fbf3df] to-[#fffaf0] px-5 py-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-[#8a6a24] shadow-sm ring-1 ring-[#eadbb8]"><PiggyBank className="size-5" /></span>
        <div>
          <h2 className={cn("text-[15px] font-semibold", SHOP_INK)}>Pay with your matured scheme</h2>
          <p className={cn("mt-0.5 text-sm", SHOP_MUTED)}>Use your savings for this order. You only pay the difference.</p>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div role="radiogroup" aria-label="Matured scheme" className="grid gap-2.5 sm:grid-cols-2">
          {matured.map((item) => {
            const on = item.id === scheme.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setSchemeId(item.id)}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors",
                  on ? "border-[var(--customer-primary,#730321)] bg-[#fdf6f4] ring-1 ring-[var(--customer-primary,#730321)]" : "border-[#ecdfd8] hover:border-[#d9c3b8]",
                )}
              >
                <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2", on ? "border-[var(--customer-primary,#730321)]" : "border-stone-300")}>
                  {on ? <span className="size-2 rounded-full bg-[var(--customer-primary,#730321)]" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-sm font-semibold", SHOP_INK)}>{item.planName}</span>
                  <span className={cn("block text-xs", SHOP_MUTED)}>{item.schemeNumber}</span>
                </span>
                <span className={cn("shrink-0 text-sm font-bold tabular-nums", SHOP_INK)}>{schemeValueLabel(item)}</span>
              </button>
            );
          })}
        </div>

        {scheme.valueBasis === "GOLD_WEIGHT" ? (
          <div>
            <p className={cn("mb-1.5 text-xs font-medium", SHOP_MUTED)}>Use this scheme as</p>
            <div role="radiogroup" aria-label="Settlement basis" className="inline-flex rounded-full bg-[#f4ece7] p-1 text-sm">
              {(["GOLD_WEIGHT", "CASH_VALUE"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selectedBasis === value}
                  onClick={() => setBasis(value)}
                  className={cn("rounded-full px-4 py-1.5 font-semibold", selectedBasis === value ? "bg-white text-[#221a1d] shadow-sm" : "text-[#7a6f72]")}
                >
                  {value === "GOLD_WEIGHT" ? "Gold weight" : "Cash value"}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {current && preview.error ? (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span className="flex-1">{parseApiError(preview.error, "Could not calculate scheme savings.").message}</span>
            <button type="button" className="font-semibold underline" onClick={() => void preview.refetch()}>Try again</button>
          </div>
        ) : null}

        <div className="rounded-2xl bg-[#faf6f2] p-4" aria-live="polite">
          {estimate ? (
            <>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4"><dt className={SHOP_MUTED}>Order total</dt><dd className={cn("tabular-nums", SHOP_INK)}>{formatShopInr(totalPaise, 2)}</dd></div>
                {estimate.makingChargeWaivedPaise > 0 ? (
                  <div className="flex justify-between gap-4"><dt className="text-[var(--ck-ok,#1f6b4c)]">Making charges waived</dt><dd className="tabular-nums text-[var(--ck-ok,#1f6b4c)]">− {formatShopInr(estimate.makingChargeWaivedPaise, 2)}</dd></div>
                ) : null}
                <div className="flex justify-between gap-4"><dt className="text-[var(--ck-ok,#1f6b4c)]">From your scheme</dt><dd className="tabular-nums text-[var(--ck-ok,#1f6b4c)]">− {formatShopInr(estimate.appliedPaise, 2)}</dd></div>
              </dl>
              <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-dashed border-[#e3d6cf] pt-3">
                <span className={cn("font-semibold", SHOP_INK)}>You pay</span>
                <span className="text-2xl font-extrabold tabular-nums text-[var(--customer-primary,#730321)]">{formatShopInr(estimate.topUpPaise, 2)}</span>
              </div>
              {estimate.remaining > 0 ? (
                <p className={cn("mt-2 text-xs", SHOP_MUTED)}>
                  Left in your scheme after this order: {selectedBasis === "GOLD_WEIGHT" ? `${(estimate.remaining / 1000).toFixed(3)} g` : formatShopInr(estimate.remaining, 2)}
                </p>
              ) : null}
            </>
          ) : (
            <p className={cn("flex items-center gap-2 text-sm", SHOP_MUTED)}>
              {preview.isFetching ? <><Loader2 className="size-4 animate-spin" /> Working out your savings…</> : "Pick a scheme to see what you pay."}
            </p>
          )}
        </div>

        <Button
          type="button"
          disabled={placing || !estimate}
          className="h-12 w-full rounded-full text-[15px] font-bold text-white"
          style={customerBrandStyle.primaryBg}
          onClick={() => estimate && onPlace({
            schemeId: scheme.id, basis: selectedBasis, applied: estimate.applied,
            topUpPaise: estimate.topUpPaise, makingChargeWaivedPaise: estimate.makingChargeWaivedPaise,
          })}
        >
          {placing ? "Placing order…" : estimate ? `Place order with scheme · pay ${formatShopInr(estimate.topUpPaise, 2)}` : "Place order with scheme"}
        </Button>
        <p className={cn("text-center text-xs", SHOP_MUTED)}>The store confirms your scheme before the order goes ahead.</p>
      </div>
    </section>
  );
}

export function CustomerShopQuotePage({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const { tenantSlug } = useCustomerTenant();
  const quote = useGetShopQuoteQuery(quoteId, { pollingInterval: 30_000 });
  const [cancelQuote, cancelState] = useCancelShopQuoteMutation();
  const [createOrder, createOrderState] = useCreateShopOrderMutation();
  // Keep the same key on an uncertain retry so a double click/network timeout cannot create another order.
  const orderIdempotencyKey = useRef<string>(newIdempotencyKey());
  const schemeOrderKeys = useRef(new Map<string, string>());
  const expiresAt = quote.data?.expiresAt ? new Date(String(quote.data.expiresAt)) : null;
  const countdown = useCountdown(expiresAt);

  if (quote.isLoading) return <PageSkeleton cards={2} />;
  if (quote.isError) return <QueryError error={quote.error} onRetry={quote.refetch} />;
  const q = quote.data;
  if (!q) return null;

  const lines = (q.lines as Record<string, unknown>[]) ?? [];
  const status = String(q.status ?? "");
  const expired = status === "EXPIRED";

  const checkoutTaxReady = q.checkoutTaxReady === true;
  const paymentMethod = String(q.paymentMethod ?? "ONLINE");
  const orderPlacementAllowed = q.orderPlacementAllowed === true;
  const canPlaceOrder =
    orderPlacementAllowed && checkoutTaxReady && status === "ACTIVE" && !expired;
  const placeOrderLabel = canPlaceOrder
    ? paymentMethod === "COD"
      ? "Place COD order"
      : "Place order & pay"
    : !checkoutTaxReady
      ? "Place order (checkout tax blocked)"
      : !orderPlacementAllowed
        ? paymentMethod === "COD"
          ? "Place COD order (not available)"
          : "Place order (payment blocked)"
        : "Place order (unavailable)";

  async function onPlaceOrder(schemePurchase?: SchemeChoice) {
    const purchaseKey = schemePurchase ? JSON.stringify(schemePurchase) : undefined;
    if (purchaseKey && !schemeOrderKeys.current.has(purchaseKey)) schemeOrderKeys.current.set(purchaseKey, newIdempotencyKey());
    try {
      const order = await createOrder({
        quoteId,
        idempotencyKey: purchaseKey ? schemeOrderKeys.current.get(purchaseKey)! : orderIdempotencyKey.current,
        schemePurchase,
      }).unwrap();
      toast.success(schemePurchase ? "Order submitted for approval" : paymentMethod === "COD" ? "COD order placed" : "Order created — continue to payment");
      router.push(customerShopOrderPath(tenantSlug, String(order.id)));
    } catch (err) {
      toastApiError(err);
    }
  }

  async function onCancel() {
    try {
      await cancelQuote({ quoteId, idempotencyKey: newIdempotencyKey() }).unwrap();
      toast.success("Quote cancelled");
      router.push(customerPath(tenantSlug, "shop", "cart"));
    } catch (err) {
      toastApiError(err);
    }
  }

  const cartHref = customerPath(tenantSlug, "shop", "cart");
  const delivery = String(q.fulfilmentMode ?? "") === "DELIVERY";
  const address = formatAddressBlock(q.addressSnapshot);
  const live = status === "ACTIVE" && !expired && (countdown?.ms ?? 1) > 0;

  return (
    <div className="pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href={cartHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--customer-primary,#730321)] underline-offset-4 hover:underline">
            <ArrowLeft className="size-4" /> Back to cart
          </Link>
          <h1 className={cn("mt-3 font-serif text-[2rem] leading-tight", SHOP_INK)}>Your price preview</h1>
          <p className={cn("mt-1 text-sm", SHOP_MUTED)}>This is the exact amount you&apos;ll pay. Nothing is charged until you place the order.</p>
        </div>
        <ShopCheckoutSteps current={1} />
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <div className="space-y-6">
          {live && countdown ? (
            <div className="flex items-center gap-3 rounded-2xl border border-[#eadbc4] customer-accent-tint-surface px-4 py-3 text-sm text-[#5b4a2a]">
              <Clock3 className="size-5 shrink-0 customer-gold-copy" aria-hidden />
              <p className="flex-1">
                Price held for <strong className="tabular-nums">{countdown.label}</strong>
                {expiresAt ? (
                  <span className="text-[#8a7a5c]"> · until {expiresAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span>
                ) : null}
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">{status === "ACTIVE" || expired ? "This price preview has expired" : "This price preview is no longer active"}</p>
                <p className="mt-0.5 text-amber-900/90">Rates or stock may have changed. Go back to your cart for a fresh price.</p>
              </div>
            </div>
          )}

          {!checkoutTaxReady ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-semibold">Checkout is temporarily unavailable</p>
              <p className="mt-1 leading-6">This store is finishing its checkout setup. Your preview is for reference; you cannot place this order yet.</p>
            </div>
          ) : null}
          {checkoutTaxReady && paymentMethod === "ONLINE" && q.paymentAllowed !== true ? (
            <div className={cn("rounded-2xl border bg-[#faf7f5] p-4 text-sm", SHOP_HAIRLINE, SHOP_INK)}>
              <p className="font-semibold">Online payment is not available for this store</p>
              <p className={cn("mt-1 leading-6", SHOP_MUTED)}>You can review this price, but the jeweller has not enabled online checkout. Contact the store for availability.</p>
            </div>
          ) : null}

          {live && q.schemePurchasePreviewEnabled === true && <SchemePurchaseEstimate key={quoteId} quoteId={quoteId} totalPaise={Number(q.totalPaise ?? 0)} placing={createOrderState.isLoading} onPlace={(choice) => void onPlaceOrder(choice)} />}

          <ShopPanel title={`Items (${lines.length})`}>
            <ul className="divide-y divide-[#f0e6e0]">
              {lines.map((line) => (
                <li key={String(line.productId)} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <ShopProductArt uploadId={(line.imageUploadId as string | undefined) ?? null} alt="" className="size-16" rounded="rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className={cn("line-clamp-2 font-serif text-[15px] leading-snug", SHOP_INK)}>{String(line.name)}</p>
                    <p className={cn("mt-0.5 text-xs", SHOP_MUTED)}>Qty {String(line.quantity)}{line.sku ? ` · ${String(line.sku)}` : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("font-semibold tabular-nums", SHOP_INK)}>{formatShopInr(Number(line.lineTotalPaise ?? 0), 2)}</p>
                    <p className={cn("text-[11px]", SHOP_MUTED)}>before tax</p>
                  </div>
                </li>
              ))}
            </ul>
          </ShopPanel>

          <div className="grid gap-4 sm:grid-cols-2">
            <ShopPanel title={delivery ? "Delivering to" : "Collecting from"}>
              <div className="flex gap-3 text-sm">
                {delivery ? <Truck className="mt-0.5 size-5 shrink-0 customer-gold-copy" /> : <Store className="mt-0.5 size-5 shrink-0 customer-gold-copy" />}
                <div className={SHOP_INK}>
                  {delivery ? (
                    address ? (
                      address.lines.map((l) => <p key={l}>{l}</p>)
                    ) : (
                      <p>Pincode {String(q.pincode ?? "on file")}</p>
                    )
                  ) : (
                    <p>{String(q.pickupBranchName ?? "Selected branch")}</p>
                  )}
                </div>
              </div>
            </ShopPanel>
            <ShopPanel title="Payment">
              <div className="flex gap-3 text-sm">
                {paymentMethod === "COD" ? <Banknote className="mt-0.5 size-5 shrink-0 customer-gold-copy" /> : <CreditCard className="mt-0.5 size-5 shrink-0 customer-gold-copy" />}
                <div>
                  <p className={cn("font-medium", SHOP_INK)}>{paymentMethod === "COD" ? "Cash on delivery" : "Pay online"}</p>
                  <p className={cn("mt-0.5 text-xs leading-5", SHOP_MUTED)}>
                    {paymentMethod === "COD" ? "Pay the courier when your order arrives." : "You'll be taken to the payment page after placing the order."}
                  </p>
                </div>
              </div>
            </ShopPanel>
          </div>
        </div>

        <aside className="lg:sticky lg:top-28">
          <ShopPanel title="Amount to pay">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className={SHOP_MUTED}>Items before tax</dt>
                <dd className={cn("tabular-nums", SHOP_INK)}>{formatShopInr(Number(q.subtotalPaise ?? 0), 2)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className={SHOP_MUTED}>Tax</dt>
                <dd className={cn("tabular-nums", SHOP_INK)}>{formatShopInr(Number(q.taxPaise ?? 0), 2)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className={SHOP_MUTED}>{delivery ? "Delivery" : "Pickup"}</dt>
                <dd className={cn("tabular-nums", SHOP_INK)}>
                  {Number(q.fulfilmentChargePaise ?? 0) ? formatShopInr(Number(q.fulfilmentChargePaise), 2) : "Free"}
                </dd>
              </div>
            </dl>
            <div className={cn("mt-4 flex items-baseline justify-between gap-4 border-t pt-4", SHOP_HAIRLINE)}>
              <span className={cn("font-semibold", SHOP_INK)}>Total</span>
              <span className="text-2xl font-bold tabular-nums text-[var(--customer-primary,#730321)]">{formatShopInr(Number(q.totalPaise ?? 0), 2)}</span>
            </div>
            <Button
              type="button"
              className="mt-5 h-12 w-full rounded-full text-[15px] text-white"
              style={customerBrandStyle.primaryBg}
              disabled={!canPlaceOrder || createOrderState.isLoading}
              onClick={() => void onPlaceOrder()}
              title={
                canPlaceOrder
                  ? paymentMethod === "COD" ? "Place your cash on delivery order" : "Create order and continue to payment"
                  : "Checkout is currently unavailable for this quote"
              }
            >
              {createOrderState.isLoading ? "Placing order…" : placeOrderLabel}
            </Button>
            {status === "ACTIVE" && !expired ? (
              <Button type="button" variant="ghost" className="mt-2 h-10 w-full rounded-full text-[#6d5f62]" disabled={cancelState.isLoading} onClick={onCancel}>
                Cancel preview
              </Button>
            ) : (
              <Button type="button" variant="outline" className="mt-2 h-11 w-full rounded-full" asChild>
                <Link href={cartHref}>Refresh from cart</Link>
              </Button>
            )}
          </ShopPanel>
          {delivery && address?.mobile ? (
            <p className={cn("mt-3 flex items-center gap-1.5 px-1 text-xs", SHOP_MUTED)}>
              <MapPin className="size-3.5" /> Courier will call {address.mobile}
            </p>
          ) : null}
          <CustomerShopPoliciesLinks className="mt-5 px-1" />
        </aside>
      </div>
    </div>
  );
}
