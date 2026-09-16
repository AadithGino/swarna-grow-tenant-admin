"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SchemeModePill, SchemeProgressRing, SchemeProgressVisual } from "@/src/components/customer/customer-ui";
import { downloadCustomerPaymentReceipt } from "@/src/lib/customer-receipt";
import type { CustomerPlanRulesSection } from "@/src/types/customer";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import {
  useGetCustomerSchemeQuery,
  useInitiateCustomerPaymentMutation,
  useInitiatePublicPaymentLinkMutation,
  useRequestCustomerRedemptionMutation,
} from "@/src/store/api/customer-api";
import { openCustomerPaymentTarget } from "@/src/lib/customer-payment-redirect";
import type { CustomerSchemeDetail } from "@/src/types/customer";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isGoldWeightScheme, useCustomerGoldMetricsVisible } from "@/src/lib/customer-gold-ui";

function RulesBlock({ section }: { section: CustomerPlanRulesSection }) {
  return (
    <div className="rounded-2xl border bg-[#fbf7f4] p-4">
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
  const range = scheme.payableRange;
  const fixed = scheme.displayMode === "FIXED";
  const suggestedPaise = range?.suggested?.amountPaise ?? range?.maxPayable?.amountPaise ?? scheme.nextActionAmount?.amountPaise ?? 0;
  const [amount, setAmount] = useState(String(suggestedPaise / 100));
  const [initiate, state] = useInitiateCustomerPaymentMutation();
  const [initiatePublicLink] = useInitiatePublicPaymentLinkMutation();
  const amountPaise = Math.round(Number(amount || 0) * 100);
  const minPaise = range?.minPayable?.amountPaise ?? amountPaise;
  const maxPaise = range?.maxPayable?.amountPaise ?? amountPaise;
  const step = range?.multipleOfPaise ?? 1;
  const valid =
    !!range &&
    amountPaise >= minPaise &&
    amountPaise <= maxPaise &&
    (step <= 1 || amountPaise % step === 0);

  useEffect(() => {
    if (open) setAmount(String(suggestedPaise / 100));
  }, [open, suggestedPaise]);

  const pay = async () => {
    if (!valid || !range) {
      return toast.error(
        range
          ? `Enter an amount between ${range.minPayable.amountDisplay} and ${range.maxPayable.amountDisplay}`
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
      }).unwrap();
      onOpenChange(false);
      await openCustomerPaymentTarget(response, {
        tenantSlug,
        statusRedirectUrl,
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
            <DialogDescription>{fixed ? "Your fixed monthly instalment" : range?.helperText ?? scheme.helperText}</DialogDescription>
          </DialogHeader>
          <div className="mt-5">
            <label className="text-xs font-bold text-muted-foreground">Amount</label>
            <div className="mt-2 flex h-14 items-center rounded-xl border bg-white px-4 focus-within:ring-2 focus-within:ring-[#9c5869]">
              <IndianRupee className="size-5" />
              <Input
                disabled={fixed}
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                className="h-full border-0 text-xl font-black shadow-none focus-visible:ring-0"
              />
            </div>
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
          <Button onClick={pay} disabled={!valid || state.isLoading} className="mt-5 h-12 w-full rounded-xl bg-[#5f259f] text-base font-black hover:bg-[#4e1d82]">
            {state.isLoading ? <LoaderCircle className="animate-spin" /> : <>Continue to PhonePe<ChevronRight className="ml-auto" /></>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CustomerSchemeDetailPage({ id }: { id: string }) {
  const { tenantSlug } = useCustomerTenant();
  const { data: scheme, isLoading, isError, refetch } = useGetCustomerSchemeQuery(id);
  const [payOpen, setPayOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [requestRedemption, redemptionState] = useRequestCustomerRedemptionMutation();
  const { visible: showGoldMetrics } = useCustomerGoldMetricsVisible();

  if (isLoading || !scheme) return <PageSkeleton cards={3} />;
  if (isError) return <QueryError onRetry={refetch} />;

  const totalPaid = scheme.totalPaid ?? { amountPaise: 0, amountDisplay: "₹0" };
  const header = scheme.header ?? { eyebrow: "", title: scheme.planName, description: scheme.subtitle ?? "" };
  const payButton = scheme.payButton ?? { visible: scheme.canPay, enabled: scheme.canPay, label: "Pay" };
  const passbook = scheme.passbookSummary ?? { totalEntries: scheme.payments?.length ?? 0, lastPaymentAt: "", totalPaid };
  const redemption = scheme.redemption ?? { eligible: false, status: "NOT_ELIGIBLE", preferredModes: [] as string[] };
  const schemeIsGold = isGoldWeightScheme(scheme.valueBasis);
  const statCards = (scheme.statCards ?? []).filter(
    (card) => (showGoldMetrics && schemeIsGold) || !/gold/i.test(card.label),
  );
  const payments = scheme.payments ?? [];
  const maturityBenefit = scheme.maturityBenefit ?? {
    title: scheme.benefitLabel || "Maturity benefit",
    summary: scheme.benefitLabel || "",
    details: [] as string[],
    eligibility: [] as string[],
  };
  const planRuleSections = scheme.planRules?.sections ?? [];

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
      await requestRedemption({
        schemeId: scheme.id,
        preferredMode: "JEWELLERY_PURCHASE",
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
      <section className="relative overflow-hidden rounded-[1.6rem] bg-[#4b0a18] p-5 text-white shadow-lg sm:p-7">
        <div className="absolute -right-16 -top-24 size-72 rounded-full bg-[#84253a] blur-2xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <SchemeModePill mode={scheme.displayMode} />
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-200">{scheme.statusLabel}</span>
          </div>
          <p className="mt-5 text-xs font-bold tracking-[.16em] text-[#e9c35d]">{header.eyebrow}</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">{header.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">{header.description}</p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {scheme.passbookNumber ? (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/50">Passbook</p>
                <p className="mt-1 font-bold text-[#e9c35d]">{scheme.passbookNumber}</p>
              </div>
            ) : null}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/50">Enrolment</p>
              <p className="mt-1 font-bold">{scheme.schemeNumber}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/50">Saved</p>
              <p className="mt-1 font-bold">{totalPaid.amountDisplay}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/50">Maturity</p>
              <p className="mt-1 font-bold">
                {scheme.maturityDate
                  ? new Date(scheme.maturityDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/50">Phase</p>
              <p className="mt-1 text-sm font-bold leading-snug">{scheme.progressLabel ?? scheme.statusLabel}</p>
            </div>
          </div>
        </div>
      </section>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
        <section className="rounded-[1.4rem] border bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-black">Scheme progress</h2>
              {scheme.progressDetail ? (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{scheme.progressDetail}</p>
              ) : null}
            </div>
            <SchemeProgressRing percent={scheme.progressPercent ?? 0} size={72} />
          </div>
          <SchemeProgressVisual scheme={scheme} />
        </section>
        <section className="rounded-[1.4rem] border border-[#e3ce94] bg-[#fffaf0] p-5 shadow-sm sm:p-6">
          <p className="text-[11px] font-black uppercase tracking-[.15em] text-[#906818]">Next action</p>
          <h2 className="mt-2 text-xl font-black">{scheme.nextActionLabel ?? "View details"}</h2>
          {scheme.nextActionAmount?.amountDisplay && (
            <p className="mt-1 text-3xl font-black text-[#730321]">{scheme.nextActionAmount.amountDisplay}</p>
          )}
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{scheme.helperText}</p>
          {payButton.visible !== false && (
            <Button disabled={!payButton.enabled} onClick={() => setPayOpen(true)} className="mt-5 h-12 w-full rounded-xl bg-[#730321] font-black">
              {payButton.label ?? "Pay"}
            </Button>
          )}
        </section>
      </div>
      {statCards.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-2xl border bg-white p-4 shadow-sm">
              <p className="text-[11px] font-semibold text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-lg font-black">{card.value}</p>
              {card.caption && <p className="mt-1 text-[10px] text-muted-foreground">{card.caption}</p>}
            </div>
          ))}
        </div>
      )}
      <Tabs defaultValue="passbook" className="mt-6">
        <TabsList className="w-full justify-start overflow-x-auto rounded-xl bg-[#eee8e5] p-1">
          <TabsTrigger value="passbook">Passbook</TabsTrigger>
          <TabsTrigger value="benefit">Maturity benefit</TabsTrigger>
          <TabsTrigger value="rules">Plan rules</TabsTrigger>
        </TabsList>
        <TabsContent value="passbook" className="mt-4 rounded-[1.4rem] border bg-white p-5 shadow-sm">
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
          <section className="rounded-[1.4rem] border bg-white p-5 shadow-sm sm:p-6">
            <div className="flex gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#fff2ce] text-[#946b17]">
                <Gem className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#9b7224]">At maturity</p>
                <h2 className="mt-1 text-xl font-black">{maturityBenefit.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Benefits are calculated and confirmed only on contractual maturity.
                  {showGoldMetrics && schemeIsGold
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
            <section className="rounded-[1.4rem] border bg-white p-5 shadow-sm">
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
            <div className="rounded-2xl border border-[#ead49a] bg-[#fff9e9] p-4 text-sm">
              <p className="font-black text-[#6d551e]">Current payment window</p>
              <p className="mt-1 text-muted-foreground">
                {scheme.payableRange.minPayable.amountDisplay} – {scheme.payableRange.maxPayable.amountDisplay}
                {scheme.payableRange.cycleCap
                  ? ` · Cycle cap ${scheme.payableRange.cycleCap.amountDisplay}`
                  : ""}
              </p>
            </div>
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
          <Button disabled={redemptionState.isLoading} onClick={redeem} className="bg-[#730321]">
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
  const { tenantSlug } = useCustomerTenant();
  const [stage, setStage] = useState<"PROCESSING" | "PAID">("PROCESSING");
  useEffect(() => {
    const timer = window.setTimeout(() => setStage("PAID"), 1800);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div className="grid min-h-[70vh] place-items-center">
      <section className="w-full max-w-md rounded-[1.6rem] border bg-white p-7 text-center shadow-xl">
        <span className={cn("mx-auto grid size-16 place-items-center rounded-full", stage === "PAID" ? "bg-emerald-50 text-emerald-700" : "bg-[#f3eafb] text-[#5f259f]")}>
          {stage === "PAID" ? <CheckCircle2 className="size-8" /> : <LoaderCircle className="size-8 animate-spin" />}
        </span>
        <h1 className="mt-5 text-2xl font-black">{stage === "PAID" ? "Payment successful" : "Confirming your payment"}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {stage === "PAID" ? "Your contribution is safely recorded in the passbook." : "PhonePe is confirming the transaction. Please don’t close this page."}
        </p>
        {stage === "PAID" && (
          <Button onClick={() => router.replace(customerPath(tenantSlug, "schemes"))} className="mt-5 w-full bg-[#730321]">
            Back to schemes
          </Button>
        )}
      </section>
    </div>
  );
}
