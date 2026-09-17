"use client";

import Link from "next/link";
import { ArrowRight, Check, Gem, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerPageHeader } from "@/src/components/customer/customer-ui";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { useGetCustomerPlansQuery } from "@/src/store/api/customer-api";

export function CustomerPlansPage() {
  const { tenantSlug } = useCustomerTenant();
  const { data, isLoading, isError, refetch } = useGetCustomerPlansQuery();
  if (isLoading) return <PageSkeleton cards={3} />;
  if (isError) return <QueryError onRetry={refetch} />;
  const plans = data ?? [];

  return (
    <div>
      <CustomerPageHeader eyebrow="Choose your journey" title="Explore savings plans" description="Compare contribution patterns and maturity benefits before you enrol." />
      <div className="mb-6 flex items-start gap-3 rounded-[1.2rem] border border-[#ead9ae] bg-[#fffaf0] p-4 text-sm leading-6"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#fff0c8] text-[#8b5f08]"><ShieldCheck className="size-5" /></span><p><b>Clear before you commit.</b><br /><span className="text-[#706b77]">Every payment rule, flexible phase and maturity benefit is shown before enrolment.</span></p></div>
      {plans.length === 0 ? <div className="customer-surface p-10 text-center"><h2 className="font-black">No plans available right now</h2><p className="mt-2 text-sm text-[#706b77]">Your branch can help you find the right savings option.</p></div> : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.id} className={`customer-surface relative flex flex-col overflow-hidden p-5 sm:p-6 ${plan.featured ? "border-[#d9c17e]" : ""}`}>
              {plan.featured ? <div className="absolute inset-x-0 top-0 h-1 bg-[#c99524]" /> : null}
              <div className="flex items-start justify-between gap-3"><span className="grid size-12 place-items-center rounded-full bg-[#fff2cf] text-[#8b5f08]">{plan.model === "FLEXIBLE" ? <Sparkles className="size-5" /> : <Gem className="size-5" />}</span><div className="flex flex-col items-end gap-2">{plan.featured ? <span className="rounded-full bg-[#730321] px-3 py-1 text-[0.68rem] font-extrabold text-white">Popular</span> : null}<span className="rounded-full bg-[#f6edf0] px-3 py-1 text-[0.68rem] font-extrabold text-[#730321]">{plan.model === "FLEXIBLE" ? "Flexible" : "Fixed"}</span></div></div>
              <p className="mt-5 text-[0.68rem] font-extrabold uppercase tracking-[.16em] text-[#9a6c17]">{plan.durationMonths} month plan</p>
              <h2 className="mt-1 text-xl font-black tracking-[-.025em]">{plan.name}</h2>
              <p className="mt-2 min-h-10 text-sm leading-5 text-[#706b77]">{plan.tagline || plan.paymentPatternLabel || plan.valueBasisLabel}</p>
              <div className="mt-5 grid gap-px overflow-hidden rounded-2xl border border-[#e9e1dc] bg-[#e9e1dc]">
                <div className="bg-[#fffefd] p-4"><p className="text-[0.7rem] text-[#77727c]">Contribution</p><p className="mt-1 text-sm font-black">{plan.amountSummary}</p></div>
                <div className="bg-[#fffaf0] p-4"><p className="text-[0.7rem] text-[#77727c]">At maturity</p><p className="mt-1 text-sm font-black text-[#8b5f08]">{plan.benefitSummary || "See plan details"}</p></div>
              </div>
              {plan.rules.length ? <ul className="my-5 space-y-2.5">{plan.rules.slice(0, 3).map((rule) => <li key={rule} className="flex gap-2 text-xs leading-5 text-[#5f5a66]"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#eaf9ef] text-[#15934b]"><Check className="size-3" /></span>{rule}</li>)}</ul> : <div className="flex-1" />}
              {!plan.canEnrol && plan.blockedReason ? <p className="mb-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">{plan.blockedReason}</p> : null}
              <Button asChild className="mt-auto h-11 rounded-xl bg-[#730321] font-bold hover:bg-[#5b021a]"><Link href={customerPath(tenantSlug, "plans", plan.id)}>View plan<ArrowRight className="ml-auto size-4" /></Link></Button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
