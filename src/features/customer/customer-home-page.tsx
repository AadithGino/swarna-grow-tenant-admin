"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  customerBannerQueryOptions,
  useCustomerBannerScheduleRefetch,
} from "@/src/lib/customer-banner-refresh";
import {
  AlertTriangle,
  Gem,
  ChevronRight,
  Coins,
  Eye,
  EyeOff,
  Heart,
  IndianRupee,
  Layers3,
  MapPin,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CustomerHomeSchemeCard } from "@/src/components/customer/customer-ui";
import { CUSTOMER_MOBILE_NAV_DOCK } from "@/src/features/customer/customer-scheme-detail-views";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import {
  useGetCustomerDigitalMetalsPortfolioQuery,
  useGetCustomerDigitalMetalsRedemptionOrdersQuery,
  useGetCustomerHomeQuery,
  useGetCustomerProfileQuery,
  useGetHomeBannersQuery,
  useGetShopAvailabilityQuery,
  useGetShopCategoriesQuery,
  useGetShopProductsQuery,
  useListShopBookingsQuery,
  useListShopOrdersQuery,
} from "@/src/store/api/customer-api";
import type { CustomerPromoBanner } from "@/src/features/customer/customer-promo-banners";
import { CustomerActivityRow } from "@/src/features/customer/customer-activity-row";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { customerBannerHref } from "@/src/lib/customer-banner-routing";
import {
  bookingHomePollMs,
  bookingPayAction,
  isOpenBooking,
  sortBookingsForHome,
  type CustomerBooking,
} from "@/src/lib/customer-shop-booking";
import { customerShopBookingPath, customerShopBookingsPath, customerShopOrderPath, customerShopOrdersPath } from "@/src/lib/customer-shop-paths";
import { BookingHighlightCard } from "@/src/features/customer/customer-shop-booking-highlight";
import { customerDigitalMetalsOrdersHubHref } from "@/src/lib/customer-digital-metals-order-links";
import { useCustomerGoldMetricsVisible } from "@/src/lib/customer-gold-ui";
import { useCustomerPortalCapabilities } from "@/src/lib/customer-portal-capabilities";
import { useCustomerKycEnabled } from "@/src/lib/customer-kyc-enabled";
import { useCustomerDigitalMetalsVisible } from "@/src/lib/customer-digital-metals-visible";
import { aggregatePortfolioValuation } from "@/src/lib/digital-metals-portfolio-summary";
import { formatInrFromPaise, ugToGramsDisplay } from "@/src/lib/digital-metals-display";
import { EcommerceCatalogImage } from "@/src/features/ecommerce/ecommerce-catalog-image";
import { buildShopOrderTimeline } from "@/src/features/customer/customer-shop-order-progress";
import { formatShopInr, productMeta, productOfferLabel, productPricePaise, productStock } from "@/src/features/customer/customer-shop-ui";
import { CkBadge, CkCard, CkSection, CkTracker, type CkStepState, type CkTone } from "@/src/components/customer/customer-kit";
import type { CustomerHome, CustomerProfile, SchemeCard } from "@/src/types/customer";

function savingsCardIdentity(home: CustomerHome, profile?: CustomerProfile | null) {
  const passbook = home.customer.passbookNumber?.trim() || profile?.passbookNumber?.trim();
  if (passbook) return { label: "Passbook", value: passbook };
  const customerNumber = profile?.customerNumber?.trim();
  if (customerNumber) return { label: "Customer no.", value: customerNumber };
  return null;
}

function payTargetScheme(schemes: SchemeCard[], actionSchemeId?: string | null) {
  return schemes.find((scheme) => scheme.id === actionSchemeId) ?? schemes.find((scheme) => scheme.canPay) ?? schemes[0];
}

function dueParts(label?: string | null) {
  const tail = (label ?? "").split("·").pop()?.trim() ?? "";
  const m = /(\d{1,2})\s+([A-Za-z]{3,})/.exec(tail);
  return m ? { day: m[1].padStart(2, "0"), month: m[2].slice(0, 3).toUpperCase() } : null;
}

const RAIL = "customer-scroll-row -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-0.5";
const BANNER_RAIL = "customer-scroll-row flex gap-2.5 overflow-x-auto pb-0.5";

/* ───────────────────────── Digital metals ───────────────────────── */

type Wallet = {
  metal: string;
  heldUg: string;
  estimatedSaleValue?: { amountPaise: number; ratePerGramPaise: number } | null;
};

function metalShort(metal: string) {
  return metal.toUpperCase() === "SILVER" ? "Ag" : "Au";
}

/* ───────────────────────── Orders ───────────────────────── */

const DM_REDEMPTION_STEPS = (pickup: boolean) => [
  { id: "requested", label: "Requested" },
  { id: "accepted", label: "Accepted" },
  { id: "packed", label: "Packed" },
  { id: "handover", label: pickup ? "Ready" : "Dispatched" },
  { id: "done", label: pickup ? "Collected" : "Delivered" },
];

function redemptionStepIndex(status: string) {
  switch (status) {
    case "CHARGE_PENDING":
      return 0;
    case "CHARGE_PAID":
    case "FULFILMENT_ACCEPTED":
      return 1;
    case "PACKING":
      return 2;
    case "DISPATCHED":
    case "PICKUP_READY":
      return 3;
    default:
      return -1;
  }
}

const REDEMPTION_LABEL: Record<string, string> = {
  CHARGE_PENDING: "Pay charges",
  CHARGE_PAID: "Preparing",
  FULFILMENT_ACCEPTED: "Accepted",
  PACKING: "Packing",
  DISPATCHED: "Dispatched",
  PICKUP_READY: "Ready for pickup",
};

function toneFromTimeline(tone: string): CkTone {
  if (tone === "success") return "ok";
  if (tone === "warning") return "warn";
  if (tone === "danger") return "bad";
  return "blue";
}

type ActiveOrder = {
  key: string;
  href: string;
  title: string;
  subtitle: string;
  badge: string;
  tone: CkTone;
  image: { uploadId?: string | null; metal?: string };
  steps: { id: string; label: string; state: CkStepState }[];
  footLeft?: React.ReactNode;
  footRight?: string;
};

function OrderCard({ order }: { order: ActiveOrder }) {
  return (
    <Link href={order.href} className="block">
      <CkCard className="p-3.5">
        <div className="flex items-start gap-3">
          {order.image.uploadId ? (
            <span className="relative size-[3.25rem] shrink-0 overflow-hidden rounded-xl bg-[#f3ece2]">
              <EcommerceCatalogImage uploadId={order.image.uploadId} channel="customer" alt="" fill className="object-cover" />
            </span>
          ) : (
            <span className="grid size-[3.25rem] shrink-0 place-items-center rounded-xl bg-[var(--ck-gold-soft)]">
              <span
                className="grid size-9 place-items-center rounded-full text-[0.7rem] font-bold"
                style={
                  order.image.metal === "SILVER"
                    ? { background: "linear-gradient(145deg,#f4f5f7,#aab1b9)", color: "#3c434b" }
                    : { background: "linear-gradient(145deg,#f4dc9c,#c49a46)", color: "#4e360c" }
                }
              >
                {metalShort(order.image.metal ?? "GOLD")}
              </span>
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.9rem] font-semibold text-[var(--ck-ink)]">{order.title}</p>
            <p className="mt-0.5 truncate text-xs tabular-nums text-[var(--ck-muted)]">{order.subtitle}</p>
            <CkBadge tone={order.tone} dot className="mt-1.5">
              {order.badge}
            </CkBadge>
          </div>
        </div>
        <CkTracker steps={order.steps} className="mt-3.5" />
        {order.footLeft || order.footRight ? (
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--ck-line-soft)] pt-2.5 text-xs text-[var(--ck-muted)]">
            <span className="flex min-w-0 items-center gap-1 truncate">{order.footLeft}</span>
            {order.footRight ? (
              <span className="flex shrink-0 items-center gap-0.5 font-semibold" style={{ color: "var(--customer-primary, #5e1622)" }}>
                {order.footRight}
                <ChevronRight className="size-3.5" />
              </span>
            ) : null}
          </div>
        ) : null}
      </CkCard>
    </Link>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export function CustomerHomePage() {
  const { tenantSlug } = useCustomerTenant();
  const { data, isLoading, isError, refetch } = useGetCustomerHomeQuery();
  const { visible: showGoldMetrics } = useCustomerGoldMetricsVisible();
  const { customerSelfEnrol, customerAppPaymentsEnabled } = useCustomerPortalCapabilities();
  const kycEnabled = useCustomerKycEnabled();
  const { data: profile } = useGetCustomerProfileQuery();
  const { data: shopAvailability } = useGetShopAvailabilityQuery();
  const shopOn = shopAvailability?.available === true;
  const { visible: metalsOn, capability: metalsCap } = useCustomerDigitalMetalsVisible();

  const homeBannersQuery = useGetHomeBannersQuery(undefined, {
    ...customerBannerQueryOptions([], null),
    pollingInterval: 60_000,
  });
  const homeBanners = homeBannersQuery.data;
  useCustomerBannerScheduleRefetch(
    (homeBanners?.items ?? []) as { startsAt?: string | null; endsAt?: string | null }[],
    homeBannersQuery.refetch,
    homeBanners?.meta,
  );

  const categories = useGetShopCategoriesQuery(undefined, { skip: !shopOn });
  const featured = useGetShopProductsQuery({ featured: true, limit: 4 }, { skip: !shopOn });
  const newest = useGetShopProductsQuery({ limit: 12, sort: "newest" }, { skip: !shopOn });
  const shopOrders = useListShopOrdersQuery({ limit: 10 }, { skip: !shopOn && !shopAvailability?.hasOrderHistory });
  const [bookingPollMs, setBookingPollMs] = useState(0);
  const bookingsQuery = useListShopBookingsQuery(
    { limit: 10 },
    { skip: !shopOn, pollingInterval: bookingPollMs > 0 ? bookingPollMs : undefined },
  );
  const openBookings = useMemo(() => {
    const items = (bookingsQuery.data?.items ?? []) as unknown as CustomerBooking[];
    return sortBookingsForHome(items.filter((b) => isOpenBooking(b.status)));
  }, [bookingsQuery.data?.items]);
  useEffect(() => {
    const next = bookingHomePollMs(openBookings);
    if (next !== bookingPollMs) setBookingPollMs(next);
  }, [openBookings, bookingPollMs]);
  const portfolio = useGetCustomerDigitalMetalsPortfolioQuery(undefined, { skip: !metalsOn });
  const redemptions = useGetCustomerDigitalMetalsRedemptionOrdersQuery({ limit: 10 }, { skip: !metalsOn });

  const [amountsVisible, setAmountsVisible] = useState(true);

  const products = useMemo(() => {
    const out: Record<string, unknown>[] = [];
    const seen = new Set<string>();
    for (const p of [...(featured.data?.items ?? []), ...(newest.data?.items ?? [])]) {
      const id = String(p.id);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(p);
      if (out.length === 4) break;
    }
    return out;
  }, [featured.data?.items, newest.data?.items]);

  const metals = useMemo(() => {
    const items = (portfolio.data?.items ?? []) as Wallet[];
    const valuation = aggregatePortfolioValuation(portfolio.data?.items ?? []);
    const byMetal = (metal: string) => items.find((w) => w.metal.toUpperCase() === metal);
    return { items, valuation, gold: byMetal("GOLD"), silver: byMetal("SILVER") };
  }, [portfolio.data?.items]);

  const activeOrders = useMemo<ActiveOrder[]>(() => {
    const out: ActiveOrder[] = [];
    for (const order of shopOrders.data?.items ?? []) {
      const timeline = buildShopOrderTimeline(order);
      if (timeline.terminal) continue;
      const lines = (order.lines as { name?: string; imageUploadId?: string | null }[] | undefined) ?? [];
      const tracking = order.deliveryTracking as { carrierName?: string; trackingNumber?: string } | null | undefined;
      const extra = lines.length > 1 ? ` + ${lines.length - 1} more` : "";
      out.push({
        key: `shop-${String(order.id)}`,
        href: customerShopOrderPath(tenantSlug, String(order.id)),
        title: `${lines[0]?.name ?? "Order"}${extra}`,
        subtitle: `${String(order.orderNumber ?? "")} · ${formatShopInr(Number(order.totalPaise ?? 0), 2)}`,
        badge: String(order.statusLabel ?? timeline.headline),
        tone: toneFromTimeline(timeline.tone),
        image: { uploadId: lines[0]?.imageUploadId ?? null },
        steps: timeline.steps.map((s) => ({ id: s.id, label: s.label, state: s.state })),
        footLeft: tracking?.trackingNumber ? (
          <>
            {tracking.carrierName ? `${tracking.carrierName} · ` : ""}
            {tracking.trackingNumber}
          </>
        ) : order.pickupBranchName ? (
          <>
            <MapPin className="size-3.5 shrink-0" />
            Pickup at {String(order.pickupBranchName)}
          </>
        ) : undefined,
        footRight: tracking?.trackingNumber ? "Track" : "Details",
      });
    }
    for (const r of redemptions.data?.items ?? []) {
      const status = String(r.status ?? "");
      const idx = redemptionStepIndex(status);
      if (idx < 0) continue;
      const pickup = String(r.fulfilmentMode ?? "") === "PICKUP";
      out.push({
        key: `dm-${String(r.id)}`,
        href: customerPath(tenantSlug, "digital-metals", "redeem-order", String(r.id)),
        title: `${String(r.itemLabel ?? "Coin")} · from digital gold`,
        subtitle: `${pickup ? "Branch pickup" : "Home delivery"} · ${formatInrFromPaise(Number(r.chargeTotalPaise ?? 0))} charges`,
        badge: REDEMPTION_LABEL[status] ?? status,
        tone: status === "CHARGE_PENDING" ? "warn" : "blue",
        image: { metal: String(r.metal ?? "GOLD").toUpperCase() },
        steps: DM_REDEMPTION_STEPS(pickup).map((s, i) => ({
          ...s,
          state: (i < idx ? "complete" : i === idx ? "current" : "upcoming") as CkStepState,
        })),
        footLeft: r.trackingReference ? <>{String(r.trackingReference)}</> : undefined,
        footRight: r.trackingReference ? "Track" : "Details",
      });
    }
    return out;
  }, [shopOrders.data?.items, redemptions.data?.items, tenantSlug]);

  if (isLoading || !data) return <PageSkeleton cards={3} />;
  if (isError) return <QueryError onRetry={refetch} />;

  const schemes = data.activeSchemes ?? [];
  const recentActivity = data.recentActivity?.length
    ? data.recentActivity
    : (data.recentPayments ?? []).map((payment) => ({
        id: `scheme_pay_${payment.id}`,
        kind: "SCHEME_PAYMENT" as const,
        title: "Scheme payment",
        subtitle: payment.schemeName || payment.schemeNumber,
        amount: payment.amount,
        occurredAt: payment.paidAt ?? "",
        statusLabel: "Paid",
        entityId: payment.id,
        direction: "OUT" as const,
      }));
  const appName = data.tenant.appDisplayName ?? data.tenant.displayName;
  const actionScheme = payTargetScheme(schemes, data.actionCard?.schemeId);
  const payHref =
    actionScheme && customerAppPaymentsEnabled
      ? customerPath(tenantSlug, "schemes", actionScheme.id)
      : customerPath(tenantSlug, "schemes");
  const goldAccumulated = data.summary.goldAccumulated?.weightDisplay;
  const currentValue = data.summary.currentValuation?.amountDisplay;
  const cardIdentity = savingsCardIdentity(data, profile);
  const kycStatus = profile?.kyc?.status;
  const showKycBanner = kycEnabled && kycStatus && kycStatus !== "VERIFIED";
  const mask = (value: string) => (amountsVisible ? value : "••••••");

  const dueAmount = actionScheme?.nextActionAmount;
  const canBuyMetal = metalsOn && metalsCap?.canPlaceNewBuy === true;
  const due = dueParts(actionScheme?.nextActionLabel);

  const goldMovement = data.goldRate?.movement ?? 0;
  const rateCells: { label: string; value: string; delta?: string; up?: boolean }[] = [];
  if (showGoldMetrics && data.goldRate) {
    rateCells.push({
      label: `${data.goldRate.purity ?? "22K"} scheme rate`,
      value: data.goldRate.ratePerGramDisplay.replace(/\s*\/\s*g/i, ""),
      delta: goldMovement ? `${goldMovement > 0 ? "▲" : "▼"}${Math.abs(goldMovement)}%` : undefined,
      up: goldMovement >= 0,
    });
  }
  if (metalsOn) {
    const goldRate = metals.gold?.estimatedSaleValue?.ratePerGramPaise;
    const silverRate = metals.silver?.estimatedSaleValue?.ratePerGramPaise;
    if (goldRate) rateCells.push({ label: "24K sell", value: formatInrFromPaise(goldRate) });
    if (silverRate) rateCells.push({ label: "Silver sell", value: formatInrFromPaise(silverRate) });
  }

  const banners = ((homeBanners?.items ?? []) as CustomerPromoBanner[]).filter((b) => b.title);
  const activeCategories = ((categories.data?.items ?? []) as { id: string; name: string; imageUploadId?: string | null }[]).slice(0, 5);

  // Two tiles in the savings card, per the plan: gold accumulated + digital gold & silver.
  type Tile = { key: string; icon: React.ComponentType<{ className?: string }>; label: string; value: string; note?: string; href?: string };
  const tiles: Tile[] = [];
  if (goldAccumulated) {
    tiles.push({ key: "gold", icon: Gem, label: "Gold accumulated", value: goldAccumulated, note: currentValue ? `Current value ${currentValue}` : undefined });
  } else if (currentValue) {
    tiles.push({ key: "value", icon: Layers3, label: "Current value", value: currentValue });
  }
  if (metalsOn) {
    const grams = [
      metals.gold ? `${ugToGramsDisplay(metals.gold.heldUg)} Au` : null,
      metals.silver ? `${ugToGramsDisplay(metals.silver.heldUg)} Ag` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    tiles.push(
      metals.valuation.anyWallet
        ? {
            key: "dm",
            icon: Coins,
            label: "Digital gold & silver",
            value: metals.valuation.combinedIndicativePaise != null ? formatInrFromPaise(metals.valuation.combinedIndicativePaise) : grams,
            note: metals.valuation.combinedIndicativePaise != null ? grams : "Value updates with today's rate",
            href: customerPath(tenantSlug, "digital-metals"),
          }
        : {
            key: "dm",
            icon: Coins,
            label: "Digital gold & silver",
            value: "Start saving",
            note: "Buy 24K gold & 999 silver",
            href: customerPath(tenantSlug, "digital-metals"),
          },
    );
  }
  if (tiles.length < 2 && dueAmount && actionScheme?.canPay) {
    tiles.push({ key: "due", icon: IndianRupee, label: "Next instalment", value: dueAmount.amountDisplay, note: actionScheme.planName });
  }
  if (tiles.length === 0) tiles.push({ key: "active", icon: Layers3, label: "Active schemes", value: String(schemes.length) });
  const shopBalance = data.summary.shopBalance;
  if (shopBalance?.summaryLine && !tiles.some((t) => t.key === "shop-scheme")) {
    tiles.push({
      key: "shop-scheme",
      icon: ShoppingBag,
      label: "Scheme shop use",
      value: shopBalance.summaryLine.split(" · ")[0] ?? shopBalance.summaryLine,
      note: shopBalance.summaryLine.includes(" · ") ? shopBalance.summaryLine.split(" · ").slice(1).join(" · ") : undefined,
      href: shopOn ? customerPath(tenantSlug, "shop", "orders") : customerPath(tenantSlug, "schemes"),
    });
  }

  const shopLoading = shopOn && (categories.isLoading || featured.isLoading || newest.isLoading);

  return (
    <div
      className="mx-auto max-w-lg"
      style={{ paddingBottom: `calc(${CUSTOMER_MOBILE_NAV_DOCK} + 0.75rem + env(safe-area-inset-bottom, 0px))` }}
    >
      <section>
        <h1 className="text-[1.6rem] font-bold leading-tight tracking-[-0.03em] text-[var(--ck-ink)]">{data.greeting.text}</h1>
        {data.greeting.subtext ? <p className="mt-1 text-[0.82rem] text-[var(--ck-muted)]">{data.greeting.subtext}</p> : null}
      </section>

      {showKycBanner ? (
        <CkCard className="mt-4 flex items-center gap-3 px-3.5 py-3">
          <AlertTriangle className="size-4 shrink-0 text-[var(--ck-warn)]" />
          <p className="min-w-0 flex-1 text-[0.8rem] leading-snug text-[var(--ck-ink-2)]">
            <b className="font-semibold text-[var(--ck-ink)]">KYC pending.</b> Complete verification to enrol in new plans.
          </p>
          <Link href={customerPath(tenantSlug, "profile", "kyc")} className="shrink-0 text-[0.8rem] font-semibold" style={{ color: "var(--customer-primary, #5e1622)" }}>
            Complete
          </Link>
        </CkCard>
      ) : null}

      {/* Savings card (plan: total, two tiles, Pay due + Buy gold) */}
      <section
        className="mt-4 overflow-hidden rounded-[1.4rem] p-4 text-white"
        style={{ background: "color-mix(in srgb, var(--customer-primary, #5e1622) 58%, #12030a)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-xs text-white/65">
            Total savings{schemes.length ? ` · ${schemes.length} active scheme${schemes.length === 1 ? "" : "s"}` : ""}
          </p>
          <div className="flex shrink-0 items-center gap-1">
            {cardIdentity ? (
              <span className="flex items-center gap-1 text-[0.7rem] text-[var(--customer-accent,#dcc08a)]">
                <ShieldCheck className="size-3.5" />
                {cardIdentity.value}
              </span>
            ) : null}
            <button
              type="button"
              className="-mr-1.5 grid size-8 place-items-center rounded-full text-white/75 hover:bg-white/10"
              aria-label={amountsVisible ? "Hide amounts" : "Show amounts"}
              onClick={() => setAmountsVisible((v) => !v)}
            >
              {amountsVisible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            </button>
          </div>
        </div>
        <p className="mt-0.5 text-[2.3rem] font-bold leading-none tracking-[-0.035em] tabular-nums">{mask(data.summary.totalPaid.amountDisplay)}</p>

        <div className={cn("mt-4 grid gap-2", tiles.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
          {tiles.slice(0, 2).map((tile) => {
            const body = (
              <>
                <span className="flex items-center gap-1.5 text-[0.7rem] text-white/70">
                  <tile.icon className="size-3.5" />
                  {tile.label}
                </span>
                <span className="mt-1.5 block truncate text-[1.05rem] font-semibold tabular-nums tracking-[-0.02em]">{tile.key === "dm" && !metals.valuation.anyWallet ? tile.value : mask(tile.value)}</span>
                {tile.note ? <span className="mt-0.5 block truncate text-[0.68rem] text-white/55">{tile.note}</span> : null}
              </>
            );
            const cls = "block min-w-0 rounded-[0.9rem] border border-white/10 bg-white/[0.07] px-3 py-2.5";
            return tile.href ? (
              <Link key={tile.key} href={tile.href} className={cls}>
                {body}
              </Link>
            ) : (
              <div key={tile.key} className={cls}>
                {body}
              </div>
            );
          })}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {dueAmount && actionScheme?.canPay && customerAppPaymentsEnabled ? (
            <Link
              href={payHref}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl text-[0.85rem] font-semibold"
              style={{ background: "var(--customer-accent, #dcc08a)", color: "#2a0a10" }}
            >
              <IndianRupee className="size-4" />
              Pay {dueAmount.amountDisplay} due
            </Link>
          ) : (
            <Link href={customerPath(tenantSlug, "schemes")} className="flex h-11 items-center justify-center gap-1.5 rounded-xl text-[0.85rem] font-semibold" style={{ background: "var(--customer-accent, #dcc08a)", color: "#2a0a10" }}>
              <Layers3 className="size-4" />
              My schemes
            </Link>
          )}
          {canBuyMetal ? (
            <Link href={customerPath(tenantSlug, "digital-metals", "buy")} className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 text-[0.85rem] font-semibold">
              <Plus className="size-4" />
              Buy gold
            </Link>
          ) : customerSelfEnrol ? (
            <Link href={customerPath(tenantSlug, "plans")} className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 text-[0.85rem] font-semibold">
              <Sparkles className="size-4" />
              Explore plans
            </Link>
          ) : (
            <Link href={customerPath(tenantSlug, "payments", "activity")} className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 text-[0.85rem] font-semibold">
              <Layers3 className="size-4" />
              Passbook
            </Link>
          )}
        </div>
      </section>

      {rateCells.length ? (
        <Link href={customerPath(tenantSlug, "gold-rate")} className="mt-2.5 flex divide-x divide-[var(--ck-line-soft)] rounded-[0.9rem] border border-[var(--ck-line)] bg-white">
          {rateCells.map((cell) => (
            <div key={cell.label} className="min-w-0 flex-1 px-3 py-2">
              <p className="truncate text-[0.66rem] font-medium text-[var(--ck-muted)]">{cell.label}</p>
              <p className="truncate text-[0.85rem] font-semibold tabular-nums text-[var(--ck-ink)]">
                {cell.value}
                {cell.delta ? (
                  <span className={cn("ml-1 text-[0.66rem] font-semibold", cell.up ? "text-[var(--ck-ok)]" : "text-[var(--ck-bad)]")}>{cell.delta}</span>
                ) : null}
              </p>
            </div>
          ))}
        </Link>
      ) : null}

      {banners.length ? (
        <CkSection title="Offers for you">
          <div className={BANNER_RAIL}>
            {banners.map((banner) => {
              const href = customerBannerHref(tenantSlug ?? "", banner.destination ?? { type: "NONE" }, { shopAvailable: shopOn });
              const card = (
                <div className="relative h-[10.5rem] w-full overflow-hidden rounded-[1.1rem] bg-[#2a0a10] text-white">
                  {banner.imageUploadId ? (
                    <EcommerceCatalogImage uploadId={banner.imageUploadId} viewUrl={banner.imageUrl ?? undefined} channel="customer" alt="" fill className="object-cover object-[70%_30%]" />
                  ) : null}
                  <span className="absolute inset-0 bg-[linear-gradient(90deg,rgba(30,6,12,.88)_0%,rgba(30,6,12,.55)_48%,rgba(30,6,12,0)_78%)]" />
                  <span className="relative flex h-full max-w-[12.5rem] flex-col p-4">
                    <span className="text-[1.35rem] font-bold leading-[1.1] tracking-[-0.03em]">{banner.title}</span>
                    {banner.subtitle ? <span className="mt-1.5 text-xs leading-snug text-white/80">{banner.subtitle}</span> : null}
                    {href ? (
                      <span className="mt-auto flex items-center gap-0.5 text-xs font-semibold">
                        Shop now
                        <ChevronRight className="size-3.5" />
                      </span>
                    ) : null}
                  </span>
                </div>
              );
              const slideClass =
                banners.length > 1
                  ? "block w-[19.5rem] max-w-full shrink-0 grow-0 snap-start"
                  : "block w-full shrink-0 grow-0 basis-full snap-start";
              return href ? (
                <Link key={banner.id} href={href} aria-label={banner.title} className={slideClass}>
                  {card}
                </Link>
              ) : (
                <div key={banner.id} className={slideClass}>
                  {card}
                </div>
              );
            })}
          </div>
        </CkSection>
      ) : null}

      {shopOn && openBookings.length > 0 ? (
        <CkSection
          title={openBookings.some((b) => bookingPayAction(b)) ? "Booking due" : "Your reserved pieces"}
          href={customerShopBookingsPath(tenantSlug)}
          linkLabel="All bookings"
        >
          <div className="space-y-2.5">
            {openBookings.slice(0, 3).map((booking) => (
              <BookingHighlightCard
                key={booking.id}
                booking={booking}
                href={customerShopBookingPath(tenantSlug, booking.id)}
              />
            ))}
          </div>
        </CkSection>
      ) : null}

      {dueAmount && actionScheme?.canPay ? (
        <CkSection title="Due next">
          <CkCard className="flex items-center gap-3 p-3.5">
            {due ? (
              <span className="w-12 shrink-0 overflow-hidden rounded-xl border border-[var(--ck-line)] text-center">
                <span className="block py-0.5 text-[0.6rem] font-bold tracking-[0.06em] text-white" style={{ background: "var(--customer-primary, #5e1622)" }}>
                  {due.month}
                </span>
                <span className="block py-1 text-xl font-bold leading-none tabular-nums text-[var(--ck-ink)]">{due.day}</span>
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-[var(--ck-muted)]">{data.actionCard?.title ?? "Your next instalment is ready"}</p>
              <p className="truncate text-[0.95rem] font-semibold text-[var(--ck-ink)]">{actionScheme.planName}</p>
              <p className="truncate text-xs tabular-nums text-[var(--ck-muted)]">
                {dueAmount.amountDisplay}
                {actionScheme.progressLabel ? ` · ${actionScheme.progressLabel}` : ""}
              </p>
            </div>
            {customerAppPaymentsEnabled ? (
              <Link href={payHref} className="shrink-0 rounded-xl px-4 py-2.5 text-[0.85rem] font-semibold text-white" style={{ background: "var(--customer-primary, #5e1622)" }}>
                Pay
              </Link>
            ) : null}
          </CkCard>
        </CkSection>
      ) : null}

      {data.emptyState && schemes.length === 0 ? (
        <CkCard className="mt-7 p-7 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--ck-gold-soft)] text-[#8a6a24]">
            <Layers3 className="size-5" />
          </span>
          <h2 className="mt-4 text-lg font-bold">Start your savings journey</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--ck-muted)]">{data.emptyState.message}</p>
          {customerSelfEnrol ? (
            <Button asChild className="mt-5 rounded-xl text-white" style={{ background: "var(--customer-primary, #5e1622)" }}>
              <Link href={customerPath(tenantSlug, "plans")}>{data.emptyState.cta}</Link>
            </Button>
          ) : (
            <p className="mt-4 text-sm font-semibold" style={{ color: "var(--customer-primary, #5e1622)" }}>Contact {appName} to enrol.</p>
          )}
        </CkCard>
      ) : null}

      {schemes.length ? (
        <CkSection title="My schemes" href={customerPath(tenantSlug, "schemes")}>
          <div className={RAIL}>
            {schemes.map((scheme) => (
              <CustomerHomeSchemeCard key={scheme.id} scheme={scheme} paymentsEnabled={customerAppPaymentsEnabled} />
            ))}
          </div>
        </CkSection>
      ) : null}

      {shopOn && activeCategories.length ? (
        <CkSection title="Shop by category" href={customerPath(tenantSlug, "shop")} linkLabel="Shop">
          <div className="grid grid-cols-5 gap-2">
            {activeCategories.map((cat) => (
              <Link key={cat.id} href={`${customerPath(tenantSlug, "shop")}?categoryId=${encodeURIComponent(cat.id)}`} className="min-w-0 text-center">
                <span className="relative mx-auto block aspect-square w-full max-w-[4rem] overflow-hidden rounded-full border border-[var(--ck-line)] bg-[#f2e9dc]">
                  {cat.imageUploadId ? <EcommerceCatalogImage uploadId={cat.imageUploadId} channel="customer" alt="" fill className="object-cover" /> : null}
                </span>
                <span className="mt-1.5 block truncate text-[0.72rem] font-medium text-[var(--ck-ink-2)]">{cat.name}</span>
              </Link>
            ))}
          </div>
        </CkSection>
      ) : null}

      {shopOn && products.length ? (
        <CkSection title="Featured for you" href={customerPath(tenantSlug, "shop")} linkLabel="See all">
          <div className="grid grid-cols-2 gap-2.5">
            {products.map((product) => {
              const stock = productStock(product);
              const offer = productOfferLabel(product);
              const price = productPricePaise(product);
              const images = (product.imageUploadIds as string[] | undefined) ?? [];
              const meta = [String(product.categoryName ?? ""), productMeta(product)].filter(Boolean).join(" · ");
              return (
                <Link key={String(product.id)} href={customerPath(tenantSlug, "shop", String(product.slug ?? product.id))} className="block">
                  <CkCard className="overflow-hidden">
                    <span className={cn("relative block aspect-square bg-[#f4ecdf]", stock.tone === "out" && "opacity-75 grayscale-[.3]")}>
                      {images[0] ? <EcommerceCatalogImage uploadId={images[0]} channel="customer" alt="" fill className="object-cover" /> : null}
                      {offer ? (
                        <CkBadge tone="brand" className="absolute left-2 top-2 bg-white/95">
                          {offer}
                        </CkBadge>
                      ) : product.featured ? (
                        <CkBadge tone="gold" className="absolute left-2 top-2">
                          Featured
                        </CkBadge>
                      ) : null}
                      <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-white/90 text-[var(--ck-ink-2)]">
                        <Heart className="size-3.5" />
                      </span>
                    </span>
                    <span className="block px-2.5 pb-3 pt-2.5">
                      <span className="block truncate text-[0.68rem] text-[var(--ck-muted)]">{meta}</span>
                      <span className="mt-0.5 block truncate text-[0.85rem] font-semibold text-[var(--ck-ink)]">{String(product.name)}</span>
                      <span className="mt-1.5 flex items-center justify-between gap-1">
                        <span className="text-[0.95rem] font-bold tabular-nums text-[var(--ck-ink)]">{price != null ? formatShopInr(price) : "Price on request"}</span>
                        {stock.label ? (
                          <span className={cn("truncate text-[0.62rem]", stock.tone === "out" ? "text-[var(--ck-bad)]" : "text-[var(--ck-muted)]")}>{stock.label}</span>
                        ) : null}
                      </span>
                    </span>
                  </CkCard>
                </Link>
              );
            })}
          </div>
        </CkSection>
      ) : null}

      {shopOn && !shopLoading && !products.length && !activeCategories.length ? (
        <CkSection title="Shop">
          <Link href={customerPath(tenantSlug, "shop")} className="block">
            <CkCard className="flex items-center gap-3 p-3.5">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--ck-gold-soft)] text-[#8a6a24]">
                <ShoppingBag className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.92rem] font-semibold text-[var(--ck-ink)]">Shop jewellery online</p>
                <p className="text-xs text-[var(--ck-muted)]">Browse {appName}&apos;s collection and order from the app.</p>
              </div>
              <ChevronRight className="size-4 text-[#ad9fa2]" />
            </CkCard>
          </Link>
        </CkSection>
      ) : null}

      {!shopOn && activeOrders.length === 0 ? (
      <CkSection title="Recent activity" href={customerPath(tenantSlug, "payments", "activity")}>
        {recentActivity.length ? (
          <div className="space-y-2.5">
            {recentActivity.slice(0, 3).map((item) => (
              <CustomerActivityRow key={item.id} item={item} tenantSlug={tenantSlug} compact />
            ))}
          </div>
        ) : (
          <CkCard className="px-4 py-8 text-center text-sm text-[var(--ck-muted)]">Your payments and orders will appear here.</CkCard>
        )}
      </CkSection>
      ) : null}

      {activeOrders.length ? (
        <CkSection
          title="Active orders"
          href={shopOn ? customerShopOrdersPath(tenantSlug) : customerDigitalMetalsOrdersHubHref(tenantSlug)}
          linkLabel="All orders"
        >
          <div className="space-y-2.5">
            {activeOrders.map((order) => (
              <OrderCard key={order.key} order={order} />
            ))}
          </div>
        </CkSection>
      ) : null}
    </div>
  );
}
