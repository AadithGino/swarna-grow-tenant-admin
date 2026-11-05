"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { toastApiError } from "@/src/lib/api-error";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import {
  customerPollIntervalMs,
  DM_BUY_ORDER_POLL_TERMINAL,
} from "@/src/lib/customer-payment-polling";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import {
  isPhonePeMockSdkToken,
  openCustomerPaymentTarget,
  pickPhonePeGatewayUrl,
} from "@/src/lib/customer-payment-redirect";
import { env } from "@/src/config/env";
import {
  parseAssetKey,
  quoteReadyAssets,
  type CapabilityAsset,
} from "@/src/lib/digital-metals-asset-ui";
import {
  useCreateDigitalMetalsBuyOrderMutation,
  useCreateDigitalMetalsBuyPaymentIntentMutation,
  useCreateDigitalMetalsBuyQuoteMutation,
  useCompleteDigitalMetalsTestHarnessPaymentMutation,
  useGetCustomerDigitalMetalsBuyOrderQuery,
  useLazyPollDigitalMetalsBuyPaymentIntentQuery,
  useGetCustomerDigitalMetalsCapabilityQuery,
  customerApi,
} from "@/src/store/api/customer-api";
import {
  CustomerDigitalMetalsPurchaseReceiptBody,
  CustomerDigitalMetalsPurchaseSuccessDialog,
  purchaseSummaryFromOrder,
} from "@/src/lib/customer-digital-metals-purchase-receipt";
import { useAppDispatch } from "@/src/store/hooks";
import { DigitalMetalsQuoteBreakdown } from "@/src/lib/digital-metals-quote-preview";
import { formatInrFromPaise, ugToGramsDisplay } from "@/src/lib/digital-metals-display";
import {
  buyOrderStatusLabel,
  CustomerDmMetalChoice,
  CustomerDmPageShell,
  CustomerDmQuickChips,
  CustomerDmSurface,
  CustomerDmTimeline,
  customerDmMetalAccent,
  dmAssetName,
  DmCoinArt,
} from "@/src/features/customer/customer-digital-metals-shared";

function dmOrderPath(tenantSlug: string | null, orderId: string) {
  return customerPath(tenantSlug, "digital-metals", "order", orderId);
}

function dmReviewPath(tenantSlug: string | null, quoteId: string) {
  return customerPath(tenantSlug, "digital-metals", "review", quoteId);
}

export function CustomerDigitalMetalsBuyPage() {
  const { tenantSlug } = useCustomerTenant();
  const capability = useGetCustomerDigitalMetalsCapabilityQuery();
  const [budgetRupees, setBudgetRupees] = useState("6000");
  const tradable = quoteReadyAssets(capability.data?.assets as CapabilityAsset[] | undefined);
  const [assetSel, setAssetSel] = useState("");
  useEffect(() => {
    if (!tradable.length) return;
    const keys = tradable.map((a) => `${a.metal}:${a.finenessPpm}`);
    setAssetSel((prev) => (prev && keys.includes(prev) ? prev : keys[0]!));
  }, [tradable]);
  const asset = parseAssetKey(assetSel);
  const accent = asset ? customerDmMetalAccent(asset.metal) : customerDmMetalAccent("GOLD");
  const [createQuote, createState] = useCreateDigitalMetalsBuyQuoteMutation();
  const router = useRouter();
  const portfolioBack = customerPath(tenantSlug, "digital-metals");

  if (capability.isLoading) return <PageSkeleton cards={1} />;
  if (capability.isError) {
    return <QueryError error={capability.error} onRetry={capability.refetch} />;
  }
  if (!capability.data?.canPlaceNewBuy) {
    return (
      <CustomerDmPageShell title="Buy digital metal" backHref={portfolioBack} backLabel="Portfolio">
        <CustomerDmSurface>
          <p className="text-sm text-[#5c3d42]">
            {capability.data?.blockers?.[0]?.message ?? "Buying is not available right now."}
          </p>
        </CustomerDmSurface>
      </CustomerDmPageShell>
    );
  }

  async function onContinue() {
    if (!asset) {
      toast.error("Choose gold or silver to buy.");
      return;
    }
    const budgetPaise = Math.round(Number(budgetRupees) * 100);
    if (!Number.isFinite(budgetPaise) || budgetPaise < 100_00) {
      toast.error("Enter at least ₹100.");
      return;
    }
    try {
      const quote = await createQuote({
        metal: asset.metal,
        finenessPpm: asset.finenessPpm,
        inputMode: "BUDGET_INR",
        budgetPaise,
        idempotencyKey: newIdempotencyKey(),
      }).unwrap();
      stashDigitalMetalsBuyQuote(String(quote.quoteId), quote as Record<string, unknown>);
      router.push(dmReviewPath(tenantSlug, String(quote.quoteId)));
    } catch (err) {
      toastApiError(err);
    }
  }

  const budgetNumber = Number(budgetRupees);
  const amountChips = [500, 1000, 5000, 10000].map((n) => ({ label: `₹${n.toLocaleString("en-IN")}`, value: String(n) }));

  return (
    <CustomerDmPageShell
      title="Buy digital gold or silver"
      subtitle="Pick a metal and how much to spend. You'll see the exact grams, rate and tax before paying."
      backHref={portfolioBack}
      backLabel="Wallet"
      testId="customer-dm-buy-form"
    >
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <CustomerDmSurface>
          <fieldset>
            <legend className="text-[15px] font-semibold text-[#221a1d]">Metal</legend>
            <div className="mt-3">
              {tradable.length ? (
                <CustomerDmMetalChoice
                  label="Metal and purity"
                  testId="customer-dm-buy-asset"
                  value={assetSel}
                  onChange={setAssetSel}
                  options={tradable.map((a) => ({
                    key: `${a.metal}:${a.finenessPpm}`,
                    metal: String(a.metal),
                    finenessPpm: Number(a.finenessPpm),
                    detail: String(a.metal) === "SILVER" ? "Fine silver, held in grams" : "Investment-grade gold, held in grams",
                  }))}
                />
              ) : (
                <p className="text-sm text-[#7a6f72]" data-testid="customer-dm-buy-asset">No metals are available to buy right now.</p>
              )}
            </div>
          </fieldset>

          <div className="mt-7 border-t border-[#f0e6e0] pt-6">
            <Label htmlFor="budget" className="text-[15px] font-semibold text-[#221a1d]">
              Amount to spend
            </Label>
            <div className="mt-3 flex max-w-sm items-center rounded-2xl border border-[#e3d6ce] bg-white px-4 focus-within:border-[var(--customer-primary,#730321)] focus-within:ring-2 focus-within:ring-[rgba(var(--customer-primary-rgb,115,3,33),0.15)]">
              <span className="font-serif text-2xl text-[#9a8d90]">₹</span>
              <Input
                id="budget"
                inputMode="decimal"
                value={budgetRupees}
                onChange={(e) => setBudgetRupees(e.target.value.replace(/[^\d.]/g, ""))}
                className="h-14 border-0 bg-transparent pl-2 font-serif text-3xl tabular-nums shadow-none focus-visible:ring-0 md:text-3xl"
                aria-describedby="budget-hint"
              />
            </div>
            <div className="mt-3">
              <CustomerDmQuickChips chips={amountChips} onPick={setBudgetRupees} active={budgetRupees} />
            </div>
            <p id="budget-hint" className="mt-3 text-xs text-[#7a6f72]">
              Minimum ₹100. Grams are worked out from the live buy rate on the next screen.
            </p>
          </div>

          <div className="mt-7 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="h-12 rounded-full px-7 text-[15px] text-white sm:flex-none"
              style={{ background: "var(--customer-primary, #730321)" }}
              onClick={() => void onContinue()}
              disabled={createState.isLoading || !asset || !(budgetNumber >= 100)}
            >
              {createState.isLoading ? "Getting today's rate…" : "Review quote"}
            </Button>
            <Button type="button" variant="ghost" className="h-12 rounded-full" asChild>
              <Link href={portfolioBack}>Cancel</Link>
            </Button>
          </div>
        </CustomerDmSurface>

        <aside className="rounded-[1.25rem] border border-[#ecdfd8] bg-[#fcfaf8] p-5">
          <p className="text-sm font-semibold text-[#221a1d]">How buying works</p>
          <ol className="mt-4 space-y-4 text-sm">
            {[
              ["See your grams", "We lock today's rate for a few minutes and show tax and fees."],
              ["Pay securely", "UPI, card or net banking through the payment gateway."],
              ["Metal is credited", "Grams land in your wallet as soon as payment is confirmed."],
            ].map(([title, detail], i) => (
              <li key={title} className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-[var(--customer-primary,#730321)] ring-1 ring-[#e8dbd3]">{i + 1}</span>
                <span>
                  <span className="block font-medium text-[#221a1d]">{title}</span>
                  <span className="text-xs leading-5 text-[#7a6f72]">{detail}</span>
                </span>
              </li>
            ))}
          </ol>
          {asset ? (
            <div className={`mt-5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs ${accent.chip}`}>
              <DmCoinArt metal={asset.metal} size={28} />
              <span>
                Buying <strong>{dmAssetName(asset.metal, asset.finenessPpm)}</strong>
                {budgetNumber >= 100 ? <> for ₹{budgetNumber.toLocaleString("en-IN")}</> : null}
              </span>
            </div>
          ) : null}
        </aside>
      </div>
    </CustomerDmPageShell>
  );
}

export function CustomerDigitalMetalsBuyReviewPage({ quoteId }: { quoteId: string }) {
  const { tenantSlug } = useCustomerTenant();
  const capability = useGetCustomerDigitalMetalsCapabilityQuery();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const orderIdempotencyKey = useRef(newIdempotencyKey());
  const [createOrder, createOrderState] = useCreateDigitalMetalsBuyOrderMutation();
  const router = useRouter();
  const portfolioBack = customerPath(tenantSlug, "digital-metals");

  const [quote] = useState<Record<string, unknown> | null>(() => {
    if (typeof sessionStorage === "undefined") return null;
    const stored = sessionStorage.getItem(`dm-quote-${quoteId}`);
    return stored ? (JSON.parse(stored) as Record<string, unknown>) : null;
  });

  if (!quote) {
    return (
      <CustomerDmPageShell title="Review purchase" backHref={customerPath(tenantSlug, "digital-metals", "buy")}>
        <CustomerDmSurface>
          <p className="text-sm text-[#5c3d42]">This quote session expired. Request a fresh quote to continue.</p>
          <Button type="button" asChild className="mt-4">
            <Link href={customerPath(tenantSlug, "digital-metals", "buy")}>Start again</Link>
          </Button>
        </CustomerDmSurface>
      </CustomerDmPageShell>
    );
  }
  const termsVersion = String(quote.termsVersion ?? capability.data?.termsVersion ?? "");
  const termsHash = String(quote.termsContentHash ?? capability.data?.termsContentHash ?? "");

  async function onAccept() {
    if (!termsAccepted) {
      toast.error("Please accept the published terms to continue.");
      return;
    }
    try {
      const order = await createOrder({
        quoteId,
        termsVersionAccepted: termsVersion,
        termsContentHashAccepted: termsHash,
        idempotencyKey: orderIdempotencyKey.current,
      }).unwrap();
      router.push(dmOrderPath(tenantSlug, String(order.id)));
    } catch (err) {
      toastApiError(err);
    }
  }

  return (
    <CustomerDmPageShell
      narrow
      title="Review purchase"
      subtitle="Confirm grams, rates, fees, and total payable before payment."
      backHref={customerPath(tenantSlug, "digital-metals", "buy")}
      testId="customer-dm-buy-review"
    >
      <DigitalMetalsQuoteBreakdown quote={{ ...quote, side: "BUY" }} className="rounded-[1.25rem] border-[#ecdfd8] bg-white p-5" />
      <label className="mt-5 flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-[#ecdfd8] bg-white px-4 py-3.5 text-sm text-[#4d4245]">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          className="mt-1 size-4 rounded border-[#eaded9]"
          aria-describedby="terms-desc"
        />
        <span id="terms-desc">
          I have read and accept the digital metals terms (version {termsVersion || "published"}).
        </span>
      </label>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="h-12 rounded-full px-7 text-[15px] text-white"
          style={{ background: "var(--customer-primary, #730321)" }}
          onClick={() => void onAccept()}
          disabled={createOrderState.isLoading}
        >
          Accept &amp; continue to payment
        </Button>
        <Button type="button" variant="outline" className="min-h-11" asChild>
          <Link href={portfolioBack}>Cancel</Link>
        </Button>
      </div>
    </CustomerDmPageShell>
  );
}

export function CustomerDigitalMetalsBuyOrderPage({ orderId }: { orderId: string }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { tenantSlug } = useCustomerTenant();
  const [buyOrderPollMs, setBuyOrderPollMs] = useState(4_000);
  const order = useGetCustomerDigitalMetalsBuyOrderQuery(orderId, {
    pollingInterval: buyOrderPollMs,
  });
  useEffect(() => {
    const next = customerPollIntervalMs(order.data?.status, DM_BUY_ORDER_POLL_TERMINAL, 4_000);
    if (next !== buyOrderPollMs) setBuyOrderPollMs(next);
  }, [order.data?.status, buyOrderPollMs]);
  const [createIntent, createIntentState] = useCreateDigitalMetalsBuyPaymentIntentMutation();
  const [pollIntent] = useLazyPollDigitalMetalsBuyPaymentIntentQuery();
  const [completeHarness, harnessState] = useCompleteDigitalMetalsTestHarnessPaymentMutation();
  const paymentIdempotencyKey = useRef(
    typeof window !== "undefined"
      ? sessionStorage.getItem(`dm-pay-idem-${orderId}`) ?? newIdempotencyKey()
      : newIdempotencyKey(),
  );
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [submittingPay, setSubmittingPay] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const invalidateWalletViews = useCallback(() => {
    dispatch(
      customerApi.util.invalidateTags([
        "DigitalMetalsPortfolio",
        "DigitalMetalsPassbook",
        { type: "DigitalMetalsBuy", id: orderId },
      ]),
    );
  }, [dispatch, orderId]);

  const openSuccessModal = useCallback(() => {
    setSuccessOpen(true);
  }, []);

  const attempts = useMemo(
    () => (order.data?.paymentAttempts as { id: string; status: string }[] | undefined) ?? [],
    [order.data?.paymentAttempts],
  );

  const refreshAttempt = useCallback(async () => {
    const id = activeAttemptId ?? attempts[0]?.id;
    if (!id) return;
    try {
      await pollIntent({ orderId, paymentAttemptId: id }).unwrap();
      await order.refetch();
    } catch {
      /* ignore */
    }
  }, [activeAttemptId, attempts, order, orderId, pollIntent]);

  useEffect(() => {
    if (!activeAttemptId && attempts[0]?.id) setActiveAttemptId(attempts[0].id);
  }, [attempts, activeAttemptId]);

  useEffect(() => {
    const status = String(order.data?.status ?? "");
    if (DM_BUY_ORDER_POLL_TERMINAL.has(status)) return;
    const t = window.setInterval(() => void refreshAttempt(), 5_000);
    return () => window.clearInterval(t);
  }, [order.data?.status, refreshAttempt]);

  const purchaseSummary = useMemo(
    () => purchaseSummaryFromOrder(order.data ?? null),
    [order.data],
  );

  if (order.isLoading) return <PageSkeleton cards={2} />;
  if (order.isError) return <QueryError error={order.error} onRetry={order.refetch} />;
  const o = order.data;
  if (!o) return null;

  const status = String(o.status);
  const statusCopy = buyOrderStatusLabel(status);
  const latestAttemptStatus = String(attempts[0]?.status ?? "");
  const canPay =
    status === "PAYMENT_FAILED"
    || (status === "PAYMENT_PENDING"
      && (!latestAttemptStatus
        || latestAttemptStatus === "FAILED"
        || latestAttemptStatus === "INITIATED"
        || latestAttemptStatus === "PENDING"));
  const orderReturnPath = dmOrderPath(tenantSlug, orderId);
  const redirectReturn = typeof window !== "undefined"
    ? `${window.location.origin}${orderReturnPath}`
    : "https://example.com/return";

  const metal = String(o.metal ?? "GOLD");
  const accent = customerDmMetalAccent(metal);

  async function onPay() {
    if (submittingPay) return;
    setSubmittingPay(true);
    try {
      // Each Pay/Retry click starts a new PhonePe session (new attempt + merchant order id).
      paymentIdempotencyKey.current = newIdempotencyKey();
      sessionStorage.setItem(`dm-pay-idem-${orderId}`, paymentIdempotencyKey.current);
      const intent = await createIntent({
        orderId,
        redirectUrl: redirectReturn,
        idempotencyKey: paymentIdempotencyKey.current,
      }).unwrap();
      const nestedPi = intent.paymentIntent as Record<string, unknown> | undefined;
      const attemptId = String(intent.id ?? nestedPi?.id ?? attempts[0]?.id ?? "");
      if (attemptId) setActiveAttemptId(attemptId);
      const paymentPayload = (nestedPi ?? intent) as Record<string, unknown>;
      const gatewayUrl = pickPhonePeGatewayUrl(intent as Record<string, unknown>) || pickPhonePeGatewayUrl(nestedPi);
      if (!gatewayUrl) {
        if (attemptId) {
          toast.message("Demo payment", { description: "Confirming your purchase…" });
          try {
            const polled = await pollIntent({ orderId, paymentAttemptId: attemptId }).unwrap();
            const credited =
              String((polled.order as Record<string, unknown> | undefined)?.status ?? "") === "CREDITED";
            await order.refetch();
            if (credited) {
              invalidateWalletViews();
              openSuccessModal();
            }
          } catch {
            await order.refetch();
          }
          return;
        }
        toast.error("Payment could not be started. Try again in a moment.");
        paymentIdempotencyKey.current = newIdempotencyKey();
        sessionStorage.setItem(`dm-pay-idem-${orderId}`, paymentIdempotencyKey.current);
        await order.refetch();
        return;
      }
      await openCustomerPaymentTarget(paymentPayload, {
        tenantSlug,
        statusRedirectUrl: orderReturnPath,
        initiateLink: async () => ({ redirectUrl: redirectReturn, gatewayUrl }),
        navigate: (path) => router.push(path),
      });
      const tokenRaw =
        paymentPayload.token ?? paymentPayload.sdkToken;
      const token = tokenRaw ? String(tokenRaw) : undefined;
      if (isPhonePeMockSdkToken(token)) {
        toast.message("Demo PhonePe", {
          description: "Simulating payment confirmation…",
        });
        await new Promise((resolve) => window.setTimeout(resolve, 700));
        try {
          const polled = await pollIntent({ orderId, paymentAttemptId: attemptId }).unwrap();
          if (String((polled.order as Record<string, unknown> | undefined)?.status ?? "") === "CREDITED") {
            invalidateWalletViews();
            openSuccessModal();
          }
        } catch {
          /* poll may still update order via refetch */
        }
        await order.refetch();
      }
    } catch (err) {
      toastApiError(err);
    } finally {
      setSubmittingPay(false);
    }
  }

  async function onHarnessComplete() {
    try {
      await completeHarness({
        orderId,
        idempotencyKey: newIdempotencyKey(),
        outcome: "COMPLETED",
        paymentAttemptId: activeAttemptId ?? undefined,
      }).unwrap();
      await order.refetch();
      invalidateWalletViews();
      openSuccessModal();
    } catch (err) {
      toastApiError(err);
    }
  }

  const timelineSteps = [
    {
      id: "order",
      label: "Order placed",
      detail: "Quote snapshot saved on this order.",
      state: "done" as const,
    },
    {
      id: "pay",
      label: "Payment",
      detail: canPay ? "Complete payment to credit metal." : status === "CREDITED" ? "Payment received." : "Updating…",
      state: status === "CREDITED" ? ("done" as const) : canPay ? ("current" as const) : ("upcoming" as const),
    },
    {
      id: "credit",
      label: "Metal credited",
      detail: "Grams appear in your wallet.",
      state: status === "CREDITED" ? ("done" as const) : ("upcoming" as const),
    },
  ];

  const portfolioHref = customerPath(tenantSlug, "digital-metals");

  return (
    <CustomerDmPageShell
      narrow
      title={statusCopy.title}
      subtitle={statusCopy.detail}
      backHref={portfolioHref}
      backLabel="Wallet"
      testId="customer-dm-buy-order"
    >
      <CustomerDigitalMetalsPurchaseSuccessDialog
        open={successOpen}
        onOpenChange={setSuccessOpen}
        summary={purchaseSummary}
        portfolioHref={portfolioHref}
      />
      <CustomerDmSurface>
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${accent.chip}`}>
          {metal === "SILVER" ? "Silver" : "Gold"} purchase
        </span>
        <dl className="mt-4 space-y-2 text-sm text-[#5c3d42]">
          <div className="flex justify-between gap-4">
            <dt>Quantity</dt>
            <dd className="font-semibold text-[#28161a]">{ugToGramsDisplay(String(o.quantityUg ?? 0))}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Total payable</dt>
            <dd className="font-semibold text-[#28161a]">{formatInrFromPaise(Number(o.totalPayablePaise))}</dd>
          </div>
        </dl>
        <div className="mt-5 border-t border-[#eaded9] pt-4">
          <CustomerDmTimeline steps={timelineSteps} />
        </div>
        {status === "CREDITED" && purchaseSummary ? (
          <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
            <p className="text-sm font-semibold text-emerald-950">Booking confirmed</p>
            <p className="mt-1 text-xs text-emerald-900/90">
              Your wallet has been credited. Details below match your passbook entry.
            </p>
            <div className="mt-3">
              <CustomerDigitalMetalsPurchaseReceiptBody summary={purchaseSummary} compact />
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-3 min-h-10 w-full sm:w-auto"
              onClick={() => setSuccessOpen(true)}
            >
              View payment receipt
            </Button>
          </div>
        ) : null}
        {canPay ? (
          <Button
            type="button"
            className="mt-5 h-12 w-full rounded-full px-7 text-[15px] text-white sm:w-auto"
            style={{ background: "var(--customer-primary, #730321)" }}
            onClick={() => void onPay()}
            disabled={createIntentState.isLoading || submittingPay}
          >
            {status === "PAYMENT_FAILED" ? "Retry payment" : "Continue to payment"}
          </Button>
        ) : null}
        {env.ecommercePaymentTestUi && canPay && attempts.length ? (
          <Button
            type="button"
            variant="outline"
            className="mt-2 min-h-11 w-full sm:w-auto"
            onClick={() => void onHarnessComplete()}
            disabled={harnessState.isLoading}
          >
            Complete payment (test)
          </Button>
        ) : null}
        <p className="mt-4 text-xs text-[#8a6a70]">
          You can safely close this page — payment status is confirmed by the gateway, not the browser return URL.
        </p>
      </CustomerDmSurface>
    </CustomerDmPageShell>
  );
}

/** Persist quote in session when creating from buy form (review page reads it). */
export function stashDigitalMetalsBuyQuote(quoteId: string, payload: Record<string, unknown>) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(`dm-quote-${quoteId}`, JSON.stringify(payload));
}
