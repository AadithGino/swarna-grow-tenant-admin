"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  Coins,
  Filter,
  Gift,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { useGetCustomerPlansQuery } from "@/src/store/api/customer-api";
import { useCustomerPortalCapabilities } from "@/src/lib/customer-portal-capabilities";
import { cn } from "@/lib/utils";
import type { SchemePlan } from "@/src/types/customer";

type PlanFilter = "ALL" | "FIXED" | "FLEXIBLE" | "GOLD";

function isGoldPlan(plan: SchemePlan) {
  return (
    plan.benefitType === "GOLD_BENEFIT" ||
    /gold/i.test(plan.valueBasisLabel ?? "") ||
    /gold/i.test(plan.benefitSummary ?? "")
  );
}

function planBadge(plan: SchemePlan) {
  if (plan.model === "FLEXIBLE") return { label: "FLEXIBLE", className: "bg-[#fff2cf] text-[#6b4e32]" };
  return { label: "FIXED", className: "bg-[#f6edf0] text-[var(--customer-primary,#730321)]" };
}

function planHighlight(plan: SchemePlan) {
  if (plan.model === "FLEXIBLE" && plan.flexibleSummary?.freeWindowMonths) {
    return {
      icon: BarChart3,
      text: `Pay freely for the first ${plan.flexibleSummary.freeWindowMonths} months`,
    };
  }
  if (plan.benefitType === "ONE_FREE_INSTALLMENT" || /making charge|free instalment/i.test(plan.benefitSummary)) {
    return { icon: Gift, text: plan.benefitSummary };
  }
  if (isGoldPlan(plan)) {
    return { icon: Gift, text: plan.benefitSummary || "Gold-linked maturity benefit" };
  }
  return { icon: Gift, text: plan.benefitSummary || "Maturity benefit on completion" };
}

function contributionLine(plan: SchemePlan) {
  const summary = plan.amountSummary ?? "";
  if (plan.model === "FIXED" && /every|month|monthly/i.test(summary) === false && summary.includes("₹")) {
    return `${summary} every month`;
  }
  return summary;
}

function PlanExploreCard({ plan, tenantSlug }: { plan: SchemePlan; tenantSlug: string | null }) {
  const badge = planBadge(plan);
  const highlight = planHighlight(plan);
  const HighlightIcon = highlight.icon;

  return (
    <article className="customer-surface relative overflow-hidden p-4 sm:p-5">
      <svg
        className="pointer-events-none absolute -bottom-4 -right-2 h-24 w-24 opacity-[0.12]"
        viewBox="0 0 120 120"
        fill="none"
        aria-hidden
      >
        <circle cx="60" cy="60" r="48" stroke="var(--customer-accent, #c9a227)" strokeWidth="1.2" />
      </svg>
      <span className={cn("relative z-10 inline-flex rounded-md px-2.5 py-1 text-[0.62rem] font-extrabold tracking-[0.12em]", badge.className)}>
        {badge.label}
      </span>
      <div className="relative z-10 mt-3 flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-black text-[#171722]">{plan.name}</h2>
        <span className="shrink-0 text-xs font-semibold text-[#77727c]">{plan.durationMonths} months</span>
      </div>
      <p className="relative z-10 mt-2 flex items-center gap-2 text-sm text-[#5c5763]">
        {plan.model === "FLEXIBLE" ? (
          <Coins className="size-4 shrink-0 text-[var(--customer-accent,#8b5f08)]" strokeWidth={2} />
        ) : (
          <CalendarDays className="size-4 shrink-0 text-[var(--customer-accent,#8b5f08)]" strokeWidth={2} />
        )}
        {contributionLine(plan)}
      </p>
      <div
        className="relative z-10 mt-4 flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs leading-snug text-[#6b4e32]"
        style={{ background: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.14)" }}
      >
        <HighlightIcon className="mt-0.5 size-4 shrink-0 text-[var(--customer-accent,#8b5f08)]" strokeWidth={2} />
        <span className="font-semibold">{highlight.text}</span>
      </div>
      {!plan.canEnrol && plan.blockedReason ? (
        <p className="relative z-10 mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">{plan.blockedReason}</p>
      ) : null}
      <Button
        asChild
        className="relative z-10 mt-4 h-11 w-full rounded-xl font-bold text-white"
        style={{ background: "var(--customer-primary, #730321)" }}
      >
        <Link href={customerPath(tenantSlug, "plans", plan.id)}>
          View plan
          <ChevronRight className="ml-1 size-4" />
        </Link>
      </Button>
    </article>
  );
}

export function CustomerPlansPage() {
  const { tenantSlug } = useCustomerTenant();
  const { multiScheme } = useCustomerPortalCapabilities();
  const { data, isLoading, isError, refetch } = useGetCustomerPlansQuery();
  const [filter, setFilter] = useState<PlanFilter>("ALL");

  const plans = data ?? [];

  const filtered = useMemo(() => {
    if (filter === "ALL") return plans;
    if (filter === "FIXED") return plans.filter((p) => p.model === "FIXED" && !isGoldPlan(p));
    if (filter === "FLEXIBLE") return plans.filter((p) => p.model === "FLEXIBLE");
    return plans.filter((p) => isGoldPlan(p));
  }, [plans, filter]);

  const filters: { key: PlanFilter; label: string }[] = [
    { key: "ALL", label: "All" },
    { key: "FIXED", label: "Fixed" },
    { key: "FLEXIBLE", label: "Flexible" },
    { key: "GOLD", label: "Gold weight" },
  ];

  if (isLoading) return <PageSkeleton cards={3} />;
  if (isError) return <QueryError onRetry={refetch} />;

  return (
    <div className="mx-auto max-w-lg pb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[1.65rem] font-black tracking-[-.03em] text-[#11111b]">Explore plans</h1>
          <p className="mt-1 text-sm text-[#777280]">Choose a savings journey that fits you</p>
        </div>
        <span
          className="grid size-10 shrink-0 place-items-center rounded-full border border-[#e8dfd9] text-[#706b77]"
          aria-hidden
        >
          <Filter className="size-[1.1rem]" strokeWidth={2} />
        </span>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition",
              filter === item.key
                ? "border-transparent text-white shadow-sm"
                : "border-[#e5ddd7] bg-white text-[#706b77]",
            )}
            style={filter === item.key ? { background: "var(--customer-primary, #730321)" } : undefined}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="customer-surface mt-5 p-10 text-center">
          <h2 className="font-black">No plans in this category</h2>
          <p className="mt-2 text-sm text-[#706b77]">Try another filter or check back later.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {filtered.map((plan) => (
            <PlanExploreCard key={plan.id} plan={plan} tenantSlug={tenantSlug} />
          ))}
        </div>
      )}

      {!multiScheme ? (
        <div
          className="mt-5 flex gap-2.5 rounded-xl border px-3.5 py-3 text-xs leading-relaxed text-[#706b77]"
          style={{
            borderColor: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.35)",
            background: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.1)",
          }}
        >
          <Info className="mt-0.5 size-4 shrink-0 text-[var(--customer-accent,#8b5f08)]" />
          <p>You can hold one active scheme at a time.</p>
        </div>
      ) : null}
    </div>
  );
}
