"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Boxes,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  ExternalLink,
  Gem,
  PackageOpen,
  Plus,
  Store,
  Truck,
  Wallet,
} from "lucide-react";
import { PageHeader, StatCard, Surface } from "@/src/components/common/page-parts";
import { EmptyState } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import {
  HeroStat,
  HeroStatusPill,
  SectionHero,
  heroButtonClass,
  heroPrimaryButtonClass,
} from "@/src/components/admin-ui/section-hero";
import { TrendChart } from "@/src/components/admin-ui/trend-chart";
import { CellStack, InitialsAvatar } from "@/src/components/admin-ui/admin-table";
import { useAppSelector } from "@/src/store/hooks";
import {
  useGetEcommerceFulfilmentSettingsQuery,
  useGetEcommerceGoldRatesCurrentQuery,
  useGetEcommerceInventoryQuery,
  useGetEcommerceOrdersQuery,
  useGetEcommerceProductsQuery,
  useGetEcommerceReportsQuery,
  useGetEcommerceWorkspaceSummaryQuery,
  useGetSettingsOperationsQuery,
} from "@/src/store/api/admin-api";
import { customerPath, tenantCodeToSlug } from "@/src/lib/customer-tenant";
import { istBusinessDateToday } from "@/src/lib/ist-business-date";
import { cn } from "@/lib/utils";
import { useEcommerceAdminAccess } from "./ecommerce-admin-shared";
import { EcommerceCatalogImage } from "./ecommerce-catalog-image";
import { customerListLabel, formatOrderInr, orderLinePreview } from "./ecommerce-order-ui";

function shiftIstDate(ymd: string, days: number) {
  const d = new Date(`${ymd}T12:00:00+05:30`);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function inrCompact(paise: number) {
  const r = paise / 100;
  if (r >= 1e7) return `₹${(r / 1e7).toFixed(2)}Cr`;
  if (r >= 1e5) return `₹${(r / 1e5).toFixed(2)}L`;
  if (r >= 1e3) return `₹${(r / 1e3).toFixed(1)}K`;
  return `₹${Math.round(r)}`;
}

function moneyValue(v: unknown): number {
  if (v && typeof v === "object" && "amountPaise" in (v as Record<string, unknown>)) {
    return Number((v as { amountPaise: number }).amountPaise ?? 0);
  }
  return Number(v ?? 0);
}

function SetupRow({ ok, label, detail, href }: { ok: boolean; label: string; detail: string; href: string }) {
  return (
    <li>
      <Link href={href} className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-[#fcf6f4]">
        {ok ? (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
        ) : (
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden />
        )}
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-[#28161a]">{label}</span>
          <span className="block text-sm text-[#857a7d]">{detail}</span>
        </span>
        <ArrowRight className="mt-1 size-4 shrink-0 text-[#c4b2b5]" aria-hidden />
      </Link>
    </li>
  );
}

export function EcommerceStoreOverviewPage() {
  const { canRead, readBlockedMessage, entitled } = useEcommerceAdminAccess();
  const session = useAppSelector((s) => s.session.session);
  const skip = !canRead;
  const [today] = useState(() => istBusinessDateToday());
  const from = shiftIstDate(today, -29);

  const summary = useGetEcommerceWorkspaceSummaryQuery({ period: "THIS_MONTH" }, { skip });
  const operations = useGetSettingsOperationsQuery();
  const orders = useGetEcommerceOrdersQuery({ limit: 8 }, { skip });
  const products = useGetEcommerceProductsQuery({ includePricing: true, limit: 100 }, { skip });
  const inventory = useGetEcommerceInventoryQuery({ limit: 100 }, { skip });
  const goldRates = useGetEcommerceGoldRatesCurrentQuery(undefined, { skip });
  const fulfilment = useGetEcommerceFulfilmentSettingsQuery(undefined, { skip });
  const sales = useGetEcommerceReportsQuery({ reportKey: "ECOMMERCE_SALES", period: "CUSTOM", from, to: today, limit: 60 }, { skip });
  const placed = useGetEcommerceReportsQuery(
    { reportKey: "ECOMMERCE_ORDERS_FULFILMENT", period: "CUSTOM", from, to: today, limit: 50 },
    { skip },
  );
  const topProducts = useGetEcommerceReportsQuery({ reportKey: "ECOMMERCE_PRODUCTS", period: "CUSTOM", from, to: today, limit: 5 }, { skip });

  const s = summary.data;
  const storeLive = operations.data?.ecommerce?.active === true;
  const shopHref = session?.tenant?.tenantCode ? customerPath(tenantCodeToSlug(session.tenant.tenantCode), "shop") : "/customer/shop";

  const salesPoints = useMemo(() => {
    const charts = (sales.data?.charts ?? {}) as Record<string, { series?: { key: string; data: { x: string; y: number }[] }[] }>;
    const series = charts.collectionsTrend?.series ?? [];
    const byDay = new Map<string, number>();
    for (const line of series) {
      if (/REFUND/i.test(line.key)) continue;
      for (const p of line.data ?? []) byDay.set(p.x, (byDay.get(p.x) ?? 0) + Number(p.y ?? 0));
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([x, y]) => ({
        label: new Date(`${x}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        value: y,
      }));
  }, [sales.data?.charts]);
  const salesTotal = salesPoints.reduce((sum, p) => sum + p.value, 0);

  const statusRows = ((placed.data?.rows ?? []) as { key?: string; status?: string; label?: string; count?: number }[]).filter(
    (r) => Number(r.count) > 0,
  );
  const statusMax = Math.max(1, ...statusRows.map((r) => Number(r.count ?? 0)));

  const productItems = (products.data?.items ?? []) as Record<string, unknown>[];
  const published = productItems.filter((p) => p.status === "PUBLISHED").length;
  const drafts = productItems.filter((p) => p.status === "DRAFT").length;
  const unpriced = productItems.filter((p) => p.status === "PUBLISHED" && (p.pricing as { computable?: boolean } | undefined)?.computable === false).length;
  const invRows = (inventory.data?.items ?? []) as Record<string, unknown>[];
  const lowStock = invRows.filter((r) => r.stockPolicy === "QUANTITY_TRACKED" && Number(r.availableQuantity ?? 0) <= 2);
  const outOfStock = lowStock.filter((r) => Number(r.availableQuantity ?? 0) <= 0).length;

  const rateRows = goldRates.data?.rates ?? [];
  const rate22 = rateRows.find((r) => String(r.purity) === "22K") ?? rateRows[0];
  const rateFresh = Boolean(rate22?.ratePerGram?.amountDisplay);
  const readiness = (fulfilment.data?.checkoutReadiness ?? {}) as { checkoutTaxReady?: boolean; checkoutUsable?: boolean; blockers?: unknown[] };
  const deliveryOn = fulfilment.data?.deliveryEnabled === true || fulfilment.data?.pickupEnabled === true;

  if (!canRead) {
    return <PageHeader title="Online store" description={readBlockedMessage ?? "Ecommerce read access required."} />;
  }

  const attention = [
    { label: "COD to accept", value: s?.placement.codPendingAcceptancePlacedInPeriod, href: "/ecommerce/orders?view=cod_acceptance", icon: Wallet, tone: "gold" as const },
    { label: "To fulfil", value: s?.pipeline.awaitingFulfilment, href: "/ecommerce/orders?view=to_fulfil", icon: PackageOpen, tone: "wine" as const },
    { label: "Payment issues", value: s?.pipeline.paymentExceptionsOpen, href: "/ecommerce/orders?view=payment_issues", icon: AlertTriangle, tone: "red" as const },
    { label: "Low on stock", value: lowStock.length, href: "/ecommerce/inventory", icon: Boxes, tone: "cream" as const },
  ];

  return (
    <div className="space-y-6">
      <SectionHero
        icon={Store}
        eyebrow="Online store"
        title={session?.tenant?.displayName ? `${session.tenant.displayName} shop` : "Your online store"}
        status={storeLive ? <HeroStatusPill tone="live">Live for customers</HeroStatusPill> : <HeroStatusPill tone="off">Not live</HeroStatusPill>}
        description="Jewellery customers order from your app — gold-rate priced, paid online or cash on delivery, delivered or picked up at a branch."
        actions={
          <>
            <a href={shopHref} target="_blank" rel="noreferrer" className={heroButtonClass}>
              <ExternalLink className="size-4" /> Preview shop
            </a>
            {entitled ? (
              <Link href="/ecommerce/catalog?new=1" className={heroPrimaryButtonClass}>
                <Plus className="size-4" /> Add product
              </Link>
            ) : null}
          </>
        }
      >
        <HeroStat label="Net collected · this month" value={s?.collections.netCollected?.amountDisplay ?? "—"} detail={`${s?.collections.collectedOrderCount ?? 0} paid orders`} loading={summary.isLoading} />
        <HeroStat label="Orders placed" value={s ? String(s.placement.ordersPlaced) : "—"} detail={`${s?.placement.onlinePaidOrdersPlacedInPeriod ?? 0} paid online`} loading={summary.isLoading} href="/ecommerce/orders" />
        <HeroStat label="Average order" value={s?.collections.averageCollectedOrderValue?.amountDisplay ?? "—"} detail="Collected orders" loading={summary.isLoading} />
        <HeroStat label="22K store rate" value={rate22?.ratePerGram?.amountDisplay ? `${rate22.ratePerGram.amountDisplay}/g` : "Not set"} detail={rate22?.effectiveAt ? `Since ${new Date(String(rate22.effectiveAt)).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}` : "Publish to price products"} loading={goldRates.isLoading} href="/ecommerce/gold-rates" />
      </SectionHero>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {attention.map((a) => (
          <StatCard
            key={a.label}
            href={a.href}
            icon={a.icon}
            label={a.label}
            value={a.value == null ? "—" : String(a.value)}
            tone={a.value ? a.tone : "wine"}
            loading={summary.isLoading && a.label !== "Low on stock"}
            detail={
              a.label === "COD to accept"
                ? "Confirm or decline new COD orders"
                : a.label === "To fulfil"
                  ? "Paid orders waiting to be packed"
                  : a.label === "Payment issues"
                    ? "Mismatched or stuck payments"
                    : outOfStock
                      ? `${outOfStock} out of stock`
                      : "Tracked items with 2 or fewer left"
            }
          />
        ))}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Surface
          title="Sales — last 30 days"
          description="Online and COD collections per day"
          action={<span className="text-lg font-extrabold tabular-nums text-[#28161a]">{inrCompact(salesTotal)}</span>}
        >
          <div className="px-5 pb-4 pt-3">
            {salesPoints.length ? (
              <TrendChart ariaLabel="Daily store collections" bars points={salesPoints} format={(v) => formatOrderInr(v)} height={220} tone="wine" />
            ) : (
              <p className="py-12 text-center text-sm text-[#7a6d70]">{sales.isLoading ? "Loading…" : "No sales in the last 30 days."}</p>
            )}
          </div>
        </Surface>
        <Surface title="Order pipeline" description="Orders placed in the last 30 days, by where they are now">
          {statusRows.length ? (
            <ul className="space-y-3 px-5 py-4">
              {statusRows.map((r) => (
                <li key={String(r.key ?? r.status)}>
                  <Link href={`/ecommerce/orders?status=${encodeURIComponent(String(r.status ?? r.key ?? ""))}`} className="group block">
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-[#3c2a2e] group-hover:text-[#7b0a2b]">
                        {String(r.label ?? r.status ?? "").replace(/^\w/, (c) => c.toUpperCase())}
                      </span>
                      <span className="font-bold tabular-nums">{r.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#f3ebe8]">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          /DELIVER/.test(String(r.status)) ? "bg-emerald-500" : /CANCEL|EXPIRED/.test(String(r.status)) ? "bg-stone-300" : /COD|PENDING/.test(String(r.status)) ? "bg-amber-400" : "bg-[#7b0a2b]",
                        )}
                        style={{ width: `${(Number(r.count ?? 0) / statusMax) * 100}%` }}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-[#7a6d70]">{placed.isLoading ? "Loading…" : "No orders yet."}</p>
          )}
        </Surface>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Surface
          icon={ClipboardList}
          title="Latest orders"
          action={
            <Link href="/ecommerce/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-[#7b0a2b] hover:underline">
              All orders <ArrowRight className="size-3.5" />
            </Link>
          }
        >
          {(orders.data?.items ?? []).length === 0 ? (
            <EmptyState icon={ClipboardList} title="No orders yet" detail="Orders from your shop appear here the moment they're placed." />
          ) : (
            <ul className="divide-y divide-[#f3eae7]">
              {(orders.data?.items ?? []).map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/ecommerce/orders/${encodeURIComponent(o.id)}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 transition-colors hover:bg-[#fcf6f4] sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_9rem_7.5rem]"
                  >
                    <CellStack
                      leading={<InitialsAvatar name={customerListLabel(o)} className="size-8 text-[0.7rem]" />}
                      primary={customerListLabel(o)}
                      secondary={o.orderNumber ?? o.id}
                    />
                    <span className="hidden truncate text-sm text-[#5c4a4e] sm:block">{orderLinePreview(o) || "—"}</span>
                    <span className="hidden sm:block">
                      <StatusBadge status={o.status} />
                    </span>
                    <span className="text-right">
                      <span className="block font-bold tabular-nums">{formatOrderInr(o.totalPaise ?? 0)}</span>
                      <span className="block text-xs text-[#9a8d90]">{o.paymentMethod === "COD" ? "Cash on delivery" : "Online"}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Surface>
        <Surface
          icon={Gem}
          title="Best sellers"
          description="By collected sales, last 30 days"
          action={
            <Link href="/ecommerce/catalog" className="text-sm font-semibold text-[#7b0a2b] hover:underline">
              Products
            </Link>
          }
        >
          {(topProducts.data?.rows ?? []).length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-[#7a6d70]">{topProducts.isLoading ? "Loading…" : "No sales yet."}</p>
          ) : (
            <ol className="divide-y divide-[#f3eae7]">
              {((topProducts.data?.rows ?? []) as Record<string, unknown>[]).slice(0, 5).map((r, i) => (
                <li key={String(r.key ?? i)} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-4 text-sm font-bold text-[#c9ad86]">{i + 1}</span>
                  <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-[#f7f1eb]">
                    {r.imageUploadId ? <EcommerceCatalogImage uploadId={String(r.imageUploadId)} channel="admin" alt="" fill /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-[#28161a]">{String(r.name ?? r.sku ?? "Product")}</span>
                    <span className="block text-xs text-[#857a7d]">{String(r.unitsOrdered ?? 0)} sold</span>
                  </span>
                  <span className="font-bold tabular-nums">{inrCompact(moneyValue(r.collectedSales))}</span>
                </li>
              ))}
            </ol>
          )}
        </Surface>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Surface icon={Gem} title="Catalogue health">
          <dl className="grid grid-cols-2 gap-px bg-[#f1e8e5] sm:grid-cols-4">
            {[
              { label: "Published", value: published, href: "/ecommerce/catalog?status=PUBLISHED" },
              { label: "Drafts", value: drafts, href: "/ecommerce/catalog?status=DRAFT" },
              { label: "No price", value: unpriced, href: "/ecommerce/catalog", warn: unpriced > 0 },
              { label: "Out of stock", value: outOfStock, href: "/ecommerce/inventory", warn: outOfStock > 0 },
            ].map((m) => (
              <Link key={m.label} href={m.href} className="bg-white px-5 py-4 transition-colors hover:bg-[#fcf6f4]">
                <dt className="text-xs text-[#8a7c80]">{m.label}</dt>
                <dd className={cn("mt-1 text-2xl font-extrabold tabular-nums", m.warn ? "text-amber-700" : "text-[#28161a]")}>{products.isLoading ? "…" : m.value}</dd>
              </Link>
            ))}
          </dl>
          {lowStock.length ? (
            <ul className="divide-y divide-[#f3eae7] border-t border-[#efe5e1]">
              {lowStock.slice(0, 4).map((r) => (
                <li key={String(r.productId)} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <span className="truncate">{String(r.productName)}</span>
                  <StatusBadge status={Number(r.availableQuantity ?? 0) <= 0 ? "OUT_OF_STOCK" : "LOW_STOCK"} label={Number(r.availableQuantity ?? 0) <= 0 ? "Out of stock" : `${String(r.availableQuantity)} left`} />
                </li>
              ))}
            </ul>
          ) : null}
        </Surface>
        <Surface icon={BadgeCheck} title="Ready to sell?" description="Everything checkout needs">
          <ul className="divide-y divide-[#f3eae7]">
            <SetupRow ok={storeLive} label="Store switched on" detail={storeLive ? "Customers can browse your shop" : "Turn it on in Settings → Subscription"} href="/settings/subscription" />
            <SetupRow ok={rateFresh} label="Store gold rate published" detail={rateFresh ? `22K at ${rate22?.ratePerGram?.amountDisplay}/g` : "Products can't be priced without it"} href="/ecommerce/gold-rates" />
            <SetupRow ok={readiness.checkoutTaxReady === true} label="GST on the final bill" detail={readiness.checkoutTaxReady ? "Configured" : "Finish GST & HSN and checkout tax"} href="/ecommerce/tax" />
            <SetupRow ok={deliveryOn} label="Delivery or pickup" detail={deliveryOn ? "At least one handover option is on" : "Turn on branch pickup or delivery"} href="/ecommerce/fulfilment" />
            <SetupRow ok={published > 0} label="Products published" detail={published ? `${published} live products` : "Publish your first product"} href="/ecommerce/catalog" />
          </ul>
        </Surface>
      </div>
      <p className="flex items-center gap-2 text-xs text-[#9a8d90]">
        <Truck className="size-3.5" aria-hidden /> Store money is kept separate from scheme collections.
      </p>
    </div>
  );
}
