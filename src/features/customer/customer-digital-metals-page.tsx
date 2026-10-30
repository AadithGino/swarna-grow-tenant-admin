"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Banknote, ChevronRight, FileText, History, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { customerPath } from "@/src/lib/customer-tenant";
import {
  useGetCustomerDigitalMetalsCapabilityQuery,
  useGetCustomerDigitalMetalsOpenOrdersSummaryQuery,
  useGetCustomerDigitalMetalsPassbookQuery,
  useGetCustomerDigitalMetalsPortfolioQuery,
  useGetCustomerDigitalMetalsStatementQuery,
} from "@/src/store/api/customer-api";
import {
  customerDigitalMetalsOrdersHubHref,
  customerDigitalMetalsOrderActionLabel,
} from "@/src/lib/customer-digital-metals-order-links";
import { CustomerDigitalMetalsDocumentPanel } from "@/src/features/customer/customer-digital-metals-document-panel";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { formatInrFromPaise } from "@/src/lib/digital-metals-display";
import { aggregatePortfolioValuation } from "@/src/lib/digital-metals-portfolio-summary";
import { defaultStatementDateRange } from "@/src/lib/customer-digital-metals-statement-dates";
import {
  dedupePassbookRows,
  formatPassbookWhen,
  passbookActivityTitle,
  passbookOrderHref,
  passbookOrderLinkLabel,
  passbookPurchaseActivityLines,
  passbookRedemptionActivityLines,
  passbookReferenceLabel,
  passbookSellActivityLines,
  formatPassbookRowQuantity,
} from "@/src/lib/customer-digital-metals-passbook-ui";
import type { DigitalMetalsRedemptionPassbookSummary } from "@/src/lib/customer-digital-metals-passbook-ui";
import type { DigitalMetalsSellSummary } from "@/src/lib/customer-digital-metals-sell-receipt";
import type { DigitalMetalsPurchaseSummary } from "@/src/lib/customer-digital-metals-purchase-receipt";
import {
  CustomerDmAssetCard,
  CustomerDmEmptyPortfolio,
  CustomerDmPageShell,
  CustomerDmQuickActionGrid,
  CustomerDmSectionTitle,
  CustomerDmSurface,
  DM_QUICK_ICONS,
  DmCoinArt,
} from "@/src/features/customer/customer-digital-metals-shared";
import { ugToGramsDisplay } from "@/src/lib/digital-metals-display";

type DigitalMetalsBlocker = { code: string; message: string };

function tradingBlockers(
  capability: NonNullable<
    ReturnType<typeof useGetCustomerDigitalMetalsCapabilityQuery>["data"]
  >,
): DigitalMetalsBlocker[] {
  const codes = new Set([
    "TAX_CONFIG_INCOMPLETE",
    "TERMS_NOT_PUBLISHED",
    "RATE_MISSING",
    "SETTINGS_MISSING",
    "OPERATIONS_PAUSED",
  ]);
  return (capability.blockers ?? []).filter(
    (b: DigitalMetalsBlocker) => codes.has(b.code) || !capability.canPlaceNewBuy,
  );
}

export function CustomerDigitalMetalsPage() {
  const { tenantSlug } = useCustomerTenant();
  const defaultRange = useMemo(() => defaultStatementDateRange(), []);
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);
  const [passbookCursor, setPassbookCursor] = useState<string | undefined>(undefined);
  const [passbookItems, setPassbookItems] = useState<Record<string, unknown>[]>([]);

  const capability = useGetCustomerDigitalMetalsCapabilityQuery(undefined, {
    skip: !tenantSlug,
  });
  const openOrders = useGetCustomerDigitalMetalsOpenOrdersSummaryQuery(undefined, {
    skip: !tenantSlug,
  });
  const portfolio = useGetCustomerDigitalMetalsPortfolioQuery(undefined, {
    skip: !tenantSlug || !capability.data?.canViewHoldings,
  });
  const passbook = useGetCustomerDigitalMetalsPassbookQuery(
    { cursor: passbookCursor, limit: 15 },
    { skip: !tenantSlug || !capability.data?.canViewHoldings },
  );
  const statement = useGetCustomerDigitalMetalsStatementQuery(
    { fromBusinessDate: fromDate, toBusinessDate: toDate },
    { skip: !tenantSlug || !capability.data?.canViewHoldings },
  );

  const mergedPassbook = useMemo(() => {
    const batch = passbook.data?.items ?? [];
    const merged = !passbookCursor
      ? batch
      : (() => {
          const ids = new Set(passbookItems.map((r) => String(r.id)));
          return [...passbookItems, ...batch.filter((r) => !ids.has(String(r.id)))];
        })();
    return dedupePassbookRows(merged);
  }, [passbook.data?.items, passbookCursor, passbookItems]);

  const portfolioSummary = useMemo(() => {
    const items = portfolio.data?.items ?? [];
    const valuation = aggregatePortfolioValuation(items);
    return { items, valuation };
  }, [portfolio.data?.items]);

  if (capability.isLoading) return <PageSkeleton cards={2} />;
  if (capability.isError) {
    return <QueryError error={capability.error} onRetry={capability.refetch} />;
  }

  const cap = capability.data;
  const canBuy = cap?.canPlaceNewBuy === true;
  const canSell = cap?.canPlaceNewSell === true;
  const canRedeem = cap?.canPlaceRedemption === true;
  const blockers = cap ? tradingBlockers(cap) : [];
  const home = customerPath(tenantSlug, "digital-metals");

  const ordersHub = customerDigitalMetalsOrdersHubHref(tenantSlug);
  const openTotal = openOrders.data?.totalOpen ?? 0;

  if (!cap?.canViewHoldings) {
    return (
      <CustomerDmPageShell title="Digital Gold & Silver" testId="customer-digital-metals-shell">
        <CustomerDmSurface>
          <p className="text-sm text-[#5c3d42]">
            {cap?.blockers?.[0]?.message ?? "Digital gold and silver is not available on your account yet."}
          </p>
          {cap?.hasLegacyActivity || openTotal > 0 ? (
            <Link
              href={ordersHub}
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-2"
              data-testid="customer-digital-metals-orders-link-paused"
            >
              Orders & tracking
              {openTotal > 0 ? ` (${openTotal} open)` : ""}
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : null}
        </CustomerDmSurface>
      </CustomerDmPageShell>
    );
  }

  const quickActions = [
    {
      key: "buy",
      label: "Buy",
      icon: DM_QUICK_ICONS.buy,
      href: customerPath(tenantSlug, "digital-metals", "buy"),
      disabled: !canBuy,
      variant: "primary" as const,
    },
    {
      key: "sell",
      label: "Sell",
      icon: DM_QUICK_ICONS.sell,
      href: customerPath(tenantSlug, "digital-metals", "sell"),
      disabled: !canSell,
    },
    {
      key: "redeem",
      label: "Get coins",
      icon: DM_QUICK_ICONS.redeem,
      href: customerPath(tenantSlug, "digital-metals", "redeem"),
      disabled: !canRedeem,
    },
    {
      key: "bank",
      label: "Bank",
      icon: DM_QUICK_ICONS.bank,
      href: customerPath(tenantSlug, "digital-metals", "bank"),
    },
    {
      key: "orders",
      label: "Orders",
      icon: History,
      href: ordersHub,
    },
  ];

  const wallets = portfolioSummary.items;
  const combined = portfolioSummary.valuation.allValuationsOk ? portfolioSummary.valuation.combinedIndicativePaise : null;
  const openRows = [
    openOrders.data?.openBuyCount
      ? { key: "buy", label: "Purchases waiting for payment", count: openOrders.data.openBuyCount, action: customerDigitalMetalsOrderActionLabel("PAYMENT_PENDING", "buy"), href: customerDigitalMetalsOrdersHubHref(tenantSlug, "buy") }
      : null,
    openOrders.data?.openSellCount
      ? { key: "sell", label: "Sales & payouts in progress", count: openOrders.data.openSellCount, action: "Track", href: customerDigitalMetalsOrdersHubHref(tenantSlug, "sell") }
      : null,
    openOrders.data?.openRedemptionCount
      ? { key: "redemption", label: "Coins & bars on the way", count: openOrders.data.openRedemptionCount, action: "Track delivery", href: customerDigitalMetalsOrdersHubHref(tenantSlug, "redemption") }
      : null,
  ].filter((r): r is NonNullable<typeof r> => Boolean(r));

  return (
    <div className="mx-auto w-full max-w-5xl pb-10" data-testid="customer-digital-metals-shell">
      <section
        className="relative overflow-hidden rounded-[1.75rem] px-5 pb-6 pt-6 text-white sm:px-8 sm:pt-8"
        style={{ background: "linear-gradient(140deg, color-mix(in srgb, var(--customer-primary, #730321) 92%, black) 0%, color-mix(in srgb, var(--customer-primary, #730321) 55%, black) 100%)" }}
        data-testid="customer-digital-metals-actions"
      >
        <div className="pointer-events-none absolute -right-20 -top-28 size-80 rounded-full opacity-50" style={{ background: "radial-gradient(circle, rgba(var(--customer-accent-rgb, 201, 162, 39), 0.5), transparent 65%)" }} aria-hidden />
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-white/70">Digital gold & silver</p>
            {portfolio.isLoading ? (
              <p className="mt-3 h-10 w-48 animate-pulse rounded-lg bg-white/15" />
            ) : combined != null ? (
              <>
                <p className="mt-2 font-serif text-[2.6rem] leading-none tabular-nums sm:text-5xl">{formatInrFromPaise(combined)}</p>
                <p className="mt-2 text-xs text-white/65">What your metal is worth at today&apos;s sell rate, before fees</p>
              </>
            ) : (
              <p className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">Your metal wallet</p>
            )}
            {wallets.length ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {wallets.map((w) => (
                  <span key={w.id} className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1.5 pl-1.5 pr-3.5 text-sm ring-1 ring-white/15">
                    <DmCoinArt metal={String(w.metal)} size={22} />
                    <span className="font-semibold tabular-nums">{ugToGramsDisplay(w.heldUg)}</span>
                    <span className="text-white/65">{String(w.metal) === "SILVER" ? "silver" : "gold"}</span>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="lg:w-[25rem]">
            <CustomerDmQuickActionGrid actions={quickActions} tone="dark" />
          </div>
        </div>
      </section>

      {!canBuy && blockers.length > 0 ? (
        <div
          className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          data-testid="customer-digital-metals-trading-blockers"
          role="status"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">New buys and some trades are paused</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-900/90">
              Your existing grams and history stay visible. Link bank accounts anytime for future sell payouts.
            </p>
            <ul className="mt-2 list-inside list-disc text-xs text-amber-900/90">
              {blockers.slice(0, 4).map((b) => (
                <li key={`${b.code}-${b.message}`}>{b.message}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {openTotal > 0 && openRows.length ? (
        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="customer-digital-metals-open-orders" aria-label="Open orders">
          {openRows.map((r) => (
            <Link
              key={r.key}
              href={r.href}
              className="group flex items-center gap-3 rounded-2xl border border-[#ecdfd8] bg-white px-4 py-3.5 transition hover:border-[#d9c6bd]"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-50 text-sm font-bold text-amber-800 tabular-nums">{r.count}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-[#221a1d]">{r.label}</span>
                <span className="text-xs font-semibold text-[var(--customer-primary,#730321)]">{r.action}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-[#b3a5a8] transition group-hover:translate-x-0.5" aria-hidden />
            </Link>
          ))}
        </section>
      ) : null}

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-10">
          <section data-testid="customer-digital-metals-portfolio">
            <div className="flex items-end justify-between gap-3">
              <CustomerDmSectionTitle>Your wallets</CustomerDmSectionTitle>
              <p className="text-xs text-[#7a6f72]">Each metal and purity is kept separately</p>
            </div>
            {portfolio.isLoading ? (
              <p className="mt-3 text-sm text-muted-foreground">Loading balances…</p>
            ) : wallets.length === 0 ? (
              <div className="mt-4">
                <CustomerDmEmptyPortfolio canBuy={canBuy} tenantSlug={tenantSlug} />
              </div>
            ) : (
              <>
                {!portfolioSummary.valuation.allValuationsOk && portfolioSummary.valuation.anyWallet ? (
                  <p className="mt-3 text-xs text-amber-900">The combined rupee total is hidden until every wallet has a fresh sell rate.</p>
                ) : null}
                <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                  {wallets.map((w) => (
                    <CustomerDmAssetCard key={w.id} wallet={w} />
                  ))}
                </ul>
              </>
            )}
          </section>

          <section data-testid="customer-digital-metals-passbook">
            <div className="flex items-end justify-between gap-3">
              <CustomerDmSectionTitle>Recent activity</CustomerDmSectionTitle>
              <Link href={ordersHub} className="text-sm font-semibold text-[var(--customer-primary,#730321)] underline-offset-4 hover:underline">
                All orders
              </Link>
            </div>
            {passbook.isLoading && !mergedPassbook.length ? (
              <p className="mt-3 text-sm text-muted-foreground">Loading history…</p>
            ) : mergedPassbook.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-dashed border-[#e3d6ce] px-4 py-6 text-center text-sm text-[#7a6f72]">
                Purchases, sales and redemptions will appear here.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-[#f0e6e0] overflow-hidden rounded-[1.25rem] border border-[#ecdfd8] bg-white">
                {mergedPassbook.map((row) => {
                  const orderRef = (row.redemptionOrderId ?? row.sellOrderId ?? row.referenceId) as string | undefined;
                  const href = passbookOrderHref(tenantSlug, orderRef);
                  const refType = row.referenceType as string | undefined;
                  const refLabel = passbookReferenceLabel(refType);
                  const purchaseSummary = row.purchaseSummary as DigitalMetalsPurchaseSummary | undefined;
                  const sellSummary = row.sellSummary as DigitalMetalsSellSummary | undefined;
                  const redemptionSummary = row.redemptionSummary as DigitalMetalsRedemptionPassbookSummary | undefined;
                  const detailLines = [
                    ...passbookPurchaseActivityLines(purchaseSummary),
                    ...passbookSellActivityLines(sellSummary),
                    ...passbookRedemptionActivityLines(redemptionSummary),
                  ];
                  const metal = String(purchaseSummary?.metal ?? sellSummary?.metal ?? redemptionSummary?.metal ?? "GOLD");
                  const entry = String(row.entryType);
                  const Icon = entry === "CREDIT" ? ArrowDownLeft : entry === "DEBIT" ? ArrowUpRight : Lock;
                  return (
                    <li key={String(row.id)} className="flex gap-3.5 px-4 py-4 sm:px-5">
                      <span className="relative mt-0.5 block size-9 shrink-0">
                        <DmCoinArt metal={metal} size={36} />
                        <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-white text-[#4d4245] shadow ring-1 ring-[#ecdfd8]">
                          <Icon className="size-3" strokeWidth={2.4} aria-hidden />
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-0.5">
                          <p className="font-medium text-[#221a1d]">
                            {passbookActivityTitle({
                              entryType: entry,
                              referenceType: row.referenceType as string | null,
                              purchaseSummary,
                              sellSummary,
                              redemptionSummary,
                            })}
                          </p>
                          <p className={entry === "CREDIT" ? "font-semibold tabular-nums text-emerald-700" : "font-semibold tabular-nums text-[#221a1d]"}>
                            {formatPassbookRowQuantity({
                              quantityUgDelta: row.quantityUgDelta as string,
                              reservedUgDelta: row.reservedUgDelta as string,
                              entryType: entry,
                              sellSummary,
                              purchaseSummary,
                            })}
                          </p>
                        </div>
                        <p className="text-xs text-[#7a6f72]">{formatPassbookWhen(row.createdAt as string)}</p>
                        {detailLines.length ? (
                          <p className="mt-1.5 text-xs leading-5 text-[#5c4f52]">{detailLines.join(" · ")}</p>
                        ) : null}
                        {href ? (
                          <Link href={href} className="mt-1.5 inline-flex text-xs font-semibold text-[var(--customer-primary,#730321)] underline-offset-4 hover:underline">
                            {passbookOrderLinkLabel(refType)}
                          </Link>
                        ) : refLabel ? (
                          <p className="mt-1 text-xs text-[#7a6f72]">{refLabel}</p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {passbook.data?.meta?.hasMore ? (
              <Button
                type="button"
                variant="outline"
                className="mt-4 h-10 w-full rounded-full sm:w-auto"
                disabled={passbook.isFetching}
                onClick={() => {
                  setPassbookItems(mergedPassbook);
                  setPassbookCursor(passbook.data?.meta?.nextCursor ?? undefined);
                }}
              >
                Load more
              </Button>
            ) : null}
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-28">
          <CustomerDmSurface testId="customer-digital-metals-statement">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-[var(--customer-primary,#730321)]" aria-hidden />
              <CustomerDmSectionTitle>Statement</CustomerDmSectionTitle>
            </div>
            <p className="mt-1.5 text-xs leading-5 text-[#7a6f72]">Download a PDF of your metal ledger for any period (IST dates).</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="stmt-from" className="text-xs">
                  From
                </Label>
                <Input id="stmt-from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="mt-1 h-10 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="stmt-to" className="text-xs">
                  To
                </Label>
                <Input id="stmt-to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="mt-1 h-10 rounded-xl" />
              </div>
            </div>
            <div className="mt-4">
              <CustomerDigitalMetalsDocumentPanel
                title="Metal statement"
                docType="METAL_STATEMENT"
                fromBusinessDate={fromDate}
                toBusinessDate={toDate}
                skip={!cap?.canViewHoldings}
              />
            </div>
            {statement.isLoading ? (
              <p className="mt-2 text-xs text-muted-foreground">Checking period…</p>
            ) : (
              <p className="mt-2 text-xs text-[#7a6f72]">
                {((statement.data?.activity as unknown[]) ?? []).length} ledger lines in this period.
              </p>
            )}
          </CustomerDmSurface>

          <Link
            href={customerPath(tenantSlug, "digital-metals", "bank")}
            className="group flex items-center gap-3 rounded-[1.25rem] border border-[#ecdfd8] bg-white p-4 text-sm transition hover:border-[#d9c6bd]"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[rgba(var(--customer-primary-rgb,115,3,33),0.07)] text-[var(--customer-primary,#730321)]">
              <Banknote className="size-5" aria-hidden />
            </span>
            <span className="flex-1">
              <strong className="block text-[#221a1d]">Payout bank accounts</strong>
              <span className="text-xs text-[#7a6f72]">Sale proceeds go only to accounts your jeweller has verified.</span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-[var(--customer-primary,#730321)] transition group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <Link href={home} className="sr-only">
            Portfolio anchor
          </Link>
        </aside>
      </div>
    </div>
  );
}
