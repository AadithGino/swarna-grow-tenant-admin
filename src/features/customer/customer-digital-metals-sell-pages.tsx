"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { toastApiError } from "@/src/lib/api-error";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { CustomerDigitalMetalsDocumentPanel } from "@/src/features/customer/customer-digital-metals-document-panel";
import {
  parseAssetKey,
  quoteReadyAssets,
  type CapabilityAsset,
} from "@/src/lib/digital-metals-asset-ui";
import {
  useCancelCustomerDigitalMetalsSellOrderMutation,
  useConfirmCustomerDigitalMetalsSellOrderMutation,
  useCreateCustomerDigitalMetalsSellOrderMutation,
  useCreateCustomerDigitalMetalsSellQuoteMutation,
  useGetCustomerDigitalMetalsBankDestinationsQuery,
  useGetCustomerDigitalMetalsCapabilityQuery,
  useGetCustomerDigitalMetalsPortfolioQuery,
  useGetCustomerDigitalMetalsSellOrderPayoutStatusQuery,
  useGetCustomerDigitalMetalsSellOrderQuery,
} from "@/src/store/api/customer-api";
import { DigitalMetalsQuoteBreakdown } from "@/src/lib/digital-metals-quote-preview";
import { formatInrFromPaise, ugToGramsDisplay } from "@/src/lib/digital-metals-display";
import {
  CustomerDigitalMetalsSellReceiptBody,
  sellSummaryFromOrder,
} from "@/src/lib/customer-digital-metals-sell-receipt";
import {
  bankDestinationStatusLabel,
  CustomerDmMetalChoice,
  CustomerDmPageShell,
  CustomerDmQuickChips,
  CustomerDmSurface,
  CustomerDmTimeline,
  sellOrderStatusLabel,
} from "@/src/features/customer/customer-digital-metals-shared";

const SELL_QUOTE_KEY = "customer-dm-sell-quote";

function stashSellQuote(quoteId: string, payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`${SELL_QUOTE_KEY}:${quoteId}`, JSON.stringify(payload));
}

export function readStashedSellQuote(quoteId: string): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(`${SELL_QUOTE_KEY}:${quoteId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function dmSellReviewPath(tenantSlug: string | null, quoteId: string) {
  return customerPath(tenantSlug, "digital-metals", "sell-review", quoteId);
}

function dmSellOrderPath(tenantSlug: string | null, orderId: string) {
  return customerPath(tenantSlug, "digital-metals", "sell-order", orderId);
}

export function CustomerDigitalMetalsSellPage() {
  const { tenantSlug } = useCustomerTenant();
  const capability = useGetCustomerDigitalMetalsCapabilityQuery();
  const portfolio = useGetCustomerDigitalMetalsPortfolioQuery(undefined, {
    skip: !capability.data?.canViewHoldings,
  });
  const [grams, setGrams] = useState("1");
  const [createQuote, createState] = useCreateCustomerDigitalMetalsSellQuoteMutation();
  const router = useRouter();

  const wallets = portfolio.data?.items ?? [];
  const tradable = quoteReadyAssets(capability.data?.assets as CapabilityAsset[] | undefined);
  const sellableWallets = useMemo(
    () =>
      wallets.filter((w) =>
        tradable.some(
          (a) => a.metal === w.metal && a.finenessPpm === w.finenessPpm && Number(w.availableUg) > 0,
        ),
      ),
    [wallets, tradable],
  );
  const pool = useMemo(
    () => (sellableWallets.length ? sellableWallets : wallets),
    [sellableWallets, wallets],
  );
  const [assetSel, setAssetSel] = useState("");
  useEffect(() => {
    if (!pool.length) return;
    const keys = pool.map((w) => `${w.metal}:${w.finenessPpm}`);
    setAssetSel((prev) => (prev && keys.includes(prev) ? prev : keys[0]!));
  }, [pool]);

  const asset = parseAssetKey(assetSel);
  const selectedWallet = wallets.find(
    (w) => asset && w.metal === asset.metal && w.finenessPpm === asset.finenessPpm,
  );
  const portfolioBack = customerPath(tenantSlug, "digital-metals");

  if (capability.isLoading || portfolio.isLoading) return <PageSkeleton cards={1} />;
  if (capability.isError) {
    return <QueryError error={capability.error} onRetry={capability.refetch} />;
  }
  if (!capability.data?.canPlaceNewSell) {
    return (
      <CustomerDmPageShell title="Sell digital metal" backHref={portfolioBack} testId="customer-dm-sell-blocked">
        <CustomerDmSurface>
          <p className="text-sm text-[#5c3d42]">
            {capability.data?.blockers?.[0]?.message ?? "Selling is not available right now."}
          </p>
        </CustomerDmSurface>
      </CustomerDmPageShell>
    );
  }

  async function onContinue() {
    const quantityUg = Math.round(Number(grams) * 1_000_000);
    if (!Number.isFinite(quantityUg) || quantityUg < 1) {
      toast.error("Enter a valid quantity in grams.");
      return;
    }
    if (selectedWallet && quantityUg > Number(selectedWallet.availableUg)) {
      toast.error("Quantity exceeds available balance.");
      return;
    }
    try {
      if (!asset) {
        toast.error("Select a wallet.");
        return;
      }
      const quote = await createQuote({
        metal: asset.metal,
        finenessPpm: asset.finenessPpm,
        quantityUg,
        idempotencyKey: newIdempotencyKey(),
      }).unwrap();
      stashSellQuote(String(quote.quoteId), quote);
      router.push(dmSellReviewPath(tenantSlug, String(quote.quoteId)));
    } catch (err) {
      toastApiError(err);
    }
  }

  const availableG = selectedWallet ? Number(selectedWallet.availableUg) / 1_000_000 : 0;
  const rateG = Number(
    (selectedWallet as { estimatedSaleValue?: { ratePerGramPaise?: number } } | undefined)?.estimatedSaleValue?.ratePerGramPaise ?? 0,
  );
  const gramsNum = Number(grams);
  const estimatePaise = rateG && gramsNum > 0 ? Math.round(rateG * gramsNum) : null;
  const trimG = (g: number) => String(Math.floor(g * 10_000) / 10_000);
  const gramChips = availableG > 0
    ? [
        { label: "25%", value: trimG(availableG * 0.25) },
        { label: "50%", value: trimG(availableG * 0.5) },
        { label: "All available", value: trimG(availableG) },
      ]
    : [];

  return (
    <CustomerDmPageShell
      title="Sell digital metal"
      subtitle="Sell from your available balance. Metal is held while your jeweller approves, then the money goes to your verified bank."
      backHref={portfolioBack}
      backLabel="Wallet"
      testId="customer-dm-sell-form"
    >
      {pool.length === 0 ? (
        <CustomerDmSurface className="text-center">
          <p className="text-sm text-[#5c4f52]">You need available metal before you can sell.</p>
          <Button type="button" asChild className="mt-4 h-11 rounded-full px-6 text-white" style={{ background: "var(--customer-primary, #730321)" }}>
            <Link href={customerPath(tenantSlug, "digital-metals", "buy")}>Buy metal</Link>
          </Button>
        </CustomerDmSurface>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <CustomerDmSurface>
            <fieldset>
              <legend className="text-[15px] font-semibold text-[#221a1d]">Sell from</legend>
              <div className="mt-3">
                <CustomerDmMetalChoice
                  label="Wallet to sell from"
                  testId="customer-dm-sell-asset"
                  value={assetSel}
                  onChange={setAssetSel}
                  options={pool.map((w) => ({
                    key: `${w.metal}:${w.finenessPpm}`,
                    metal: String(w.metal),
                    finenessPpm: Number(w.finenessPpm),
                    detail: <>{ugToGramsDisplay(w.availableUg)} available</>,
                  }))}
                />
              </div>
              {selectedWallet && Number(selectedWallet.reservedUg) > 0 ? (
                <p className="mt-3 text-xs text-[#7a6f72]">
                  {ugToGramsDisplay(selectedWallet.reservedUg)} is held for other orders and can&apos;t be sold right now.
                </p>
              ) : null}
            </fieldset>

            <div className="mt-7 border-t border-[#f0e6e0] pt-6">
              <Label htmlFor="grams" className="text-[15px] font-semibold text-[#221a1d]">
                Grams to sell
              </Label>
              <div className="mt-3 flex max-w-sm items-center rounded-2xl border border-[#e3d6ce] bg-white px-4 focus-within:border-[var(--customer-primary,#730321)] focus-within:ring-2 focus-within:ring-[rgba(var(--customer-primary-rgb,115,3,33),0.15)]">
                <Input
                  id="grams"
                  inputMode="decimal"
                  value={grams}
                  onChange={(e) => setGrams(e.target.value.replace(/[^\d.]/g, ""))}
                  className="h-14 border-0 bg-transparent px-0 font-serif text-3xl tabular-nums shadow-none focus-visible:ring-0 md:text-3xl"
                />
                <span className="font-serif text-2xl text-[#9a8d90]">g</span>
              </div>
              {gramChips.length ? (
                <div className="mt-3">
                  <CustomerDmQuickChips chips={gramChips} onPick={setGrams} active={grams} />
                </div>
              ) : null}
              {selectedWallet && gramsNum * 1_000_000 > Number(selectedWallet.availableUg) ? (
                <p className="mt-3 text-xs font-medium text-red-700">That&apos;s more than your available balance.</p>
              ) : null}
            </div>

            <div className="mt-7 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="h-12 rounded-full px-7 text-[15px] text-white"
                style={{ background: "var(--customer-primary, #730321)" }}
                onClick={() => void onContinue()}
                disabled={createState.isLoading}
              >
                {createState.isLoading ? "Getting today's rate…" : "Review payout quote"}
              </Button>
              <Button type="button" variant="ghost" className="h-12 rounded-full" asChild>
                <Link href={customerPath(tenantSlug, "digital-metals", "bank")}>Bank accounts</Link>
              </Button>
            </div>
          </CustomerDmSurface>

          <aside className="rounded-[1.25rem] border border-[#ecdfd8] bg-[#fcfaf8] p-5">
            <p className="text-sm font-semibold text-[#221a1d]">Estimated payout</p>
            <p className="mt-2 font-serif text-3xl tabular-nums text-[var(--customer-primary,#730321)]">
              {estimatePaise != null ? formatInrFromPaise(estimatePaise) : "—"}
            </p>
            <p className="mt-1 text-xs leading-5 text-[#7a6f72]">
              {rateG ? `At today's sell rate of ${formatInrFromPaise(rateG)}/g, before fees. The review screen shows the exact amount.` : "The review screen shows the exact rate and fees."}
            </p>
            <ol className="mt-5 space-y-3 border-t border-[#ecdfd8] pt-4 text-xs leading-5 text-[#5c4f52]">
              <li><strong className="text-[#221a1d]">1.</strong> Confirm the quote and pick a verified bank account.</li>
              <li><strong className="text-[#221a1d]">2.</strong> Your jeweller approves the sale — grams are held until then.</li>
              <li><strong className="text-[#221a1d]">3.</strong> Money is transferred, usually within 1–2 business days.</li>
            </ol>
          </aside>
        </div>
      )}
    </CustomerDmPageShell>
  );
}

export function CustomerDigitalMetalsSellReviewPage({ quoteId }: { quoteId: string }) {
  const { tenantSlug } = useCustomerTenant();
  const capability = useGetCustomerDigitalMetalsCapabilityQuery();
  const banks = useGetCustomerDigitalMetalsBankDestinationsQuery();
  const quote = useMemo(() => readStashedSellQuote(quoteId), [quoteId]);
  const orderIdempotencyKey = useRef(newIdempotencyKey());
  const confirmIdempotencyKey = useRef(newIdempotencyKey());
  const [createOrder, orderState] = useCreateCustomerDigitalMetalsSellOrderMutation();
  const [confirm, confirmState] = useConfirmCustomerDigitalMetalsSellOrderMutation();
  const router = useRouter();
  const [selectedBank, setSelectedBank] = useState("");

  const activeBanks = useMemo(
    () => (banks.data?.items ?? []).filter((b) => b.status === "ACTIVE"),
    [banks.data?.items],
  );
  const pendingBanks = useMemo(
    () => (banks.data?.items ?? []).filter((b) => b.status === "PENDING_VERIFICATION"),
    [banks.data?.items],
  );

  useEffect(() => {
    if (!activeBanks.length) return;
    if (!selectedBank || !activeBanks.some((b) => b.id === selectedBank)) {
      setSelectedBank(activeBanks[0].id);
    }
  }, [activeBanks, selectedBank]);

  if (!quote) {
    return (
      <CustomerDmPageShell title="Review sell" backHref={customerPath(tenantSlug, "digital-metals", "sell")}>
        <CustomerDmSurface>
          <p className="text-sm text-[#5c3d42]">Quote expired or missing. Start again from sell.</p>
        </CustomerDmSurface>
      </CustomerDmPageShell>
    );
  }

  const expiresAt = String(quote.expiresAt ?? "");

  async function onConfirm() {
    if (!quote) return;
    if (!selectedBank) {
      toast.error("Choose a verified bank account for payout.");
      return;
    }
    try {
      const order = await createOrder({
        quoteId,
        termsVersionAccepted: String(quote.termsVersion),
        termsContentHashAccepted: String(quote.termsContentHash),
        idempotencyKey: orderIdempotencyKey.current,
      }).unwrap();
      const confirmed = await confirm({
        orderId: String(order.id),
        bankDestinationId: selectedBank,
        idempotencyKey: confirmIdempotencyKey.current,
      }).unwrap();
      router.push(dmSellOrderPath(tenantSlug, String(confirmed.id ?? order.id)));
    } catch (err) {
      toastApiError(err);
    }
  }

  return (
    <CustomerDmPageShell
      narrow
      title="Review sell & payout"
      subtitle="Net settlement goes to your verified bank after jeweller approval."
      backHref={customerPath(tenantSlug, "digital-metals", "sell")}
      testId="customer-dm-sell-review"
    >
      <DigitalMetalsQuoteBreakdown quote={{ ...quote, side: "SELL" }} className="rounded-[1.25rem] border-[#ecdfd8] bg-white p-5" />
      {expiresAt ? (
        <p className="mt-3 text-xs text-amber-900">
          Confirm before {new Date(expiresAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} (IST) or request a
          new quote.
        </p>
      ) : null}
      {banks.isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading bank accounts…</p>
      ) : banks.isError ? (
        <QueryError error={banks.error} onRetry={banks.refetch} />
      ) : (banks.data?.items ?? []).length === 0 ? (
        <CustomerDmSurface className="mt-4">
          <p className="text-sm text-[#5c3d42]">
            Add a bank account before confirming.{" "}
            <Link href={customerPath(tenantSlug, "digital-metals", "bank")} className="font-medium underline">
              Manage bank accounts
            </Link>
          </p>
        </CustomerDmSurface>
      ) : activeBanks.length === 0 ? (
        <CustomerDmSurface className="mt-4">
          <p className="text-sm font-medium text-[#28161a]">No verified bank for payout yet</p>
          <p className="mt-2 text-sm text-[#5c3d42]">
            Sell proceeds can only go to a bank account your jeweller has verified.{" "}
            {pendingBanks.length
              ? "Your added account is still pending — refresh this page after verification, or add another account."
              : "Add a bank account under Bank in the digital metals menu."}
          </p>
          {pendingBanks.length ? (
            <ul className="mt-3 space-y-2 text-sm text-[#5c3d42]">
              {pendingBanks.map((b) => (
                <li key={b.id} className="rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2">
                  {b.accountHolderName} · ****{b.accountLast4} · {bankDestinationStatusLabel(b.status)}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="min-h-10" onClick={() => void banks.refetch()}>
              Refresh status
            </Button>
            <Button type="button" variant="outline" className="min-h-10" asChild>
              <Link href={customerPath(tenantSlug, "digital-metals", "bank")}>Manage bank accounts</Link>
            </Button>
          </div>
        </CustomerDmSurface>
      ) : (
        <fieldset className="mt-6">
          <legend className="mb-3 text-[15px] font-semibold text-[#221a1d]">Pay the money into</legend>
          <div role="radiogroup" aria-label="Payout bank account" className="space-y-2.5" data-testid="customer-dm-sell-payout-bank">
            {activeBanks.map((b) => {
              const selected = selectedBank === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setSelectedBank(b.id)}
                  className={`flex w-full items-center gap-3.5 rounded-2xl border bg-white p-4 text-left transition ${selected ? "border-[var(--customer-primary,#730321)] shadow-[0_0_0_1px_var(--customer-primary,#730321)]" : "border-[#e6d9d1] hover:border-[#cdb9b0]"}`}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(var(--customer-primary-rgb,115,3,33),0.07)] text-[var(--customer-primary,#730321)]">
                    <Landmark className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[#221a1d]">
                      {b.bankName ? `${b.bankName} ` : ""}•••• {b.accountLast4}
                    </span>
                    <span className="block text-xs text-[#7a6f72]">
                      {b.accountHolderName} · {b.ifsc}
                    </span>
                  </span>
                  <span className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${selected ? "border-[var(--customer-primary,#730321)]" : "border-[#d6c8c0]"}`} aria-hidden>
                    {selected ? <span className="size-2.5 rounded-full bg-[var(--customer-primary,#730321)]" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
          {pendingBanks.length ? (
            <p className="mt-3 text-xs text-amber-900">
              {pendingBanks.length} other account(s) awaiting jeweller verification — not shown until active.
            </p>
          ) : null}
          <p className="mt-2 text-xs text-[#7a6f72]">Accounts are verified by your jeweller, not by an instant automated bank check.</p>
        </fieldset>
      )}
      <div className="mt-7 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="h-12 rounded-full px-7 text-[15px] text-white"
          style={{ background: "var(--customer-primary, #730321)" }}
          onClick={() => void onConfirm()}
          disabled={
            orderState.isLoading
            || confirmState.isLoading
            || !capability.data?.canPlaceNewSell
            || activeBanks.length === 0
            || !selectedBank
          }
        >
          Confirm sell
        </Button>
        <Button type="button" variant="outline" className="min-h-11" asChild>
          <Link href={customerPath(tenantSlug, "digital-metals", "sell")}>Back</Link>
        </Button>
      </div>
    </CustomerDmPageShell>
  );
}

export function CustomerDigitalMetalsSellOrderPage({ orderId }: { orderId: string }) {
  const { tenantSlug } = useCustomerTenant();
  const order = useGetCustomerDigitalMetalsSellOrderQuery(orderId, { pollingInterval: 5_000 });
  const payout = useGetCustomerDigitalMetalsSellOrderPayoutStatusQuery(orderId, { pollingInterval: 5_000 });
  const [cancel, cancelState] = useCancelCustomerDigitalMetalsSellOrderMutation();

  const sellSummary = useMemo(() => {
    const o = order.data ?? {};
    const base = sellSummaryFromOrder(o);
    if (!base) return null;
    const mask = payout.data?.payoutDestinationMasked as
      | { accountLast4?: string; ifsc?: string; accountHolderName?: string }
      | undefined;
    if (!base.bankDestination && mask?.accountHolderName) {
      return {
        ...base,
        bankDestination: {
          accountHolderName: mask.accountHolderName,
          accountLast4: mask.accountLast4,
          ifsc: mask.ifsc,
        },
      };
    }
    return base;
  }, [order.data, payout.data?.payoutDestinationMasked]);

  if (order.isLoading || payout.isLoading) return <PageSkeleton cards={1} />;
  if (order.isError) {
    return <QueryError error={order.error} onRetry={order.refetch} />;
  }
  if (payout.isError) {
    return <QueryError error={payout.error} onRetry={payout.refetch} />;
  }

  const o = order.data ?? {};
  const status = String(o.status ?? "");
  const statusCopy = sellOrderStatusLabel(status);
  const snap = (o.snapshot ?? {}) as Record<string, unknown>;
  const settlementPaise = Number(o.settlementPaise ?? snap.settlementPaise ?? 0);
  const canCancel = status === "RESERVED" || status === "PENDING_APPROVAL";
  const saleExecuted = payout.data?.saleExecuted === true;
  const bankSettled = payout.data?.bankPayoutSettled === true;
  const latestPayout = (payout.data?.payouts as { status?: string }[] | undefined)?.[0];
  const payoutStatus = latestPayout?.status ? String(latestPayout.status) : null;

  async function onCancel() {
    try {
      await cancel({ orderId, idempotencyKey: newIdempotencyKey() }).unwrap();
      toast.success("Sell cancelled.");
      order.refetch();
    } catch (err) {
      toastApiError(err);
    }
  }

  const metalSteps = [
    {
      id: "reserve",
      label: "Metal reserved",
      detail: "Grams held while approval is pending.",
      state: "done" as const,
    },
    {
      id: "sale",
      label: "Sale executed",
      detail: saleExecuted ? "Metal debited from your wallet." : "Waiting for jeweller approval.",
      state: saleExecuted ? ("done" as const) : status === "CANCELLED" ? ("failed" as const) : ("current" as const),
    },
  ];
  const bankSteps = [
    {
      id: "open",
      label: "Payout opened",
      detail: saleExecuted ? "Bank transfer initiated." : "Opens after sale executes.",
      state: saleExecuted ? ("done" as const) : ("upcoming" as const),
    },
    {
      id: "settle",
      label: "Bank settlement",
      detail: bankSettled
        ? "Funds sent to your bank."
        : payoutStatus === "UNKNOWN"
          ? "Transfer status unclear — your jeweller is investigating."
          : payoutStatus === "FAILED"
            ? "Transfer failed — contact your jeweller for next steps."
            : "May take 1–2 business days after sale.",
      state: bankSettled
        ? ("done" as const)
        : payoutStatus === "FAILED" || payoutStatus === "UNKNOWN"
          ? ("failed" as const)
          : saleExecuted
            ? ("current" as const)
            : ("upcoming" as const),
    },
  ];

  return (
    <CustomerDmPageShell
      narrow
      title={statusCopy.title}
      subtitle={statusCopy.detail}
      backHref={customerPath(tenantSlug, "digital-metals")}
      backLabel="Wallet"
      testId="customer-dm-sell-order"
    >
      {sellSummary ? (
        <CustomerDmSurface>
          <h2 className="text-sm font-semibold text-[#28161a]">Sale receipt</h2>
          <p className="mt-1 text-xs text-[#8a6a70]">Locked quote and payout account for this sell order.</p>
          <div className="mt-3 rounded-xl border border-[#eaded9] bg-[#faf8f7] px-4 py-3">
            <CustomerDigitalMetalsSellReceiptBody summary={sellSummary} />
          </div>
          {o.approvalExpiresAt && status === "PENDING_APPROVAL" ? (
            <p className="mt-3 text-xs text-[#8a6a70]">
              Approval window:{" "}
              {new Date(String(o.approvalExpiresAt)).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
            </p>
          ) : null}
        </CustomerDmSurface>
      ) : (
        <CustomerDmSurface>
          <dl className="space-y-2 text-sm text-[#5c3d42]">
            <div className="flex justify-between gap-4">
              <dt>Reserved quantity</dt>
              <dd className="font-semibold">{ugToGramsDisplay(String(o.quantityUg ?? 0))}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Net payout</dt>
              <dd className="font-semibold">{formatInrFromPaise(settlementPaise)}</dd>
            </div>
          </dl>
        </CustomerDmSurface>
      )}

      <CustomerDmSurface className="mt-4" testId="customer-dm-payout-tracking">
        <h2 className="text-sm font-semibold text-[#28161a]">Metal sale</h2>
        <div className="mt-3">
          <CustomerDmTimeline steps={metalSteps} />
        </div>
        <h2 className="mt-6 text-sm font-semibold text-[#28161a]">Bank payout</h2>
        <div className="mt-3">
          <CustomerDmTimeline steps={bankSteps} />
        </div>
      </CustomerDmSurface>

      {canCancel ? (
        <Button
          type="button"
          variant="outline"
          className="mt-4 min-h-11"
          disabled={cancelState.isLoading}
          onClick={() => void onCancel()}
        >
          Cancel sell
        </Button>
      ) : null}
      {status !== "CANCELLED" && status !== "EXPIRED" ? (
        <div className="mt-4">
          <CustomerDigitalMetalsDocumentPanel
            title="Sale acknowledgement (PDF)"
            docType="SELL_ACKNOWLEDGEMENT"
            subjectId={orderId}
          />
        </div>
      ) : null}
    </CustomerDmPageShell>
  );
}
