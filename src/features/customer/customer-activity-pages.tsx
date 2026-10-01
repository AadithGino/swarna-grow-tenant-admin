"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Gem, MapPin, Phone, Store, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerPageHeader } from "@/src/components/customer/customer-ui";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { useCustomerGoldMetricsVisible } from "@/src/lib/customer-gold-ui";
import {
  useGetCustomerBranchesQuery,
  useGetCustomerGoldHistoryQuery,
  useGetCustomerGoldRateQuery,
} from "@/src/store/api/customer-api";
import { customerPath } from "@/src/lib/customer-tenant";
export { CustomerNotificationsPage } from "@/src/features/customer/customer-notifications-page";

export function CustomerGoldRatePage() {
  const router = useRouter();
  const { tenantSlug } = useCustomerTenant();
  const { visible: showGoldMetrics, isLoading: homeLoading } = useCustomerGoldMetricsVisible();
  const { data: rate, isLoading, isError, refetch } = useGetCustomerGoldRateQuery(undefined, { skip: !showGoldMetrics });
  const { data: history } = useGetCustomerGoldHistoryQuery(undefined, { skip: !showGoldMetrics });

  useEffect(() => {
    if (!homeLoading && !showGoldMetrics) router.replace(customerPath(tenantSlug));
  }, [homeLoading, showGoldMetrics, router, tenantSlug]);

  if (homeLoading || (!showGoldMetrics && !homeLoading) || isLoading || !rate) return <PageSkeleton cards={3} />;
  if (isError) return <QueryError onRetry={refetch} />;
  const movement = rate.movement ?? 0;

  return (
    <div>
      <CustomerPageHeader eyebrow="Published by your jewellery" title="Gold rate" description="The reference rate used for eligible gold accumulation and maturity calculations." />
      <section className="customer-surface relative overflow-hidden p-6 sm:p-8">
        <div className="relative z-10 flex items-start justify-between gap-4"><div><p className="text-[0.72rem] font-extrabold uppercase tracking-[.16em] text-[#9a6c17]">Today · {rate.purity}</p><p className="mt-3 text-[2.6rem] font-black tracking-[-.04em] text-[#8b5f08] sm:text-[3.25rem]">{rate.ratePerGramDisplay}</p><p className="mt-2 text-sm text-[#706b77]">Effective {new Date(rate.effectiveDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p><p className={`mt-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${movement >= 0 ? "bg-[#eaf9ef] text-[#15934b]" : "bg-red-50 text-red-700"}`}>{movement >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}{movement >= 0 ? "Up" : "Down"} {Math.abs(movement)}% from the previous rate</p></div><span className="grid size-16 shrink-0 place-items-center rounded-full bg-[#fff0c8] text-[#8b5f08]"><Gem className="size-8" /></span></div>
        <svg className="absolute bottom-2 right-0 h-20 w-1/2 text-[#deb75d] opacity-70" viewBox="0 0 400 90" fill="none" aria-hidden><path d="M0 68C80 22 143 75 205 43C275 7 318 54 400 12" stroke="currentColor" strokeWidth="1.5" /></svg>
      </section>
      <section className="customer-surface mt-5 overflow-hidden"><div className="border-b border-[#e8dfd9] p-5 sm:px-6"><h2 className="font-black">Recent rate history</h2><p className="mt-1 text-xs text-[#77727c]">Rates published by your jeweller</p></div><div className="divide-y divide-[#e8dfd9]">{history?.map((item) => { const itemMovement = item?.movement ?? 0; return item ? <div key={item.effectiveDate} className="flex items-center px-5 py-4 sm:px-6"><span className={`grid size-10 place-items-center rounded-full ${itemMovement >= 0 ? "bg-[#eaf9ef] text-[#15934b]" : "bg-red-50 text-red-700"}`}>{itemMovement >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}</span><p className="ml-3 text-sm font-bold">{new Date(item.effectiveDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p><div className="ml-auto text-right"><p className="font-black text-[#8b5f08]">{item.ratePerGramDisplay}</p><p className={`text-[0.68rem] ${itemMovement >= 0 ? "text-[#15934b]" : "text-red-600"}`}>{itemMovement > 0 ? "+" : ""}{itemMovement}%</p></div></div> : null; })}</div></section>
      <p className="mt-4 rounded-[1.15rem] border border-[#ead9ae] bg-[#fffaf0] p-4 text-xs leading-5 text-[#725719]">Gold maturity benefits use the latest rate available on or before the contractual maturity date.</p>
    </div>
  );
}

export function CustomerBranchesPage() {
  const { data, isLoading, isError, refetch } = useGetCustomerBranchesQuery();
  if (isLoading || !data) return <PageSkeleton cards={2} />;
  if (isError) return <QueryError onRetry={refetch} />;
  return <div><CustomerPageHeader title="Our branches" description="Visit or call your jeweller for in-person assistance." /><div className="grid gap-4 md:grid-cols-2">{data.map((branch, index) => <article key={branch.id} className="customer-surface p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid size-11 place-items-center rounded-full bg-[#f7edf0] text-[#730321]"><Store className="size-5" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-black">{branch.name}</h2>{index === 0 ? <span className="rounded-full bg-[#eaf9ef] px-2 py-0.5 text-[0.62rem] font-bold text-[#15934b]">YOUR BRANCH</span> : null}</div><p className="mt-1 text-xs text-[#77727c]">{branch.code}</p></div></div><p className="mt-5 flex gap-2 text-sm leading-6 text-[#706b77]"><MapPin className="mt-1 size-4 shrink-0 text-[#a47316]" />{branch.address}</p><p className="mt-2 flex items-center gap-2 text-sm font-bold"><Phone className="size-4 text-[#a47316]" />{branch.mobile}</p><Button variant="outline" className="mt-5 w-full rounded-xl bg-white" asChild><a href={`tel:${branch.mobile}`}>Call branch</a></Button></article>)}</div></div>;
}
