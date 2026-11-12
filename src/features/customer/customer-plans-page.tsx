"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CircleCheck, Info, Sparkles } from "lucide-react";
import { CkBadge, CkCard, CkStats } from "@/src/components/customer/customer-kit";
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

function PlanExploreCard({ plan, tenantSlug }: { plan: SchemePlan; tenantSlug: string | null }) {
  const gold = isGoldPlan(plan);
  const typeBadge =
    plan.model === "FLEXIBLE" ? (
      <CkBadge tone="blue">Flexible</CkBadge>
    ) : gold ? (
      <CkBadge tone="gold">Gold benefit</CkBadge>
    ) : (
      <CkBadge tone="brand">Fixed</CkBadge>
    );
  const href = customerPath(tenantSlug, "plans", plan.id);
  return (
    <CkCard as="article" className={cn("p-4", plan.featured && "border-[1.5px] border-[var(--ck-gold)]")}>
      <div className="flex items-center gap-1.5">
        {typeBadge}
        {plan.featured ? (
          <CkBadge tone="gold">
            <Sparkles className="size-3" />
            Featured
          </CkBadge>
        ) : null}
        <span className="ml-auto text-xs text-[var(--ck-muted)]">{plan.durationMonths} months</span>
      </div>
      <h2 className="mt-3 text-[1.35rem] font-bold leading-tight tracking-[-0.03em] text-[var(--ck-ink)]">{plan.name}</h2>
      {plan.tagline ? <p className="mt-1 text-[0.82rem] text-[var(--ck-muted)]">{plan.tagline}</p> : null}
      <CkStats
        className="mt-3.5"
        items={[
          { label: "Amount", value: <span className="whitespace-normal text-[0.85rem] leading-snug">{plan.amountSummary}</span> },
          { label: "Benefit", value: <span className="whitespace-normal text-[0.85rem] leading-snug">{plan.benefitSummary || "On completion"}</span> },
        ]}
      />
      {plan.rules?.length ? (
        <ul className="mt-3.5 grid gap-2">
          {plan.rules.slice(0, 3).map((rule) => (
            <li key={rule} className="flex items-start gap-2 text-[0.8rem] text-[var(--ck-ink-2)]">
              <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-[var(--ck-ok)]" />
              {rule}
            </li>
          ))}
        </ul>
      ) : null}
      {!plan.canEnrol && plan.blockedReason ? (
        <p className="mt-3 rounded-lg bg-[var(--ck-warn-soft)] px-3 py-2 text-xs text-[var(--ck-warn)]">{plan.blockedReason}</p>
      ) : null}
      <div className="mt-4 grid grid-cols-[1fr_1.3fr] gap-2">
        <Link href={href} className="flex h-10 items-center justify-center rounded-xl border border-[var(--ck-line)] bg-white text-[0.82rem] font-semibold text-[var(--ck-ink)]">
          View plan
        </Link>
        {plan.canEnrol ? (
          <Link href={`${href}#enrol`} className="flex h-10 items-center justify-center rounded-xl text-[0.82rem] font-semibold text-white" style={{ background: "var(--customer-primary, #730321)" }}>
            Enrol now
          </Link>
        ) : (
          <span className="flex h-10 items-center justify-center rounded-xl bg-[#efe8df] text-[0.82rem] font-semibold text-[var(--ck-muted)]">Not available</span>
        )}
      </div>
    </CkCard>
  );
}

export function CustomerPlansPage() {
  const { tenantSlug } = useCustomerTenant();
  const { multiScheme } = useCustomerPortalCapabilities();
  const { data, isLoading, isError, refetch } = useGetCustomerPlansQuery();
  const [filter, setFilter] = useState<PlanFilter>("ALL");

  const filtered = useMemo(() => {
    const plans = data ?? [];
    if (filter === "ALL") return plans;
    if (filter === "FIXED") return plans.filter((p) => p.model === "FIXED" && !isGoldPlan(p));
    if (filter === "FLEXIBLE") return plans.filter((p) => p.model === "FLEXIBLE");
    return plans.filter((p) => isGoldPlan(p));
  }, [data, filter]);

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
      <h1 className="text-[1.65rem] font-bold tracking-[-.03em] text-[var(--ck-ink)]">Explore plans</h1>
      <p className="mt-1 text-[0.82rem] text-[var(--ck-muted)]">Choose a savings journey that fits you</p>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filters.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-[0.8rem] font-semibold transition",
              filter === item.key ? "border-[var(--ck-ink)] bg-[var(--ck-ink)] text-white" : "border-[var(--ck-line)] bg-white text-[var(--ck-ink-2)]",
            )}
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
        <div className="mt-4 space-y-3">
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
