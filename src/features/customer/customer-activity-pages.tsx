"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Bell, ChevronRight, Gem, IndianRupee, MessageSquareText, Store, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerPageHeader } from "@/src/components/customer/customer-ui";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { useGetCustomerBranchesQuery, useGetCustomerGoldHistoryQuery, useGetCustomerGoldRateQuery, useGetCustomerNotificationsQuery, useMarkAllCustomerNotificationsReadMutation, useMarkCustomerNotificationReadMutation } from "@/src/store/api/customer-api";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { useCustomerGoldMetricsVisible } from "@/src/lib/customer-gold-ui";
import { toast } from "sonner";

export function CustomerNotificationsPage() {
  const { data, isLoading, isError, refetch } = useGetCustomerNotificationsQuery();
  const [markRead] = useMarkCustomerNotificationReadMutation();
  const [markAll] = useMarkAllCustomerNotificationsReadMutation();
  if (isLoading || !data) return <PageSkeleton cards={2}/>;
  if (isError) return <QueryError onRetry={refetch}/>;
  return <div><CustomerPageHeader title="Notifications" description="Payment confirmations, scheme updates and support replies." action={data.unreadCount ? <Button variant="outline" onClick={() => markAll().unwrap().then(() => toast.success("All caught up"))}>Mark all read</Button> : undefined}/><section className="overflow-hidden rounded-[1.4rem] border bg-white shadow-sm"><div className="divide-y">{data.items.map((item) => <Link key={item.id} href={item.deepLink ?? "#"} onClick={() => !item.read && markRead(item.id)} className="flex gap-3 p-4 transition hover:bg-[#fcf8f5] sm:p-5"><span className={`relative grid size-11 shrink-0 place-items-center rounded-2xl ${item.type === "PAYMENT" ? "bg-emerald-50 text-emerald-700" : item.type === "GRIEVANCE" ? "bg-blue-50 text-blue-700" : "bg-[#f7edef] text-[#730321]"}`}>{item.type === "PAYMENT" ? <IndianRupee className="size-5"/> : item.type === "GRIEVANCE" ? <MessageSquareText className="size-5"/> : <Bell className="size-5"/>}{!item.read && <i className="absolute right-0 top-0 size-2.5 rounded-full bg-red-500 ring-2 ring-white"/>}</span><div className="min-w-0"><div className="flex items-center gap-2"><p className="font-black">{item.title}</p>{!item.read && <span className="rounded-full bg-[#730321] px-2 py-0.5 text-[9px] font-bold text-white">NEW</span>}</div><p className="mt-1 text-sm leading-5 text-muted-foreground">{item.body}</p><p className="mt-2 text-[10px] text-muted-foreground">{new Date(item.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p></div>{item.deepLink && <ChevronRight className="ml-auto size-4 shrink-0 self-center text-muted-foreground"/>}</Link>)}</div></section></div>;
}

export function CustomerGoldRatePage() {
  const router = useRouter();
  const { tenantSlug } = useCustomerTenant();
  const { visible: showGoldMetrics, isLoading: homeLoading } = useCustomerGoldMetricsVisible();
  const { data: rate, isLoading, isError, refetch } = useGetCustomerGoldRateQuery(undefined, {
    skip: !showGoldMetrics,
  });
  const { data: history } = useGetCustomerGoldHistoryQuery(undefined, { skip: !showGoldMetrics });

  useEffect(() => {
    if (!homeLoading && !showGoldMetrics) {
      router.replace(customerPath(tenantSlug));
    }
  }, [homeLoading, showGoldMetrics, router, tenantSlug]);

  if (homeLoading || (!showGoldMetrics && !homeLoading)) return <PageSkeleton cards={3} />;
  if (isLoading || !rate) return <PageSkeleton cards={3}/>;
  if (isError) return <QueryError onRetry={refetch}/>;
  return <div><CustomerPageHeader eyebrow="Published by your jewellery" title="Gold rate" description="The daily reference rate used for eligible gold benefit calculations."/><section className="relative overflow-hidden rounded-[1.6rem] bg-gradient-to-br from-[#4b0a18] to-[#791d33] p-6 text-white shadow-lg sm:p-8"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#e8c35e]">Today · {rate.purity}</p><p className="mt-3 text-4xl font-black">{rate.ratePerGramDisplay}</p><p className="mt-2 text-sm text-white/60">Effective {new Date(rate.effectiveDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p></div><span className="grid size-14 place-items-center rounded-2xl bg-white/10 text-[#e8c35e]"><Gem className="size-7"/></span></div><p className="mt-7 flex items-center gap-2 text-xs text-emerald-200"><TrendingUp className="size-4"/>Up {rate.movement}% from the previous published rate</p></section><section className="mt-5 rounded-[1.4rem] border bg-white p-5 shadow-sm"><h2 className="font-black">Recent rate history</h2><div className="mt-3 divide-y">{history?.map((item) => <div key={item.effectiveDate} className="flex items-center py-4"><span className="grid size-9 place-items-center rounded-xl bg-[#fff8e8] text-[#98701c]">{(item.movement ?? 0) >= 0 ? <TrendingUp className="size-4"/> : <TrendingDown className="size-4"/>}</span><p className="ml-3 text-sm font-bold">{new Date(item.effectiveDate).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}</p><div className="ml-auto text-right"><p className="font-black">{item.ratePerGramDisplay}</p><p className={`text-[10px] ${(item.movement ?? 0) >= 0 ? "text-emerald-700" : "text-red-600"}`}>{(item.movement ?? 0) > 0 ? "+" : ""}{item.movement}%</p></div></div>)}</div></section><p className="mt-4 rounded-2xl bg-[#fff8e8] p-4 text-xs leading-5 text-[#6d551e]">Gold maturity benefits use the latest rate published on or before the contractual maturity date—not the redemption completion date.</p></div>;
}

export function CustomerBranchesPage() {
  const { data, isLoading, isError, refetch } = useGetCustomerBranchesQuery();
  if (isLoading || !data) return <PageSkeleton cards={2}/>;
  if (isError) return <QueryError onRetry={refetch}/>;
  return <div><CustomerPageHeader title="Our branches" description="Visit or contact Kairali Jewellers for in-person assistance."/><div className="grid gap-4 md:grid-cols-2">{data.map((branch, index) => <article key={branch.id} className="rounded-[1.4rem] border bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-[#f7edef] text-[#730321]"><Store className="size-5"/></span><div><div className="flex items-center gap-2"><h2 className="font-black">{branch.name}</h2>{index === 0 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">YOUR BRANCH</span>}</div><p className="mt-1 text-xs text-muted-foreground">{branch.code}</p></div></div><p className="mt-5 text-sm leading-6 text-muted-foreground">{branch.address}</p><p className="mt-2 text-sm font-bold">{branch.mobile}</p><Button variant="outline" className="mt-5 w-full rounded-xl" asChild><a href={`tel:${branch.mobile}`}>Call branch</a></Button></article>)}</div></div>;
}
