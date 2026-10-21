"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { customerPath } from "@/src/lib/customer-tenant";
import { CustomerDigitalMetalsDocumentPanel } from "@/src/features/customer/customer-digital-metals-document-panel";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { toastApiError } from "@/src/lib/api-error";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { env } from "@/src/config/env";
import {
  isPhonePeMockSdkToken,
  openCustomerPaymentTarget,
  phonePeSdkGatewayUrl,
} from "@/src/lib/customer-payment-redirect";
import {
  useCancelCustomerDigitalMetalsRedemptionOrderMutation,
  useCompleteCustomerDigitalMetalsRedemptionTestHarnessPaymentMutation,
  useCreateCustomerDigitalMetalsRedemptionOrderMutation,
  useCreateCustomerDigitalMetalsRedemptionPaymentIntentMutation,
  useLazyPollDigitalMetalsRedemptionPaymentIntentQuery,
  useCreateCustomerDigitalMetalsDeliveryAddressMutation,
  useCreateCustomerDigitalMetalsRedemptionQuoteMutation,
  useGetCustomerBranchesQuery,
  useGetCustomerDigitalMetalsCapabilityQuery,
  useGetCustomerDigitalMetalsDeliveryAddressesQuery,
  useGetCustomerDigitalMetalsPortfolioQuery,
  useGetCustomerDigitalMetalsRedemptionCatalogueQuery,
  useGetCustomerDigitalMetalsRedemptionFulfilmentQuery,
  useGetCustomerDigitalMetalsRedemptionOrderQuery,
  useGetCustomerDigitalMetalsRedemptionPickupInstructionsQuery,
} from "@/src/store/api/customer-api";
import { formatAssetLabel } from "@/src/lib/digital-metals-asset-ui";
import { formatDeliveryAddressSnapshot, formatInrFromPaise, ugToGramsDisplay } from "@/src/lib/digital-metals-display";
import { DigitalMetalsRedemptionChargeBreakdown } from "@/src/lib/digital-metals-redemption-charge-breakdown";
import {
  CustomerDmPageShell,
  CustomerDmSurface,
  CustomerDmTimeline,
  customerDmMetalAccent,
  redemptionOrderStatusLabel,
} from "@/src/features/customer/customer-digital-metals-shared";

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
  if (paise === 0) return "No INR charges";
  return `${formatInrFromPaise(paise)} charges`;
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
      title="Redeem physical metal"
      subtitle="Choose coins or bars from your jeweller's catalogue. Metal is reserved; minting and delivery are paid in rupees."
      backHref={portfolioBack}
      testId="customer-dm-redeem-catalogue"
    >
      {items.length === 0 ? (
        <CustomerDmSurface>
          <p className="text-sm text-[#5c3d42]">No redemption items are listed right now. Check back later.</p>
        </CustomerDmSurface>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const metal = String(item.metal);
            const accent = customerDmMetalAccent(metal);
            const charge = Number(item.chargeTotalPaise ?? item.mintingChargePaise ?? 0);
            const grams = item.unitQuantityUg ? ugToGramsDisplay(String(item.unitQuantityUg)) : null;
            return (
              <li
                key={String(item.id)}
                className={`flex flex-col rounded-2xl border ${accent.border} bg-white p-4 shadow-sm`}
              >
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={String(item.imageUrl)}
                    alt=""
                    className="mb-3 h-32 w-full rounded-xl object-cover"
                  />
                ) : (
                  <div className={`mb-3 flex h-32 items-center justify-center rounded-xl ${accent.iconBg} text-sm font-medium`}>
                    {grams ?? "Physical item"}
                  </div>
                )}
                <p className="font-semibold text-[#28161a]">{String(item.label)}</p>
                <p className="mt-1 text-xs text-[#8a6a70]">
                  {formatAssetLabel(metal, Number(item.finenessPpm))}
                  {grams ? ` · ${grams}` : null}
                </p>
                <p className="mt-2 text-sm text-[#5c3d42]">{formatCatalogueCharge(charge)}</p>
                {item.leadTimeDays != null ? (
                  <p className="text-xs text-[#8a6a70]">Typical lead time: {String(item.leadTimeDays)} days</p>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  className="mt-4 min-h-10 w-full"
                  onClick={() => startRedeem(item)}
                >
                  Select
                </Button>
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
  const [addressForm, setAddressForm] = useState({
    line1: "",
    city: "",
    state: "Kerala",
    pincode: "",
    recipientName: "",
    mobile: "",
    label: "Home",
  });

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

  async function onSaveAddress() {
    try {
      const created = await createAddress({
        ...addressForm,
        idempotencyKey: newIdempotencyKey(),
        isDefault: addressItems.length === 0,
      }).unwrap();
      setDeliveryAddressId(String(created.id));
      setShowAddressForm(false);
      toast.success("Address saved");
    } catch (err) {
      toastApiError(err);
    }
  }

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
      title={String(item.label)}
      subtitle="Choose branch pickup or home delivery before we price minting and delivery charges."
      backHref={backHref}
      testId="customer-dm-redeem-setup"
    >
      <CustomerDmSurface>
        <p className="text-sm font-medium text-[#28161a]">How should we fulfil this order?</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {pickupEnabled ? (
            <Button
              type="button"
              variant={mode === "PICKUP" ? "default" : "outline"}
              className="min-h-10"
              onClick={() => setMode("PICKUP")}
            >
              Branch pickup
            </Button>
          ) : null}
          {deliveryEnabled ? (
            <Button
              type="button"
              variant={mode === "DELIVERY" ? "default" : "outline"}
              className="min-h-10"
              onClick={() => setMode("DELIVERY")}
            >
              Home delivery
            </Button>
          ) : null}
        </div>

        {mode === "PICKUP" ? (
          <div className="mt-4 space-y-2">
            <Label htmlFor="dm-redeem-branch">Pickup branch</Label>
            <select
              id="dm-redeem-branch"
              className="w-full rounded-md border border-[#eaded9] bg-white px-3 py-2 text-sm"
              value={effectiveBranchId}
              onChange={(e) => setPickupBranchId(e.target.value)}
            >
              {branchRows.length === 0 ? (
                <option value="">No branches listed</option>
              ) : (
                branchRows.map((b) => (
                  <option key={String(b.id)} value={String(b.id)}>
                    {String(b.name ?? b.code ?? b.id)}
                  </option>
                ))
              )}
            </select>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <Label>Delivery address</Label>
            {addressItems.length > 0 ? (
              <select
                className="w-full rounded-md border border-[#eaded9] bg-white px-3 py-2 text-sm"
                value={deliveryAddressId}
                onChange={(e) => setDeliveryAddressId(e.target.value)}
              >
                {addressItems.map((a) => (
                  <option key={String(a.id)} value={String(a.id)}>
                    {String(a.label ?? "Address")} — {String(a.line1)}, {String(a.pincode)}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-[#8a6a70]">Add an address for courier delivery.</p>
            )}
            {showAddressForm ? (
              <div className="grid gap-2 rounded-xl border border-[#eaded9] bg-white p-3">
                <Input
                  placeholder="Recipient name"
                  value={addressForm.recipientName}
                  onChange={(e) => setAddressForm((f) => ({ ...f, recipientName: e.target.value }))}
                />
                <Input
                  placeholder="Mobile"
                  value={addressForm.mobile}
                  onChange={(e) => setAddressForm((f) => ({ ...f, mobile: e.target.value }))}
                />
                <Input
                  placeholder="Address line 1"
                  value={addressForm.line1}
                  onChange={(e) => setAddressForm((f) => ({ ...f, line1: e.target.value }))}
                />
                <Input
                  placeholder="City"
                  value={addressForm.city}
                  onChange={(e) => setAddressForm((f) => ({ ...f, city: e.target.value }))}
                />
                <Input
                  placeholder="State"
                  value={addressForm.state}
                  onChange={(e) => setAddressForm((f) => ({ ...f, state: e.target.value }))}
                />
                <Input
                  placeholder="Pincode"
                  value={addressForm.pincode}
                  onChange={(e) => setAddressForm((f) => ({ ...f, pincode: e.target.value }))}
                />
                <div className="flex gap-2">
                  <Button type="button" size="sm" disabled={createAddressState.isLoading} onClick={() => void onSaveAddress()}>
                    Save address
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddressForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddressForm(true)}>
                Add new address
              </Button>
            )}
            <p className="text-xs text-[#8a6a70]">
              Same address book as the online shop — saved once, reused for physical redemption.
            </p>
          </div>
        )}
      </CustomerDmSurface>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button type="button" className="min-h-11" disabled={quoteState.isLoading} onClick={() => void continueToQuote()}>
          Continue to review
        </Button>
        <Button type="button" variant="outline" className="min-h-11" asChild>
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
      title="Review redemption"
      subtitle="Confirm metal reservation and INR charges before placing the order."
      backHref={customerPath(tenantSlug, "digital-metals", "redeem")}
      testId="customer-dm-redeem-review"
    >
      <DigitalMetalsRedemptionChargeBreakdown quote={quote} />
      <RedemptionFulfilmentSummary quote={quote} />
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button type="button" className="min-h-11" disabled={orderState.isLoading} onClick={() => void confirm()}>
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
    CHARGE_PAID: "Waiting for jeweller to accept",
    FULFILMENT_ACCEPTED: "Order accepted",
    PACKING: "Packing your item",
    DISPATCHED: "Dispatched",
    PICKUP_READY: "Ready for pickup",
    COMPLETED: "Handed over",
  };
  const mapped = [
    { id: "accepted", label: "Accepted", match: ["CHARGE_PAID", "FULFILMENT_ACCEPTED"] },
    { id: "packing", label: "Packing", match: ["PACKING"] },
    { id: "dispatch", label: "Dispatch / pickup ready", match: ["DISPATCHED", "PICKUP_READY"] },
    { id: "handover", label: "Handover complete", match: ["COMPLETED"] },
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
  const orderQuery = useGetCustomerDigitalMetalsRedemptionOrderQuery(orderId, { pollingInterval: 5_000 });
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
      const gatewayUrl = phonePeSdkGatewayUrl(token);

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

      await openCustomerPaymentTarget(
        {
          token,
          redirectUrl: gatewayUrl,
          paymentUrl: gatewayUrl,
        },
        {
          tenantSlug,
          statusRedirectUrl: orderReturnPath,
          initiateLink: async () => ({ redirectUrl: redirectReturn, gatewayUrl }),
          navigate: (path) => router.push(path),
        },
      );
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
      title={statusCopy.title}
      subtitle={statusCopy.detail}
      backHref={customerPath(tenantSlug, "digital-metals")}
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
          className="mt-4 min-h-11 w-full sm:w-auto"
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
