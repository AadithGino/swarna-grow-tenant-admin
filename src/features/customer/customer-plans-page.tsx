"use client";

import Link from "next/link";
import { ArrowRight, Check, Gem, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
      <CustomerPageHeader
        eyebrow="Grow with confidence"
        title="Explore savings plans"
        description="Clear rules, flexible options and benefits designed by your jewellery."
      />
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#ead49a] bg-[#fff9e9] p-4 text-sm">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#8b6517]" />
        <p>
          <b>Transparent by design.</b> You’ll see the contribution rules and maturity benefit before you enrol.
          Flexible contributions are always optional.
        </p>
      </div>
      {plans.length === 0 ? (
        <p className="rounded-2xl border bg-white p-8 text-center text-sm text-muted-foreground">
          No plans are available for self-enrolment right now. Contact your branch for help.
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className="relative flex flex-col overflow-hidden rounded-[1.5rem] border bg-white p-6 shadow-[0_12px_35px_rgba(77,24,36,.06)]"
            >
              {plan.featured ? (
                <Badge className="absolute right-4 top-4 bg-[#d5a52e] text-white">Popular</Badge>
              ) : null}
              <span className="grid size-12 place-items-center rounded-2xl bg-[#f7edef] text-[#730321]">
                {plan.model === "FLEXIBLE" ? <Sparkles /> : <Gem />}
              </span>
              <p className="mt-5 text-[10px] font-black uppercase tracking-[.16em] text-[#9a6f2a]">
                {plan.model} · {plan.durationMonths} months
              </p>
              <h2 className="mt-1 text-xl font-black">{plan.name}</h2>
              <p className="mt-2 min-h-10 text-sm leading-5 text-muted-foreground">
                {plan.tagline || plan.paymentPatternLabel || plan.valueBasisLabel}
              </p>
              <div className="mt-5 rounded-2xl bg-[#fbf7f4] p-4">
                <p className="text-xs text-muted-foreground">Contribution</p>
                <p className="mt-1 font-black">{plan.amountSummary}</p>
                <p className="mt-3 text-xs text-muted-foreground">Maturity benefit</p>
                <p className="mt-1 font-black text-[#730321]">
                  {plan.benefitSummary || "See plan details"}
                </p>
              </div>
              {plan.rules.length > 0 ? (
                <ul className="my-5 space-y-3">
                  {plan.rules.map((rule) => (
                    <li key={rule} className="flex gap-2 text-sm">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                        <Check className="size-3" />
                      </span>
                      {rule}
                    </li>
                  ))}
                </ul>
              ) : null}
              {!plan.canEnrol && plan.blockedReason ? (
                <p className="mb-3 text-xs text-amber-800">{plan.blockedReason}</p>
              ) : null}
              <Button
                asChild
                className="mt-auto h-11 rounded-xl bg-[#730321] font-bold"
                disabled={!plan.canEnrol}
              >
                <Link href={customerPath(tenantSlug, "plans", plan.id)}>
                  View plan
                  <ArrowRight className="ml-auto" />
                </Link>
              </Button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
