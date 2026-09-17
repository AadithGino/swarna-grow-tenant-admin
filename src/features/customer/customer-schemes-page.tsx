"use client";

import Link from "next/link";
import { useState } from "react";
import { CustomerPageHeader, CustomerSchemeCard } from "@/src/components/customer/customer-ui";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { useGetCustomerPastSchemesQuery, useGetCustomerSchemesQuery } from "@/src/store/api/customer-api";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { cn } from "@/lib/utils";
import type { CustomerPastScheme, SchemeCard } from "@/src/types/customer";

function PastSchemeRow({ scheme, tenantSlug }: { scheme: CustomerPastScheme; tenantSlug: string | null }) {
  return (
    <Link
      href={customerPath(tenantSlug, "schemes", scheme.id)}
      className="customer-surface flex flex-col gap-2 p-5 transition hover:border-[#dac17e] sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p className="text-xs font-bold text-muted-foreground">{scheme.schemeNumber}</p>
        <h3 className="text-lg font-black">{scheme.planName}</h3>
        <p className="text-sm text-muted-foreground">
          Closed {scheme.closedAt ? new Date(scheme.closedAt).toLocaleDateString("en-IN") : "—"} · {scheme.closureType}
        </p>
      </div>
      <div className="text-right">
        <p className="text-xs text-muted-foreground">Final value</p>
        <p className="text-xl font-black">{scheme.finalValue.amountDisplay}</p>
        {scheme.benefitReceived.amountPaise > 0 && (
          <p className="text-xs text-emerald-700">Benefit {scheme.benefitReceived.amountDisplay}</p>
        )}
      </div>
    </Link>
  );
}

export function CustomerSchemesPage() {
  const { tenantSlug } = useCustomerTenant();
  const activeQuery = useGetCustomerSchemesQuery(undefined);
  const pastQuery = useGetCustomerPastSchemesQuery(undefined);
  const [tab, setTab] = useState<"ACTIVE" | "PAST">("ACTIVE");

  const loading = activeQuery.isLoading || pastQuery.isLoading;
  const error = tab === "ACTIVE" ? activeQuery.isError : pastQuery.isError;
  const refetch = tab === "ACTIVE" ? activeQuery.refetch : pastQuery.refetch;

  if (loading && !(activeQuery.data || pastQuery.data)) return <PageSkeleton cards={3} />;
  if (error) return <QueryError onRetry={refetch} />;

  const active = (activeQuery.data ?? []) as SchemeCard[];
  const past = (pastQuery.data ?? []) as CustomerPastScheme[];

  return (
    <div>
      <CustomerPageHeader
        eyebrow="My savings"
        title="Your schemes"
        description="Every contribution, benefit and maturity date in one place."
      />
      <div className="mb-6 inline-flex rounded-2xl border border-[#e5ddd7] bg-white p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => setTab("ACTIVE")}
          className={cn("rounded-xl px-5 py-2.5 text-sm font-bold", tab === "ACTIVE" ? "bg-[#730321] text-white shadow-sm" : "text-[#77727c]")}
        >
          Active ({active.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("PAST")}
          className={cn("rounded-xl px-5 py-2.5 text-sm font-bold", tab === "PAST" ? "bg-[#730321] text-white shadow-sm" : "text-[#77727c]")}
        >
          Past ({past.length})
        </button>
      </div>

      {tab === "ACTIVE" ? (
        active.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {active.map((scheme) => (
              <CustomerSchemeCard key={scheme.id} scheme={scheme} />
            ))}
          </div>
        ) : (
          <div className="customer-surface p-12 text-center">
            <h3 className="font-black">No active schemes yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">Explore plans to start saving with your jeweller.</p>
            <Link href={customerPath(tenantSlug, "plans")} className="mt-4 inline-block text-sm font-bold text-[#730321]">
              Browse plans
            </Link>
          </div>
        )
      ) : past.length ? (
        <div className="space-y-3">{past.map((scheme) => <PastSchemeRow key={scheme.id} scheme={scheme} tenantSlug={tenantSlug} />)}</div>
      ) : (
        <div className="customer-surface p-12 text-center">
          <h3 className="font-black">Your completed schemes will appear here</h3>
          <p className="mt-2 text-sm text-muted-foreground">Receipts, benefits and passbooks remain available after closure.</p>
        </div>
      )}
    </div>
  );
}
