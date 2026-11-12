"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Banknote, ChevronRight, FileText, History, Lock } from "lucide-react";
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
  passbookPurchaseActivityLines,
  passbookRedemptionActivityLines,
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
  dmAssetName,
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
  const [passbookCursor] = useState<string | undefined>(undefined);
  const [passbookItems] = useState<Record<string, unknown>[]>([]);

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
      <h1 className="mb-3.5 text-[1.65rem] font-bold tracking-[-.03em] text-[var(--ck-ink)]">Digital gold &amp; silver</h1>
      <section
        className="overflow-hidden rounded-[1.4rem] p-[1.1rem] text-white sm:p-7"
        style={{ background: "color-mix(in srgb, var(--customer-primary, #5e1622) 62%, #12030a)" }}
        data-testid="customer-digital-metals-actions"
      >
        <p className="text-xs text-white/65">Your metal is worth</p>
        {portfolio.isLoading ? (
          <p className="mt-2 h-10 w-48 animate-pulse rounded-lg bg-white/15" />
        ) : combined != null ? (
          <>
            <p className="mt-0.5 text-[2.35rem] font-bold leading-none tracking-[-0.035em] tabular-nums">{formatInrFromPaise(combined)}</p>
            <p className="mt-1.5 text-xs text-white/60">At today&apos;s sell rate, before fees</p>
          </>
        ) : (
          <p className="mt-1 text-2xl font-bold">Your metal wallet</p>
        )}
        {wallets.length ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {wallets.map((w) => (
              <span key={w.id} className="flex min-w-0 items-center gap-2.5 rounded-[0.9rem] border border-white/10 bg-white/[0.07] px-2.5 py-2">
                <DmCoinArt metal={String(w.metal)} size={30} />
                <span className="min-w-0">
                  <span className="block truncate text-[0.66rem] text-white/60">{dmAssetName(String(w.metal), Number(w.finenessPpm))}</span>
                  <span className="block truncate text-[0.95rem] font-semibold tabular-nums">{ugToGramsDisplay(w.heldUg)}</span>
                </span>
              </span>
            ))}
          </div>
        ) : null}
      </section>
      <div className="mt-4">
        <CustomerDmQuickActionGrid actions={quickActions} />
      </div>

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
        <section className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-3" data-testid="customer-digital-metals-open-orders" aria-label="Open orders">
          {openRows.map((r) => (
            <Link
              key={r.key}
              href={r.href}
              className="group flex items-center gap-2.5 rounded-[1.15rem] border border-[var(--ck-line)] bg-white px-3 py-2.5 transition hover:bg-[#fdfbf8]"
            >
              <span className="shrink-0 text-base font-bold tabular-nums" style={{ color: "var(--customer-primary, #5e1622)" }}>{r.count}</span>
              <span className="min-w-0 flex-1 text-[0.75rem] leading-snug text-[var(--ck-ink-2)]">{r.label}</span>
            </Link>
          ))}
        </section>
      ) : null}

      <div className="mt-7 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-8">
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
                <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
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
              <ul className="mt-3 divide-y divide-[var(--ck-line-soft)] overflow-hidden rounded-[1.15rem] border border-[var(--ck-line)] bg-white">
                {mergedPassbook.slice(0, 3).map((row) => {
                  const orderRef = (row.redemptionOrderId ?? row.sellOrderId ?? row.referenceId) as string | undefined;
                  const href = passbookOrderHref(tenantSlug, orderRef);
                  const purchaseSummary = row.purchaseSummary as DigitalMetalsPurchaseSummary | undefined;
                  const sellSummary = row.sellSummary as DigitalMetalsSellSummary | undefined;
                  const redemptionSummary = row.redemptionSummary as DigitalMetalsRedemptionPassbookSummary | undefined;
                  const detailLines = [
                    ...passbookPurchaseActivityLines(purchaseSummary),
                    ...passbookSellActivityLines(sellSummary),
                    ...passbookRedemptionActivityLines(redemptionSummary),
                  ];
                  const entry = String(row.entryType);
                  const Icon = entry === "CREDIT" ? ArrowDownLeft : entry === "DEBIT" ? ArrowUpRight : Lock;
                  const tile =
                    entry === "CREDIT"
                      ? "bg-[var(--ck-ok-soft)] text-[var(--ck-ok)]"
                      : entry === "DEBIT"
                        ? "bg-[rgba(var(--customer-primary-rgb,94,22,34),0.08)] text-[var(--customer-primary,#5e1622)]"
                        : "bg-[var(--ck-gold-soft)] text-[#8a6a24]";
                  const body = (
                    <>
                      <span className={cn("grid size-[2.4rem] shrink-0 place-items-center rounded-xl", tile)}>
                        <Icon className="size-[1.1rem]" strokeWidth={1.8} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.88rem] font-semibold text-[var(--ck-ink)]">
                          {passbookActivityTitle({
                            entryType: entry,
                            referenceType: row.referenceType as string | null,
                            purchaseSummary,
                            sellSummary,
                            redemptionSummary,
                          })}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[var(--ck-muted)]">{detailLines[0] ?? formatPassbookWhen(row.createdAt as string)}</p>
                      </div>
                      <p className={cn("shrink-0 text-[0.85rem] font-semibold tabular-nums", entry === "CREDIT" ? "text-[var(--ck-ok)]" : "text-[var(--ck-ink)]")}>
                        {formatPassbookRowQuantity({
                          quantityUgDelta: row.quantityUgDelta as string,
                          reservedUgDelta: row.reservedUgDelta as string,
                          entryType: entry,
                          sellSummary,
                          purchaseSummary,
                        })}
                      </p>
                    </>
                  );
                  return (
                    <li key={String(row.id)}>
                      {href ? (
                        <Link href={href} className="flex items-center gap-3 px-3.5 py-3">
                          {body}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 px-3.5 py-3">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
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
