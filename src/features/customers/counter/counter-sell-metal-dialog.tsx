"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Banknote, Building2, Loader2, Scale } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogTitle, dialogScrollShellClass } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Notice } from "@/src/components/admin-ui/detail-parts";
import { apiErrorMessage } from "@/src/lib/api-error";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import type { CustomerDigitalMetalsSummary, DmCounterQuote, DmMetal, DmRateRow } from "@/src/lib/counter-trade-types";
import {
  useCreateDigitalMetalsCounterSellQuoteMutation,
  useGetDigitalMetalsCustomerBankDestinationsQuery,
  usePlaceDigitalMetalsCounterSellMutation,
  useRecordDigitalMetalsSellCashPayoutMutation,
} from "@/src/store/api/admin-api";
import { dmInr, dmWeight } from "@/src/features/digital-metals/digital-metals-admin-ui";
import {
  ConsentCheck,
  CounterDialogBand,
  CounterDone,
  PriceSheet,
  QuoteTimer,
  Segmented,
  gramsInputToUg,
  useSecondsLeft,
} from "./counter-trade-ui";

const STEPS = ["Price", "Payout", "Done"];

type BankRow = {
  id?: string;
  accountHolderName?: string;
  accountLast4?: string;
  ifsc?: string;
  bankName?: string;
  status?: string;
};

export function CounterSellMetalDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  rates,
  holdings,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  rates: DmRateRow[];
  holdings: CustomerDigitalMetalsSummary["holdings"];
}) {
  const availableUg = (m: DmMetal) => Number(holdings.find((h) => h.metal === m)?.availableUg ?? 0);
  const firstMetal: DmMetal = availableUg("GOLD") > 0 || availableUg("SILVER") === 0 ? "GOLD" : "SILVER";
  const [step, setStep] = useState(0);
  const [metal, setMetal] = useState<DmMetal>(firstMetal);
  const [grams, setGrams] = useState("");
  const [quote, setQuote] = useState<DmCounterQuote | null>(null);
  const [payout, setPayout] = useState<"CASH" | "BANK">("CASH");
  const [bankId, setBankId] = useState("");
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [placeKey, setPlaceKey] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [stage, setStage] = useState<"pending" | "accepted" | "paid">("pending");
  const [error, setError] = useState<string | null>(null);
  const banks = useGetDigitalMetalsCustomerBankDestinationsQuery(customerId, { skip: !open });
  const [getQuote, quoteState] = useCreateDigitalMetalsCounterSellQuoteMutation();
  const [placeSell, placeState] = usePlaceDigitalMetalsCounterSellMutation();
  const [payCash, payState] = useRecordDigitalMetalsSellCashPayoutMutation();
  const secondsLeft = useSecondsLeft(quote?.expiresAt);

  const bankRows = (banks.data?.items ?? []) as BankRow[];
  const verifiedBanks = bankRows.filter((b) => b.status === "ACTIVE");
  const ug = gramsInputToUg(grams);
  const maxUg = availableUg(metal);
  const overBalance = ug != null && ug > maxUg;
  const rate = rates.find((r) => r.metal === metal);

  function reset() {
    setStep(0);
    setGrams("");
    setQuote(null);
    setPayout("CASH");
    setBankId("");
    setNote("");
    setConsent(false);
    setOrderId(null);
    setStage("pending");
    setError(null);
  }

  function close(next: boolean) {
    onOpenChange(next);
    if (!next) window.setTimeout(reset, 200);
  }

  async function requestQuote() {
    if (ug == null || overBalance) return;
    setError(null);
    try {
      const q = await getQuote({ customerId, metal, finenessPpm: 999_000, quantityUg: ug }).unwrap();
      setQuote(q);
      setPlaceKey(newIdempotencyKey());
      setConsent(false);
      if (!bankId && verifiedBanks[0]?.id) setBankId(String(verifiedBanks[0].id));
      setStep(1);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not price this sell."));
    }
  }

  async function confirm() {
    if (!quote) return;
    setError(null);
    try {
      const res = await placeSell({
        customerId,
        idempotencyKey: placeKey,
        quoteId: quote.quoteId,
        payoutMethod: payout,
        bankDestinationId: payout === "BANK" ? bankId : undefined,
        note: note.trim() || undefined,
      }).unwrap();
      if (res.order.status !== "PAYABLE_OPEN" || !res.order.id) {
        throw new Error("Sale confirmation is incomplete. Refresh the customer before retrying.");
      }
      setOrderId(String(res.order.id));
      setStage("accepted");
      setStep(2);
      toast.success("Sale accepted — payment pending");
    } catch (err) {
      setError(apiErrorMessage(err, "Could not place this sell."));
    }
  }

  async function payCashNow() {
    if (!orderId) return;
    setError(null);
    try {
      await payCash({ orderId, idempotencyKey: newIdempotencyKey() }).unwrap();
      setStage("paid");
      toast.success(`${dmInr(quote?.settlementPaise)} paid to ${customerName}`);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not record the cash payout."));
    }
  }

  const settlement = quote?.settlementPaise ?? 0;
  const bankReady = payout === "CASH" || Boolean(bankId);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className={`${dialogScrollShellClass} [&>[data-slot=dialog-close]]:text-white [&>[data-slot=dialog-close]]:opacity-80 sm:max-w-xl`} aria-describedby={undefined}>
        <DialogTitle className="sr-only">Sell Digi Gold for {customerName}</DialogTitle>
        <CounterDialogBand icon={Scale} title="Sell Digi Gold" customerName={customerName} steps={STEPS} current={step} />
        <DialogBody className="space-y-5 pb-6">
          {error ? <Notice tone="red" title={error} /> : null}

          {step === 0 ? (
            <>
              <Segmented
                label="Metal"
                value={metal}
                onChange={(m) => {
                  setMetal(m);
                  setGrams("");
                }}
                options={(["GOLD", "SILVER"] as const).map((m) => ({
                  value: m,
                  label: m === "GOLD" ? "Gold 24K" : "Silver",
                  hint: availableUg(m) > 0 ? `${dmWeight(availableUg(m))} available` : "Nothing to sell",
                  disabled: availableUg(m) === 0,
                }))}
              />
              <div className="space-y-3">
                <p className="text-sm font-semibold text-[#28161a]">How many grams is the customer selling?</p>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-[#a2969a]">g</span>
                  <Input
                    autoFocus
                    inputMode="decimal"
                    value={grams}
                    onChange={(e) => setGrams(e.target.value.replace(/[^\d.]/g, "").slice(0, 12))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void requestQuote();
                    }}
                    placeholder={metal === "GOLD" ? "1.000" : "50"}
                    className="h-14 pl-10 text-2xl font-bold tabular-nums md:text-2xl"
                    aria-label="Weight in grams"
                    aria-invalid={overBalance}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["Quarter", 0.25],
                    ["Half", 0.5],
                    ["All available", 1],
                  ].map(([label, share]) => (
                    <button
                      key={String(label)}
                      type="button"
                      disabled={maxUg === 0}
                      onClick={() => setGrams(String(Math.floor(maxUg * Number(share)) / 1_000_000))}
                      className="rounded-full border border-[#eadfe2] bg-white px-3 py-1 text-xs font-semibold text-[#5d4f53] hover:border-[#c9a3ad] hover:text-[#4a0e1c] disabled:opacity-50"
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {overBalance ? (
                  <p className="text-sm font-medium text-red-700">
                    The customer has only {dmWeight(maxUg)} {metal === "GOLD" ? "gold" : "silver"} available to sell.
                  </p>
                ) : rate?.sellRatePerGramPaise && ug ? (
                  <p className="text-xs text-[#8a7c80]">
                    About {dmInr(Math.round((ug * rate.sellRatePerGramPaise) / 1_000_000))} at today&apos;s sell rate of{" "}
                    {dmInr(rate.sellRatePerGramPaise)}/g, before fees.
                  </p>
                ) : null}
              </div>
            </>
          ) : null}

          {step === 1 && quote ? (
            <>
              <PriceSheet
                rows={[
                  { label: metal === "GOLD" ? "Gold 24K · 99.9" : "Silver · 99.9", value: dmWeight(quote.quantityUg) },
                  { label: "Sell rate", value: `${dmInr(quote.rateSnapshot?.sellRatePerGramPaise)}/g` },
                  { label: "Metal value", value: dmInr(quote.metalSubtotalPaise) },
                  ...(quote.feePaise ? [{ label: "Sell fee", value: `− ${dmInr(quote.feePaise)}` }] : []),
                  ...(quote.taxPaise ? [{ label: "Tax on fee", value: `− ${dmInr(quote.taxPaise)}` }] : []),
                ]}
                total={{ label: "Customer receives", value: dmInr(settlement) }}
                aside={<QuoteTimer secondsLeft={secondsLeft} />}
              />
              <div className="space-y-3">
                <p className="text-sm font-semibold text-[#28161a]">How should we pay the customer?</p>
                <Segmented
                  label="Payout method"
                  value={payout}
                  onChange={setPayout}
                  options={[
                    { value: "CASH", label: "Cash at counter", icon: Banknote, hint: "Record cash after confirming the sale" },
                    {
                      value: "BANK",
                      label: "Bank transfer",
                      icon: Building2,
                      hint: verifiedBanks.length ? "To a verified account" : "No verified account",
                    },
                  ]}
                />
                {payout === "BANK" ? (
                  verifiedBanks.length === 0 ? (
                    <Notice tone="amber" title="No verified bank account">
                      Verify the customer&apos;s account in the Digital metals tab first, or pay in cash.
                    </Notice>
                  ) : (
                    <div role="radiogroup" aria-label="Bank account" className="space-y-2">
                      {bankRows.map((b) => {
                        const verified = b.status === "ACTIVE";
                        const selected = bankId === b.id;
                        return (
                          <button
                            key={String(b.id)}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            disabled={!verified}
                            onClick={() => setBankId(String(b.id))}
                            className={cn(
                              "flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-55",
                              selected ? "border-[#7b0a2b] bg-[#fbf3f5] shadow-[inset_0_0_0_1px_#7b0a2b]" : "border-[#eadfe2] bg-white",
                            )}
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-[#28161a]">
                                {b.bankName || "Bank account"} ···· {b.accountLast4}
                              </span>
                              <span className="block truncate text-xs text-[#8a7c80]">
                                {b.accountHolderName} · {b.ifsc}
                              </span>
                            </span>
                            <span className={cn("shrink-0 text-xs font-semibold", verified ? "text-emerald-700" : "text-amber-700")}>
                              {verified ? "Verified" : "Not verified"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )
                ) : (
                  <p className="text-xs text-[#8a7c80]">
                    Confirming the sale debits the grams immediately. Record the cash only after you hand it to the customer; it then comes off your cash in hand.
                  </p>
                )}
              </div>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-[#3a2a2f]">Note (optional)</span>
                <Textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} rows={2} placeholder="Shown on the order for your team" />
              </label>
              <ConsentCheck checked={consent} onChange={setConsent}>
                The customer has seen this price and agrees to sell {dmWeight(quote.quantityUg)} for {dmInr(settlement)}.
              </ConsentCheck>
            </>
          ) : null}

          {step === 2 && quote ? (
            stage === "paid" ? (
              <CounterDone title={`${dmInr(settlement)} paid in cash`}>
                <p>
                  {dmWeight(quote.quantityUg)} {metal === "GOLD" ? "gold" : "silver"} sold and settled. The amount comes off your cash in hand.
                </p>
              </CounterDone>
            ) : stage === "accepted" ? (
              <CounterDone title="Sale accepted — payment pending">
                <p>
                  {dmWeight(quote.quantityUg)} {metal === "GOLD" ? "gold" : "silver"} is sold. {customerName} is owed {dmInr(settlement)}.
                </p>
                {payout === "CASH" ? (
                  <Notice tone="wine" title={`Hand over ${dmInr(settlement)} and record it`}>
                    Count the cash with the customer, then tap Paid in cash.
                  </Notice>
                ) : (
                  <Notice tone="blue" title="Transfer and record payment">
                    Transfer the amount externally, then record the payment on the{" "}
                    <Link href={`/digital-metals/sells/${orderId}`} className="font-semibold underline">
                      sell order
                    </Link>
                    .
                  </Notice>
                )}
              </CounterDone>
            ) : (
              <CounterDone title="Sale status needs review" tone="amber">
                <p>Refresh the customer to check this sale before making payment.</p>
              </CounterDone>
            )
          ) : null}
        </DialogBody>
        <DialogFooter>
          {step === 0 ? (
            <>
              <Button variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button disabled={ug == null || overBalance || quoteState.isLoading} onClick={() => void requestQuote()}>
                {quoteState.isLoading ? <Loader2 className="animate-spin" /> : null}
                Get today&apos;s price
              </Button>
            </>
          ) : step === 1 ? (
            <>
              <Button variant="outline" onClick={() => setStep(0)} disabled={placeState.isLoading}>
                <ArrowLeft />
                Change grams
              </Button>
              {secondsLeft === 0 ? (
                <Button onClick={() => void requestQuote()} disabled={quoteState.isLoading}>
                  Refresh price
                </Button>
              ) : (
                <Button disabled={!consent || !bankReady || placeState.isLoading} onClick={() => void confirm()}>
                  {placeState.isLoading ? <Loader2 className="animate-spin" /> : null}
                  Confirm sale
                </Button>
              )}
            </>
          ) : stage === "accepted" && payout === "CASH" ? (
            <>
              <Button variant="outline" onClick={() => close(false)}>
                Pay later
              </Button>
              <Button onClick={() => void payCashNow()} disabled={payState.isLoading}>
                {payState.isLoading ? <Loader2 className="animate-spin" /> : null}
                Paid {dmInr(settlement)} in cash
              </Button>
            </>
          ) : (
            <Button onClick={() => close(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
