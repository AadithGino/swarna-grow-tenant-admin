"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Download,
  Gem,
  IndianRupee,
  LoaderCircle,
  LockKeyhole,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCustomerDate, SchemeModePill, SchemeProgressVisual } from "@/src/components/customer/customer-ui";
import { downloadCustomerPaymentReceipt } from "@/src/lib/customer-receipt";
import type { CustomerPlanRulesSection } from "@/src/types/customer";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import {
  customerApi,
  useGetCustomerSchemeQuery,
  useInitiateCustomerPaymentMutation,
  useInitiatePublicPaymentLinkMutation,
  useLazyGetCustomerPayableRangeQuery,
  useLazyPollCustomerPaymentIntentQuery,
  useLazyPollPublicPaymentLinkQuery,
  useRequestCustomerRedemptionMutation,
} from "@/src/store/api/customer-api";
import { useDispatch } from "react-redux";
import { clearCustomerPaymentSession, readCustomerPaymentSession } from "@/src/lib/customer-payment-session";
import { openCustomerPaymentTarget } from "@/src/lib/customer-payment-redirect";
import type { CustomerSchemeDetail } from "@/src/types/customer";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { useCustomerPortalCapabilities } from "@/src/lib/customer-portal-capabilities";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isGoldWeightScheme } from "@/src/lib/customer-gold-ui";
import { formatGoldPurchaseDate, paymentHasGoldAccrual } from "@/src/lib/gold-payment-display";
import { CustomerPayableSummary } from "@/src/components/customer/customer-payable-summary";
import { FormFieldError } from "@/src/components/common/form-field-error";
import {
  livePayableAmountError,
  paymentAmountReady,
  payableAmountRangeMessage,
} from "@/src/lib/payment-form-validation";
import { payableQuoteBounds } from "@/src/lib/customer-payable-display";

function RulesBlock({ section }: { section: CustomerPlanRulesSection }) {
  return (
    <div className="customer-surface p-5">
      <h3 className="text-sm font-black text-[#730321]">{section.title}</h3>
      <ul className="mt-3 space-y-2">
        {section.items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#d5a52e]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PhonePePaymentDialog({ scheme, open, onOpenChange }: { scheme: CustomerSchemeDetail; open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const { tenantSlug } = useCustomerTenant();
  const initialRange = scheme.payableRange;
  const [range, setRange] = useState(initialRange);
  const [targetCycle, setTargetCycle] = useState(initialRange?.targetCycle ?? "");
  const [fetchRange, fetchRangeState] = useLazyGetCustomerPayableRangeQuery();
  const fixed = scheme.displayMode === "FIXED";
  const suggestedPaise = range?.suggested?.amountPaise ?? range?.maxPayable?.amountPaise ?? scheme.nextActionAmount?.amountPaise ?? 0;
  const [amount, setAmount] = useState(String(suggestedPaise / 100));
  const [amountTouched, setAmountTouched] = useState(false);
  const [initiate, state] = useInitiateCustomerPaymentMutation();
  const [initiatePublicLink] = useInitiatePublicPaymentLinkMutation();
  const amountPaise = Math.round(Number(amount || 0) * 100);
  const quoteBounds = payableQuoteBounds(range);
  const numericAmount = amount === "" ? "" : Number(amount);
  const amountError =
    amountTouched || amount !== ""
      ? livePayableAmountError(numericAmount, quoteBounds)
      : undefined;
  const valid = !!range && paymentAmountReady(numericAmount, quoteBounds);

  useEffect(() => {
    if (!open) {
      setAmountTouched(false);
      return;
    }
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

  const cycleOptions = useMemo(
    () => range?.targetCycleOptions ?? [],
    [range?.targetCycleOptions],
  );

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
      onOpenChange(false);
      await openCustomerPaymentTarget(response, {
        tenantSlug,
        statusRedirectUrl,
        schemeId: scheme.id,
        initiateLink: async (linkToken) =>
          initiatePublicLink({ linkToken, redirectUrl: statusRedirectFull }).unwrap(),
        navigate: (path) => router.push(path),
      });
    } catch {
      toast.error("PhonePe could not be started. Your account was not charged.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden rounded-3xl p-0">
        <div className="bg-[#5f259f] p-5 text-white">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-white font-black text-[#5f259f]">पे</span>
            <div>
              <p className="font-black">Pay securely with PhonePe</p>
              <p className="text-xs text-white/70">Encrypted gateway checkout</p>
            </div>
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle>{scheme.planName}</DialogTitle>
            <DialogDescription>
              {fixed
                ? range?.helperText || "Your fixed monthly instalment"
                : range?.helperText ?? scheme.helperText}
            </DialogDescription>
          </DialogHeader>
          {range ? (
            <div className="mt-4">
              <CustomerPayableSummary range={range} displayMode={scheme.displayMode} compact />
            </div>
          ) : fetchRangeState.isFetching ? (
            <p className="mt-4 text-xs text-muted-foreground">Loading payment limits…</p>
          ) : null}
          {range?.allowFutureCycleSelection && cycleOptions.length > 1 ? (
            <div className="mt-4">
              <label className="text-xs font-bold text-muted-foreground">Contribution cycle</label>
              <Select value={targetCycle} onValueChange={setTargetCycle} disabled={fetchRangeState.isFetching}>
                <SelectTrigger className="mt-2 h-11 rounded-xl">
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
          <div className="mt-5">
            <label className="text-xs font-bold text-muted-foreground">Amount</label>
            {quoteBounds?.eligible ? (
              <p className="mt-1 text-[0.68rem] text-muted-foreground">
                {payableAmountRangeMessage(quoteBounds)}
              </p>
            ) : null}
            <div
              className={cn(
                "mt-2 flex h-14 items-center rounded-xl border bg-white px-4 focus-within:ring-2 focus-within:ring-[#9c5869]",
                amountError && "border-red-300",
              )}
            >
              <IndianRupee className="size-5" />
              <Input
                disabled={fixed}
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmountTouched(true);
                  setAmount(e.target.value.replace(/[^0-9.]/g, ""));
                }}
                onBlur={() => setAmountTouched(true)}
                className="h-full border-0 text-xl font-black shadow-none focus-visible:ring-0"
              />
            </div>
            <FormFieldError message={amountError} />
            {!fixed && range?.quickAmounts?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {range.quickAmounts.map((quick) => (
                  <button
                    type="button"
                    key={quick.amountPaise}
                    onClick={() => setAmount(String(quick.amountPaise / 100))}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-bold",
                      amountPaise === quick.amountPaise && "border-[#730321] bg-[#f7edef] text-[#730321]",
                    )}
                  >
                    {quick.amountDisplay}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="mt-5 rounded-2xl bg-[#faf6f3] p-4 text-xs leading-5 text-muted-foreground">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <ShieldCheck className="size-4 text-emerald-700" />
              Protected payment
            </div>
            <p className="mt-1">The amount is reserved before PhonePe opens. If payment fails or expires, the reservation is released automatically.</p>
          </div>
          <Button onClick={pay} disabled={!valid || state.isLoading || fetchRangeState.isFetching} className="mt-5 h-12 w-full rounded-xl bg-[#5f259f] text-base font-black hover:bg-[#4e1d82]">
            {state.isLoading ? <LoaderCircle className="animate-spin" /> : <>Continue to PhonePe<ChevronRight className="ml-auto" /></>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CustomerSchemeDetailPage({ id }: { id: string }) {
  const { tenantSlug } = useCustomerTenant();
  const { customerAppPaymentsEnabled } = useCustomerPortalCapabilities();
  const { data: scheme, isLoading, isError, refetch } = useGetCustomerSchemeQuery(id);
  const [payOpen, setPayOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redemptionMode, setRedemptionMode] = useState("");
  const [requestRedemption, redemptionState] = useRequestCustomerRedemptionMutation();
  const redemptionModeOptions = useMemo(() => {
    const preferred = scheme?.redemption?.preferredModes ?? [];
    return preferred.map((entry) =>
      typeof entry === "string" ? { mode: entry, label: entry.replaceAll("_", " ").toLowerCase() } : entry,
    );
  }, [scheme?.redemption?.preferredModes]);

  useEffect(() => {
    if (redemptionModeOptions.length && !redemptionMode) {
      setRedemptionMode(redemptionModeOptions[0].mode);
    }
  }, [redemptionModeOptions, redemptionMode]);

  if (isLoading || !scheme) return <PageSkeleton cards={3} />;
  if (isError) return <QueryError onRetry={refetch} />;

  const totalPaid = scheme.totalPaid ?? { amountPaise: 0, amountDisplay: "₹0" };
  const header = scheme.header ?? { eyebrow: "", title: scheme.planName, description: scheme.subtitle ?? "" };
  const payButtonRaw = scheme.payButton ?? { visible: scheme.canPay, enabled: scheme.canPay, label: "Pay" };
  const payButton = customerAppPaymentsEnabled
    ? payButtonRaw
    : {
        ...payButtonRaw,
        enabled: false,
        label: "Payments unavailable",
        helperText: "This jeweller has set the customer app to view-only or disabled online payments.",
      };
  const passbook = scheme.passbookSummary ?? { totalEntries: scheme.payments?.length ?? 0, lastPaymentAt: "", totalPaid };
  const redemption = scheme.redemption ?? { eligible: false, status: "NOT_ELIGIBLE", preferredModes: [] as Array<{ mode: string; label: string } | string> };
  const schemeIsGold = isGoldWeightScheme(scheme.valueBasis);
  const statCards = (scheme.statCards ?? []).filter((card) => schemeIsGold || !/gold/i.test(card.label));
  const payments = scheme.payments ?? [];
  const maturityBenefit = scheme.maturityBenefit ?? {
    title: scheme.benefitLabel || "Maturity benefit",
    summary: scheme.benefitLabel || "",
    details: [] as string[],
    eligibility: [] as string[],
  };
  const planRuleSections = scheme.planRules?.sections ?? [];
  const goldBalance = scheme.goldAccumulated ?? scheme.goldAccrued ?? scheme.progressCard.goldAccumulated ?? scheme.progressCard.goldAccrued;

  const downloadReceipt = async (payment: (typeof payments)[number]) => {
    if (!payment.receiptDownloadPath) {
      toast.error("Receipt is not available for this entry");
      return;
    }
    try {
      const name = payment.receiptNumber ? `${payment.receiptNumber}.pdf` : `receipt-${payment.id}.pdf`;
      await downloadCustomerPaymentReceipt(payment.receiptDownloadPath, name);
      toast.success("Receipt downloaded");
    } catch {
      toast.error("Could not download receipt. Try again.");
    }
  };

  const redeem = async () => {
    try {
      if (!redemptionMode) return toast.error("Choose how you would like to redeem");
      await requestRedemption({
        schemeId: scheme.id,
        preferredMode: redemptionMode,
        expectedVersion: scheme.version,
      }).unwrap();
      toast.success("Redemption request sent to your jewellery");
      setRedeemOpen(false);
    } catch {
      toast.error("Could not submit the request");
    }
  };

  return (
    <div>
      <Link href={customerPath(tenantSlug, "schemes")} className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-[#730321]">
        <ArrowLeft className="size-4" />
        Back to schemes
      </Link>
      <section className="customer-surface overflow-hidden p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><SchemeModePill mode={scheme.displayMode} /><span className="rounded-full bg-[#eaf9ef] px-3 py-1 text-[0.68rem] font-extrabold text-[#15934b]">{scheme.statusLabel}</span></div>
            <p className="mt-5 text-[0.72rem] font-extrabold uppercase tracking-[.17em] text-[#9a6b14]">{header.eyebrow}</p>
            <h1 className="mt-1 text-[1.9rem] font-black tracking-[-.04em] text-[#171722] sm:text-[2.35rem]">{scheme.planName}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#706b77]"><b className="text-[#292732]">{header.title}.</b> {header.description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-[#eadfda] bg-[#faf7f4] px-4 py-3"><span className="grid size-10 place-items-center rounded-full bg-[#fff0c8] text-[#8b5f08]"><CalendarDays className="size-5" /></span><div><p className="text-[0.68rem] text-[#77727c]">Contractual maturity</p><p className="mt-0.5 text-sm font-black">{formatCustomerDate(scheme.maturityDate)}</p></div></div>
        </div>
        <div className={`mt-6 grid gap-px overflow-hidden rounded-2xl border border-[#e9e1dc] bg-[#e9e1dc] ${schemeIsGold ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
          <div className="bg-[#fffefd] p-4 sm:p-5"><p className="text-[0.68rem] text-[#77727c]">Enrolment</p><p className="mt-1 text-sm font-black">{scheme.schemeNumber}</p>{scheme.passbookNumber ? <p className="mt-1 text-[0.68rem] text-[#77727c]">Passbook {scheme.passbookNumber}</p> : null}</div>
          {schemeIsGold && goldBalance ? (
            <>
              <div className="bg-[#fffefd] p-4 sm:p-5"><p className="text-[0.68rem] text-[#77727c]">Gold accumulated</p><p className="mt-1 text-xl font-black text-[#8b5f08]">{goldBalance.weightDisplay}</p></div>
              <div className="bg-[#fffefd] p-4 sm:p-5"><p className="text-[0.68rem] text-[#77727c]">Total contributed</p><p className="mt-1 text-xl font-black text-[#8b5f08]">{totalPaid.amountDisplay}</p></div>
            </>
          ) : (
            <div className="bg-[#fffefd] p-4 sm:p-5"><p className="text-[0.68rem] text-[#77727c]">Total saved</p><p className="mt-1 text-xl font-black text-[#8b5f08]">{totalPaid.amountDisplay}</p></div>
          )}
          <div className="bg-[#fffefd] p-4 sm:p-5"><p className="text-[0.68rem] text-[#77727c]">Current phase</p><p className="mt-1 text-sm font-black">{scheme.progressLabel ?? scheme.statusLabel}</p></div>
        </div>
      </section>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
        <section className="customer-surface p-5 sm:p-6">
          <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-[0.7rem] font-extrabold uppercase tracking-[.15em] text-[#996a15]">Your journey</p><h2 className="mt-1 text-xl font-black">Scheme progress</h2>{scheme.progressDetail ? <p className="mt-1 text-xs leading-relaxed text-[#77727c]">{scheme.progressDetail}</p> : null}</div><b className="text-2xl font-black text-[#730321]">{Math.round(scheme.progressPercent ?? 0)}%</b></div>
          <SchemeProgressVisual scheme={scheme} />
        </section>
        <section className="rounded-[1.35rem] border border-[#ead9ae] bg-[#fffaf0] p-5 shadow-[0_12px_34px_rgba(75,31,42,.045)] sm:p-6">
          <p className="text-[0.7rem] font-extrabold uppercase tracking-[.15em] text-[#906818]">Next action</p>
          <h2 className="mt-2 text-xl font-black">{scheme.nextActionLabel ?? "View details"}</h2>
          {scheme.nextActionAmount?.amountDisplay ? <p className="mt-1 text-3xl font-black tracking-tight text-[#730321]">{scheme.nextActionAmount.amountDisplay}</p> : null}
          {scheme.payableRange ? (
            <div className="mt-4">
              <CustomerPayableSummary
                range={scheme.payableRange}
                displayMode={scheme.displayMode}
                compact
              />
            </div>
          ) : null}
          <p className="mt-3 text-xs leading-5 text-[#706b77]">{scheme.helperText}</p>
          {payButton.visible !== false ? (
            <>
              <Button disabled={!payButton.enabled} onClick={() => setPayOpen(true)} className="mt-5 h-12 w-full rounded-xl bg-[#730321] font-black hover:bg-[#5b021a]">{payButton.label ?? "Pay"}</Button>
              {payButton.helperText ? (
                <p className="mt-2 text-center text-[0.68rem] leading-relaxed text-amber-800">{payButton.helperText}</p>
              ) : null}
            </>
          ) : null}
          <p className="mt-3 flex items-center justify-center gap-1 text-[0.68rem] text-[#77727c]"><ShieldCheck className="size-3.5" />Secure PhonePe checkout</p>
        </section>
      </div>
      {statCards.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {statCards.map((card) => (
            <div key={card.label} className="customer-surface p-4">
              <p className="text-[11px] font-semibold text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-lg font-black">{card.value}</p>
              {card.caption && <p className="mt-1 text-[10px] text-muted-foreground">{card.caption}</p>}
            </div>
          ))}
        </div>
      )}
      <Tabs defaultValue="passbook" className="mt-6">
        <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-2xl border border-[#e5ddd7] bg-white p-1.5 shadow-sm">
          <TabsTrigger value="passbook">Passbook</TabsTrigger>
          <TabsTrigger value="benefit">Maturity benefit</TabsTrigger>
          <TabsTrigger value="rules">Plan rules</TabsTrigger>
        </TabsList>
        <TabsContent value="passbook" className="customer-surface mt-4 p-5 sm:p-6">
          <div>
            <h2 className="font-black">Digital passbook</h2>
            <p className="text-xs text-muted-foreground">
              {passbook.totalEntries} verified entries · Total {passbook.totalPaid?.amountDisplay ?? totalPaid.amountDisplay}
            </p>
          </div>
          <div className="mt-4 divide-y">
            {payments.length ? (
              payments.map((payment) => (
                <div key={payment.id} className="flex flex-wrap items-center gap-3 py-4 sm:flex-nowrap">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                    <CheckCircle2 className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{payment.amount.amountDisplay}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {payment.channelLabel ?? payment.channel}
                      {payment.statusLabel && payment.status !== "SUCCESS" ? ` · ${payment.statusLabel}` : ""}
                      {payment.receiptNumber ? ` · ${payment.receiptNumber}` : ""}
                    </p>
                    {paymentHasGoldAccrual(payment) && payment.goldAccrual ? (
                      <p className="text-[10px] font-semibold text-[#8b5f08]">
                        {payment.goldAccrual.weightDisplay} at {payment.goldAccrual.ratePerGramDisplay}/g ·{" "}
                        {formatGoldPurchaseDate(payment.goldAccrual.purchasedAt ?? payment.paidAt)}
                      </p>
                    ) : null}
                    <p className="text-[10px] text-muted-foreground">
                      {payment.paidAt
                        ? new Date(payment.paidAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </p>
                  </div>
                  <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
                    <span className="text-xs font-bold text-emerald-700 sm:hidden">Received</span>
                    {payment.status === "SUCCESS" && payment.receiptDownloadPath ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="ml-auto rounded-xl"
                        onClick={() => downloadReceipt(payment)}
                      >
                        <Download className="size-4" />
                        Receipt
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">No passbook entries yet.</p>
            )}
          </div>
        </TabsContent>
        <TabsContent value="benefit" className="mt-4 space-y-4">
          <section className="customer-surface p-5 sm:p-6">
            <div className="flex gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#fff2ce] text-[#946b17]">
                <Gem className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#9b7224]">At maturity</p>
                <h2 className="mt-1 text-xl font-black">{maturityBenefit.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Benefits are calculated and confirmed only on contractual maturity.
                  {schemeIsGold
                    ? " Gold benefits use the published rate on or before the maturity date."
                    : " Your jeweller will confirm settlement when you redeem."}
                </p>
              </div>
            </div>
            {maturityBenefit.details.length > 0 && (
              <ul className="mt-5 space-y-2 rounded-2xl bg-[#fbf7f4] p-4 text-sm">
                {maturityBenefit.details.map((line) => (
                  <li key={line} className="flex gap-2 text-muted-foreground">
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-[#9a6f2a]" />
                    {line}
                  </li>
                ))}
              </ul>
            )}
            {maturityBenefit.eligibility.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-bold text-muted-foreground">Eligibility</p>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  {maturityBenefit.eligibility.map((line) => (
                    <li key={line} className="flex gap-2">
                      <ShieldCheck className="size-4 shrink-0 text-emerald-700" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-5">
              {redemption.eligible ? (
                <Button onClick={() => setRedeemOpen(true)} className="bg-[#730321]">
                  Request redemption
                </Button>
              ) : (
                <p className="inline-flex items-center gap-2 rounded-xl bg-[#faf6f3] px-3 py-2 text-xs">
                  <LockKeyhole className="size-4" />
                  {redemption.blocker ?? "Not eligible yet"}
                </p>
              )}
            </div>
          </section>
        </TabsContent>
        <TabsContent value="rules" className="mt-4 space-y-4">
          {planRuleSections.length ? (
            planRuleSections.map((section) => <RulesBlock key={section.title} section={section} />)
          ) : (
            <section className="customer-surface p-5">
              <ul className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <ShieldCheck className="size-5 text-emerald-700" />
                  Paid contributions never expire and stay in your immutable ledger.
                </li>
                <li className="flex gap-3">
                  <Scale className="size-5 text-[#9a6f2a]" />
                  Payment limits follow your current plan phase.
                </li>
              </ul>
            </section>
          )}
          {scheme.payableRange ? (
            <CustomerPayableSummary range={scheme.payableRange} displayMode={scheme.displayMode} />
          ) : null}
        </TabsContent>
      </Tabs>
      <PhonePePaymentDialog scheme={scheme} open={payOpen} onOpenChange={setPayOpen} />
      <Dialog open={redeemOpen} onOpenChange={setRedeemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request redemption</DialogTitle>
            <DialogDescription>
              This sends a servicing request. No financial ledger entry is created until the jewellery completes settlement.
            </DialogDescription>
          </DialogHeader>
          {redemptionModeOptions.length > 1 ? (
            <div className="mt-2">
              <label className="text-xs font-bold text-muted-foreground">Preferred settlement</label>
              <Select value={redemptionMode} onValueChange={setRedemptionMode}>
                <SelectTrigger className="mt-2 h-11 rounded-xl">
                  <SelectValue placeholder="Choose mode" />
                </SelectTrigger>
                <SelectContent>
                  {redemptionModeOptions.map((opt) => (
                    <SelectItem key={opt.mode} value={opt.mode}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : redemptionModeOptions.length === 1 ? (
            <p className="text-sm text-muted-foreground">Settlement: {redemptionModeOptions[0].label}</p>
          ) : null}
          <Button disabled={redemptionState.isLoading || !redemptionMode} onClick={redeem} className="mt-4 bg-[#730321]">
            Submit request
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Resolves `/pay/:token` (backend link path) into PhonePe checkout under `/customer/:slug/pay/:token`. */
export function CustomerPaymentLinkPage({ linkToken }: { linkToken: string }) {
  const router = useRouter();
  const { tenantSlug } = useCustomerTenant();
  const [initiatePublicLink] = useInitiatePublicPaymentLinkMutation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const statusRedirectUrl = customerPath(tenantSlug, "pay", "status");
        const statusRedirectFull = `${window.location.origin}${statusRedirectUrl}`;
        await openCustomerPaymentTarget(
          { token: linkToken, gatewayUrl: `/pay/${linkToken}` },
          {
            tenantSlug,
            statusRedirectUrl,
            session: { kind: "link", linkToken },
            initiateLink: async (token) =>
              initiatePublicLink({ linkToken: token, redirectUrl: statusRedirectFull }).unwrap(),
            navigate: (path) => router.replace(path),
          },
        );
      } catch {
        if (!cancelled) setError("Could not start payment. Go back and try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [linkToken, tenantSlug, initiatePublicLink, router]);

  if (error) {
    return (
      <div className="grid min-h-[50vh] place-items-center p-6 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button asChild className="mt-4 bg-[#730321]">
          <Link href={customerPath(tenantSlug, "schemes")}>Back to schemes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid min-h-[50vh] place-items-center">
      <LoaderCircle className="size-10 animate-spin text-[#730321]" />
    </div>
  );
}

export function CustomerPaymentStatusPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { tenantSlug } = useCustomerTenant();
  const [pollIntent] = useLazyPollCustomerPaymentIntentQuery();
  const [pollLink] = useLazyPollPublicPaymentLinkQuery();
  const [stage, setStage] = useState<"PROCESSING" | "PAID" | "FAILED" | "UNKNOWN">("PROCESSING");
  const [detail, setDetail] = useState<string>("PhonePe is confirming the transaction. Please don’t close this page.");
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const finish = (next: typeof stage, message: string, receipt?: string | null) => {
      if (cancelled) return;
      setStage(next);
      setDetail(message);
      if (receipt) setReceiptNumber(receipt);
      if (next === "PAID") {
        clearCustomerPaymentSession();
        dispatch(
          customerApi.util.invalidateTags(["CustomerScheme", "CustomerPayment", "CustomerHome"]),
        );
      }
    };

    const pollOnce = async (): Promise<boolean> => {
      const session = readCustomerPaymentSession();
      if (!session) {
        finish(
          "UNKNOWN",
          "We could not find an active payment session. If you completed payment, check your passbook in a minute.",
        );
        return true;
      }

      try {
        const result =
          session.kind === "intent" && session.intentId
            ? await pollIntent(session.intentId).unwrap()
            : session.linkToken
              ? await pollLink(session.linkToken).unwrap()
              : null;
        if (!result) {
          finish("UNKNOWN", "Payment status is unavailable. Please check your schemes list.");
          return true;
        }
        if (result.paid) {
          finish(
            "PAID",
            result.receipt?.receiptNumber
              ? `Receipt ${result.receipt.receiptNumber} is recorded in your passbook.`
              : "Your contribution is safely recorded in the passbook.",
            result.receipt?.receiptNumber ?? null,
          );
          return true;
        }
        if (result.failed || result.status === "EXPIRED" || result.status === "CANCELLED") {
          finish(
            "FAILED",
            result.status === "EXPIRED"
              ? "This payment session expired before PhonePe confirmed it. You can start a new payment."
              : "PhonePe reported that the payment did not complete. You were not charged.",
          );
          clearCustomerPaymentSession();
          return true;
        }
        const delayMs = Math.max(1500, (result.retryAfterSeconds ?? 3) * 1000);
        timer = window.setTimeout(() => {
          void pollOnce();
        }, delayMs);
        return false;
      } catch {
        finish("FAILED", "We could not confirm the payment status. Check your passbook or try again.");
        clearCustomerPaymentSession();
        return true;
      }
    };

    void pollOnce();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [dispatch, pollIntent, pollLink]);

  const schemeHref = customerPath(tenantSlug, "schemes");

  return (
    <div className="grid min-h-[70vh] place-items-center p-4">
      <section className="customer-surface w-full max-w-md p-7 text-center">
        <span
          className={cn(
            "mx-auto grid size-16 place-items-center rounded-full",
            stage === "PAID" && "bg-emerald-50 text-emerald-700",
            stage === "PROCESSING" && "bg-[#f3eafb] text-[#5f259f]",
            (stage === "FAILED" || stage === "UNKNOWN") && "bg-red-50 text-red-700",
          )}
        >
          {stage === "PAID" ? (
            <CheckCircle2 className="size-8" />
          ) : stage === "PROCESSING" ? (
            <LoaderCircle className="size-8 animate-spin" />
          ) : (
            <ShieldCheck className="size-8" />
          )}
        </span>
        <h1 className="mt-5 text-2xl font-black">
          {stage === "PAID"
            ? "Payment successful"
            : stage === "PROCESSING"
              ? "Confirming your payment"
              : stage === "FAILED"
                ? "Payment not completed"
                : "Payment status unknown"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
        {receiptNumber ? (
          <p className="mt-2 text-xs font-semibold text-emerald-800">Receipt {receiptNumber}</p>
        ) : null}
        {stage !== "PROCESSING" ? (
          <Button
            onClick={() => router.replace(schemeHref)}
            className="mt-5 w-full bg-[#730321]"
          >
            Back to schemes
          </Button>
        ) : null}
      </section>
    </div>
  );
}
