"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, Lock, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import {
  useInitiateCustomerPaymentMutation,
  useInitiatePublicPaymentLinkMutation,
  useLazyGetCustomerPayableRangeQuery,
} from "@/src/store/api/customer-api";
import { customerPath } from "@/src/lib/customer-tenant";
import { openCustomerPaymentTarget } from "@/src/lib/customer-payment-redirect";
import { pollSessionFromInitResponse } from "@/src/lib/customer-payment-session";
import { payableQuoteBounds } from "@/src/lib/customer-payable-display";
import {
  livePayableAmountError,
  paymentAmountReady,
  payableAmountRangeMessage,
} from "@/src/lib/payment-form-validation";
import { money } from "@/src/lib/format";
import type { CustomerSchemeDetail, PayableRangeTargetCycleOption } from "@/src/types/customer";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function formatCycleLabel(cycle: string | undefined, options?: PayableRangeTargetCycleOption[]) {
  if (!cycle) return "This cycle";
  const match = options?.find((opt) => opt.cycle === cycle);
  if (match?.label) return match.label;
  const parts = cycle.match(/^(\d{4})-(\d{2})/);
  if (parts) {
    const date = new Date(Number(parts[1]), Number(parts[2]) - 1, 1);
    return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }
  return cycle;
}

function PhonePeMark() {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#5f259f] text-sm font-black text-white">
      Pe
    </span>
  );
}

function SchemeGoldIcon() {
  return (
    <span
      className="grid size-12 shrink-0 place-items-center rounded-xl"
      style={{ background: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.22)" }}
    >
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <rect x="4" y="14" width="8" height="10" rx="1" fill="#c9a227" />
        <rect x="12" y="10" width="8" height="14" rx="1" fill="#e8c547" />
        <rect x="20" y="14" width="8" height="10" rx="1" fill="#a67c00" />
      </svg>
    </span>
  );
}

export function CustomerMakePaymentSheet({
  scheme,
  open,
  onOpenChange,
}: {
  scheme: CustomerSchemeDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { tenantSlug } = useCustomerTenant();
  const initialRange = scheme.payableRange;
  const fixed = scheme.displayMode === "FIXED";
  const [range, setRange] = useState(initialRange);
  const [targetCycle, setTargetCycle] = useState(initialRange?.targetCycle ?? "");
  const [fetchRange, fetchRangeState] = useLazyGetCustomerPayableRangeQuery();
  const suggestedPaise =
    range?.suggested?.amountPaise ?? range?.maxPayable?.amountPaise ?? scheme.nextActionAmount?.amountPaise ?? 0;
  const [amount, setAmount] = useState(String(suggestedPaise / 100));
  const [amountTouched, setAmountTouched] = useState(false);
  const [initiate, state] = useInitiateCustomerPaymentMutation();
  const [initiatePublicLink] = useInitiatePublicPaymentLinkMutation();
  const amountPaise = Math.round(Number(amount || 0) * 100);
  const quoteBounds = payableQuoteBounds(range);
  const numericAmount = amount === "" ? "" : Number(amount);
  const amountError =
    amountTouched || amount !== "" ? livePayableAmountError(numericAmount, quoteBounds) : undefined;
  const valid = !!range && paymentAmountReady(numericAmount, quoteBounds);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const next = await fetchRange({
          schemeId: scheme.id,
          targetCycle: initialRange?.targetCycle,
        }).unwrap();
        if (cancelled) return;
        setRange(next);
        setTargetCycle(next.targetCycle ?? "");
        const suggested = next.suggested?.amountPaise ?? next.maxPayable?.amountPaise ?? 0;
        setAmount(String(suggested / 100));
      } catch {
        if (cancelled) return;
        setRange(initialRange);
        setTargetCycle(initialRange?.targetCycle ?? "");
        const suggested =
          initialRange?.suggested?.amountPaise ?? initialRange?.maxPayable?.amountPaise ?? 0;
        setAmount(String(suggested / 100));
        toast.error("Could not refresh payment limits. Showing last known quote.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, scheme.id, initialRange, fetchRange]);

  useEffect(() => {
    if (!open || !targetCycle || targetCycle === initialRange?.targetCycle) return;
    let cancelled = false;
    (async () => {
      try {
        const next = await fetchRange({ schemeId: scheme.id, targetCycle }).unwrap();
        if (cancelled) return;
        setRange(next);
        const nextSuggested = next.suggested?.amountPaise ?? next.maxPayable?.amountPaise ?? 0;
        setAmount(String(nextSuggested / 100));
      } catch {
        if (!cancelled) toast.error("Could not load payment quote for that cycle");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, targetCycle, scheme.id, fetchRange, initialRange?.targetCycle]);

  const cycleOptions = useMemo(() => range?.targetCycleOptions ?? [], [range?.targetCycleOptions]);
  const cycleLabel = formatCycleLabel(range?.targetCycle ?? targetCycle, cycleOptions);

  const amountChips = useMemo(() => {
    const chips = range?.allowedAmountsPaise?.length
      ? range.allowedAmountsPaise
      : range?.quickAmounts?.length
        ? range.quickAmounts.map((q) => q.amountPaise)
      : range
        ? [range.suggested?.amountPaise ?? range.maxPayable.amountPaise]
        : [];
    const unique = [...new Set(chips.filter((p) => p > 0))];
    if (amountPaise > 0 && !unique.includes(amountPaise) && !range?.allowedAmountsPaise?.length) {
      unique.unshift(amountPaise);
    }
    return unique;
  }, [range, amountPaise]);

  const pay = async () => {
    setAmountTouched(true);
    if (!valid || !range) {
      return toast.error(
        quoteBounds
          ? payableAmountRangeMessage(quoteBounds)
          : "Payment quote unavailable. Refresh and try again.",
      );
    }
    try {
      const statusRedirectUrl = customerPath(tenantSlug, "pay", "status");
      const statusRedirectFull = `${window.location.origin}${statusRedirectUrl}`;
      const response = await initiate({
        scheme,
        amountPaise,
        redirectUrl: statusRedirectFull,
        targetCycle: range.targetCycle ?? targetCycle,
        positionVersion: range.positionVersion,
      }).unwrap();
      const baseSession = pollSessionFromInitResponse(response, scheme.id);
      onOpenChange(false);
      await openCustomerPaymentTarget(response, {
        tenantSlug,
        statusRedirectUrl,
        schemeId: scheme.id,
        session: baseSession
          ? {
              ...baseSession,
              schemeName: scheme.planName,
              schemeNumber: scheme.schemeNumber,
              amountPaise,
              cycleLabel,
            }
          : undefined,
        initiateLink: async (linkToken) =>
          initiatePublicLink({ linkToken, redirectUrl: statusRedirectFull }).unwrap(),
        navigate: (path) => router.push(path),
      });
    } catch {
      toast.error("PhonePe could not be started. Your account was not charged.");
    }
  };

  const payableDisplay = money(amountPaise / 100);
  const minDisplay = range ? range.minPayable.amountDisplay : "—";
  const maxDisplay = range ? range.maxPayable.amountDisplay : "—";

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setAmountTouched(false);
        onOpenChange(nextOpen);
      }}
    >
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[92vh] overflow-y-auto rounded-t-[1.35rem] border-[#ece6e1] bg-[#faf7f4] px-0 pb-[max(1rem,env(safe-area-inset-bottom))] pt-0 sm:mx-auto sm:max-w-lg"
      >
        <SheetTitle className="sr-only">Make payment</SheetTitle>
        <div className="sticky top-0 z-10 border-b border-[#ece6e1] bg-[#faf7f4] px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black tracking-[-.02em] text-[#171722]">Make payment</h2>
              <p className="mt-0.5 text-sm text-[#777280]">Secure and convenient</p>
            </div>
            <Lock className="size-5 shrink-0 text-[var(--customer-accent,#c9a227)]" strokeWidth={2} />
          </div>
        </div>

        <div className="space-y-5 px-5 pt-4">
          <div
            className="flex items-center gap-3 rounded-2xl border px-3.5 py-3"
            style={{
              borderColor: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.35)",
              background: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.12)",
            }}
          >
            <SchemeGoldIcon />
            <div className="min-w-0">
              <p className="truncate font-bold text-[#171722]">{scheme.planName}</p>
              <p className="text-xs text-[#777280]">{cycleLabel}</p>
            </div>
          </div>

          {range?.allowFutureCycleSelection && cycleOptions.length > 1 ? (
            <div>
              <p className="text-xs font-semibold text-[#777280]">Contribution cycle</p>
              <Select value={targetCycle} onValueChange={setTargetCycle} disabled={fetchRangeState.isFetching}>
                <SelectTrigger className="mt-2 h-11 rounded-xl border-[#e5ddd7] bg-white">
                  <SelectValue placeholder="Choose cycle" />
                </SelectTrigger>
                <SelectContent>
                  {cycleOptions.map((opt) => (
                    <SelectItem key={opt.cycle} value={opt.cycle}>
                      {opt.label}
                      {opt.isCurrentCycle ? " (current)" : ""} · up to {opt.remaining.amountDisplay}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div>
            <p className="text-sm font-semibold text-[#777280]">Payable now</p>
            <p className="mt-1 text-[2.35rem] font-black leading-none tracking-[-.03em] text-[#171722]">
              {fetchRangeState.isFetching && !range ? "…" : payableDisplay}
            </p>
            {range ? (
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-[#ece6e1] bg-white px-4 py-3">
                <div>
                  <p className="text-[11px] text-[#8a8490]">Minimum</p>
                  <p className="text-sm font-bold text-[#171722]">{minDisplay}</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#8a8490]">Maximum</p>
                  <p className="text-sm font-bold text-[#171722]">{maxDisplay}</p>
                </div>
              </div>
            ) : null}
          </div>

          <div>
            <p className="text-sm font-semibold text-[#777280]">Select amount</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {amountChips.map((chipPaise) => {
                const selected = amountPaise === chipPaise;
                return (
                  <button
                    key={chipPaise}
                    type="button"
                    onClick={() => {
                      setAmountTouched(true);
                      setAmount(String(chipPaise / 100));
                    }}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition",
                      selected
                        ? "text-white shadow-sm"
                        : "border border-[#e5ddd7] bg-white text-[#706b77]",
                    )}
                    style={selected ? { background: "var(--customer-primary, #730321)" } : undefined}
                  >
                    {money(chipPaise / 100)}
                    {selected ? (
                      <span className="grid size-5 place-items-center rounded-full bg-white/25">
                        <Check className="size-3.5 text-white" strokeWidth={3} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {!fixed && quoteBounds?.eligible ? (
              <div className="mt-3">
                <Input
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => {
                    setAmountTouched(true);
                    setAmount(e.target.value.replace(/[^0-9.]/g, ""));
                  }}
                  onBlur={() => setAmountTouched(true)}
                  className={cn(
                    "h-11 rounded-xl border-[#e5ddd7] bg-white text-base font-bold",
                    amountError && "border-red-300",
                  )}
                  placeholder="Enter amount"
                />
                <FormFieldError message={amountError} />
              </div>
            ) : null}
            {fixed && amountError ? (
              <p className="mt-2">
                <FormFieldError message={amountError} />
              </p>
            ) : null}
          </div>

          <div>
            <p className="text-sm font-semibold text-[#777280]">Payment method</p>
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-[#ece6e1] bg-white px-3.5 py-3">
              <PhonePeMark />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#171722]">Pay securely with PhonePe</p>
                <p className="text-[11px] text-[#777280]">You&apos;ll be redirected to PhonePe to complete payment</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <Button
              onClick={pay}
              disabled={!valid || state.isLoading || fetchRangeState.isFetching}
              className="h-12 w-full rounded-xl text-base font-black text-white disabled:opacity-45"
              style={{ background: "var(--customer-primary, #730321)" }}
            >
              {state.isLoading ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                `Continue to pay ${payableDisplay}`
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-11 w-full rounded-xl font-bold text-[var(--customer-primary,#730321)] hover:bg-[#f6edf0]"
            >
              Cancel
            </Button>
          </div>

          <p className="flex items-center justify-center gap-1.5 pb-1 text-center text-[11px] text-[#8a8490]">
            <Check className="size-3.5 text-emerald-600" strokeWidth={3} />
            256-bit secure payment
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
