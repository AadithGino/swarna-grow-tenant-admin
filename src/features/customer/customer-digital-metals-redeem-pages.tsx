"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { customerPath } from "@/src/lib/customer-tenant";
import { CustomerDigitalMetalsDocumentPanel } from "@/src/features/customer/customer-digital-metals-document-panel";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { toastApiError } from "@/src/lib/api-error";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { env } from "@/src/config/env";
import {
  isPhonePeMockSdkToken,
  openCustomerPaymentTarget,
  pickPhonePeGatewayUrl,
} from "@/src/lib/customer-payment-redirect";
import {
  customerPollIntervalMs,
  DM_REDEEM_ORDER_POLL_TERMINAL,
} from "@/src/lib/customer-payment-polling";
import {
  useCancelCustomerDigitalMetalsRedemptionOrderMutation,
  useCompleteCustomerDigitalMetalsRedemptionTestHarnessPaymentMutation,
  useCreateCustomerDigitalMetalsRedemptionOrderMutation,
  useCreateCustomerDigitalMetalsRedemptionPaymentIntentMutation,
  useLazyPollDigitalMetalsRedemptionPaymentIntentQuery,
  useCreateCustomerDigitalMetalsDeliveryAddressMutation,
  useCreateCustomerDigitalMetalsRedemptionQuoteMutation,
  useDeleteCustomerDigitalMetalsDeliveryAddressMutation,
  useGetCustomerBranchesQuery,
  useGetCustomerDigitalMetalsCapabilityQuery,
  useGetCustomerDigitalMetalsDeliveryAddressesQuery,
  useGetCustomerDigitalMetalsPortfolioQuery,
  useGetCustomerDigitalMetalsRedemptionCatalogueQuery,
  useGetCustomerDigitalMetalsRedemptionFulfilmentQuery,
  useGetCustomerDigitalMetalsRedemptionOrderQuery,
  useGetCustomerDigitalMetalsRedemptionPickupInstructionsQuery,
  useUpdateCustomerDigitalMetalsDeliveryAddressMutation,
} from "@/src/store/api/customer-api";
import {
  DeleteDeliveryAddressDialog,
  DeliveryAddressCardActions,
  DeliveryAddressFormFields,
  deliveryAddressToForm,
  emptyDeliveryAddressForm,
  formatDeliveryAddressDetail,
  type DeliveryAddressFormState,
} from "@/src/features/customer/customer-delivery-address-book";
import { formatDeliveryAddressSnapshot, formatInrFromPaise, ugToGramsDisplay } from "@/src/lib/digital-metals-display";
import { DigitalMetalsRedemptionChargeBreakdown } from "@/src/lib/digital-metals-redemption-charge-breakdown";
import {
  CustomerDmPageShell,
  CustomerDmSurface,
  CustomerDmTimeline,
  dmAssetName,
  DmCoinArt,
  dmFinish,
  redemptionOrderStatusLabel,
} from "@/src/features/customer/customer-digital-metals-shared";
import { ChoiceCard } from "@/src/features/customer/customer-shop-ui";
import { EcommerceCatalogImage } from "@/src/features/ecommerce/ecommerce-catalog-image";
import { MapPin, Plus, Store, Truck } from "lucide-react";

const QUOTE_KEY = "dm_redemption_quote_v1";

export function stashRedemptionQuote(quoteId: string, payload: Record<string, unknown>) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(`${QUOTE_KEY}:${quoteId}`, JSON.stringify(payload));
}

export function readRedemptionQuote(quoteId: string): Record<string, unknown> | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(`${QUOTE_KEY}:${quoteId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function formatCatalogueCharge(paise: number) {
  if (paise === 0) return "No extra charges";
  return `${formatInrFromPaise(paise)} minting & packing`;
}

export function CustomerDigitalMetalsRedeemCatalogPage() {
  const { tenantSlug } = useCustomerTenant();
  const capability = useGetCustomerDigitalMetalsCapabilityQuery();
  const catalogue = useGetCustomerDigitalMetalsRedemptionCatalogueQuery(undefined, {
    skip: !capability.data?.canPlaceRedemption,
  });
  const router = useRouter();
  const portfolioBack = customerPath(tenantSlug, "digital-metals");

  if (capability.isLoading || catalogue.isLoading) return <PageSkeleton cards={1} />;
  if (capability.isError) return <QueryError error={capability.error} onRetry={capability.refetch} />;
  if (!capability.data?.canPlaceRedemption) {
    return (
      <CustomerDmPageShell title="Redeem physical metal" backHref={portfolioBack}>
        <CustomerDmSurface>
          <p className="text-sm text-[#5c3d42]">
            {capability.data?.blockers?.[0]?.message ?? "Physical redemption is not available."}
          </p>
        </CustomerDmSurface>
      </CustomerDmPageShell>
    );
  }
  if (catalogue.isError) return <QueryError error={catalogue.error} onRetry={catalogue.refetch} />;

  const items = catalogue.data?.items ?? [];

  function startRedeem(item: Record<string, unknown>) {
    router.push(
      customerPath(tenantSlug, "digital-metals", "redeem-setup", String(item.id)),
    );
  }

  return (
    <CustomerDmPageShell
      title="Turn grams into coins & bars"
      subtitle="Pick a coin or bar from your jeweller. The metal comes from your wallet; minting, packing and delivery are paid in rupees."
      backHref={portfolioBack}
      backLabel="Wallet"
      testId="customer-dm-redeem-catalogue"
    >
      {items.length === 0 ? (
        <CustomerDmSurface className="text-center">
          <p className="text-sm text-[#5c4f52]">No coins or bars are listed right now. Check back later.</p>
        </CustomerDmSurface>
      ) : (
        <ul className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
          {items.map((item) => {
            const metal = String(item.metal);
            const finish = dmFinish(metal);
            const charge = Number(item.chargeTotalPaise ?? item.mintingChargePaise ?? 0);
            const grams = item.unitQuantityUg ? ugToGramsDisplay(String(item.unitQuantityUg)) : null;
            const gramsShort = item.unitQuantityUg ? `${Number((Number(item.unitQuantityUg) / 1_000_000).toFixed(3))}g` : undefined;
            const isBar = /bar/i.test(String(item.label ?? ""));
            return (
              <li key={String(item.id)} className="group flex flex-col overflow-hidden rounded-[1.15rem] border border-[var(--ck-line)] bg-white p-2.5 transition hover:bg-[#fdfbf8]">
                <div className="relative grid h-[7.25rem] place-items-center overflow-hidden rounded-xl" style={{ background: `radial-gradient(circle at 50% 42%, #ffffff 0%, ${finish.soft} 75%)` }}>
                  {item.imageUploadId ? (
                    <EcommerceCatalogImage uploadId={String(item.imageUploadId)} channel="customer" alt="" fill className="object-cover" />
                  ) : item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={String(item.imageUrl)} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : isBar ? (
                    <span
                      className="grid h-12 w-24 place-items-center rounded-md text-xs font-bold shadow-[0_8px_16px_rgba(60,40,10,.18)]"
                      style={{ background: finish.face, color: finish.ink, clipPath: "polygon(10% 0, 90% 0, 100% 100%, 0 100%)" }}
                    >
                      {gramsShort}
                    </span>
                  ) : (
                    <DmCoinArt metal={metal} size={76} label={gramsShort} />
                  )}
                  <span className="absolute left-2 top-2 rounded-[7px] bg-white/95 px-2 py-[3px] text-[0.66rem] font-semibold text-[var(--ck-ink-2)]">
                    {dmAssetName(metal, Number(item.finenessPpm))}
                  </span>
                </div>
                <div className="flex flex-1 flex-col px-0.5 pt-2.5">
                  <p className="text-[0.9rem] font-semibold leading-snug text-[var(--ck-ink)]">{String(item.label)}</p>
                  <p className="mt-0.5 text-[0.7rem] leading-snug text-[var(--ck-muted)]">
                    Uses {grams ?? "metal"}
                    {item.leadTimeDays != null ? ` · ready in ~${String(item.leadTimeDays)} days` : ""}
                  </p>
                  <p className="mt-0.5 text-[0.7rem] leading-snug text-[var(--ck-muted)]">
                    {[item.pickupEnabled !== false ? "Pickup" : null, item.deliveryEnabled !== false ? "Delivery" : null].filter(Boolean).join(" or ")}
                  </p>
                  <p className="mt-2 text-[0.8rem] font-semibold text-[var(--ck-ink)]">{formatCatalogueCharge(charge)}</p>
                  <div className="mt-auto pt-2.5">
                    <Button
                      type="button"
                      className="h-9 w-full rounded-xl text-[0.8rem] text-white"
                      style={{ background: "var(--customer-primary, #730321)" }}
                      onClick={() => startRedeem(item)}
                    >
                      Choose this
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </CustomerDmPageShell>
  );
}

type RedemptionFulfilmentMode = "PICKUP" | "DELIVERY";

export function CustomerDigitalMetalsRedeemSetupPage({ catalogueItemId }: { catalogueItemId: string }) {
  const { tenantSlug } = useCustomerTenant();
  const router = useRouter();
  const catalogue = useGetCustomerDigitalMetalsRedemptionCatalogueQuery();
  const portfolio = useGetCustomerDigitalMetalsPortfolioQuery();
  const branchesQuery = useGetCustomerBranchesQuery();
  const addressesQuery = useGetCustomerDigitalMetalsDeliveryAddressesQuery();
  const [createAddress, createAddressState] = useCreateCustomerDigitalMetalsDeliveryAddressMutation();
  const [updateAddress, updateAddressState] = useUpdateCustomerDigitalMetalsDeliveryAddressMutation();
  const [deleteAddress, deleteAddressState] = useDeleteCustomerDigitalMetalsDeliveryAddressMutation();
  const [createQuote, quoteState] = useCreateCustomerDigitalMetalsRedemptionQuoteMutation();

  const item = useMemo(
    () => (catalogue.data?.items ?? []).find((row) => String(row.id) === catalogueItemId),
    [catalogue.data?.items, catalogueItemId],
  );

  const pickupEnabled = item?.pickupEnabled !== false;
  const deliveryEnabled = item?.deliveryEnabled !== false;
  const defaultBranchId =
    (portfolio.data?.items?.[0]?.branchId as string | null | undefined) ?? "";
  const branchRows = useMemo(() => {
    const raw = branchesQuery.data;
    if (!Array.isArray(raw)) return [];
    return raw.filter((b) => b && typeof b === "object" && "id" in b);
  }, [branchesQuery.data]);

  const [mode, setMode] = useState<RedemptionFulfilmentMode>(
    pickupEnabled ? "PICKUP" : "DELIVERY",
  );
  const [pickupBranchId, setPickupBranchId] = useState("");
  const [deliveryAddressId, setDeliveryAddressId] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [deleteAddressId, setDeleteAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<DeliveryAddressFormState>(emptyDeliveryAddressForm);

  const addressItems = addressesQuery.data?.items ?? [];
  const effectiveBranchId =
    pickupBranchId || defaultBranchId || String(branchRows[0]?.id ?? "");

  useEffect(() => {
    if (!deliveryAddressId && addressItems.length > 0) {
      const preferred = addressItems.find((a) => a.isDefault === true) ?? addressItems[0];
      setDeliveryAddressId(String(preferred.id));
    }
  }, [addressItems, deliveryAddressId]);

  if (catalogue.isLoading) return <PageSkeleton cards={1} />;
  if (catalogue.isError) return <QueryError error={catalogue.error} onRetry={catalogue.refetch} />;
  if (!item) {
    return (
      <CustomerDmPageShell
        title="Redemption item"
        backHref={customerPath(tenantSlug, "digital-metals", "redeem")}
      >
        <CustomerDmSurface>
          <p className="text-sm text-[#5c3d42]">This catalogue item is no longer available.</p>
        </CustomerDmSurface>
      </CustomerDmPageShell>
    );
  }

  function openCreateAddress() {
    setEditingAddressId(null);
    setAddressForm(emptyDeliveryAddressForm());
    setShowAddressForm(true);
  }

  function openEditAddress(row: Record<string, unknown>) {
    setEditingAddressId(String(row.id));
    setAddressForm(deliveryAddressToForm(row));
    setShowAddressForm(true);
    setDeliveryAddressId(String(row.id));
  }

  function closeAddressForm() {
    setShowAddressForm(false);
    setEditingAddressId(null);
    setAddressForm(emptyDeliveryAddressForm());
  }

  async function onSaveAddress() {
    if (!addressForm.line1.trim() || !addressForm.city.trim() || !addressForm.state.trim() || !addressForm.pincode.trim()) {
      toast.error("Fill house/street, city, state and pincode.");
      return;
    }
    try {
      if (editingAddressId) {
        const current = addressItems.find((row) => String(row.id) === editingAddressId);
        const updated = await updateAddress({
          addressId: editingAddressId,
          ...addressForm,
          ...(typeof current?.version === "number" ? { expectedVersion: Number(current.version) } : {}),
        }).unwrap();
        setDeliveryAddressId(String(updated.id ?? editingAddressId));
        toast.success("Address updated");
      } else {
        const created = await createAddress({
          ...addressForm,
          idempotencyKey: newIdempotencyKey(),
          isDefault: addressItems.length === 0,
        }).unwrap();
        setDeliveryAddressId(String(created.id));
        toast.success("Address saved");
      }
      closeAddressForm();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function onConfirmDeleteAddress() {
    if (!deleteAddressId) return;
    try {
      await deleteAddress({ addressId: deleteAddressId }).unwrap();
      if (deliveryAddressId === deleteAddressId) setDeliveryAddressId("");
      if (editingAddressId === deleteAddressId) closeAddressForm();
      setDeleteAddressId(null);
      toast.success("Address removed");
    } catch (err) {
      toastApiError(err);
    }
  }

  const addressBusy = createAddressState.isLoading || updateAddressState.isLoading;

  async function continueToQuote() {
    if (mode === "PICKUP" && !effectiveBranchId) {
      toast.error("Select a pickup branch.");
      return;
    }
    if (mode === "DELIVERY" && !deliveryAddressId) {
      toast.error("Select or add a delivery address.");
      return;
    }
    try {
      const quote = await createQuote({
        catalogueItemId: String(item!.id),
        metal: String(item!.metal),
        finenessPpm: Number(item!.finenessPpm),
        unitCount: 1,
        fulfilmentMode: mode,
        ...(mode === "PICKUP" ? { pickupBranchId: effectiveBranchId } : {}),
        ...(mode === "DELIVERY" ? { deliveryAddressId } : {}),
        idempotencyKey: newIdempotencyKey(),
      }).unwrap();
      stashRedemptionQuote(String(quote.quoteId), quote);
      router.push(customerPath(tenantSlug, "digital-metals", "redeem-review", String(quote.quoteId)));
    } catch (err) {
      toastApiError(err);
    }
  }

  const backHref = customerPath(tenantSlug, "digital-metals", "redeem");

  return (
    <CustomerDmPageShell
      narrow
      title={String(item.label)}
      subtitle="Choose branch pickup or home delivery. We'll price minting and delivery on the next screen."
      backHref={backHref}
      testId="customer-dm-redeem-setup"
    >
      <CustomerDmSurface>
        <fieldset>
          <legend className="text-[15px] font-semibold text-[#221a1d]">How would you like to receive it?</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {pickupEnabled ? (
              <ChoiceCard
                name="dm-redeem-mode"
                selected={mode === "PICKUP"}
                onSelect={() => setMode("PICKUP")}
                icon={<Store className="size-5" />}
                title="Collect from a branch"
                detail="Bring your pickup code and photo ID"
              />
            ) : null}
            {deliveryEnabled ? (
              <ChoiceCard
                name="dm-redeem-mode"
                selected={mode === "DELIVERY"}
                onSelect={() => setMode("DELIVERY")}
                icon={<Truck className="size-5" />}
                title="Deliver to my address"
                detail="Insured courier; delivery charge shown on review"
              />
            ) : null}
          </div>
        </fieldset>

        {mode === "PICKUP" ? (
          <fieldset className="mt-6">
            <legend className="mb-3 text-sm font-semibold text-[#221a1d]">Pickup branch</legend>
            {branchRows.length === 0 ? (
              <p className="text-sm text-[#7a6f72]">No branches are listed for pickup.</p>
            ) : (
              <div className="space-y-2.5" id="dm-redeem-branch">
                {branchRows.map((b) => (
                  <ChoiceCard
                    key={String(b.id)}
                    name="dm-redeem-branch"
                    selected={effectiveBranchId === String(b.id)}
                    onSelect={() => setPickupBranchId(String(b.id))}
                    icon={<MapPin className="size-5" />}
                    title={String(b.name ?? b.code ?? b.id)}
                    detail={(b as { address?: string }).address ? String((b as { address?: string }).address) : undefined}
                  />
                ))}
              </div>
            )}
          </fieldset>
        ) : (
          <fieldset className="mt-6">
            <legend className="mb-3 text-sm font-semibold text-[#221a1d]">Delivery address</legend>
            {addressItems.length > 0 ? (
              <div className="space-y-2.5">
                {addressItems.map((a) => (
                  <ChoiceCard
                    key={String(a.id)}
                    name="dm-redeem-address"
                    selected={deliveryAddressId === String(a.id)}
                    onSelect={() => setDeliveryAddressId(String(a.id))}
                    icon={<MapPin className="size-5" />}
                    title={String(a.label ?? "Address")}
                    detail={formatDeliveryAddressDetail(a)}
                    aside={
                      <DeliveryAddressCardActions
                        onEdit={() => openEditAddress(a)}
                        onDelete={() => setDeleteAddressId(String(a.id))}
                      />
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#7a6f72]">Add an address for courier delivery.</p>
            )}
            {showAddressForm ? (
              <DeliveryAddressFormFields
                form={addressForm}
                setForm={setAddressForm}
                idPrefix="dm-addr"
                showLabel
                busy={addressBusy}
                submitLabel={editingAddressId ? "Save changes" : "Save address"}
                onSubmit={() => void onSaveAddress()}
                onCancel={closeAddressForm}
              />
            ) : (
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--customer-primary,#730321)] underline-offset-4 hover:underline"
                onClick={openCreateAddress}
              >
                <Plus className="size-4" /> Add a new address
              </button>
            )}
            <DeleteDeliveryAddressDialog
              open={Boolean(deleteAddressId)}
              onOpenChange={(open) => {
                if (!open) setDeleteAddressId(null);
              }}
              busy={deleteAddressState.isLoading}
              onConfirm={() => void onConfirmDeleteAddress()}
            />
            <p className="mt-3 text-xs text-[#7a6f72]">Same address book as the online store — saved once, used for both.</p>
          </fieldset>
        )}
      </CustomerDmSurface>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button type="button" className="h-12 rounded-full px-7 text-[15px] text-white" style={{ background: "var(--customer-primary, #730321)" }} disabled={quoteState.isLoading} onClick={() => void continueToQuote()}>
          {quoteState.isLoading ? "Pricing your order…" : "Continue to review"}
        </Button>
        <Button type="button" variant="ghost" className="h-12 rounded-full" asChild>
          <Link href={backHref}>Back</Link>
        </Button>
      </div>
    </CustomerDmPageShell>
  );
}

function RedemptionFulfilmentSummary({ quote }: { quote: Record<string, unknown> }) {
  const mode = String(quote.fulfilmentMode ?? "");
  const snapshot = quote.deliveryAddressSnapshot as Record<string, unknown> | undefined;
  const branchId = quote.pickupBranchId ? String(quote.pickupBranchId) : "";
  if (!mode) return null;
  return (
    <CustomerDmSurface className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#8a6a70]">Fulfilment</p>
      <p className="mt-2 text-sm text-[#28161a]">
        {mode === "DELIVERY" ? "Home delivery" : "Branch pickup"}
      </p>
      {mode === "DELIVERY" && snapshot ? (
        <p className="mt-1 text-xs text-[#5c3d42]">{formatDeliveryAddressSnapshot(snapshot)}</p>
      ) : null}
      {mode === "PICKUP" ? (
        <p className="mt-1 text-xs text-[#5c3d42]">
          {quote.pickupBranchLabel ? String(quote.pickupBranchLabel) : branchId || "Branch pickup"}
        </p>
      ) : null}
    </CustomerDmSurface>
  );
}

export function CustomerDigitalMetalsRedeemReviewPage({ quoteId }: { quoteId: string }) {
  const { tenantSlug } = useCustomerTenant();
  const quote = readRedemptionQuote(quoteId);
  const orderIdempotencyKey = useRef(newIdempotencyKey());
  const [createOrder, orderState] = useCreateCustomerDigitalMetalsRedemptionOrderMutation();
  const router = useRouter();

  if (!quote) {
    return (
      <CustomerDmPageShell title="Review redemption" backHref={customerPath(tenantSlug, "digital-metals", "redeem")}>
        <CustomerDmSurface>
          <p className="text-sm text-[#5c3d42]">Quote expired or missing. Start again from the catalogue.</p>
        </CustomerDmSurface>
      </CustomerDmPageShell>
    );
  }

  async function confirm() {
    if (!quote) return;
    try {
      const order = await createOrder({
        quoteId,
        termsVersionAccepted: String(quote.termsVersion),
        termsContentHashAccepted: String(quote.termsContentHash),
        idempotencyKey: orderIdempotencyKey.current,
      }).unwrap();
      router.push(customerPath(tenantSlug, "digital-metals", "redeem-order", String(order.id)));
    } catch (err) {
      toastApiError(err);
    }
  }

  return (
    <CustomerDmPageShell
      narrow
      title="Review redemption"
      subtitle="Confirm metal reservation and INR charges before placing the order."
      backHref={customerPath(tenantSlug, "digital-metals", "redeem")}
      testId="customer-dm-redeem-review"
    >
      <DigitalMetalsRedemptionChargeBreakdown quote={quote} />
      <RedemptionFulfilmentSummary quote={quote} />
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button type="button" className="h-12 rounded-full px-7 text-[15px] text-white" style={{ background: "var(--customer-primary, #730321)" }} disabled={orderState.isLoading} onClick={() => void confirm()}>
          Place redemption order
        </Button>
        <Button type="button" variant="outline" className="min-h-11" asChild>
          <Link href={customerPath(tenantSlug, "digital-metals", "redeem")}>Back</Link>
        </Button>
      </div>
    </CustomerDmPageShell>
  );
}

const REDEMPTION_PROGRESS_STATUSES = [
  "CHARGE_PENDING",
  "CHARGE_PAID",
  "FULFILMENT_ACCEPTED",
  "PACKING",
  "DISPATCHED",
  "PICKUP_READY",
  "COMPLETED",
] as const;

function redemptionProgressIndex(status: string): number {
  return REDEMPTION_PROGRESS_STATUSES.indexOf(status as (typeof REDEMPTION_PROGRESS_STATUSES)[number]);
}

/** Prefer the furthest-known status between order row and fulfilment poll. */
function redemptionTimelineStatus(orderStatus: string, fulfilmentStatus: string): string {
  const a = redemptionProgressIndex(orderStatus);
  const b = redemptionProgressIndex(fulfilmentStatus);
  if (a < 0 && b < 0) return orderStatus || fulfilmentStatus;
  if (a < 0) return fulfilmentStatus;
  if (b < 0) return orderStatus;
  return a >= b ? orderStatus : fulfilmentStatus;
}

function fulfilmentTimelineSteps(status: string) {
  const idx = redemptionProgressIndex(status);
  const labels: Record<string, string> = {
    CHARGE_PENDING: "Pay INR charges",
    CHARGE_PAID: "Jeweller preparing your order",
    FULFILMENT_ACCEPTED: "Jeweller preparing your order",
    PACKING: "Jeweller preparing your order",
    DISPATCHED: "On the way — track shipment below",
    PICKUP_READY: "Ready for branch pickup — show your code",
    COMPLETED: "Handed over",
  };
  const mapped = [
    { id: "paid", label: "Charges paid", match: ["CHARGE_PAID", "FULFILMENT_ACCEPTED", "PACKING"] },
    { id: "ready", label: "Shipped or ready for pickup", match: ["DISPATCHED", "PICKUP_READY"] },
    { id: "handover", label: "Handed over", match: ["COMPLETED"] },
  ];
  return mapped.map((step) => {
    const milestones = step.match.map((m) => redemptionProgressIndex(m)).filter((n) => n >= 0);
    const stepStart = milestones.length ? Math.min(...milestones) : -1;
    const done = idx >= 0 && stepStart >= 0 && idx > stepStart;
    const current =
      step.match.includes(status)
      || (idx >= 0 && stepStart >= 0 && idx === stepStart);
    return {
      id: step.id,
      label: step.label,
      detail: labels[status] && current ? labels[status] : undefined,
      state: done ? ("done" as const) : current ? ("current" as const) : ("upcoming" as const),
    };
  });
}

export function CustomerDigitalMetalsRedeemOrderPage({ orderId }: { orderId: string }) {
  const { tenantSlug } = useCustomerTenant();
  const router = useRouter();
  const [redeemOrderPollMs, setRedeemOrderPollMs] = useState(5_000);
  const orderQuery = useGetCustomerDigitalMetalsRedemptionOrderQuery(orderId, {
    pollingInterval: redeemOrderPollMs,
  });
  useEffect(() => {
    const next = customerPollIntervalMs(orderQuery.data?.status, DM_REDEEM_ORDER_POLL_TERMINAL, 5_000);
    if (next !== redeemOrderPollMs) setRedeemOrderPollMs(next);
  }, [orderQuery.data?.status, redeemOrderPollMs]);
  const fulfilmentQuery = useGetCustomerDigitalMetalsRedemptionFulfilmentQuery(orderId, {
    skip: !orderId,
  });
  const fulfilmentStatus = String(fulfilmentQuery.data?.status ?? "");
  const pickupQuery = useGetCustomerDigitalMetalsRedemptionPickupInstructionsQuery(orderId, {
    skip: !orderId || fulfilmentStatus !== "PICKUP_READY",
  });
  const [payIntent, payState] = useCreateCustomerDigitalMetalsRedemptionPaymentIntentMutation();
  const [pollIntent] = useLazyPollDigitalMetalsRedemptionPaymentIntentQuery();
  const [harnessPay, harnessState] = useCompleteCustomerDigitalMetalsRedemptionTestHarnessPaymentMutation();
  const [cancelOrder, cancelState] = useCancelCustomerDigitalMetalsRedemptionOrderMutation();
  const [pickupRevealed, setPickupRevealed] = useState(false);
  const payIdempotencyRef = useRef(
    typeof window !== "undefined"
      ? sessionStorage.getItem(`dm-redeem-pay-idem-${orderId}`) ?? newIdempotencyKey()
      : newIdempotencyKey(),
  );
  const [submittingPay, setSubmittingPay] = useState(false);

  useEffect(() => {
    orderQuery.refetch();
  }, [orderId]);

  if (orderQuery.isLoading) return <PageSkeleton cards={1} />;
  if (orderQuery.isError) return <QueryError error={orderQuery.error} onRetry={orderQuery.refetch} />;

  const order = orderQuery.data ?? {};
  const status = String(order.status ?? "");
  const statusCopy = redemptionOrderStatusLabel(status);
  const chargePaise = Number(order.chargeTotalPaise ?? 0);
  const timelineStatus = redemptionTimelineStatus(status, fulfilmentStatus);
  const fStatus = timelineStatus;

  async function payCharges() {
    if (chargePaise <= 0 || submittingPay) return;
    setSubmittingPay(true);
    try {
      if (env.ecommercePaymentTestUi) {
        await harnessPay({ orderId, idempotencyKey: newIdempotencyKey(), outcome: "COMPLETED" }).unwrap();
        toast.success("Charge payment recorded (test harness).");
        orderQuery.refetch();
        return;
      }
      const orderReturnPath = customerPath(tenantSlug, "digital-metals", "redeem-order", orderId);
      const redirectReturn =
        typeof window !== "undefined" ? `${window.location.origin}${orderReturnPath}` : orderReturnPath;
      payIdempotencyRef.current = newIdempotencyKey();
      sessionStorage.setItem(`dm-redeem-pay-idem-${orderId}`, payIdempotencyRef.current);
      const intent = await payIntent({
        orderId,
        redirectUrl: redirectReturn,
        idempotencyKey: payIdempotencyRef.current,
      }).unwrap();
      const paymentIntent = (intent.paymentIntent ?? intent) as Record<string, unknown>;
      const attemptId = String(paymentIntent.id ?? intent.id ?? "");
      const tokenRaw = paymentIntent.token ?? intent.token;
      const token = tokenRaw ? String(tokenRaw) : undefined;
      const gatewayUrl =
        pickPhonePeGatewayUrl(paymentIntent) || pickPhonePeGatewayUrl(intent as Record<string, unknown>);

      async function pollUntilPaid() {
        if (!attemptId) return false;
        const polled = await pollIntent({ orderId, paymentAttemptId: attemptId }).unwrap();
        const paid =
          String((polled.order as Record<string, unknown> | undefined)?.status ?? "") === "CHARGE_PAID";
        await orderQuery.refetch();
        await fulfilmentQuery.refetch();
        return paid;
      }

      if (!gatewayUrl) {
        toast.message("Demo payment", { description: "Confirming your charge payment…" });
        try {
          if (await pollUntilPaid()) toast.success("Charges paid — fulfilment will continue.");
        } catch {
          await orderQuery.refetch();
        }
        return;
      }

      if (isPhonePeMockSdkToken(token)) {
        toast.message("Demo PhonePe", { description: "Simulating charge payment…" });
        await new Promise((resolve) => window.setTimeout(resolve, 700));
        try {
          if (await pollUntilPaid()) toast.success("Charges paid — fulfilment will continue.");
        } catch {
          await orderQuery.refetch();
        }
        return;
      }

      await openCustomerPaymentTarget(paymentIntent, {
        tenantSlug,
        statusRedirectUrl: orderReturnPath,
        initiateLink: async () => ({ redirectUrl: redirectReturn, gatewayUrl }),
        navigate: (path) => router.push(path),
      });
    } catch (err) {
      toastApiError(err);
      payIdempotencyRef.current = newIdempotencyKey();
      sessionStorage.setItem(`dm-redeem-pay-idem-${orderId}`, payIdempotencyRef.current);
    } finally {
      setSubmittingPay(false);
    }
  }

  async function onCancel() {
    try {
      await cancelOrder({ orderId, idempotencyKey: newIdempotencyKey() }).unwrap();
      toast.success("Order cancelled.");
      orderQuery.refetch();
    } catch (err) {
      toastApiError(err);
    }
  }

  const investigation =
    status.includes("INVESTIGATION") || status.includes("REPLACEMENT") || fStatus.includes("INVESTIGATION");

  return (
    <CustomerDmPageShell
      narrow
      title={statusCopy.title}
      subtitle={statusCopy.detail}
      backHref={customerPath(tenantSlug, "digital-metals")}
      backLabel="Wallet"
      testId="customer-dm-redeem-order"
    >
      <CustomerDmSurface>
        <dl className="space-y-2 text-sm text-[#5c3d42]">
          <div className="flex justify-between gap-4">
            <dt>Metal reserved</dt>
            <dd className="font-semibold">{ugToGramsDisplay(String(order.quantityUg ?? "0"))}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>INR charges</dt>
            <dd className="font-semibold">{formatInrFromPaise(chargePaise)}</dd>
          </div>
          {order.fulfilmentMode ? (
            <div className="flex justify-between gap-4">
              <dt>Fulfilment</dt>
              <dd className="text-right">
                {String(order.fulfilmentMode) === "DELIVERY" ? "Home delivery" : "Branch pickup"}
              </dd>
            </div>
          ) : null}
          {order.deliveryAddressSnapshot ? (
            <div>
              <dt className="text-xs text-[#8a6a70]">Delivery address</dt>
              <dd className="mt-1 text-xs">
                {formatDeliveryAddressSnapshot(order.deliveryAddressSnapshot as Record<string, unknown>)}
              </dd>
            </div>
          ) : null}
          {String(order.fulfilmentMode) === "PICKUP" && (order.snapshot as Record<string, unknown>)?.pickupBranchLabel ? (
            <div>
              <dt className="text-xs text-[#8a6a70]">Pickup branch</dt>
              <dd className="mt-1 text-xs">{String((order.snapshot as Record<string, unknown>).pickupBranchLabel)}</dd>
            </div>
          ) : null}
        </dl>
      </CustomerDmSurface>

      {investigation ? (
        <CustomerDmSurface className="mt-4 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-950">
            Your jeweller is reviewing this order ({status || fStatus}). You will be contacted with next steps — refunds
            or replacement follow their policy.
          </p>
        </CustomerDmSurface>
      ) : null}

      {fulfilmentQuery.data ? (
        <CustomerDmSurface className="mt-4" testId="customer-dm-redeem-fulfilment">
          <h2 className="text-sm font-semibold text-[#28161a]">Order timeline</h2>
          <div className="mt-3">
            <CustomerDmTimeline steps={fulfilmentTimelineSteps(fStatus)} />
          </div>
          {fulfilmentQuery.data.trackingReference ? (
            <p className="mt-4 text-xs text-[#5c3d42]">
              Tracking: {String(fulfilmentQuery.data.trackingReference)}
              {fulfilmentQuery.data.trackingSource ? ` (${String(fulfilmentQuery.data.trackingSource)})` : null}
            </p>
          ) : null}
          {fulfilmentQuery.data.cancellationEligible === true ? (
            <p className="mt-2 text-xs text-[#5c3d42]">You may cancel before dispatch.</p>
          ) : null}
          {pickupQuery.data?.pickupCode ? (
            <div className="mt-4 rounded-xl border border-[#eaded9] bg-white p-3">
              <p className="text-xs font-medium text-[#8a6a70]">Branch pickup code</p>
              {pickupRevealed ? (
                <p className="mt-2 font-mono text-lg tracking-widest text-[#28161a]">{String(pickupQuery.data.pickupCode)}</p>
              ) : (
                <Button type="button" variant="outline" className="mt-2 min-h-11" onClick={() => setPickupRevealed(true)}>
                  Show pickup code
                </Button>
              )}
              <p className="mt-2 text-xs text-[#8a6a70]">Bring this code and ID when collecting your item.</p>
            </div>
          ) : null}
        </CustomerDmSurface>
      ) : null}

      {status === "CHARGE_PENDING" && chargePaise > 0 ? (
        <Button
          type="button"
          className="mt-4 h-12 w-full rounded-full px-7 text-[15px] text-white sm:w-auto"
          style={{ background: "var(--customer-primary, #730321)" }}
          disabled={payState.isLoading || harnessState.isLoading || submittingPay}
          onClick={() => void payCharges()}
        >
          Pay charges
        </Button>
      ) : null}
      {chargePaise === 0 && status === "CHARGE_PENDING" ? (
        <p className="mt-4 text-sm text-emerald-900">No payment needed — fulfilment will continue automatically.</p>
      ) : null}
      {["CHARGE_PENDING", "CHARGE_PAID"].includes(status) ? (
        <Button
          type="button"
          variant="outline"
          className="mt-4 min-h-11"
          disabled={cancelState.isLoading}
          onClick={() => void onCancel()}
        >
          Cancel order
        </Button>
      ) : null}
      {["CHARGE_PAID", "COMPLETED", "DISPATCHED", "PICKUP_READY"].includes(status) ? (
        <div className="mt-4">
          <CustomerDigitalMetalsDocumentPanel
            title="Redemption charge receipt"
            docType="REDEMPTION_CHARGE_RECEIPT"
            subjectId={orderId}
          />
        </div>
      ) : null}
      {status === "COMPLETED" ? (
        <div className="mt-4">
          <CustomerDigitalMetalsDocumentPanel
            title="Physical handover receipt"
            docType="HANDOVER_RECEIPT"
            subjectId={orderId}
          />
        </div>
      ) : null}
    </CustomerDmPageShell>
  );
}
