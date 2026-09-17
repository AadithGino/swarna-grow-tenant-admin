"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronRight,
  Coins,
  Gem,
  Grid2X2,
  IndianRupee,
  Layers3,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerSchemeCard, CustomerSectionHeading } from "@/src/components/customer/customer-ui";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { useGetCustomerHomeQuery } from "@/src/store/api/customer-api";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { useCustomerGoldMetricsVisible } from "@/src/lib/customer-gold-ui";
import { useCustomerPortalCapabilities } from "@/src/lib/customer-portal-capabilities";
import type { SchemeCard } from "@/src/types/customer";

function firstGoldBalance(schemes: SchemeCard[]) {
  const gold = schemes.find((scheme) => scheme.valueBasis === "GOLD_WEIGHT");
  return gold?.goldAccumulated ?? gold?.goldAccrued;
}

function nextMaturity(schemes: SchemeCard[]) {
  const values = schemes.map((scheme) => scheme.maturityDate).filter(Boolean).sort();
  if (!values[0]) return "—";
  return new Date(`${values[0]}${values[0].includes("T") ? "" : "T00:00:00"}`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function CustomerHomePage() {
  const { tenantSlug } = useCustomerTenant();
  const { data, isLoading, isError, refetch } = useGetCustomerHomeQuery();
  const { visible: showGoldMetrics } = useCustomerGoldMetricsVisible();
  const { customerSelfEnrol, customerAppPaymentsEnabled } = useCustomerPortalCapabilities();

  if (isLoading || !data) return <PageSkeleton cards={3} />;
  if (isError) return <QueryError onRetry={refetch} />;

  const schemes = data.activeSchemes ?? [];
  const recentPayments = data.recentPayments ?? [];
  const appName = data.tenant.appDisplayName ?? data.tenant.displayName;
  const activeCount = data.summary.activeSchemeCount ?? schemes.length;
  const singleGoldBalance = schemes.length === 1 ? firstGoldBalance(schemes) : undefined;
  const summaryPrimaryLabel = singleGoldBalance ? "Gold balance" : "Total saved";
  const summaryPrimaryValue = singleGoldBalance?.weightDisplay ?? data.summary.totalPaid.amountDisplay;
  const actionScheme = schemes.find((scheme) => scheme.id === data.actionCard?.schemeId) ?? schemes.find((scheme) => scheme.canPay);

  const quickActions = [
    {
      key: "PAY",
      label: customerAppPaymentsEnabled
        ? actionScheme?.displayMode === "FIXED"
          ? "Pay"
          : "Contribute"
        : "View schemes",
      icon: IndianRupee,
      href: actionScheme && customerAppPaymentsEnabled
        ? customerPath(tenantSlug, "schemes", actionScheme.id)
        : customerPath(tenantSlug, "schemes"),
    },
    ...(customerSelfEnrol ? [{ key: "ENROL", label: "Explore plans", icon: Grid2X2, href: customerPath(tenantSlug, "plans") }] : []),
    { key: "PASSBOOK", label: "Passbook", icon: WalletCards, href: customerPath(tenantSlug, "payments") },
  ];

  return (
    <div>
      <section className="px-1 sm:px-2">
        <h1 className="text-[2rem] font-black tracking-[-.045em] text-[#11111b] sm:text-[2.65rem]">{data.greeting.text}</h1>
        <p className="mt-1 text-base text-[#777280] sm:text-lg">{data.greeting.subtext}</p>
      </section>

      <section className="customer-surface relative mt-7 overflow-hidden p-5 sm:p-7">
        <div className="relative z-10 grid gap-5 md:grid-cols-[1fr_1.05fr] md:items-center">
          <div>
            <p className="text-sm font-medium text-[#716d7b]">{summaryPrimaryLabel}</p>
            <p className="mt-1 text-[2.65rem] font-black tracking-[-.045em] text-[#8b5f08] sm:text-[3.35rem]">{summaryPrimaryValue}</p>
            {singleGoldBalance ? <p className="mt-1 text-sm font-semibold text-[#706b77]">{data.summary.totalPaid.amountDisplay} contributed</p> : null}
          </div>
          <div className="relative hidden min-h-24 items-center justify-center md:flex">
            <span className="grid size-20 place-items-center rounded-full border border-[#ead8a8] bg-[#fff8e6] text-[#a47316]"><Coins className="size-10" strokeWidth={1.55} /></span>
            <svg className="absolute inset-x-0 bottom-2 h-12 w-full text-[#d6a73e]" viewBox="0 0 500 70" fill="none" aria-hidden><path d="M0 45C86 72 138 7 224 32C310 57 360 71 500 10" stroke="currentColor" strokeWidth="1.4" /></svg>
            <p className="absolute right-1 top-0 max-w-28 text-sm leading-5 text-[#8b5f08]">Small steps towards a brighter tomorrow</p>
          </div>
        </div>
        <div className="relative z-10 mt-6 grid gap-3 border-t border-[#e9e1dc] pt-5 sm:grid-cols-2">
          <p className="flex items-center gap-2 text-sm text-[#4e4a56]"><Layers3 className="size-5 text-[#9a6b14]" /><b>{activeCount}</b> active scheme{activeCount === 1 ? "" : "s"}</p>
          <p className="flex items-center gap-2 text-sm text-[#4e4a56]"><CalendarDays className="size-5 text-[#9a6b14]" />Next maturity · <b>{nextMaturity(schemes)}</b></p>
        </div>
      </section>

      <section className={`mt-4 grid gap-3 ${quickActions.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
        {quickActions.map((action, index) => (
          <Link key={action.key} href={action.href} className="customer-surface group flex min-w-0 flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
            <span className={`grid size-11 shrink-0 place-items-center rounded-full ${index === 0 ? "bg-[#8a062a] text-white" : index === 1 ? "bg-[#fff2cf] text-[#8b5f08]" : "bg-[#f7edf0] text-[#730321]"}`}><action.icon className="size-5" /></span>
            <b className="truncate text-sm sm:text-base">{action.label}</b>
            <ChevronRight className="ml-auto hidden size-4 transition-transform group-hover:translate-x-0.5 sm:block" />
          </Link>
        ))}
      </section>

      {data.actionCard && actionScheme ? (
        <section className="mt-5 flex flex-col gap-4 rounded-[1.35rem] border border-[#ead9ae] bg-[#fffaf0] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#fff0c8] text-[#8b5f08]"><CalendarDays className="size-5" /></span>
            <div className="min-w-0"><p className="text-[0.7rem] font-extrabold uppercase tracking-[.15em] text-[#956817]">{actionScheme.displayMode === "FIXED" ? "Instalment ready" : "Contribute when you choose"}</p><h2 className="mt-1 truncate text-lg font-black">{data.actionCard.title}</h2><p className="mt-0.5 truncate text-sm text-[#6f6b78]">{actionScheme.planName}{actionScheme.nextActionAmount ? ` · ${actionScheme.nextActionAmount.amountDisplay}` : ""}</p></div>
          </div>
          <div className="shrink-0"><Button asChild className="h-12 w-full rounded-xl bg-[#730321] px-6 text-sm font-black hover:bg-[#590219] sm:w-auto"><Link href={customerPath(tenantSlug, "schemes", actionScheme.id)}>{customerAppPaymentsEnabled ? (actionScheme.displayMode === "FIXED" ? "Pay with PhonePe" : "Contribute securely") : "View scheme"}<ArrowRight className="ml-2 size-4" /></Link></Button><p className="mt-2 flex items-center justify-center gap-1 text-[0.7rem] text-[#77727c]"><ShieldCheck className="size-3.5" />{customerAppPaymentsEnabled ? "Secure payment" : "View-only mode enabled"}</p></div>
        </section>
      ) : null}

      {data.emptyState && schemes.length === 0 ? (
        <section className="customer-surface mt-7 p-8 text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-[#fff2cf] text-[#8b5f08]"><Gem /></span><h2 className="mt-4 text-xl font-black">Start your savings journey</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#706b77]">{data.emptyState.message}</p>{customerSelfEnrol ? <Button asChild className="mt-5 rounded-xl bg-[#730321]"><Link href={customerPath(tenantSlug, "plans")}>{data.emptyState.cta}</Link></Button> : <p className="mt-4 text-sm font-semibold text-[#730321]">Contact {appName} to enrol.</p>}</section>
      ) : null}

      {schemes.length > 0 ? (
        <section className="mt-9">
          <CustomerSectionHeading eyebrow="Your savings" title={schemes.length === 1 ? "Your scheme" : "Your schemes"} action={<Link href={customerPath(tenantSlug, "schemes")} className="inline-flex items-center gap-1 text-sm font-bold text-[#730321]">View all<ChevronRight className="size-4" /></Link>} />
          <div className="customer-scroll-row -mx-4 flex gap-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0 xl:grid-cols-3">
            {schemes.map((scheme, index) => <CustomerSchemeCard key={scheme.id} scheme={scheme} featured={index === 0 && Boolean(data.actionCard)} className="w-[88vw] shrink-0 sm:w-[520px] lg:w-auto" />)}
          </div>
        </section>
      ) : null}

      <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_330px]">
        <div>
          <CustomerSectionHeading title="Recent activity" action={<Link href={customerPath(tenantSlug, "payments")} className="inline-flex items-center gap-1 text-sm font-bold text-[#730321]">View passbook<ChevronRight className="size-4" /></Link>} />
          <div className="customer-surface overflow-hidden px-5 sm:px-6">
            {recentPayments.length ? <ul className="divide-y divide-[#e8dfd9]">{recentPayments.slice(0, 4).map((payment) => <li key={payment.id}><Link href={customerPath(tenantSlug, "payments", payment.id)} className="flex items-center gap-3 py-4"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#eafbf3] text-[#0b9860]"><IndianRupee className="size-5" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{payment.amount.amountDisplay} received</p><p className="truncate text-xs text-[#77727c]">{payment.schemeName} · {payment.schemeNumber}</p></div><time className="shrink-0 text-xs text-[#77727c]">{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</time></Link></li>)}</ul> : <p className="py-9 text-center text-sm text-[#77727c]">Your verified payments will appear here.</p>}
          </div>
        </div>

        <div className="space-y-4">
          {showGoldMetrics && data.goldRate ? <Link href={customerPath(tenantSlug, "gold-rate")} className="customer-surface flex items-center gap-3 p-5"><span className="grid size-11 place-items-center rounded-full bg-[#fff2cf] text-[#8b5f08]"><Gem className="size-5" /></span><div><p className="text-xs text-[#77727c]">Today’s {data.goldRate.purity ?? "22K"} rate</p><p className="mt-0.5 text-lg font-black text-[#8b5f08]">{data.goldRate.ratePerGramDisplay}</p></div><ChevronRight className="ml-auto size-4" /></Link> : null}
          <Link href={customerPath(tenantSlug, "notifications")} className="customer-surface flex items-center gap-3 p-5"><span className="relative grid size-11 place-items-center rounded-full bg-[#f7edf0] text-[#730321]"><Bell className="size-5" />{data.unreadNotificationCount > 0 ? <i className="absolute right-0.5 top-0.5 size-2.5 rounded-full bg-[#ef394e] ring-2 ring-white" /> : null}</span><div><p className="text-sm font-black">{data.unreadNotificationCount ? `${data.unreadNotificationCount} new updates` : "You’re all caught up"}</p><p className="text-xs text-[#77727c]">Payments, schemes and support</p></div><ArrowRight className="ml-auto size-4" /></Link>
        </div>
      </section>
    </div>
  );
}
