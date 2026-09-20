"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { CustomerSchemesActiveCard, CustomerSchemesPastCard } from "@/src/components/customer/customer-ui";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import {
  useGetCustomerHomeQuery,
  useGetCustomerPastSchemesQuery,
  useGetCustomerSchemesQuery,
} from "@/src/store/api/customer-api";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { cn } from "@/lib/utils";
import { CUSTOMER_MOBILE_NAV_DOCK } from "@/src/features/customer/customer-scheme-detail-views";
import type { CustomerPastScheme, SchemeCard } from "@/src/types/customer";

export function CustomerSchemesPage() {
  const { tenantSlug } = useCustomerTenant();
  const activeQuery = useGetCustomerSchemesQuery(undefined);
  const pastQuery = useGetCustomerPastSchemesQuery(undefined);
  const { data: home } = useGetCustomerHomeQuery();
  const [tab, setTab] = useState<"ACTIVE" | "PAST">("ACTIVE");

  const loading = activeQuery.isLoading || pastQuery.isLoading;
  const error = activeQuery.isError || pastQuery.isError;

  const refetch = () => {
    void activeQuery.refetch();
    void pastQuery.refetch();
  };

  if (loading && !(activeQuery.data || pastQuery.data)) return <PageSkeleton cards={3} />;
  if (error) return <QueryError onRetry={refetch} />;

  const active = (activeQuery.data ?? []) as SchemeCard[];
  const past = (pastQuery.data ?? []) as CustomerPastScheme[];

  const totalSaved =
    home?.summary?.totalPaid?.amountDisplay ??
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
      active.reduce((sum, scheme) => sum + (scheme.totalPaid?.amountPaise ?? 0), 0) / 100,
    );

  const pastPreview = past.slice(0, 1);

  return (
    <div
      className="mx-auto max-w-lg"
      style={{ paddingBottom: `calc(${CUSTOMER_MOBILE_NAV_DOCK} + 0.5rem + env(safe-area-inset-bottom, 0px))` }}
    >
      <h1 className="text-[1.65rem] font-black tracking-[-.03em] text-[#11111b]">My schemes</h1>

      <div
        className="mt-5 grid w-full grid-cols-2 gap-0 rounded-full border bg-[#fffefd] p-1"
        style={{ borderColor: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.55)" }}
      >
        <button
          type="button"
          onClick={() => setTab("ACTIVE")}
          className={cn(
            "rounded-full py-2.5 text-sm font-bold transition",
            tab === "ACTIVE" ? "text-white shadow-sm" : "text-[#8a8490]",
          )}
          style={tab === "ACTIVE" ? { background: "var(--customer-primary, #730321)" } : undefined}
        >
          Active ({active.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("PAST")}
          className={cn(
            "rounded-full py-2.5 text-sm font-bold transition",
            tab === "PAST" ? "text-white shadow-sm" : "text-[#8a8490]",
          )}
          style={tab === "PAST" ? { background: "var(--customer-primary, #730321)" } : undefined}
        >
          Past ({past.length})
        </button>
      </div>

      {tab === "ACTIVE" ? (
        <p className="mt-4 leading-tight">
          <span className="text-[1.65rem] font-black tracking-tight text-[#11111b]">{totalSaved}</span>
          <span className="ml-2 text-[0.9375rem] font-medium text-[#777280]">total saved</span>
        </p>
      ) : null}

      {tab === "ACTIVE" ? (
        <>
          {active.length ? (
            <div className="mt-4 space-y-3">
              {active.map((scheme) => (
                <CustomerSchemesActiveCard key={scheme.id} scheme={scheme} />
              ))}
            </div>
          ) : (
            <div className="customer-surface mt-5 p-10 text-center">
              <h3 className="font-black">No active schemes yet</h3>
              <p className="mt-2 text-sm text-[#77727c]">Explore plans to start saving with your jeweller.</p>
              <Link
                href={customerPath(tenantSlug, "plans")}
                className="mt-4 inline-block text-sm font-bold text-[var(--customer-primary,#730321)]"
              >
                Browse plans
              </Link>
            </div>
          )}

          {past.length > 0 ? (
            <section className="mt-7">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-[1.05rem] font-black text-[#171722]">Past schemes</h2>
                <button
                  type="button"
                  onClick={() => setTab("PAST")}
                  className="inline-flex items-center gap-0.5 text-sm font-bold text-[var(--customer-primary,#730321)]"
                >
                  View all
                  <ChevronRight className="size-4" />
                </button>
              </div>
              <div className="space-y-3">
                {pastPreview.map((scheme) => (
                  <CustomerSchemesPastCard key={scheme.id} scheme={scheme} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : past.length ? (
        <div className="mt-6 space-y-3">
          {past.map((scheme) => (
            <CustomerSchemesPastCard key={scheme.id} scheme={scheme} />
          ))}
        </div>
      ) : (
        <div className="customer-surface mt-5 p-10 text-center">
          <h3 className="font-black">Your completed schemes will appear here</h3>
          <p className="mt-2 text-sm text-[#77727c]">Receipts, benefits and passbooks remain available after closure.</p>
        </div>
      )}
    </div>
  );
}
