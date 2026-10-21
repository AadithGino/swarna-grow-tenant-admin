"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  customerBannerQueryOptions,
  useCustomerBannerScheduleRefetch,
} from "@/src/lib/customer-banner-refresh";
import {
  AlertTriangle,
  BarChart3,
  Check,
  ChevronRight,
  Coins,
  Eye,
  EyeOff,
  FileText,
  Gem,
  Grid2X2,
  IndianRupee,
  Layers3,
  ShoppingBag,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerHomeSchemeCard, formatCustomerDate } from "@/src/components/customer/customer-ui";
import { CUSTOMER_MOBILE_NAV_DOCK } from "@/src/features/customer/customer-scheme-detail-views";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import {
  useGetCustomerHomeQuery,
  useGetCustomerProfileQuery,
  useGetHomeBannersQuery,
  useGetShopAvailabilityQuery,
} from "@/src/store/api/customer-api";
import { CustomerPromoBanners, type CustomerPromoBanner } from "@/src/features/customer/customer-promo-banners";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { useCustomerGoldMetricsVisible } from "@/src/lib/customer-gold-ui";
import { useCustomerPortalCapabilities } from "@/src/lib/customer-portal-capabilities";
import { useCustomerKycEnabled } from "@/src/lib/customer-kyc-enabled";
import { useCustomerDigitalMetalsVisible } from "@/src/lib/customer-digital-metals-visible";
import { customerBrandStyle } from "@/src/lib/customer-brand-styles";
import type { CustomerHome, CustomerProfile, SchemeCard } from "@/src/types/customer";

function savingsCardIdentity(home: CustomerHome, profile?: CustomerProfile | null) {
  const passbook =
    home.customer.passbookNumber?.trim() || profile?.passbookNumber?.trim();
  if (passbook) {
    return { label: "Passbook no.", value: passbook };
  }
  const customerNumber = profile?.customerNumber?.trim();
  if (customerNumber) {
    return { label: "Customer no.", value: customerNumber };
  }
  return null;
}

function payTargetScheme(schemes: SchemeCard[], actionSchemeId?: string | null) {
  return schemes.find((scheme) => scheme.id === actionSchemeId) ?? schemes.find((scheme) => scheme.canPay) ?? schemes[0];
}

function GoldRateSparkline({ points }: { points: number[] }) {
  if (points.length < 2) {
    return (
      <svg className="h-10 w-20 text-[var(--customer-accent,#c9a227)]" viewBox="0 0 80 40" fill="none" aria-hidden>
        <path d="M4 28 L24 22 L44 26 L76 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const coords = points.map((value, index) => {
    const x = 4 + (index / (points.length - 1)) * 72;
    const y = 34 - ((value - min) / range) * 26;
    return `${x},${y}`;
  });
  return (
    <svg className="h-10 w-20 text-[var(--customer-accent,#c9a227)]" viewBox="0 0 80 40" fill="none" aria-hidden>
      <polyline points={coords.join(" ")} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CustomerHomePage() {
  const { tenantSlug } = useCustomerTenant();
  const { data, isLoading, isError, refetch } = useGetCustomerHomeQuery();
  const { visible: showGoldMetrics } = useCustomerGoldMetricsVisible();
  const { customerSelfEnrol, customerAppPaymentsEnabled } = useCustomerPortalCapabilities();
  const kycEnabled = useCustomerKycEnabled();
  const { data: profile } = useGetCustomerProfileQuery();
  const { data: shopAvailability } = useGetShopAvailabilityQuery();
  const { visible: digitalMetalsVisible } = useCustomerDigitalMetalsVisible();
  const homeBannersQuery = useGetHomeBannersQuery(undefined, {
    ...customerBannerQueryOptions([], null),
    pollingInterval: 60_000,
  });
  const homeBanners = homeBannersQuery.data;
  const homeBannerItems = (homeBanners?.items ?? []) as {
    startsAt?: string | null;
    endsAt?: string | null;
  }[];
  useCustomerBannerScheduleRefetch(
    homeBannerItems,
    homeBannersQuery.refetch,
    homeBanners?.meta,
  );
  const [amountsVisible, setAmountsVisible] = useState(true);

  const trendPoints = useMemo(() => {
    const trend = data?.contributionTrend ?? data?.goldAccumulationTrend ?? [];
    return trend.map((item) => {
      if ("amountPaise" in item) return item.amountPaise;
      if ("amount" in item) return item.amount.amountPaise;
      if ("weight" in item) return item.weight.weightMg;
      return 0;
    });
  }, [data?.contributionTrend, data?.goldAccumulationTrend]);

  if (isLoading || !data) return <PageSkeleton cards={3} />;
  if (isError) return <QueryError onRetry={refetch} />;

  const schemes = data.activeSchemes ?? [];
  const recentPayments = data.recentPayments ?? [];
  const appName = data.tenant.appDisplayName ?? data.tenant.displayName;
  const actionScheme = payTargetScheme(schemes, data.actionCard?.schemeId);
  const totalSavings = data.summary.totalPaid.amountDisplay;
  const goldAccumulated = data.summary.goldAccumulated?.weightDisplay;
  const currentValue = data.summary.currentValuation?.amountDisplay;
  const showSavingsBreakdown = Boolean(goldAccumulated && currentValue);

  const cardIdentity = savingsCardIdentity(data, profile);
  const kycStatus = profile?.kyc?.status;
  const showKycBanner =
    kycEnabled && kycStatus && kycStatus !== "VERIFIED";

  const quickActions = [
    {
      key: "PAY",
      label: "Pay now",
      icon: IndianRupee,
      href:
        actionScheme && customerAppPaymentsEnabled
          ? customerPath(tenantSlug, "schemes", actionScheme.id)
          : customerPath(tenantSlug, "schemes"),
    },
    ...(customerSelfEnrol
      ? [{ key: "ENROL", label: "Explore plans", icon: Grid2X2, href: customerPath(tenantSlug, "plans") }]
      : []),
    { key: "PASSBOOK", label: "Passbook", icon: WalletCards, href: customerPath(tenantSlug, "payments") },
    ...(showGoldMetrics
      ? [{ key: "GOLD", label: "Gold rate", icon: BarChart3, href: customerPath(tenantSlug, "gold-rate") }]
      : []),
    ...(digitalMetalsVisible
      ? [{ key: "DM", label: "Digital gold", icon: Coins, href: customerPath(tenantSlug, "digital-metals") }]
      : []),
  ];

  const mask = (value: string) => (amountsVisible ? value : "••••••");

  const goldMovement = data.goldRate?.movement ?? 0;
  const ratePaise = data.goldRate?.ratePerGramPaise ?? 0;
  const movementRupee =
    ratePaise > 0 && goldMovement !== 0
      ? Math.round((Math.abs(goldMovement) / 100) * (ratePaise / 100))
      : null;
  const movementLabel =
    goldMovement === 0
      ? "No change today"
      : movementRupee != null && movementRupee > 0
        ? `${goldMovement > 0 ? "▲" : "▼"} ₹${movementRupee.toLocaleString("en-IN")} today`
        : `${goldMovement > 0 ? "▲" : "▼"} ${Math.abs(goldMovement)}% today`;

  return (
    <div
      className="mx-auto max-w-lg"
      style={{ paddingBottom: `calc(${CUSTOMER_MOBILE_NAV_DOCK} + 0.75rem + env(safe-area-inset-bottom, 0px))` }}
    >
      <section>
        <h1 className="text-[1.65rem] font-black tracking-[-.03em] text-[#11111b]">{data.greeting.text}</h1>
        {data.greeting.subtext ? (
          <p className="mt-1 text-sm text-[#777280]">{data.greeting.subtext}</p>
        ) : null}
      </section>

      {showKycBanner ? (
        <section
          className="mt-5 flex flex-col gap-3 rounded-2xl border border-[rgba(var(--customer-primary-rgb,115,3,33),0.28)] bg-[#fff4eb] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <AlertTriangle className="size-4 shrink-0 text-[var(--customer-primary,#730321)]" strokeWidth={2.25} />
            <p className="text-xs leading-snug text-[#706b77] sm:text-sm">
              <span className="font-black text-[#171722]">KYC pending</span>
              <span className="hidden sm:inline"> — </span>
              <span className="block sm:inline">Complete verification to enrol in new plans</span>
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="h-8 shrink-0 rounded-full border-[var(--customer-primary,#730321)] bg-white/80 px-4 text-xs font-bold text-[var(--customer-primary,#730321)] hover:bg-white"
          >
            <Link href={customerPath(tenantSlug, "profile", "kyc")}>Complete KYC</Link>
          </Button>
        </section>
      ) : null}

      <section
        className="relative mt-5 overflow-hidden rounded-[1.35rem] p-5 text-white shadow-[0_16px_40px_rgba(var(--customer-primary-rgb,115,3,33),0.28)] sm:p-6"
        style={{ background: "var(--customer-primary, #730321)" }}
      >
        <svg
          className="pointer-events-none absolute -bottom-6 -right-4 h-36 w-36 opacity-[0.14]"
          viewBox="0 0 120 120"
          fill="none"
          aria-hidden
        >
          <path
            d="M88 72 L90 82 L100 82 L92 88 L94 98 L88 92 L82 98 L84 88 L76 82 L86 82 Z"
            stroke="var(--customer-accent, #c9a227)"
            strokeWidth="1.2"
            fill="none"
          />
          <path
            d="M98 48 L99 54 L105 54 L100 58 L101 64 L98 61 L95 64 L96 58 L91 54 L97 54 Z"
            stroke="var(--customer-accent, #c9a227)"
            strokeWidth="0.9"
            fill="none"
            opacity="0.7"
          />
        </svg>

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/90">Total savings</p>
            {cardIdentity ? (
              <p className="mt-1 truncate text-xs font-medium text-white/75">
                {cardIdentity.label}{" "}
                <span className="font-bold text-white/95">{cardIdentity.value}</span>
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="grid size-9 shrink-0 place-items-center rounded-full text-white/90 transition hover:bg-white/10"
            aria-label={amountsVisible ? "Hide amounts" : "Show amounts"}
            onClick={() => setAmountsVisible((value) => !value)}
          >
            {amountsVisible ? <Eye className="size-[1.15rem]" /> : <EyeOff className="size-[1.15rem]" />}
          </button>
        </div>
        <p className="relative z-10 mt-2 text-[2.35rem] font-black tracking-[-.04em] sm:text-[2.65rem]">{mask(totalSavings)}</p>

        {showSavingsBreakdown ? (
          <div className="relative z-10 mt-5 border-t border-white/25 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-medium text-white/80">Gold accumulated</p>
                <p className="mt-1 text-base font-black sm:text-lg">{mask(goldAccumulated!)}</p>
              </div>
              <div className="border-l border-white/25 pl-4">
                <p className="text-[11px] font-medium text-white/80">Current value</p>
                <p className="mt-1 text-base font-black sm:text-lg">{mask(currentValue!)}</p>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section
        className={`mt-4 grid gap-2.5 ${quickActions.length >= 4 ? "grid-cols-4" : quickActions.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}
      >
        {quickActions.map((action) => (
          <Link
            key={action.key}
            href={action.href}
            className="flex min-h-[5.35rem] flex-col items-center justify-center gap-2 rounded-2xl border border-[#f0ebe6] bg-white px-1 py-3.5 text-center shadow-[0_6px_20px_rgba(var(--customer-primary-rgb,115,3,33),0.06)] transition active:scale-[0.98]"
          >
            <span className="grid size-11 place-items-center rounded-2xl bg-[#f6edf0] text-[var(--customer-primary,#730321)]">
              <action.icon className="size-[1.2rem]" strokeWidth={2.15} />
            </span>
            <span className="text-[0.6875rem] font-bold leading-tight text-[#292732]">{action.label}</span>
          </Link>
        ))}
      </section>

      {digitalMetalsVisible ? (
        <Link
          href={customerPath(tenantSlug, "digital-metals")}
          className="mt-5 flex items-center gap-4 rounded-[1.5rem] border border-[#eaded9] bg-white p-5 shadow-[0_6px_20px_rgba(var(--customer-primary-rgb,115,3,33),0.06)] transition hover:border-[rgba(var(--customer-primary-rgb,115,3,33),0.22)] sm:p-6"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#f6edf0] text-[var(--customer-primary,#730321)]">
            <Coins className="size-6" strokeWidth={2.1} />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block font-serif text-xl text-[#171722]">Digital Gold & Silver</strong>
            <small className="mt-1 block text-xs text-[#706b77]">
              Buy, sell, and redeem digital metal from your portfolio.
            </small>
          </span>
          <ChevronRight className="size-5 shrink-0 text-[var(--customer-primary,#730321)]" />
        </Link>
      ) : null}

      {shopAvailability?.available === true ? (
        <Link
          href={customerPath(tenantSlug, "shop")}
          className="mt-5 flex items-center gap-4 rounded-[1.5rem] p-5 text-white transition hover:brightness-110 sm:p-6"
          style={customerBrandStyle.primaryPromoCard}
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10" style={customerBrandStyle.heroIconAccent}><ShoppingBag className="size-6" /></span>
          <span className="min-w-0 flex-1"><strong className="block font-serif text-xl">Explore the online store</strong><small className="mt-1 block text-xs" style={customerBrandStyle.promoSubtext}>Browse jewellery and see the current price breakdown.</small></span>
          <ChevronRight className="size-5 shrink-0" />
        </Link>
      ) : null}

      {data.emptyState && schemes.length === 0 ? (
        <section className="customer-surface mt-7 p-8 text-center">
          <span
            className="mx-auto grid size-14 place-items-center rounded-full text-[var(--customer-accent,#8b5f08)]"
            style={{ background: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.18)" }}
          >
            <Layers3 className="size-6" />
          </span>
          <h2 className="mt-4 text-xl font-black">Start your savings journey</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#706b77]">{data.emptyState.message}</p>
          {customerSelfEnrol ? (
            <Button asChild className="mt-5 rounded-xl text-white" style={{ background: "var(--customer-primary, #730321)" }}>
              <Link href={customerPath(tenantSlug, "plans")}>{data.emptyState.cta}</Link>
            </Button>
          ) : (
            <p className="mt-4 text-sm font-semibold text-[var(--customer-primary,#730321)]">Contact {appName} to enrol.</p>
          )}
        </section>
      ) : null}

      {schemes.length > 0 ? (
        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-[1.05rem] font-black text-[#171722]">Active schemes</h2>
            <Link href={customerPath(tenantSlug, "schemes")} className="inline-flex items-center gap-0.5 text-sm font-bold text-[var(--customer-primary,#730321)]">
              View all
              <ChevronRight className="size-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {schemes.slice(0, 3).map((scheme) => (
              <CustomerHomeSchemeCard key={scheme.id} scheme={scheme} paymentsEnabled={customerAppPaymentsEnabled} />
            ))}
          </div>
        </section>
      ) : null}

      <CustomerPromoBanners
        tenantSlug={tenantSlug}
        className="mt-7"
        placement="home-feed"
        shopAvailable={shopAvailability?.available === true}
        items={(homeBanners?.items ?? []) as CustomerPromoBanner[]}
      />

      {showGoldMetrics && data.goldRate ? (
        <Link
          href={customerPath(tenantSlug, "gold-rate")}
          className="mt-6 flex items-stretch gap-3 rounded-2xl border border-[rgba(var(--customer-accent-rgb,201,162,39),0.22)] p-4 sm:p-[1.05rem]"
          style={{ background: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.11)" }}
        >
          <span
            className="grid size-12 shrink-0 place-items-center self-center rounded-2xl text-[var(--customer-accent,#8b5f08)]"
            style={{ background: "rgba(var(--customer-accent-rgb, 201, 162, 39), 0.22)" }}
          >
            <Gem className="size-5" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1 self-center">
            <p className="text-xs font-semibold text-[#77727c]">Today&apos;s gold rate</p>
            <p className="mt-0.5 text-sm font-black text-[#171722]">
              {data.goldRate.purity ?? "22K"} · {data.goldRate.ratePerGramDisplay.replace(/\s*\/\s*g/i, "/g")}
            </p>
            <p className={`mt-0.5 text-xs font-semibold ${goldMovement >= 0 ? "text-[#0b9860]" : "text-red-600"}`}>
              {movementLabel}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end justify-between gap-2 py-0.5">
            <GoldRateSparkline points={trendPoints} />
            <p className="inline-flex items-center gap-0.5 text-[0.65rem] font-bold text-[var(--customer-primary,#730321)]">
              View history
              <ChevronRight className="size-3.5" />
            </p>
          </div>
        </Link>
      ) : null}

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[1.05rem] font-black text-[#171722]">Recent activity</h2>
          <Link href={customerPath(tenantSlug, "payments")} className="inline-flex items-center gap-0.5 text-sm font-bold text-[var(--customer-primary,#730321)]">
            View all
            <ChevronRight className="size-4" />
          </Link>
        </div>
        {recentPayments.length ? (
          <div className="space-y-3">
            {recentPayments.slice(0, 3).map((payment) => (
              <Link
                key={payment.id}
                href={customerPath(tenantSlug, "payments", payment.id)}
                className="flex items-center gap-3.5 rounded-2xl border border-[#f0ebe6] bg-white p-4 shadow-[0_8px_24px_rgba(var(--customer-primary-rgb,115,3,33),0.06)] transition hover:-translate-y-0.5 sm:p-[1.05rem]"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#0b9860] text-white shadow-[0_4px_12px_rgba(11,152,96,0.28)]">
                  <Check className="size-5" strokeWidth={2.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.9375rem] font-bold leading-snug text-[#171722]">Payment successful</p>
                  <p className="mt-1 truncate text-sm text-[#77727c]">
                    <span className="font-semibold text-[#5c5763]">{payment.amount.amountDisplay}</span>
                    <span className="mx-2 text-[#d5ced6]">·</span>
                    {payment.paidAt ? formatCustomerDate(payment.paidAt) : "—"}
                  </p>
                </div>
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f6f2ee] text-[#a59da8]">
                  <FileText className="size-[1.15rem]" strokeWidth={1.75} />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="customer-surface px-4 py-9 text-center text-sm text-[#77727c] sm:px-5">
            Your verified payments will appear here.
          </div>
        )}
      </section>
    </div>
  );
}
