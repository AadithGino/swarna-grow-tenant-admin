"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Coins, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogTitle, dialogScrollShellClass } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Notice } from "@/src/components/admin-ui/detail-parts";
import { apiErrorMessage } from "@/src/lib/api-error";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { rupeeInputToPaise } from "@/src/lib/digital-metals-display";
import type { CounterPaymentMode, DmCounterQuote, DmMetal, DmRateRow } from "@/src/lib/counter-trade-types";
import {
  useCreateDigitalMetalsCounterBuyQuoteMutation,
  usePlaceDigitalMetalsCounterBuyMutation,
} from "@/src/store/api/admin-api";
import { dmInr, dmWeight } from "@/src/features/digital-metals/digital-metals-admin-ui";
import {
  ConsentCheck,
  CounterDialogBand,
  CounterDone,
  PaymentModeFields,
  PriceSheet,
  QuoteTimer,
  Segmented,
  gramsInputToUg,
  referenceMissing,
  useSecondsLeft,
} from "./counter-trade-ui";

const STEPS = ["Price", "Payment", "Done"];
const AMOUNT_CHIPS = [1_000, 5_000, 10_000, 25_000];
const GRAM_CHIPS = { GOLD: [0.5, 1, 2, 5], SILVER: [10, 50, 100, 500] } as const;

export function CounterBuyMetalDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  rates,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  rates: DmRateRow[];
}) {
  const [step, setStep] = useState(0);
  const [metal, setMetal] = useState<DmMetal>("GOLD");
  const [inputMode, setInputMode] = useState<"BUDGET_INR" | "QUANTITY_UG">("BUDGET_INR");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<DmCounterQuote | null>(null);
  const [payMode, setPayMode] = useState<CounterPaymentMode>("CASH");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [placeKey, setPlaceKey] = useState("");
  const [result, setResult] = useState<{ order: Record<string, unknown>; cashCustody: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [getQuote, quoteState] = useCreateDigitalMetalsCounterBuyQuoteMutation();
  const [placeBuy, placeState] = usePlaceDigitalMetalsCounterBuyMutation();
  const secondsLeft = useSecondsLeft(quote?.expiresAt);

  const rate = rates.find((r) => r.metal === metal);
  const parsed = inputMode === "BUDGET_INR" ? rupeeInputToPaise(amount) : gramsInputToUg(amount);
  const canQuote = parsed != null && parsed > 0 && !quoteState.isLoading;

  function reset() {
    setStep(0);
    setQuote(null);
    setAmount("");
    setPayMode("CASH");
    setReference("");
    setNote("");
    setConsent(false);
    setResult(null);
    setError(null);
  }

  function close(next: boolean) {
    onOpenChange(next);
    if (!next) window.setTimeout(reset, 200);
  }

  async function requestQuote() {
    if (parsed == null) return;
    setError(null);
    try {
      const q = await getQuote({
        customerId,
        metal,
        finenessPpm: 999_000,
        inputMode,
        ...(inputMode === "BUDGET_INR" ? { budgetPaise: parsed } : { quantityUg: parsed }),
      }).unwrap();
      setQuote(q);
      setPlaceKey(newIdempotencyKey());
      setConsent(false);
      setStep(1);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not price this purchase."));
    }
  }

  async function confirm() {
    if (!quote) return;
    setError(null);
    try {
      const res = await placeBuy({
        customerId,
        idempotencyKey: placeKey,
        quoteId: quote.quoteId,
        paymentMode: payMode,
        paymentReference: payMode === "CASH" ? undefined : reference.trim(),
        note: note.trim() || undefined,
      }).unwrap();
      setResult(res);
      setStep(2);
      toast.success(`${dmWeight(quote.quantityUg)} ${metal === "GOLD" ? "gold" : "silver"} credited to ${customerName}`);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not record this purchase."));
    }
  }

  const total = quote?.totalPayablePaise ?? 0;
  const metalLabel = metal === "GOLD" ? "Gold 24K · 99.9" : "Silver · 99.9";

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className={`${dialogScrollShellClass} [&>[data-slot=dialog-close]]:text-white [&>[data-slot=dialog-close]]:opacity-80 sm:max-w-xl`} aria-describedby={undefined}>
        <DialogTitle className="sr-only">Buy Digi Gold for {customerName}</DialogTitle>
        <CounterDialogBand icon={Coins} title="Buy Digi Gold" customerName={customerName} steps={STEPS} current={step} />
        <DialogBody className="space-y-5 pb-6">
          {error ? <Notice tone="red" title={error} /> : null}

          {step === 0 ? (
            <>
              <Segmented
                label="Metal"
                value={metal}
                onChange={(m) => {
                  setMetal(m);
                  setAmount("");
                }}
                options={(["GOLD", "SILVER"] as const).map((m) => {
                  const r = rates.find((x) => x.metal === m);
                  return {
                    value: m,
                    label: m === "GOLD" ? "Gold 24K" : "Silver",
                    hint: r?.buyRatePerGramPaise ? `${dmInr(r.buyRatePerGramPaise)}/g today` : "Rate not published",
                    disabled: !r?.buyRatePerGramPaise,
                  };
                })}
              />
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#28161a]">How much does the customer want?</p>
                  <div className="inline-flex rounded-lg bg-[#f5eef0] p-0.5 text-xs font-semibold" role="radiogroup" aria-label="Enter as">
                    {(
                      [
                        ["BUDGET_INR", "Rupees"],
                        ["QUANTITY_UG", "Grams"],
                      ] as const
                    ).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        role="radio"
                        aria-checked={inputMode === mode}
                        onClick={() => {
                          setInputMode(mode);
                          setAmount("");
                        }}
                        className={
                          inputMode === mode
                            ? "rounded-md bg-white px-3 py-1 text-[#4a0e1c] shadow-sm"
                            : "rounded-md px-3 py-1 text-[#7a6d70]"
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-[#a2969a]">
                    {inputMode === "BUDGET_INR" ? "₹" : "g"}
                  </span>
                  <Input
                    autoFocus
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, "").slice(0, 12))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canQuote) void requestQuote();
                    }}
                    placeholder={inputMode === "BUDGET_INR" ? "5,000" : metal === "GOLD" ? "1.000" : "50"}
                    className="h-14 pl-10 text-2xl font-bold tabular-nums md:text-2xl"
                    aria-label={inputMode === "BUDGET_INR" ? "Amount in rupees" : "Weight in grams"}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {(inputMode === "BUDGET_INR" ? AMOUNT_CHIPS : GRAM_CHIPS[metal]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAmount(String(v))}
                      className="rounded-full border border-[#eadfe2] bg-white px-3 py-1 text-xs font-semibold text-[#5d4f53] hover:border-[#c9a3ad] hover:text-[#4a0e1c]"
                    >
                      {inputMode === "BUDGET_INR" ? `₹${v.toLocaleString("en-IN")}` : `${v} g`}
                    </button>
                  ))}
                </div>
                {rate?.buyRatePerGramPaise && parsed ? (
                  <p className="text-xs text-[#8a7c80]">
                    {inputMode === "BUDGET_INR"
                      ? `About ${dmWeight(Math.floor((parsed / 1.03 / rate.buyRatePerGramPaise) * 1_000_000))} before fees and GST.`
                      : `About ${dmInr(Math.round((parsed * rate.buyRatePerGramPaise) / 1_000_000))} before fees and GST.`}{" "}
                    The exact price comes on the next step.
                  </p>
                ) : null}
              </div>
            </>
          ) : null}

          {step === 1 && quote ? (
            <>
              <PriceSheet
                rows={[
                  { label: metalLabel, value: dmWeight(quote.quantityUg) },
                  {
                    label: "Buy rate",
                    value: `${dmInr(quote.rateSnapshot?.buyRatePerGramPaise)}/g`,
                  },
                  { label: "Metal value", value: dmInr(quote.metalSubtotalPaise) },
                  ...(quote.feePaise ? [{ label: "Buy fee", value: dmInr(quote.feePaise) }] : []),
                  ...((quote.taxLines ?? []).length
                    ? (quote.taxLines ?? []).map((t) => ({
                        label: `${t.code ?? "Tax"}${t.ratePercent != null ? ` ${t.ratePercent}%` : ""}`,
                        value: dmInr(t.amountPaise),
                      }))
                    : [{ label: "GST", value: dmInr(quote.taxPaise ?? 0), muted: true }]),
                ]}
                total={{ label: "Customer pays", value: dmInr(total) }}
                aside={<QuoteTimer secondsLeft={secondsLeft} />}
              />
              {quote.budgetRemainderPaise ? (
                <p className="-mt-2 text-xs text-[#8a7c80]">
                  {dmInr(quote.budgetRemainderPaise)} of the {dmInr(rupeeInputToPaise(amount) ?? 0)} budget is left over after rounding to the nearest milligram.
                </p>
              ) : null}
              <PaymentModeFields
                mode={payMode}
                onModeChange={setPayMode}
                reference={reference}
                onReferenceChange={setReference}
                amountLabel={<strong className="text-[#28161a]">{dmInr(total)}</strong>}
              />
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-[#3a2a2f]">Note (optional)</span>
                <Textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} rows={2} placeholder="Shown on the order for your team" />
              </label>
              <ConsentCheck checked={consent} onChange={setConsent}>
                The customer has seen this price, paid {dmInr(total)}, and agrees to the Digi Gold terms.
              </ConsentCheck>
            </>
          ) : null}

          {step === 2 && quote && result ? (
            <CounterDone title={`${dmWeight(quote.quantityUg)} ${metal === "GOLD" ? "gold" : "silver"} credited`}>
              <p>
                {dmInr(total)} received by {payMode === "CASH" ? "cash" : payMode === "UPI" ? "UPI" : "card"}. The receipt and GST invoice are sent to {customerName} automatically.
              </p>
              {payMode === "CASH" ? (
                <Notice tone={result.cashCustody === "STAFF" ? "green" : "blue"}>
                  {result.cashCustody === "STAFF"
                    ? `${dmInr(total)} is added to your cash in hand. Hand it over in Cash control as usual.`
                    : "Owner and admin cash isn't tracked in Cash control. Keep it with the day's takings."}
                </Notice>
              ) : null}
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/digital-metals/purchases/${encodeURIComponent(String(result.order.id ?? ""))}`}>View purchase</Link>
                </Button>
                <Button variant="outline" size="sm" onClick={reset}>
                  Buy more
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
              <Button disabled={!canQuote} onClick={() => void requestQuote()}>
                {quoteState.isLoading ? <Loader2 className="animate-spin" /> : null}
                Get today&apos;s price
              </Button>
            </>
          ) : step === 1 ? (
            <>
              <Button variant="outline" onClick={() => setStep(0)} disabled={placeState.isLoading}>
                <ArrowLeft />
                Change amount
              </Button>
              {secondsLeft === 0 ? (
                <Button onClick={() => void requestQuote()} disabled={quoteState.isLoading}>
                  {quoteState.isLoading ? <Loader2 className="animate-spin" /> : null}
                  Refresh price
                </Button>
              ) : (
                <Button
                  disabled={!consent || referenceMissing(payMode, reference) || placeState.isLoading}
                  onClick={() => void confirm()}
                >
                  {placeState.isLoading ? <Loader2 className="animate-spin" /> : null}
                  Record {dmInr(total)} &amp; credit grams
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
