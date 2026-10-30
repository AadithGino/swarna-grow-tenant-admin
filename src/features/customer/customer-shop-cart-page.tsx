"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Banknote, CreditCard, Loader2, MapPin, Plus, ShoppingBag, Store, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import {
  customerApi,
  useCreateShopAddressMutation,
  useCreateShopQuoteMutation,
  useGetShopAddressesQuery,
  useGetShopAvailabilityQuery,
  useGetShopCartQuery,
  useGetShopFulfilmentOptionsQuery,
  useGetShopProductQuery,
  usePutShopCartMutation,
} from "@/src/store/api/customer-api";
import { useAppSelector } from "@/src/store/hooks";
import { parseApiError, toastApiError } from "@/src/lib/api-error";
import { formatCheckoutNotReadyMessage } from "@/src/features/ecommerce/ecommerce-checkout-blockers";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { customerShopOrdersPath, customerShopQuotePath } from "@/src/lib/customer-shop-paths";
import { customerBrandStyle } from "@/src/lib/customer-brand-styles";
import { CustomerShopPoliciesLinks } from "@/src/features/customer/customer-shop-policies";
import {
  ChoiceCard,
  formatShopInr,
  productMeta,
  productPricePaise,
  productStock,
  QuantityStepper,
  SHOP_HAIRLINE,
  SHOP_INK,
  SHOP_MUTED,
  ShopCheckoutSteps,
  ShopPanel,
  ShopProductArt,
  StockDot,
} from "@/src/features/customer/customer-shop-ui";

type FulfilmentChoice = "BRANCH_PICKUP" | "DELIVERY";

function CartLineRow({
  line,
  tenantSlug,
  busy,
  onQuantity,
}: {
  line: Record<string, unknown>;
  tenantSlug: string | null;
  busy: boolean;
  onQuantity: (quantity: number) => void;
}) {
  const summary = line.product as { name?: string; slug?: string } | null;
  const slug = summary?.slug ? String(summary.slug) : String(line.productId);
  const detail = useGetShopProductQuery(slug);
  const product = detail.data;
  const quantity = Number(line.quantity ?? 1);
  const unit = productPricePaise(product);
  const stock = productStock({ availability: line.availability ?? product?.availability });
  const maxQty =
    (line.availability as { stockPolicy?: string; availableQuantity?: number | null } | null)?.stockPolicy === "QUANTITY_TRACKED"
      ? Math.max(1, Number((line.availability as { availableQuantity?: number }).availableQuantity ?? 99))
      : 99;
  const name = summary?.name ?? String(product?.name ?? "Product");
  const href = customerPath(tenantSlug, "shop", encodeURIComponent(slug));
  const meta = product ? productMeta(product) : "";

  return (
    <li className="flex gap-4 py-5 first:pt-0 last:pb-0">
      <Link href={href} className="shrink-0" aria-label={name}>
        <ShopProductArt
          uploadId={(product?.imageUploadIds as string[] | undefined)?.[0]}
          viewUrl={(product?.imageUrls as { viewUrl?: string }[] | undefined)?.[0]?.viewUrl}
          alt=""
          className="size-24 sm:size-28"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={href} className={cn("line-clamp-2 font-serif text-base leading-snug hover:underline", SHOP_INK)}>
              {name}
            </Link>
            {meta ? <p className={cn("mt-0.5 text-xs", SHOP_MUTED)}>{meta}</p> : null}
            <StockDot stock={stock} className="mt-1" />
          </div>
          <div className="shrink-0 text-right">
            <p className={cn("font-semibold tabular-nums", SHOP_INK)}>{unit != null ? formatShopInr(unit * quantity) : "—"}</p>
            {unit != null && quantity > 1 ? <p className={cn("text-xs tabular-nums", SHOP_MUTED)}>{formatShopInr(unit)} each</p> : null}
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <QuantityStepper value={quantity} max={maxQty} disabled={busy} onChange={onQuantity} label={`Quantity for ${name}`} />
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-medium text-[#8a7d80] transition hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
            aria-label={`Remove ${name}`}
            disabled={busy}
            onClick={() => onQuantity(0)}
          >
            <Trash2 className="size-3.5" />
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}

export function CustomerShopCartPage() {
  const router = useRouter();
  const { tenantSlug } = useCustomerTenant();
  const availability = useGetShopAvailabilityQuery();
  const cart = useGetShopCartQuery(undefined, { skip: !availability.data?.available });
  const fulfilment = useGetShopFulfilmentOptionsQuery(undefined, {
    skip: !availability.data?.available,
  });
  const addresses = useGetShopAddressesQuery(undefined, { skip: !availability.data?.available });
  const [createQuote, createState] = useCreateShopQuoteMutation();
  const [createAddress, createAddressState] = useCreateShopAddressMutation();
  const [putCart, putCartState] = usePutShopCartMutation();

  const [mode, setMode] = useState<FulfilmentChoice>("BRANCH_PICKUP");
  const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "COD">("ONLINE");
  const [pickupBranchId, setPickupBranchId] = useState("");
  const [addressId, setAddressId] = useState("");
  const [pincode, setPincode] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    line1: "",
    city: "",
    state: "Kerala",
    pincode: "",
    recipientName: "",
    mobile: "",
  });

  const pickup = fulfilment.data?.pickup as {
    enabled?: boolean;
    branches?: { id?: string; name?: string }[];
  };
  const delivery = fulfilment.data?.delivery as {
    enabled?: boolean;
    serviceablePincodes?: string[];
    supportedDestinationStates?: string[];
    deliveryChargePaise?: number | null;
    codEnabled?: boolean;
    codPincodes?: string[];
  };
  const supportedStates = delivery?.supportedDestinationStates ?? [];

  const addressItems = useMemo(
    () => (addresses.data?.items as Record<string, unknown>[]) ?? [],
    [addresses.data?.items],
  );

  const lineSlugs = useMemo(
    () =>
      ((cart.data?.lines as Record<string, unknown>[] | undefined) ?? []).map((line) => ({
        slug: String((line.product as { slug?: string } | null)?.slug ?? line.productId),
        quantity: Number(line.quantity ?? 1),
      })),
    [cart.data?.lines],
  );
  /** Sum of today's estimated prices; -1 while any line is still loading or unpriced. */
  const estimatePaise = useAppSelector((state) => {
    let sum = 0;
    for (const { slug, quantity } of lineSlugs) {
      const unit = productPricePaise(customerApi.endpoints.getShopProduct.select(slug)(state).data);
      if (unit == null) return -1;
      sum += unit * quantity;
    }
    return sum;
  });

  if (availability.isLoading || cart.isLoading) return <PageSkeleton cards={2} />;
  if (!availability.data?.available) {
    return (
      <div className={cn("mx-auto max-w-lg rounded-[1.75rem] border bg-white px-8 py-12 text-center", SHOP_HAIRLINE)}>
        <h1 className={cn("font-serif text-2xl", SHOP_INK)}>The store is closed right now</h1>
        <p className={cn("mt-2 text-sm", SHOP_MUTED)}>Your previous orders are still available.</p>
        {availability.data?.hasOrderHistory ? (
          <Link href={customerShopOrdersPath(tenantSlug)} className="mt-5 inline-flex rounded-full px-5 py-3 text-sm font-semibold text-white" style={customerBrandStyle.primaryBg}>
            View your orders
          </Link>
        ) : null}
      </div>
    );
  }
  if (cart.isError) return <QueryError error={cart.error} onRetry={cart.refetch} />;

  const lines = (cart.data?.lines as Record<string, unknown>[]) ?? [];
  const pieceCount = lines.reduce((s, l) => s + Number(l.quantity ?? 0), 0);
  const pickupEnabled = pickup?.enabled === true && (pickup.branches?.length ?? 0) > 0;
  const deliveryEnabled = delivery?.enabled === true;
  const selectedBranch = pickupBranchId || String(pickup?.branches?.[0]?.id ?? "");
  const selectedAddress = addressId || String(addressItems.find((a) => a.isDefault)?.id ?? "");
  const deliveryCharge = Number(delivery?.deliveryChargePaise ?? 0);

  async function updateLine(productId: string, quantity: number) {
    const nextLines = lines
      .map((line) => ({ productId: String(line.productId), quantity: Number(line.quantity) }))
      .filter((line) => line.productId !== productId);
    if (quantity > 0) nextLines.push({ productId, quantity });
    try {
      await putCart({ lines: nextLines, expectedVersion: cart.data?.version as number | undefined }).unwrap();
    } catch (err) {
      toastApiError(err);
      void cart.refetch();
    }
  }

  async function onCreateQuote() {
    try {
      if (mode === "BRANCH_PICKUP") {
        const branchId = pickupBranchId || pickup?.branches?.[0]?.id;
        if (!pickupEnabled || !branchId) {
          toast.error("Select a pickup branch.");
          return;
        }
        const preview = await createQuote({
          fulfilmentMode: "BRANCH_PICKUP",
          pickupBranchId: String(branchId),
          idempotencyKey: newIdempotencyKey(),
        }).unwrap();
        router.push(customerShopQuotePath(tenantSlug, String(preview.id)));
        return;
      }
      if (!deliveryEnabled) {
        toast.error("Delivery is not available for this store.");
        return;
      }
      const chosenAddress = addressId || String(addressItems.find((a) => a.isDefault)?.id ?? "");
      if (!chosenAddress && !pincode.trim()) {
        toast.error("Select a saved address or enter a serviceable pincode.");
        return;
      }
      const selectedRow = addressItems.find((a) => String(a.id) === chosenAddress);
      const pinForCheck = chosenAddress
        ? String(selectedRow?.pincode ?? "").trim()
        : pincode.trim();
      const serviceable = delivery?.serviceablePincodes ?? [];
      if (
        serviceable.length > 0
        && pinForCheck
        && !serviceable.includes(pinForCheck)
      ) {
        toast.error(
          `Pincode ${pinForCheck} is not in this store's delivery area. Serviceable: ${serviceable.join(", ")}.`,
          { duration: 8000 },
        );
        return;
      }
      const stateForCheck = chosenAddress
        ? String(selectedRow?.state ?? "").trim()
        : addressForm.state.trim();
      if (supportedStates.length > 0 && stateForCheck) {
        const ok = supportedStates.some(
          (s) => s.trim().toLowerCase() === stateForCheck.toLowerCase(),
        );
        if (!ok) {
          toast.error(
            `Address state "${stateForCheck}" is not supported for checkout. Use: ${supportedStates.join(", ")}.`,
            { duration: 9000 },
          );
          return;
        }
      } else if (chosenAddress && !stateForCheck) {
        toast.error("Delivery address must include a valid state (e.g. Kerala).");
        return;
      }
      const codPincodes = delivery?.codPincodes ?? [];
      const codEligible =
        delivery?.codEnabled === true
        && pinForCheck
        && codPincodes.includes(pinForCheck);
      if (paymentMethod === "COD" && !codEligible) {
        toast.error(
          serviceable.includes(pinForCheck)
            ? "Delivery is available to this pincode, but cash on delivery is not."
            : "Cash on delivery requires a saved address in a COD pincode.",
          { duration: 8000 },
        );
        return;
      }
      const preview = await createQuote({
        fulfilmentMode: "DELIVERY",
        paymentMethod: paymentMethod === "COD" && codEligible ? "COD" : "ONLINE",
        ...(chosenAddress ? { addressId: chosenAddress } : {}),
        ...(!chosenAddress && pincode.trim() ? { pincode: pincode.trim() } : {}),
        idempotencyKey: newIdempotencyKey(),
      }).unwrap();
      router.push(customerShopQuotePath(tenantSlug, String(preview.id)));
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.code === "CHECKOUT_NOT_READY") {
        toast.error(formatCheckoutNotReadyMessage(err, parsed), { duration: 8000 });
        return;
      }
      toastApiError(err);
    }
  }

  async function onSaveAddress() {
    try {
      const created = await createAddress({
        ...addressForm,
        idempotencyKey: newIdempotencyKey(),
        isDefault: addressItems.length === 0,
      }).unwrap();
      setAddressId(String(created.id));
      setShowAddressForm(false);
      toast.success("Address saved");
    } catch (err) {
      toastApiError(err);
    }
  }

  const shopHref = customerPath(tenantSlug, "shop");

  return (
    <div className="pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href={shopHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--customer-primary,#730321)] underline-offset-4 hover:underline">
            <ArrowLeft className="size-4" /> Continue shopping
          </Link>
          <h1 className={cn("mt-3 font-serif text-[2rem] leading-tight", SHOP_INK)}>Your cart</h1>
          {lines.length ? <p className={cn("mt-1 text-sm", SHOP_MUTED)}>{pieceCount} {pieceCount === 1 ? "piece" : "pieces"} · choose pickup or delivery, then see your final price.</p> : null}
        </div>
        <ShopCheckoutSteps current={0} />
      </div>

      {!lines.length ? (
        <div className={cn("mt-8 rounded-[1.75rem] border bg-white px-6 py-16 text-center", SHOP_HAIRLINE)}>
          <span className="mx-auto grid size-16 place-items-center rounded-full customer-accent-tint-surface">
            <ShoppingBag className="size-7 customer-gold-copy" />
          </span>
          <h2 className={cn("mt-5 font-serif text-2xl", SHOP_INK)}>Your cart is empty</h2>
          <p className={cn("mx-auto mt-2 max-w-sm text-sm leading-6", SHOP_MUTED)}>Pieces you add from the store will wait here while you decide.</p>
          <Link href={shopHref} className="mt-6 inline-flex rounded-full px-6 py-3 text-sm font-semibold text-white" style={customerBrandStyle.primaryBg}>
            Browse the collection
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
          <div className="space-y-6">
            <ShopPanel title="Items" action={putCartState.isLoading ? <Loader2 className="size-4 animate-spin text-[#9a8d90]" aria-label="Updating cart" /> : null}>
              <ul className={cn("divide-y", "divide-[#f0e6e0]")}>
                {lines.map((line) => (
                  <CartLineRow
                    key={String(line.productId)}
                    line={line}
                    tenantSlug={tenantSlug}
                    busy={putCartState.isLoading}
                    onQuantity={(q) => void updateLine(String(line.productId), q)}
                  />
                ))}
              </ul>
            </ShopPanel>

            <ShopPanel title="How would you like to receive it?">
              <div className="grid gap-3 sm:grid-cols-2">
                <ChoiceCard
                  name="fulfilment"
                  selected={mode === "BRANCH_PICKUP"}
                  disabled={!pickupEnabled}
                  onSelect={() => setMode("BRANCH_PICKUP")}
                  icon={<Store className="size-5" />}
                  title="Collect from a branch"
                  detail={pickupEnabled ? "Free · ready when the store confirms" : "Not offered by this store"}
                />
                <ChoiceCard
                  name="fulfilment"
                  selected={mode === "DELIVERY"}
                  disabled={!deliveryEnabled}
                  onSelect={() => setMode("DELIVERY")}
                  icon={<Truck className="size-5" />}
                  title="Deliver to me"
                  detail={
                    deliveryEnabled
                      ? deliveryCharge
                        ? `${formatShopInr(deliveryCharge)} delivery · insured`
                        : "Delivery charge shown in your price preview"
                      : "Not offered by this store"
                  }
                />
              </div>

              {mode === "BRANCH_PICKUP" ? (
                pickupEnabled ? (
                  <fieldset className="mt-6">
                    <legend className={cn("mb-3 text-sm font-semibold", SHOP_INK)}>Pickup branch</legend>
                    <div className="space-y-2.5">
                      {(pickup?.branches ?? []).map((b) => (
                        <ChoiceCard
                          key={String(b.id)}
                          name="pickup-branch"
                          selected={selectedBranch === String(b.id)}
                          onSelect={() => setPickupBranchId(String(b.id))}
                          icon={<MapPin className="size-5" />}
                          title={b.name ?? String(b.id)}
                        />
                      ))}
                    </div>
                  </fieldset>
                ) : (
                  <p className={cn("mt-4 text-sm", SHOP_MUTED)}>Pickup is not set up for this store.</p>
                )
              ) : deliveryEnabled ? (
                <div className="mt-6 space-y-6">
                  <fieldset>
                    <legend className={cn("mb-3 text-sm font-semibold", SHOP_INK)}>Deliver to</legend>
                    {addressItems.length > 0 ? (
                      <div className="space-y-2.5">
                        {addressItems.map((a) => (
                          <ChoiceCard
                            key={String(a.id)}
                            name="delivery-address"
                            selected={selectedAddress === String(a.id)}
                            onSelect={() => setAddressId(String(a.id))}
                            icon={<MapPin className="size-5" />}
                            title={
                              <span className="flex items-center gap-2">
                                {String(a.label ?? "Address")}
                                {a.isDefault ? <span className="rounded-full bg-[#f3ebe7] px-2 py-0.5 text-[10px] font-semibold text-[#6d5f62]">Default</span> : null}
                              </span>
                            }
                            detail={[a.recipientName, a.line1, a.line2, [a.city, a.state, a.pincode].filter(Boolean).join(", ")].filter(Boolean).map(String).join(" · ")}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="max-w-xs space-y-2">
                        <Label htmlFor="pincode">Delivery pincode</Label>
                        <Input id="pincode" inputMode="numeric" value={pincode} onChange={(e) => setPincode(e.target.value)} className="h-11 rounded-xl" placeholder="e.g. 682036" />
                        <p className={cn("text-xs", SHOP_MUTED)}>We check this against the store&apos;s delivery area.</p>
                      </div>
                    )}
                    <button
                      type="button"
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--customer-primary,#730321)] underline-offset-4 hover:underline"
                      onClick={() => setShowAddressForm((v) => !v)}
                      aria-expanded={showAddressForm}
                    >
                      <Plus className="size-4" />
                      {showAddressForm ? "Close new address" : "Add a new address"}
                    </button>
                    {showAddressForm ? (
                      <div className={cn("mt-3 grid gap-3 rounded-2xl border bg-[#fcfaf8] p-4 sm:grid-cols-2", SHOP_HAIRLINE)}>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label htmlFor="addr-line1">House, street and area</Label>
                          <Input id="addr-line1" value={addressForm.line1} onChange={(e) => setAddressForm((f) => ({ ...f, line1: e.target.value }))} className="h-11 rounded-xl bg-white" />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="addr-name">Recipient name</Label>
                          <Input id="addr-name" value={addressForm.recipientName} onChange={(e) => setAddressForm((f) => ({ ...f, recipientName: e.target.value }))} className="h-11 rounded-xl bg-white" />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="addr-mobile">Mobile</Label>
                          <Input id="addr-mobile" inputMode="tel" value={addressForm.mobile} onChange={(e) => setAddressForm((f) => ({ ...f, mobile: e.target.value }))} className="h-11 rounded-xl bg-white" />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="addr-city">City</Label>
                          <Input id="addr-city" value={addressForm.city} onChange={(e) => setAddressForm((f) => ({ ...f, city: e.target.value }))} className="h-11 rounded-xl bg-white" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="addr-state">State</Label>
                            <Input id="addr-state" value={addressForm.state} onChange={(e) => setAddressForm((f) => ({ ...f, state: e.target.value }))} className="h-11 rounded-xl bg-white" />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="addr-pin">Pincode</Label>
                            <Input id="addr-pin" inputMode="numeric" value={addressForm.pincode} onChange={(e) => setAddressForm((f) => ({ ...f, pincode: e.target.value }))} className="h-11 rounded-xl bg-white" />
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <Button type="button" className="h-10 rounded-full px-5 text-white" style={customerBrandStyle.primaryBg} disabled={createAddressState.isLoading} onClick={() => void onSaveAddress()}>
                            {createAddressState.isLoading ? "Saving…" : "Save address"}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    {supportedStates.length > 0 ? (
                      <p className={cn("mt-3 text-xs", SHOP_MUTED)}>This store delivers to addresses in {supportedStates.join(", ")}.</p>
                    ) : null}
                  </fieldset>

                  <fieldset>
                    <legend className={cn("mb-3 text-sm font-semibold", SHOP_INK)}>Pay with</legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ChoiceCard
                        name="payment"
                        selected={paymentMethod === "ONLINE"}
                        onSelect={() => setPaymentMethod("ONLINE")}
                        icon={<CreditCard className="size-5" />}
                        title="Pay online"
                        detail="UPI, cards or net banking after you place the order"
                      />
                      <ChoiceCard
                        name="payment"
                        selected={paymentMethod === "COD"}
                        disabled={delivery?.codEnabled !== true}
                        onSelect={() => setPaymentMethod("COD")}
                        icon={<Banknote className="size-5" />}
                        title="Cash on delivery"
                        detail={delivery?.codEnabled === true ? "Available in selected pincodes only" : "Not offered by this store"}
                      />
                    </div>
                  </fieldset>
                </div>
              ) : (
                <p className={cn("mt-4 text-sm", SHOP_MUTED)}>Delivery isn&apos;t available until the store sets it up.</p>
              )}
            </ShopPanel>
          </div>

          <aside className="lg:sticky lg:top-28">
            <ShopPanel title="Summary">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className={SHOP_MUTED}>Items ({pieceCount})</dt>
                  <dd className={cn("font-medium tabular-nums", SHOP_INK)}>{estimatePaise >= 0 ? formatShopInr(estimatePaise) : "Calculating…"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className={SHOP_MUTED}>{mode === "DELIVERY" ? "Delivery" : "Pickup"}</dt>
                  <dd className={cn("font-medium tabular-nums", SHOP_INK)}>{mode === "DELIVERY" ? (deliveryCharge ? formatShopInr(deliveryCharge) : "In preview") : "Free"}</dd>
                </div>
              </dl>
              <div className={cn("mt-4 flex items-baseline justify-between gap-4 border-t pt-4", SHOP_HAIRLINE)}>
                <span className={cn("font-semibold", SHOP_INK)}>Estimated total</span>
                <span className="text-xl font-bold tabular-nums text-[var(--customer-primary,#730321)]">
                  {estimatePaise >= 0 ? formatShopInr(estimatePaise + (mode === "DELIVERY" ? deliveryCharge : 0)) : "—"}
                </span>
              </div>
              <p className={cn("mt-2 text-xs leading-5", SHOP_MUTED)}>Includes estimated GST at today&apos;s rate. The next step locks your exact price for a few minutes.</p>
              <Button
                type="button"
                className="mt-5 h-12 w-full rounded-full text-[15px] text-white"
                style={customerBrandStyle.primaryBg}
                disabled={!lines.length || createState.isLoading}
                onClick={() => void onCreateQuote()}
              >
                {createState.isLoading ? "Preparing your price…" : "Review final price"}
              </Button>
              <p className={cn("mt-3 text-center text-xs", SHOP_MUTED)}>You won&apos;t be charged yet.</p>
            </ShopPanel>
            <CustomerShopPoliciesLinks className="mt-5 px-1" />
          </aside>
        </div>
      )}
    </div>
  );
}
