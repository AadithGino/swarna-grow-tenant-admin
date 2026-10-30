"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Minus, Plus, Search, ShoppingBag, Store, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogTitle, dialogScrollShellClass } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Notice } from "@/src/components/admin-ui/detail-parts";
import { apiErrorMessage } from "@/src/lib/api-error";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import type { CounterOrderQuote, CounterPaymentMode } from "@/src/lib/counter-trade-types";
import {
  useCreateCustomerCounterOrderQuoteMutation,
  useGetCustomerCounterOrderOptionsQuery,
  useGetEcommerceProductsQuery,
  usePlaceCustomerCounterOrderMutation,
} from "@/src/store/api/admin-api";
import { EcommerceCatalogImage } from "@/src/features/ecommerce/ecommerce-catalog-image";
import { dmInr } from "@/src/features/digital-metals/digital-metals-admin-ui";
import {
  ConsentCheck,
  CounterDialogBand,
  CounterDone,
  PaymentModeFields,
  PriceSheet,
  QuoteTimer,
  Segmented,
  referenceMissing,
  useSecondsLeft,
} from "./counter-trade-ui";

const STEPS = ["Items", "Payment", "Done"];
type Product = Record<string, any>;

function priceOf(p: Product) {
  return Number(p?.pricing?.displayTotal?.amountPaise ?? 0);
}

export function CounterStoreOrderDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
}) {
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<"BRANCH_PICKUP" | "DELIVERY">("BRANCH_PICKUP");
  const [branchId, setBranchId] = useState("");
  const [addressId, setAddressId] = useState("");
  const [quote, setQuote] = useState<CounterOrderQuote | null>(null);
  const [payMode, setPayMode] = useState<CounterPaymentMode>("CASH");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [placeKey, setPlaceKey] = useState("");
  const [placed, setPlaced] = useState<{ order: Record<string, unknown>; cashCustody: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const products = useGetEcommerceProductsQuery(
    { status: "PUBLISHED", includePricing: true, limit: 100 },
    { skip: !open },
  );
  const options = useGetCustomerCounterOrderOptionsQuery(customerId, { skip: !open });
  const [getQuote, quoteState] = useCreateCustomerCounterOrderQuoteMutation();
  const [placeOrder, placeState] = usePlaceCustomerCounterOrderMutation();
  const secondsLeft = useSecondsLeft(quote?.expiresAt);

  const opts = options.data;
  const effectiveBranch = branchId || opts?.defaultPickupBranchId || "";
  const defaultAddress = opts?.addresses.find((a) => a.isDefault)?.id ?? opts?.addresses[0]?.id ?? "";
  const effectiveAddress = addressId || defaultAddress;
  const allProducts = (products.data?.items ?? []) as Product[];
  const needle = search.trim().toLowerCase();
  const visible = useMemo(
    () =>
      allProducts
        .filter((p) => p.status === "PUBLISHED")
        .filter((p) => !needle || `${p.name} ${p.sku ?? ""}`.toLowerCase().includes(needle))
        .slice(0, 30),
    [allProducts, needle],
  );
  const cartLines = Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([productId, quantity]) => ({ product: allProducts.find((p) => p.id === productId), productId, quantity }));
  const estimate = cartLines.reduce((s, l) => s + priceOf(l.product ?? {}) * l.quantity, 0);
  const itemCount = cartLines.reduce((s, l) => s + l.quantity, 0);
  const fulfilmentReady =
    mode === "BRANCH_PICKUP" ? Boolean(opts?.pickup.enabled && effectiveBranch) : Boolean(opts?.delivery.enabled && effectiveAddress);

  function setQty(productId: string, qty: number) {
    setCart((c) => ({ ...c, [productId]: Math.max(0, Math.min(99, qty)) }));
  }

  function reset() {
    setStep(0);
    setSearch("");
    setCart({});
    setQuote(null);
    setPayMode("CASH");
    setReference("");
    setNote("");
    setConsent(false);
    setPlaced(null);
    setError(null);
  }

  function close(next: boolean) {
    onOpenChange(next);
    if (!next) window.setTimeout(reset, 200);
  }

  async function priceOrder() {
    setError(null);
    try {
      const q = await getQuote({
        customerId,
        lines: cartLines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        fulfilmentMode: mode,
        ...(mode === "BRANCH_PICKUP" ? { pickupBranchId: effectiveBranch } : { addressId: effectiveAddress }),
      }).unwrap();
      setQuote(q);
      setPlaceKey(newIdempotencyKey());
      setConsent(false);
      setStep(1);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not price this order."));
    }
  }

  async function confirm() {
    if (!quote) return;
    setError(null);
    try {
      const res = await placeOrder({
        customerId,
        idempotencyKey: placeKey,
        quoteId: quote.id,
        paymentMode: payMode,
        paymentReference: payMode === "CASH" ? undefined : reference.trim(),
        note: note.trim() || undefined,
      }).unwrap();
      setPlaced(res);
      setStep(2);
      toast.success(`Order ${String(res.order.orderNumber ?? "")} placed for ${customerName}`);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not place this order."));
    }
  }

  const branchName = (id: string | null | undefined) => opts?.pickup.branches.find((b) => b.id === id)?.name ?? "branch";

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className={`${dialogScrollShellClass} [&>[data-slot=dialog-close]]:text-white [&>[data-slot=dialog-close]]:opacity-80 sm:max-w-2xl`} aria-describedby={undefined}>
        <DialogTitle className="sr-only">New store order for {customerName}</DialogTitle>
        <CounterDialogBand icon={ShoppingBag} title="New store order" customerName={customerName} steps={STEPS} current={step} />
        <DialogBody className="space-y-5 pb-6">
          {error ? <Notice tone="red" title={error} /> : null}
          {opts && !opts.checkoutTaxReady ? (
            <Notice tone="amber" title="Store checkout isn't set up yet">
              Finish GST and place-of-supply settings in Online store → Settings before taking orders.
            </Notice>
          ) : null}

          {step === 0 ? (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#a2969a]" aria-hidden />
                <Input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by product name or SKU"
                  className="pl-9"
                  aria-label="Search products"
                />
              </div>
              <div className="max-h-64 overflow-y-auto rounded-2xl border border-[#eadfe2]">
                {products.isLoading ? (
                  <p className="px-4 py-6 text-sm text-[#8a7c80]">Loading products…</p>
                ) : visible.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-[#8a7c80]">
                    {needle ? `No published product matches “${search.trim()}”.` : "No published products in the store yet."}
                  </p>
                ) : (
                  <ul className="divide-y divide-[#f3eae7]">
                    {visible.map((p) => {
                      const qty = cart[p.id] ?? 0;
                      return (
                        <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                          <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-[#f7f1eb] ring-1 ring-[#efe5e1]">
                            <EcommerceCatalogImage uploadId={p.imageUploadIds?.[0]} channel="admin" alt={p.name} fill />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[#28161a]">{p.name}</p>
                            <p className="truncate text-xs text-[#8a7c80]">
                              {p.sku ? `${p.sku} · ` : ""}
                              {priceOf(p) ? dmInr(priceOf(p)) : "Price unavailable"}
                            </p>
                          </div>
                          {qty > 0 ? (
                            <QtyStepper value={qty} onChange={(v) => setQty(p.id, v)} label={p.name} />
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => setQty(p.id, 1)} disabled={!priceOf(p)}>
                              <Plus />
                              Add
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-[#28161a]">How does the customer take it?</p>
                <Segmented
                  label="Fulfilment"
                  value={mode}
                  onChange={setMode}
                  options={[
                    {
                      value: "BRANCH_PICKUP",
                      label: "Collect at branch",
                      icon: Store,
                      hint: opts?.pickup.enabled ? "Hand over from the order" : "Pickup is off in store settings",
                      disabled: opts ? !opts.pickup.enabled : false,
                    },
                    {
                      value: "DELIVERY",
                      label: "Deliver",
                      icon: Truck,
                      hint: opts?.delivery.enabled
                        ? opts.addresses.length
                          ? `${opts.delivery.deliveryChargePaise ? dmInr(opts.delivery.deliveryChargePaise) : "Free"} delivery`
                          : "No saved address"
                        : "Delivery is off",
                      disabled: opts ? !opts.delivery.enabled || opts.addresses.length === 0 : false,
                    },
                  ]}
                />
                {mode === "BRANCH_PICKUP" && opts?.pickup.enabled ? (
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-[#3a2a2f]">Pickup branch</span>
                    <select
                      value={effectiveBranch}
                      onChange={(e) => setBranchId(e.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
                    >
                      {opts.pickup.branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {mode === "DELIVERY" && opts?.addresses.length ? (
                  <div role="radiogroup" aria-label="Delivery address" className="space-y-2">
                    {opts.addresses.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        role="radio"
                        aria-checked={effectiveAddress === a.id}
                        onClick={() => setAddressId(a.id)}
                        className={cn(
                          "w-full rounded-xl border px-3.5 py-2.5 text-left text-sm",
                          effectiveAddress === a.id ? "border-[#7b0a2b] bg-[#fbf3f5] shadow-[inset_0_0_0_1px_#7b0a2b]" : "border-[#eadfe2] bg-white",
                        )}
                      >
                        <span className="block font-semibold text-[#28161a]">
                          {a.label || "Address"} · {a.recipientName}
                        </span>
                        <span className="block truncate text-xs text-[#8a7c80]">
                          {[a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(", ")}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {cartLines.length ? (
                <div className="flex items-center justify-between rounded-xl bg-[#fbf6f2] px-4 py-3 text-sm">
                  <span className="text-[#5d4f53]">
                    {itemCount} item{itemCount === 1 ? "" : "s"} in the order
                  </span>
                  <span className="font-bold tabular-nums text-[#28161a]">≈ {dmInr(estimate)}</span>
                </div>
              ) : null}
            </>
          ) : null}

          {step === 1 && quote ? (
            <>
              <PriceSheet
                rows={[
                  ...quote.lines.map((l) => ({
                    label: (
                      <span>
                        {l.name} <span className="text-[#a2969a]">× {l.quantity}</span>
                      </span>
                    ),
                    value: dmInr(l.lineTotalPaise),
                  })),
                  { label: "GST", value: dmInr(quote.taxPaise) },
                  ...(quote.fulfilmentChargePaise ? [{ label: "Delivery", value: dmInr(quote.fulfilmentChargePaise) }] : []),
                  {
                    label: "Fulfilment",
                    value: quote.fulfilmentMode === "DELIVERY" ? "Delivery" : `Collect at ${branchName(quote.pickupBranchId)}`,
                    muted: true,
                  },
                ]}
                total={{ label: "Customer pays", value: dmInr(quote.totalPaise) }}
                aside={<QuoteTimer secondsLeft={secondsLeft} />}
              />
              <PaymentModeFields
                mode={payMode}
                onModeChange={setPayMode}
                reference={reference}
                onReferenceChange={setReference}
                amountLabel={<strong className="text-[#28161a]">{dmInr(quote.totalPaise)}</strong>}
              />
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-[#3a2a2f]">Note (optional)</span>
                <Textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} rows={2} placeholder="Ring size, gift wrap, anything for the team" />
              </label>
              <ConsentCheck checked={consent} onChange={setConsent}>
                The customer has checked the items and paid {dmInr(quote.totalPaise)}.
              </ConsentCheck>
            </>
          ) : null}

          {step === 2 && placed ? (
            <CounterDone title={`Order ${String(placed.order.orderNumber ?? "")} placed and paid`}>
              <p>
                Stock is taken out and the invoice is ready.{" "}
                {quote?.fulfilmentMode === "DELIVERY"
                  ? "Pack and ship it from the order as usual."
                  : "When the customer takes the jewellery, record the hand-over on the order."}
              </p>
              {payMode === "CASH" ? (
                <Notice tone={placed.cashCustody === "STAFF" ? "green" : "blue"}>
                  {placed.cashCustody === "STAFF"
                    ? `${dmInr(quote?.totalPaise)} is added to your cash in hand.`
                    : "Owner and admin cash isn't tracked in Cash control. Keep it with the day's takings."}
                </Notice>
              ) : null}
              <div className="flex justify-center pt-1">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/ecommerce/orders/${encodeURIComponent(String(placed.order.id ?? ""))}`}>Open order</Link>
                </Button>
              </div>
            </CounterDone>
          ) : null}
        </DialogBody>
        <DialogFooter>
          {step === 0 ? (
            <>
              <Button variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button
                disabled={!cartLines.length || !fulfilmentReady || quoteState.isLoading || opts?.checkoutTaxReady === false}
                onClick={() => void priceOrder()}
              >
                {quoteState.isLoading ? <Loader2 className="animate-spin" /> : null}
                Price {itemCount || ""} item{itemCount === 1 ? "" : "s"}
              </Button>
            </>
          ) : step === 1 ? (
            <>
              <Button variant="outline" onClick={() => setStep(0)} disabled={placeState.isLoading}>
                <ArrowLeft />
                Edit items
              </Button>
              {secondsLeft === 0 ? (
                <Button onClick={() => void priceOrder()} disabled={quoteState.isLoading}>
                  Refresh price
                </Button>
              ) : (
                <Button
                  disabled={!consent || referenceMissing(payMode, reference) || placeState.isLoading}
                  onClick={() => void confirm()}
                >
                  {placeState.isLoading ? <Loader2 className="animate-spin" /> : null}
                  Record {dmInr(quote?.totalPaise)} &amp; place order
                </Button>
              )}
            </>
          ) : (
            <Button onClick={() => close(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QtyStepper({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-[#e3d3d8] bg-white">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        className="grid size-8 place-items-center text-[#7b0a2b] hover:bg-[#fbf3f5]"
        aria-label={value === 1 ? `Remove ${label}` : `One less ${label}`}
      >
        {value === 1 ? <Trash2 className="size-3.5" /> : <Minus className="size-3.5" />}
      </button>
      <span className="w-7 text-center text-sm font-bold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="grid size-8 place-items-center text-[#7b0a2b] hover:bg-[#fbf3f5]"
        aria-label={`One more ${label}`}
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
