"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
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
  formatAssetLabel,
  parseAssetKey,
  quoteReadyAssets,
  type CapabilityAsset,
} from "@/src/lib/digital-metals-asset-ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  CustomerDmPageShell,
  CustomerDmSurface,
  CustomerDmTimeline,
  customerDmMetalAccent,
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

  return (
    <CustomerDmPageShell
      title="Sell digital metal"
      subtitle="Sell from your available balance. Metal is reserved until your jeweller approves the sale."
      backHref={portfolioBack}
      testId="customer-dm-sell-form"
    >
      {pool.length === 0 ? (
        <CustomerDmSurface>
          <p className="text-sm text-[#5c3d42]">You need available metal before you can sell.</p>
          <Button type="button" asChild className="mt-4">
            <Link href={customerPath(tenantSlug, "digital-metals", "buy")}>Buy metal</Link>
          </Button>
        </CustomerDmSurface>
      ) : (
        <CustomerDmSurface>
          <div className="space-y-4 lg:max-w-md">
            <div>
              <Label htmlFor="sell-wallet">Your holding</Label>
              <Select value={assetSel || undefined} onValueChange={setAssetSel}>
                <SelectTrigger id="sell-wallet" className="mt-1.5" data-testid="customer-dm-sell-asset">
                  <SelectValue placeholder="Choose wallet" />
                </SelectTrigger>
                <SelectContent>
                  {pool.map((w) => (
                    <SelectItem key={`${w.metal}:${w.finenessPpm}`} value={`${w.metal}:${w.finenessPpm}`}>
                      {formatAssetLabel(String(w.metal), Number(w.finenessPpm))} · {ugToGramsDisplay(w.availableUg)}{" "}
                      available
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedWallet ? (
              <p className="text-sm text-[#5c3d42]">
                Available to sell:{" "}
                <strong>{ugToGramsDisplay(selectedWallet.availableUg)}</strong>
                {Number(selectedWallet.reservedUg) > 0 ? (
                  <span className="text-xs text-[#8a6a70]">
                    {" "}
                    ({ugToGramsDisplay(selectedWallet.reservedUg)} reserved for other orders)
                  </span>
                ) : null}
              </p>
            ) : null}
            <div>
              <Label htmlFor="grams">Quantity to sell (grams)</Label>
              <Input
                id="grams"
                inputMode="decimal"
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
                className="mt-1.5 max-w-xs"
              />
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button type="button" className="min-h-11" onClick={() => void onContinue()} disabled={createState.isLoading}>
              Review payout quote
            </Button>
            <Button type="button" variant="outline" className="min-h-11" asChild>
              <Link href={customerPath(tenantSlug, "digital-metals", "bank")}>Bank accounts</Link>
            </Button>
          </div>
        </CustomerDmSurface>
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
      title="Review sell & payout"
      subtitle="Net settlement goes to your verified bank after jeweller approval."
      backHref={customerPath(tenantSlug, "digital-metals", "sell")}
      testId="customer-dm-sell-review"
    >
      <DigitalMetalsQuoteBreakdown quote={{ ...quote, side: "SELL" }} className="border-[#eaded9] bg-[#faf8f7]" />
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
        <div className="mt-4 space-y-2">
          <Label htmlFor="payout-bank">Payout bank account</Label>
          <Select value={selectedBank || undefined} onValueChange={setSelectedBank}>
            <SelectTrigger id="payout-bank" className="min-h-11 w-full max-w-md" data-testid="customer-dm-sell-payout-bank">
              <SelectValue placeholder="Choose verified bank" />
            </SelectTrigger>
            <SelectContent>
              {activeBanks.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.accountHolderName} · ****{b.accountLast4}
                  {b.bankName ? ` · ${b.bankName}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {pendingBanks.length ? (
            <p className="text-xs text-amber-900">
              {pendingBanks.length} other account(s) awaiting jeweller verification — not shown until active.
            </p>
          ) : null}
          <p className="text-xs text-[#8a6a70]">
            In production, verification is done manually by your jeweller — not an instant automated bank check.
          </p>
        </div>
      )}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="min-h-11"
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
      title={statusCopy.title}
      subtitle={statusCopy.detail}
      backHref={customerPath(tenantSlug, "digital-metals")}
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
