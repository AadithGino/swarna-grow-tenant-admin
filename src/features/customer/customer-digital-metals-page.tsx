"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, ChevronRight, FileText, History } from "lucide-react";
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
} from "@/src/features/customer/customer-digital-metals-shared";

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
      label: "Redeem",
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

  return (
    <CustomerDmPageShell
      title="Digital Gold & Silver"
      subtitle="Save in grams, sell back to rupees, or redeem physical coins and bars from your jeweller."
      testId="customer-digital-metals-shell"
    >
      <div className="space-y-6 lg:grid lg:grid-cols-[1fr,min(22rem,100%)] lg:items-start lg:gap-8">
        <div className="space-y-6">
          <CustomerDmSurface testId="customer-digital-metals-actions">
            <CustomerDmSectionTitle>Quick actions</CustomerDmSectionTitle>
            <div className="mt-4">
              <CustomerDmQuickActionGrid actions={quickActions} />
            </div>
            {!canBuy && blockers.length > 0 ? (
              <div
                className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
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
          </CustomerDmSurface>

          {openTotal > 0 ? (
            <CustomerDmSurface testId="customer-digital-metals-open-orders">
              <CustomerDmSectionTitle>Open orders</CustomerDmSectionTitle>
              <p className="mt-1 text-xs text-[#8a6a70]">
                Purchases awaiting payment, sells awaiting approval or payout, and physical deliveries in progress.
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {openOrders.data?.openBuyCount ? (
                  <li className="flex items-center justify-between gap-2 rounded-lg bg-[#faf8f7] px-3 py-2">
                    <span>Purchases in checkout</span>
                    <Link
                      href={customerDigitalMetalsOrdersHubHref(tenantSlug, "buy")}
                      className="font-medium text-primary underline underline-offset-2"
                    >
                      {openOrders.data.openBuyCount} · {customerDigitalMetalsOrderActionLabel("PAYMENT_PENDING", "buy")}
                    </Link>
                  </li>
                ) : null}
                {openOrders.data?.openSellCount ? (
                  <li className="flex items-center justify-between gap-2 rounded-lg bg-[#faf8f7] px-3 py-2">
                    <span>Sales & payouts</span>
                    <Link
                      href={customerDigitalMetalsOrdersHubHref(tenantSlug, "sell")}
                      className="font-medium text-primary underline underline-offset-2"
                    >
                      {openOrders.data.openSellCount} · Track
                    </Link>
                  </li>
                ) : null}
                {openOrders.data?.openRedemptionCount ? (
                  <li className="flex items-center justify-between gap-2 rounded-lg bg-[#faf8f7] px-3 py-2">
                    <span>Physical delivery</span>
                    <Link
                      href={customerDigitalMetalsOrdersHubHref(tenantSlug, "redemption")}
                      className="font-medium text-primary underline underline-offset-2"
                    >
                      {openOrders.data.openRedemptionCount} · Track delivery
                    </Link>
                  </li>
                ) : null}
              </ul>
              <Link
                href={ordersHub}
                className="mt-3 inline-flex text-xs font-medium text-primary underline underline-offset-2"
              >
                View all orders & tracking
              </Link>
            </CustomerDmSurface>
          ) : null}

          <section data-testid="customer-digital-metals-portfolio">
            <CustomerDmSectionTitle>Your metal wallets</CustomerDmSectionTitle>
            <p className="mt-1 text-xs text-[#8a6a70]">
              Gold and silver, and each purity, are separate — we never add grams across different assets.
            </p>
            {portfolio.isLoading ? (
              <p className="mt-3 text-sm text-muted-foreground">Loading balances…</p>
            ) : portfolioSummary.items.length === 0 ? (
              <div className="mt-4">
                <CustomerDmEmptyPortfolio canBuy={canBuy} tenantSlug={tenantSlug} />
              </div>
            ) : (
              <>
                {portfolioSummary.valuation.allValuationsOk &&
                portfolioSummary.valuation.combinedIndicativePaise != null ? (
                  <p className="mt-3 rounded-xl bg-[#faf8f7] px-3 py-2 text-xs text-[#5c3d42]">
                    Combined indicative sell value (all wallets below, before fees):{" "}
                    <strong>{formatInrFromPaise(portfolioSummary.valuation.combinedIndicativePaise)}</strong>
                  </p>
                ) : portfolioSummary.valuation.anyWallet ? (
                  <p className="mt-3 text-xs text-amber-900">
                    Combined rupee total hidden until every wallet has a fresh sell rate.
                  </p>
                ) : null}
                <ul className="mt-4 space-y-3">
                  {portfolioSummary.items.map((w) => (
                    <CustomerDmAssetCard key={w.id} wallet={w} />
                  ))}
                </ul>
              </>
            )}
          </section>

          <section data-testid="customer-digital-metals-passbook">
            <div className="flex items-center gap-2">
              <History className="size-4 text-[var(--customer-primary,#730321)]" aria-hidden />
              <CustomerDmSectionTitle>Recent activity</CustomerDmSectionTitle>
            </div>
            {passbook.isLoading && !mergedPassbook.length ? (
              <p className="mt-3 text-sm text-muted-foreground">Loading history…</p>
            ) : mergedPassbook.length === 0 ? (
              <p className="mt-3 text-sm text-[#5c3d42]">Transactions will appear here after your first purchase or sale.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {mergedPassbook.map((row) => {
                  const orderRef = (row.redemptionOrderId ??
                    row.sellOrderId ??
                    row.referenceId) as string | undefined;
                  const href = passbookOrderHref(tenantSlug, orderRef);
                  const refType = row.referenceType as string | undefined;
                  const refLabel = passbookReferenceLabel(refType);
                  const purchaseSummary = row.purchaseSummary as DigitalMetalsPurchaseSummary | undefined;
                  const sellSummary = row.sellSummary as DigitalMetalsSellSummary | undefined;
                  const redemptionSummary = row.redemptionSummary as
                    | DigitalMetalsRedemptionPassbookSummary
                    | undefined;
                  const detailLines = [
                    ...passbookPurchaseActivityLines(purchaseSummary),
                    ...passbookSellActivityLines(sellSummary),
                    ...passbookRedemptionActivityLines(redemptionSummary),
                  ];
                  return (
                    <li
                      key={String(row.id)}
                      className="rounded-xl border border-[#eaded9] bg-white px-3 py-3 text-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-[#28161a]">
                            {passbookActivityTitle({
                              entryType: String(row.entryType),
                              referenceType: row.referenceType as string | null,
                              purchaseSummary,
                              sellSummary,
                              redemptionSummary,
                            })}
                          </p>
                          <p className="text-xs text-[#8a6a70]">{formatPassbookWhen(row.createdAt as string)}</p>
                        </div>
                        <p className="font-semibold text-[var(--customer-primary,#730321)]">
                          {formatPassbookRowQuantity({
                            quantityUgDelta: row.quantityUgDelta as string,
                            reservedUgDelta: row.reservedUgDelta as string,
                            entryType: String(row.entryType),
                            sellSummary,
                            purchaseSummary,
                          })}
                        </p>
                      </div>
                      {detailLines.length ? (
                        <ul className="mt-2 space-y-0.5 text-xs text-[#5c3d42]">
                          {detailLines.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      ) : null}
                      {href ? (
                        <p className="mt-2">
                          <Link
                            href={href}
                            className="text-xs font-semibold text-[var(--customer-primary,#730321)] underline underline-offset-2"
                          >
                            {passbookOrderLinkLabel(refType)}
                          </Link>
                        </p>
                      ) : refLabel ? (
                        <p className="mt-1 text-xs text-[#8a6a70]">{refLabel}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
            {passbook.data?.meta?.hasMore ? (
              <Button
                type="button"
                variant="outline"
                className="mt-3 w-full sm:w-auto"
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

        <aside className="space-y-6">
          <CustomerDmSurface testId="customer-digital-metals-statement">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-[var(--customer-primary,#730321)]" aria-hidden />
              <CustomerDmSectionTitle>Statements & documents</CustomerDmSectionTitle>
            </div>
            <p className="mt-2 text-xs text-[#8a6a70]">Download a PDF metal statement for your records (IST dates).</p>
            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="stmt-from" className="text-xs">
                  From
                </Label>
                <Input
                  id="stmt-from"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="stmt-to" className="text-xs">
                  To
                </Label>
                <Input
                  id="stmt-to"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="mt-1"
                />
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
              <p className="mt-2 text-xs text-[#8a6a70]">
                {((statement.data?.activity as unknown[]) ?? []).length} ledger lines in selected period.
              </p>
            )}
          </CustomerDmSurface>

          <Link
            href={customerPath(tenantSlug, "digital-metals", "bank")}
            className="flex items-center gap-3 rounded-2xl border border-[#eaded9] bg-white p-4 text-sm shadow-sm transition hover:border-[rgba(var(--customer-primary-rgb,115,3,33),0.25)]"
          >
            <span className="flex-1">
              <strong className="block text-[#28161a]">Bank accounts for sell payouts</strong>
              <span className="text-xs text-[#8a6a70]">Add and verify accounts before you sell metal.</span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-[var(--customer-primary,#730321)]" aria-hidden />
          </Link>
          <Link href={home} className="sr-only">
            Portfolio anchor
          </Link>
        </aside>
      </div>
    </CustomerDmPageShell>
  );
}
