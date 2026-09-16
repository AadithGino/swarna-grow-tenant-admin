"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Gem, IndianRupee, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import {
  useEnrolCustomerSchemeMutation,
  useGetCustomerPlanQuery,
  useInitiatePublicPaymentLinkMutation,
} from "@/src/store/api/customer-api";
import { customerPath } from "@/src/lib/customer-tenant";
import {
  suggestedEnrolAmountRupee,
  validateEnrolAmountRupee,
} from "@/src/lib/customer-plan-adapter";
import { openCustomerPaymentTarget } from "@/src/lib/customer-payment-redirect";
import { toast } from "sonner";

export function CustomerPlanDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const { tenantSlug, tenant } = useCustomerTenant();
  const { data: plan, isLoading, isError, refetch } = useGetCustomerPlanQuery(id);
  const [amount, setAmount] = useState("");
  const [payNow, setPayNow] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [enrol, enrolState] = useEnrolCustomerSchemeMutation();
  const [initiatePublicLink] = useInitiatePublicPaymentLinkMutation();

  useEffect(() => {
    if (plan) setAmount(suggestedEnrolAmountRupee(plan));
  }, [plan]);

  const amountHint = useMemo(() => {
    if (!plan) return null;
    if (plan.fixedAmountPaise) return `Fixed at ${plan.amountSummary}`;
    const parts: string[] = [];
    if (plan.amountMinPaise != null && plan.amountMaxPaise != null) {
      parts.push(
        `₹${Math.round(plan.amountMinPaise / 100).toLocaleString("en-IN")} – ₹${Math.round(plan.amountMaxPaise / 100).toLocaleString("en-IN")}`,
      );
    }
    if (plan.multipleOfPaise && plan.multipleOfPaise > 100) {
      parts.push(`multiples of ₹${Math.round(plan.multipleOfPaise / 100).toLocaleString("en-IN")}`);
    }
    return parts.length ? parts.join(", ") : null;
  }, [plan]);

  if (isLoading || !plan) return <PageSkeleton cards={3} />;
  if (isError) return <QueryError onRetry={refetch} />;

  const jewellerName = tenant?.displayName ?? tenant?.appDisplayName ?? "your jeweller";
  const contributionText = plan.contributionDetail ?? plan.amountSummary;
  const benefitText = plan.benefitSummary || "Benefit follows plan rules shown at enrolment";

  const submit = async () => {
    if (!plan.canEnrol) {
      return toast.error(plan.blockedReason ?? "You cannot enrol in this plan right now");
    }
    if (!agreed) return toast.error("Please confirm that you understand the plan rules");
    const validation = validateEnrolAmountRupee(plan, Number(amount));
    if (validation) return toast.error(validation);
    try {
      const statusRedirectUrl = customerPath(tenantSlug, "pay", "status");
      const statusRedirectFull = `${window.location.origin}${statusRedirectUrl}`;
      const result = await enrol({
        planId: plan.id,
        installmentAmountPaise: Math.round(Number(amount) * 100),
        payNow,
        redirectUrl: statusRedirectFull,
      }).unwrap();
      toast.success("Your scheme has been created");
      if (!payNow) {
        router.push(customerPath(tenantSlug, "schemes"));
        return;
      }
      const paymentLink = result.paymentLink as Record<string, unknown> | undefined;
      const paymentIntent = result.paymentIntent as Record<string, unknown> | undefined;
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
          initiateLink: async (linkToken) =>
            initiatePublicLink({ linkToken, redirectUrl: statusRedirectFull }).unwrap(),
          navigate: (path) => router.push(path),
        },
      );
    } catch {
      toast.error("We couldn’t create the scheme");
    }
  };

  return (
    <div>
      <Link
        href={customerPath(tenantSlug, "plans")}
        className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground"
      >
        <ArrowLeft className="size-4" />
        All plans
      </Link>
      <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
        <section className="overflow-hidden rounded-[1.6rem] border bg-white shadow-sm">
          <div className="bg-[#4b0a18] p-6 text-white sm:p-8">
            <span className="grid size-12 place-items-center rounded-2xl bg-white/10 text-[#e8c35e]">
              {plan.model === "FLEXIBLE" ? <Sparkles /> : <Gem />}
            </span>
            <p className="mt-6 text-xs font-black tracking-[.16em] text-[#e8c35e]">
              {plan.model}
              {plan.valueBasisLabel ? ` · ${plan.valueBasisLabel.toUpperCase()}` : ""} · {plan.durationMonths}{" "}
              MONTHS
            </p>
            <h1 className="mt-2 text-3xl font-black">{plan.name}</h1>
            <p className="mt-2 max-w-lg leading-7 text-white/65">
              {plan.tagline || plan.paymentPatternLabel || "Savings plan tailored by your jeweller"}
            </p>
          </div>
          <div className="p-6 sm:p-8">
            <h2 className="font-black">How this plan works</h2>
            {plan.rules.length > 0 ? (
              <ul className="mt-4 space-y-4">
                {plan.rules.map((rule) => (
                  <li key={rule} className="flex gap-3 text-sm leading-6">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                      <Check className="size-3.5" />
                    </span>
                    {rule}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{contributionText}</p>
            )}
            {plan.flexibleSummary?.freeWindowMonths != null && plan.flexibleSummary.lockWindowMonths != null ? (
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-[#f5f0ec] p-4">
                  <p className="text-xs text-muted-foreground">Free window</p>
                  <p className="mt-1 font-black">{plan.flexibleSummary.freeWindowMonths} cycles</p>
                </div>
                <div className="rounded-2xl bg-[#f5f0ec] p-4">
                  <p className="text-xs text-muted-foreground">Capped phase</p>
                  <p className="mt-1 font-black">{plan.flexibleSummary.lockWindowMonths} cycles</p>
                </div>
              </div>
            ) : null}
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#faf6f3] p-4">
                <p className="text-xs text-muted-foreground">Contribution</p>
                <p className="mt-1 text-sm font-black leading-6">{contributionText}</p>
              </div>
              <div className="rounded-2xl bg-[#fff8e8] p-4">
                <p className="text-xs text-muted-foreground">Maturity benefit</p>
                <p className="mt-1 text-sm font-black leading-6 text-[#7d5a15]">{benefitText}</p>
              </div>
            </div>
          </div>
        </section>
        <section className="h-fit rounded-[1.6rem] border bg-white p-6 shadow-sm sm:p-8 lg:sticky lg:top-24">
          <p className="text-[11px] font-black uppercase tracking-[.16em] text-[#9b7224]">Start saving</p>
          <h2 className="mt-1 text-2xl font-black">Create your scheme</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Your plan rules are set by {jewellerName} and cannot be changed after enrolment.
          </p>
          {!plan.canEnrol && plan.blockedReason ? (
            <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {plan.blockedReason}
            </p>
          ) : null}
          <div className="mt-6">
            <label className="text-sm font-bold">
              {plan.model === "FIXED" ? "Monthly instalment" : "First contribution"}
            </label>
            <div className="mt-2 flex h-13 items-center rounded-xl border px-3">
              <IndianRupee className="size-5 shrink-0" />
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                disabled={Boolean(plan.fixedAmountPaise) || !plan.canEnrol}
                className="border-0 text-lg font-black shadow-none focus-visible:ring-0"
              />
            </div>
            {amountHint ? <p className="mt-2 text-xs text-muted-foreground">{amountHint}</p> : null}
          </div>
          <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#faf6f3] p-4">
            <div>
              <p className="text-sm font-bold">Pay first contribution now</p>
              <p className="text-xs text-muted-foreground">Continue securely through PhonePe</p>
            </div>
            <Switch checked={payNow} onCheckedChange={setPayNow} disabled={!plan.canEnrol} />
          </div>
          <label className="mt-5 flex cursor-pointer gap-3 rounded-2xl border p-4 text-xs leading-5">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              disabled={!plan.canEnrol}
              className="mt-1 size-4 accent-[#730321]"
            />
            <span>
              I understand the contribution schedule, benefit eligibility and contractual maturity rules for this plan.
            </span>
          </label>
          <div className="mt-5 flex items-start gap-2 text-[11px] leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-700" />
            Your enrolment is securely recorded before any payment begins.
          </div>
          <Button
            onClick={submit}
            disabled={enrolState.isLoading || !Number(amount) || !plan.canEnrol}
            className="mt-5 h-12 w-full rounded-xl bg-[#730321] text-base font-black"
          >
            {enrolState.isLoading ? (
              <LoaderCircle className="animate-spin" />
            ) : payNow ? (
              "Enrol & continue to PhonePe"
            ) : (
              "Create scheme"
            )}
          </Button>
        </section>
      </div>
    </div>
  );
}
