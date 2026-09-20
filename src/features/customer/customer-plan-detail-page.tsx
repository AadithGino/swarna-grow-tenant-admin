"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  Coins,
  FileText,
  Gift,
  LoaderCircle,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnrolAmountControl } from "@/src/components/common/enrol-amount-control";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import {
  useEnrolCustomerSchemeMutation,
  useGetCustomerPlanQuery,
  useGetCustomerProfileQuery,
  useInitiatePublicPaymentLinkMutation,
} from "@/src/store/api/customer-api";
import { customerPath } from "@/src/lib/customer-tenant";
import { validateEnrolAmountRupee } from "@/src/lib/customer-plan-adapter";
import {
  customerPlanEnrolRules,
  defaultCustomerEnrolAmountRupee,
} from "@/src/lib/customer-enrol-plan";
import {
  amountFieldLocked,
  amountUsesSlabs,
  resolvedFirstInstallmentMode,
} from "@/src/lib/enrol-plan-rules";
import { openCustomerPaymentTarget } from "@/src/lib/customer-payment-redirect";
import { useCustomerKycEnabled } from "@/src/lib/customer-kyc-enabled";
import { money } from "@/src/lib/format";
import { cn } from "@/lib/utils";
import { CUSTOMER_MOBILE_NAV_DOCK } from "@/src/features/customer/customer-scheme-detail-views";
import { toast } from "sonner";

type ExpandSection = "benefit" | "rules" | "terms" | null;

function nextCyclePayDateLabel() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function payoutLabel(benefitType?: string, valueBasisLabel?: string) {
  if (benefitType === "GOLD_BENEFIT" || /gold/i.test(valueBasisLabel ?? "")) {
    return "Gold-linked";
  }
  return valueBasisLabel || "Jewellery benefit";
}

function contributionStat(plan: { model: string; amountSummary: string; contributionDetail?: string }, amountRupee?: number) {
  if (plan.model === "FIXED" && amountRupee != null && amountRupee > 0) {
    return `${money(amountRupee)}/month`;
  }
  return plan.contributionDetail ?? plan.amountSummary;
}

function PlanDetailTopBar({ tenantSlug }: { tenantSlug: string | null }) {
  return (
    <header className="mb-5 flex items-center justify-between gap-3">
      <Link
        href={customerPath(tenantSlug, "plans")}
        className="grid size-10 place-items-center rounded-full text-[#171722] transition hover:bg-[#f6f2ee]"
        aria-label="Back to plans"
      >
        <ArrowLeft className="size-5" strokeWidth={2.25} />
      </Link>
      <h1 className="text-base font-black text-[#171722]">Plan details</h1>
      <Link
        href={customerPath(tenantSlug, "support")}
        className="grid size-10 place-items-center rounded-full text-[#171722] transition hover:bg-[#f6f2ee]"
        aria-label="Help"
      >
        <CircleHelp className="size-5" strokeWidth={2} />
      </Link>
    </header>
  );
}

function DetailLinkRow({
  icon: Icon,
  label,
  open,
  onToggle,
  children,
}: {
  icon: typeof Gift;
  label: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-[#ece6e1] last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 py-3.5 text-left text-sm font-semibold text-[#171722]"
      >
        <Icon className="size-5 shrink-0 text-[var(--customer-accent,#8b5f08)]" strokeWidth={2} />
        <span className="flex-1">{label}</span>
        <ChevronRight className={cn("size-4 text-[#b0a9b3] transition", open && "rotate-90")} />
      </button>
      {open ? <div className="pb-4 pl-8 pr-2 text-xs leading-relaxed text-[#706b77]">{children}</div> : null}
    </div>
  );
}

function FirstInstalmentTiles({
  payNow,
  onPayNowChange,
  amountRupee,
  nextDateLabel,
  disabled,
  payNowLocked,
  startNextLocked,
}: {
  payNow: boolean;
  onPayNowChange: (payNow: boolean) => void;
  amountRupee: number;
  nextDateLabel: string;
  disabled?: boolean;
  payNowLocked?: boolean;
  startNextLocked?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {!startNextLocked ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onPayNowChange(true)}
          className={cn(
            "rounded-xl border-2 p-3.5 text-left transition",
            payNow ? "border-[var(--customer-primary,#730321)] bg-[#fffafb]" : "border-[#e5ddd7] bg-white",
            (disabled || payNowLocked) && "opacity-60",
          )}
        >
          <span
            className={cn(
              "mb-2 inline-flex size-4 rounded-full border-2",
              payNow
                ? "border-[var(--customer-primary,#730321)] bg-[var(--customer-primary,#730321)] shadow-[inset_0_0_0_3px_white]"
                : "border-[#c8c0bb]",
            )}
          />
          <p className="text-sm font-bold text-[#171722]">Pay now</p>
          <p className="mt-0.5 text-[11px] leading-snug text-[#777280]">Pay {money(amountRupee)} today</p>
        </button>
      ) : null}
      {!payNowLocked ? (
        <button
          type="button"
          disabled={disabled || startNextLocked}
          onClick={() => onPayNowChange(false)}
          className={cn(
            "rounded-xl border-2 p-3.5 text-left transition",
            !payNow ? "border-[var(--customer-primary,#730321)] bg-[#fffafb]" : "border-[#e5ddd7] bg-white",
            (disabled || startNextLocked) && "opacity-60",
            startNextLocked && "hidden",
          )}
        >
          <span
            className={cn(
              "mb-2 inline-flex size-4 rounded-full border-2",
              !payNow
                ? "border-[var(--customer-primary,#730321)] bg-[var(--customer-primary,#730321)] shadow-[inset_0_0_0_3px_white]"
                : "border-[#c8c0bb]",
            )}
          />
          <p className="text-sm font-bold text-[#171722]">Start next cycle</p>
          <p className="mt-0.5 text-[11px] leading-snug text-[#777280]">Pay on {nextDateLabel}</p>
        </button>
      ) : null}
    </div>
  );
}

export function CustomerPlanDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { tenantSlug } = useCustomerTenant();
  const kycEnabled = useCustomerKycEnabled();
  const { data: profile } = useGetCustomerProfileQuery();
  const { data: plan, isLoading, isError, refetch } = useGetCustomerPlanQuery(id);
  const enrolRules = useMemo(() => (plan ? customerPlanEnrolRules(plan) : undefined), [plan]);
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [payNow, setPayNow] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [expanded, setExpanded] = useState<ExpandSection>(null);
  const [enrol, enrolState] = useEnrolCustomerSchemeMutation();
  const [initiatePublicLink] = useInitiatePublicPaymentLinkMutation();

  useEffect(() => {
    if (!plan) return;
    const rules = customerPlanEnrolRules(plan);
    if (amountFieldLocked(rules) || amountUsesSlabs(rules)) {
      setAmount((prev) => (prev == null ? defaultCustomerEnrolAmountRupee(plan) : prev));
    } else {
      setAmount(undefined);
    }
    const collectNow = plan.firstInstallmentRequired !== false;
    setPayNow(collectNow);
  }, [plan?.id, plan?.firstInstallmentRequired]);

  if (isLoading || !plan) return <PageSkeleton cards={3} />;
  if (isError) return <QueryError onRetry={refetch} />;

  const contributionText = plan.contributionDetail ?? plan.amountSummary;
  const benefitText = plan.benefitSummary || "Benefit follows plan rules shown at enrolment";
  const presetAmount = amountFieldLocked(enrolRules) || amountUsesSlabs(enrolRules);
  const amountValue = presetAmount ? (amount ?? defaultCustomerEnrolAmountRupee(plan)) : amount;
  const amountError = amountValue != null ? validateEnrolAmountRupee(plan, amountValue) : "Enter a valid amount";
  const hasValidAmount = amountValue != null && !amountError;
  const hardBlocked = !plan.canEnrol;
  const firstMode = resolvedFirstInstallmentMode(enrolRules, payNow ? "COLLECT_NOW" : "START_NEXT_CYCLE");
  const showPayNowToggle = plan.firstInstallmentModeEditable !== false;
  const payNowLocked =
    plan.firstInstallmentModeEditable === false && plan.firstInstallmentModeDefault === "COLLECT_NOW";
  const payNowHidden =
    plan.firstInstallmentModeEditable === false && plan.firstInstallmentModeDefault === "START_NEXT_CYCLE";
  const effectivePayNow = payNowHidden ? false : firstMode === "COLLECT_NOW";
  const showInstalmentTiles =
    amountValue != null &&
    amountValue > 0 &&
    showPayNowToggle &&
    !payNowLocked &&
    !payNowHidden;
  const termsParagraphs = plan.termsText
    ? plan.termsText.split(/\n+/).map((line) => line.replace(/^\d+\.\s*/, "").trim()).filter(Boolean)
    : [];
  const kycVerified = kycEnabled && profile?.kyc?.status === "VERIFIED";
  const lockedContribution = amountFieldLocked(enrolRules);
  const nextDateLabel = nextCyclePayDateLabel();
  const modelBadge = plan.model === "FLEXIBLE" ? "FLEXIBLE" : "FIXED";

  const submit = async () => {
    if (hardBlocked) {
      return toast.error(plan.blockedReason ?? "You cannot enrol in this plan right now");
    }
    if (!agreed) return toast.error("Please agree to the plan terms to continue");
    if (!hasValidAmount || amountValue == null) {
      return toast.error(amountError ?? "Enter a valid amount");
    }
    try {
      const statusRedirectUrl = customerPath(tenantSlug, "pay", "status");
      const statusRedirectFull = `${window.location.origin}${statusRedirectUrl}`;
      const result = await enrol({
        planId: plan.id,
        installmentAmountPaise: Math.round(amountValue * 100),
        payNow: effectivePayNow,
        redirectUrl: statusRedirectFull,
      }).unwrap();
      toast.success("Your scheme has been created");
      if (!effectivePayNow) {
        router.push(customerPath(tenantSlug, "schemes"));
        return;
      }
      const paymentLink = result.paymentLink as Record<string, unknown> | undefined;
      const paymentIntent = result.paymentIntent as Record<string, unknown> | undefined;
      const schemeId =
        typeof (result.scheme as { id?: string } | undefined)?.id === "string"
          ? (result.scheme as { id: string }).id
          : undefined;
      await openCustomerPaymentTarget(
        {
          ...paymentLink,
          ...paymentIntent,
          paymentUrl: paymentIntent?.paymentUrl,
          gatewayUrl: paymentLink?.gatewayUrl,
          token: paymentLink?.token,
        },
        {
          tenantSlug,
          statusRedirectUrl,
          schemeId,
          initiateLink: async (linkToken) =>
            initiatePublicLink({ linkToken, redirectUrl: statusRedirectFull }).unwrap(),
          navigate: (path) => router.push(path),
        },
      );
    } catch {
      toast.error("We couldn’t create the scheme");
    }
  };

  const enrolCtaLabel = enrolState.isLoading
    ? null
    : effectivePayNow && hasValidAmount && amountValue != null
      ? `Enrol & pay ${money(amountValue)}`
      : "Enrol & create scheme";

  const submitDisabled =
    enrolState.isLoading || !hasValidAmount || hardBlocked || !agreed;

  const submitHint = (() => {
    if (enrolState.isLoading || hardBlocked) return null;
    if (!agreed) return "Tick the box above to accept plan terms and enable enrolment.";
    if (!hasValidAmount) return amountError ?? "Enter a valid contribution amount.";
    return null;
  })();

  return (
    <div
      className="mx-auto max-w-lg"
      style={{ paddingBottom: `calc(${CUSTOMER_MOBILE_NAV_DOCK} + 12.5rem + env(safe-area-inset-bottom, 0px))` }}
    >
      <PlanDetailTopBar tenantSlug={tenantSlug} />

      <section className="customer-surface p-5">
        <span className="inline-flex rounded-md bg-[#f6edf0] px-2.5 py-1 text-[0.62rem] font-extrabold tracking-[0.12em] text-[var(--customer-primary,#730321)]">
          {modelBadge}
        </span>
        <h2 className="mt-3 text-xl font-black tracking-[-.02em] text-[#171722]">{plan.name}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#706b77]">
          {plan.tagline ||
            `Save for ${plan.durationMonths} months. Enjoy jewellery benefits at maturity.`}
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-[#faf6f3] px-2 py-3">
            <CalendarDays className="mx-auto size-5 text-[var(--customer-accent,#8b5f08)]" strokeWidth={2} />
            <p className="mt-2 text-xs font-bold text-[#171722]">{plan.durationMonths} months</p>
            <p className="text-[10px] text-[#8a8490]">Duration</p>
          </div>
          <div className="rounded-xl bg-[#faf6f3] px-2 py-3">
            <Coins className="mx-auto size-5 text-[var(--customer-accent,#8b5f08)]" strokeWidth={2} />
            <p className="mt-2 text-xs font-bold leading-tight text-[#171722]">
              {contributionStat(plan, amountValue ?? undefined)}
            </p>
            <p className="text-[10px] text-[#8a8490]">Contribution</p>
          </div>
          <div className="rounded-xl bg-[#faf6f3] px-2 py-3">
            <Gift className="mx-auto size-5 text-[var(--customer-accent,#8b5f08)]" strokeWidth={2} />
            <p className="mt-2 text-xs font-bold text-[#171722]">{payoutLabel(plan.benefitType, plan.valueBasisLabel)}</p>
            <p className="text-[10px] text-[#8a8490]">Payout</p>
          </div>
        </div>
      </section>

      <section className="customer-surface mt-4 p-5">
        <p className="text-sm font-bold text-[#171722]">Choose your contribution</p>
        <div className="mt-3 [&_label]:sr-only">
          <EnrolAmountControl
            plan={enrolRules}
            amount={amountValue}
            onAmountChange={setAmount}
            invalid={amountValue != null && Boolean(amountError)}
          />
        </div>
        {lockedContribution ? (
          <p className="mt-2 text-xs text-[#777280]">This plan has a fixed monthly contribution.</p>
        ) : null}
        {!hasValidAmount && amountValue != null && amountError ? (
          <p className="mt-2 text-xs text-red-700">{amountError}</p>
        ) : null}

        {showInstalmentTiles ? (
          <div className="mt-6">
            <p className="text-sm font-bold text-[#171722]">First instalment selection</p>
            <div className="mt-3">
              <FirstInstalmentTiles
                payNow={payNow}
                onPayNowChange={setPayNow}
                amountRupee={amountValue}
                nextDateLabel={nextDateLabel}
                disabled={hardBlocked}
                payNowLocked={payNowLocked}
                startNextLocked={payNowHidden}
              />
            </div>
          </div>
        ) : payNowHidden ? (
          <p className="mt-5 rounded-xl bg-[#faf6f3] px-3 py-2.5 text-xs leading-relaxed text-[#706b77]">
            Your first contribution is scheduled from the next billing cycle.
          </p>
        ) : null}
      </section>

      <section className="customer-surface mt-4 px-5 py-1">
        <DetailLinkRow
          icon={Gift}
          label="Maturity benefit"
          open={expanded === "benefit"}
          onToggle={() => setExpanded((s) => (s === "benefit" ? null : "benefit"))}
        >
          <p className="font-semibold text-[#171722]">{benefitText}</p>
          {plan.flexibleSummary?.explainer ? <p className="mt-2">{plan.flexibleSummary.explainer}</p> : null}
        </DetailLinkRow>
        <DetailLinkRow
          icon={FileText}
          label="Plan rules"
          open={expanded === "rules"}
          onToggle={() => setExpanded((s) => (s === "rules" ? null : "rules"))}
        >
          {plan.rules.length > 0 ? (
            <ul className="list-disc space-y-1.5 pl-4">
              {plan.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          ) : (
            <p>{contributionText}</p>
          )}
        </DetailLinkRow>
        <DetailLinkRow
          icon={Shield}
          label="Terms & conditions"
          open={expanded === "terms"}
          onToggle={() => setExpanded((s) => (s === "terms" ? null : "terms"))}
        >
          {termsParagraphs.length > 0 ? (
            <ul className="space-y-2">
              {termsParagraphs.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p>
              Enrolment is governed by your jeweller&apos;s scheme terms, benefit eligibility, and contractual maturity
              rules. Contact your branch for the full policy document.
            </p>
          )}
        </DetailLinkRow>
      </section>

      {hardBlocked && plan.blockedReason ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {plan.blockedReason}
        </p>
      ) : null}

      <div
        className="fixed inset-x-0 z-30 border-t border-[#ece6e1] bg-[#fffcfa]/98 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(23,23,34,0.06)] backdrop-blur-sm"
        style={{ bottom: `calc(${CUSTOMER_MOBILE_NAV_DOCK} + env(safe-area-inset-bottom, 0px))` }}
      >
        <div className="mx-auto max-w-lg space-y-3">
          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-xs leading-relaxed transition",
              agreed
                ? "border-[rgba(var(--customer-primary-rgb,115,3,33),0.35)] bg-white"
                : "border-[#e5ddd7] bg-[#faf6f3]",
              hardBlocked && "pointer-events-none opacity-60",
            )}
          >
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              disabled={hardBlocked}
              className="mt-0.5 size-[1.125rem] shrink-0 accent-[var(--customer-primary,#730321)]"
            />
            <span className="font-medium text-[#171722]">
              I agree to the plan terms and consent to enrolment
            </span>
          </label>
          {kycVerified ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
              <ShieldCheck className="size-3.5" strokeWidth={2.25} />
              KYC verified
            </span>
          ) : null}
          {submitHint ? (
            <p className="text-center text-[11px] leading-snug text-[#706b77]" role="status">
              {submitHint}
            </p>
          ) : null}
          <Button
            onClick={submit}
            disabled={submitDisabled}
            className="h-12 w-full rounded-xl text-base font-black text-white disabled:opacity-45"
            style={{ background: "var(--customer-primary, #730321)" }}
          >
            {enrolState.isLoading ? <LoaderCircle className="animate-spin" /> : enrolCtaLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
