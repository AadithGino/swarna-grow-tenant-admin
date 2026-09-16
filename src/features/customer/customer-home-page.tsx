"use client";

import Link from "next/link";
import { ArrowRight, Bell, Gem, IndianRupee, TrendingUp, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerSchemeCard } from "@/src/components/customer/customer-ui";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { useGetCustomerHomeQuery } from "@/src/store/api/customer-api";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { useCustomerGoldMetricsVisible } from "@/src/lib/customer-gold-ui";
import { useCustomerPortalCapabilities } from "@/src/lib/customer-portal-capabilities";
import { cn } from "@/lib/utils";

export function CustomerHomePage() {
  const { tenantSlug } = useCustomerTenant();
  const { data, isLoading, isError, refetch } = useGetCustomerHomeQuery();
  const { visible: showGoldMetrics } = useCustomerGoldMetricsVisible();
  const { customerSelfEnrol } = useCustomerPortalCapabilities();
  if (isLoading || !data) return <PageSkeleton cards={3} />;
  if (isError) return <QueryError onRetry={refetch} />;

  const recentPayments = data.recentPayments ?? [];
  const appName = data.tenant.appDisplayName ?? data.tenant.displayName;

  return (
    <div>
      <section className="relative overflow-hidden rounded-[1.6rem] bg-[#4b0a18] p-5 text-white shadow-[0_18px_45px_rgba(74,10,24,.18)] sm:p-7 lg:p-9">
        <div className="absolute -right-20 -top-28 size-72 rounded-full border border-white/10 bg-[#7b2034] blur-2xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[#e8c35e]">{appName}</p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">{data.greeting.text}</h1>
            <p className="mt-1 text-sm text-white/65">{data.greeting.subtext}</p>
          </div>
        </div>
        <div
          className={cn(
            "relative mt-7 grid gap-3",
            showGoldMetrics ? "sm:grid-cols-3" : "sm:grid-cols-1 sm:max-w-sm",
          )}
        >
          <div className="rounded-2xl border border-white/10 bg-white/[.08] p-4 backdrop-blur">
            {data.customer.passbookNumber ? (
              <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#e8c35e]">
                {data.customer.passbookNumber}
              </p>
            ) : null}
            <p className={cn("text-xs text-white/60", data.customer.passbookNumber && "mt-2")}>Total saved</p>
            <p className="mt-1 text-2xl font-black">{data.summary.totalPaid.amountDisplay}</p>
            <p className="mt-2 text-[11px] text-[#efd47e]">
              Across {data.summary.activeSchemeCount} active scheme
              {data.summary.activeSchemeCount === 1 ? "" : "s"}
            </p>
          </div>
          {showGoldMetrics && data.summary.goldAccumulated ? (
            <div className="rounded-2xl border border-white/10 bg-white/[.08] p-4 backdrop-blur">
              <p className="text-xs text-white/60">Gold accumulated</p>
              <p className="mt-1 text-2xl font-black">{data.summary.goldAccumulated.weightDisplay}</p>
              <p className="mt-2 text-[11px] text-white/55">From successful contributions</p>
            </div>
          ) : null}
          {showGoldMetrics && data.summary.currentValuation ? (
            <div className="rounded-2xl border border-white/10 bg-white/[.08] p-4 backdrop-blur">
              <p className="text-xs text-white/60">Current valuation</p>
              <p className="mt-1 text-2xl font-black">{data.summary.currentValuation.amountDisplay}</p>
              <p className="mt-2 flex items-center gap-1 text-[11px] text-emerald-300">
                <TrendingUp className="size-3" />
                Today’s {data.goldRate?.purity ?? "22K"} rate {data.goldRate?.ratePerGramDisplay ?? "—"}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {data.actionCard && (
        <section className="mt-6 flex flex-col gap-4 rounded-[1.4rem] border border-[#ead49a] bg-gradient-to-r from-[#fff9e9] to-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#d5a52e] text-white">
              <IndianRupee className="size-5" />
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[.15em] text-[#8b6517]">Ready when you are</p>
              <h2 className="mt-1 text-lg font-black">{data.actionCard.title}</h2>
              <p className="text-sm text-muted-foreground">
                {[data.actionCard.planName, data.actionCard.subtitle].filter(Boolean).join(" · ") ||
                  data.actionCard.type.replace("_", " ")}
              </p>
            </div>
          </div>
          <Button asChild className="rounded-xl bg-[#730321] font-bold">
            <Link href={customerPath(tenantSlug, "schemes", data.actionCard.schemeId)}>
              {data.actionCard.type === "REDEEM" ? "View scheme" : "Pay securely"}
              <ArrowRight />
            </Link>
          </Button>
        </section>
      )}

      {data.emptyState && data.activeSchemes.length === 0 && (
        <section className="mt-8 rounded-[1.4rem] border bg-white p-8 text-center shadow-sm">
          <p className="text-muted-foreground">{data.emptyState.message}</p>
          {customerSelfEnrol ? (
            <Button asChild className="mt-4 bg-[#730321]">
              <Link href={customerPath(tenantSlug, "plans")}>{data.emptyState.cta}</Link>
            </Button>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Contact {appName} to enrol in a savings scheme.
            </p>
          )}
        </section>
      )}

      {data.activeSchemes.length > 0 && (
        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[.16em] text-[#9b7224]">Your savings</p>
              <h2 className="mt-1 text-xl font-black">Active schemes</h2>
            </div>
            <Link href={customerPath(tenantSlug, "schemes")} className="text-sm font-bold text-[#730321]">
              View all
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.activeSchemes.map((scheme, index) => (
              <CustomerSchemeCard key={scheme.id} scheme={scheme} featured={index === 0 && Boolean(data.actionCard)} />
            ))}
          </div>
        </section>
      )}

      <div className={cn("mt-8 grid gap-4", showGoldMetrics && "lg:grid-cols-[1.4fr_.6fr]")}>
        <section className="rounded-[1.4rem] border bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground">Passbook</p>
              <h2 className="mt-1 text-lg font-black">Recent payments</h2>
            </div>
            <span className="grid size-10 place-items-center rounded-xl bg-[#f7edef] text-[#730321]">
              <WalletCards className="size-5" />
            </span>
          </div>
          {recentPayments.length ? (
            <ul className="mt-5 divide-y">
              {recentPayments.map((payment) => (
                <li key={payment.id}>
                  <Link
                    href={customerPath(tenantSlug, "payments", payment.id)}
                    className="flex items-center gap-3 py-3.5 transition hover:bg-[#fcf8f5]"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                      <IndianRupee className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black">{payment.schemeName || payment.schemeNumber}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {payment.schemeNumber}
                        {payment.receiptNumber ? ` · ${payment.receiptNumber}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black">{payment.amount.amountDisplay}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {payment.paidAt
                          ? new Date(payment.paidAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">No payments recorded yet.</p>
          )}
          <Button variant="outline" asChild className="mt-4 w-full rounded-xl">
            <Link href={customerPath(tenantSlug, "payments")}>View full passbook</Link>
          </Button>
        </section>
        {showGoldMetrics && data.goldRate ? (
          <section className="rounded-[1.4rem] border bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-[#fff4d9] text-[#9a6f17]">
                <Gem className="size-5" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">Today’s {data.goldRate.purity ?? "22K"} rate</p>
                <p className="text-xl font-black">{data.goldRate.ratePerGramDisplay ?? "—"}</p>
              </div>
            </div>
            <div className="my-5 h-px bg-border" />
            {data.goldRate.effectiveDate ? (
              <p className="text-sm leading-6 text-muted-foreground">
                Published by {data.tenant.displayName} for{" "}
                {new Date(data.goldRate.effectiveDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                .
              </p>
            ) : null}
            <Button variant="outline" asChild className="mt-5 w-full rounded-xl">
              <Link href={customerPath(tenantSlug, "gold-rate")}>View rate history</Link>
            </Button>
          </section>
        ) : null}
      </div>

      <Link
        href={customerPath(tenantSlug, "notifications")}
        className="mt-5 flex items-center gap-3 rounded-2xl border bg-white p-4 text-sm shadow-sm"
      >
        <span className="relative grid size-10 place-items-center rounded-xl bg-[#f7edef] text-[#730321]">
          <Bell className="size-5" />
          {data.unreadNotificationCount > 0 && (
            <i className="absolute right-1 top-1 size-2 rounded-full bg-red-500" />
          )}
        </span>
        <span>
          <b>{data.unreadNotificationCount} new updates</b>
          <br />
          <small className="text-muted-foreground">Payments, scheme updates and support replies</small>
        </span>
        <ArrowRight className="ml-auto size-4" />
      </Link>
    </div>
  );
}
