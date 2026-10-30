"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CreditCard, FileText, ReceiptText, ShoppingCart, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { EmptyState, PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import {
  AdminTable,
  IdChip,
  ListPanel,
  LoadMoreFooter,
  type AdminColumn,
} from "@/src/components/admin-ui/admin-table";
import {
  FilterBar,
  FilterSearch,
  FilterSelect,
  QuickViews,
  useDebouncedValue,
} from "@/src/components/admin-ui/filter-bar";
import { DetailLayout, Fact, FactGrid, InfoList, InfoRow, Notice, Timeline } from "@/src/components/admin-ui/detail-parts";
import { useLoadMoreList } from "@/src/hooks/use-load-more-list";
import {
  useGetDigitalMetalsBuyOrderQuery,
  useGetDigitalMetalsBuyOrdersQuery,
} from "@/src/store/api/admin-api";
import { formatInrPerGramFromPaise } from "@/src/lib/digital-metals-display";
import { useDigitalMetalsServerEntitlement } from "./digital-metals-admin-shared";
import {
  DM_SECTION,
  DmCustomerCell,
  DmGate,
  MetalPill,
  dmInr,
  dmWeight,
  shortDateTime,
  timeAgo,
} from "./digital-metals-admin-ui";

type BuyOrderRow = {
  id: string;
  status: string;
  metal: string;
  finenessPpm?: number;
  quantityUg: string;
  totalPayablePaise: number;
  buyRatePerGramPaise?: number;
  paymentExceptionStatus?: string | null;
  invoiceStatus?: string;
  createdAt?: string | null;
  creditedAt?: string | null;
  customerId?: string;
  customer?: { id?: string; name?: string; mobile?: string; customerNumber?: string } | null;
};

const BUY_STATUS_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "PAYMENT_PENDING", label: "Payment pending" },
  { value: "CREDITED", label: "Credited" },
  { value: "PAYMENT_FAILED", label: "Payment failed" },
  { value: "REFUND_REVIEW", label: "Refund review" },
];

const METAL_OPTIONS = [
  { value: "ALL", label: "All metals" },
  { value: "GOLD", label: "Gold" },
  { value: "SILVER", label: "Silver" },
];

const rowId = (r: BuyOrderRow) => r.id;

export function DigitalMetalsPurchasesPage() {
  const ent = useDigitalMetalsServerEntitlement();
  const [status, setStatus] = useState("ALL");
  const [metal, setMetal] = useState("ALL");
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim(), 350);
  const q = debounced.length >= 4 ? debounced : undefined;
  const list = useLoadMoreList<BuyOrderRow>(`${status}|${q ?? ""}`, rowId);
  const orders = useGetDigitalMetalsBuyOrdersQuery(
    {
      ...(status !== "ALL" ? { status } : {}),
      limit: 20,
      cursor: list.cursor,
      ...(q ? { q } : {}),
    },
    { skip: !ent.workspaceVisible },
  );

  const merged = list.merge((orders.data?.items ?? []) as BuyOrderRow[]);
  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return merged.filter((r) => {
      if (metal !== "ALL" && String(r.metal).toUpperCase() !== metal) return false;
      if (!needle || q) return true;
      return [r.id, r.customer?.name, r.customer?.customerNumber, r.customerId]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [merged, metal, search, q]);
  const meta = orders.data?.meta;

  const columns: AdminColumn<BuyOrderRow>[] = [
    {
      key: "customer",
      header: "Customer",
      primary: true,
      cell: (r) => <DmCustomerCell customer={r.customer} fallbackId={r.customerId} />,
      sortValue: (r) => r.customer?.name ?? r.customerId ?? "",
    },
    {
      key: "order",
      header: "Order",
      cell: (r) => (
        <div className="space-y-1">
          <IdChip>{r.id}</IdChip>
          <p className="text-xs text-[#9a8d90]">{shortDateTime(r.createdAt)}</p>
        </div>
      ),
      sortValue: (r) => r.createdAt ?? "",
      hideOnMobile: true,
    },
    {
      key: "metal",
      header: "Metal",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <MetalPill metal={r.metal} />
          <span className="tabular-nums text-[#3c2a2e]">{dmWeight(r.quantityUg)}</span>
        </div>
      ),
      sortValue: (r) => Number(r.quantityUg),
    },
    {
      key: "status",
      header: "Status",
      primary: true,
      cell: (r) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={r.status} />
          {r.paymentExceptionStatus ? <StatusBadge status="URGENT" label="Exception" /> : null}
        </div>
      ),
      sortValue: (r) => r.status,
    },
    {
      key: "amount",
      header: "Paid",
      align: "right",
      cell: (r) => <span className="font-bold text-[#28161a]">{dmInr(r.totalPayablePaise)}</span>,
      sortValue: (r) => Number(r.totalPayablePaise ?? 0),
    },
  ];

  const activeFilters = [
    ...(status !== "ALL" ? [{ key: "status", label: BUY_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status, onClear: () => setStatus("ALL") }] : []),
    ...(metal !== "ALL" ? [{ key: "metal", label: metal === "GOLD" ? "Gold" : "Silver", onClear: () => setMetal("ALL") }] : []),
    ...(search.trim() ? [{ key: "q", label: `“${search.trim()}”`, onClear: () => setSearch("") }] : []),
  ];

  return (
    <DmGate loading={ent.loading} visible={ent.workspaceVisible} message={ent.disabledMessage} title="Purchases">
      <div className="space-y-6" data-testid="digital-metals-purchases-list">
        <PageHeader
          eyebrow={DM_SECTION}
          icon={ShoppingCart}
          title="Purchases"
          description="Every customer buy order — payment state, metal credited and invoice."
        />
        <ListPanel
          toolbar={
            <FilterBar
              quickViews={<QuickViews value={status} onChange={setStatus} options={BUY_STATUS_OPTIONS} ariaLabel="Purchase status" />}
              search={
                <FilterSearch
                  value={search}
                  onChange={setSearch}
                  placeholder="Search order ID or customer"
                  hint="Type 4+ characters to search all orders"
                />
              }
              filters={<FilterSelect label="Metal" value={metal} onChange={setMetal} options={METAL_OPTIONS} />}
              activeFilters={activeFilters}
              onClearAll={() => {
                setStatus("ALL");
                setMetal("ALL");
                setSearch("");
              }}
              resultLabel={`${rows.length}${meta?.hasMore ? "+" : ""} purchases`}
            />
          }
        >
          {orders.isError ? (
            <QueryError error={orders.error} onRetry={orders.refetch} />
          ) : (
            <AdminTable
              columns={columns}
              rows={rows}
              getRowId={rowId}
              rowHref={(r) => `/digital-metals/purchases/${r.id}`}
              loading={orders.isLoading}
              fetching={orders.isFetching && !orders.isLoading}
              caption="Digital gold and silver purchases"
              empty={
                <EmptyState
                  icon={ShoppingCart}
                  title={activeFilters.length ? "No purchases match" : "No purchases yet"}
                  detail={activeFilters.length ? "Try another status or clear the search." : "Customer buy orders appear here as soon as they're placed."}
                />
              }
              footer={
                <LoadMoreFooter
                  shown={rows.length}
                  hasMore={meta?.hasMore}
                  loading={orders.isFetching}
                  noun="purchases"
                  onLoadMore={() => list.loadMore(merged, meta?.nextCursor)}
                />
              }
            />
          )}
        </ListPanel>
      </div>
    </DmGate>
  );
}

function buyTimeline(o: BuyOrderRow & { paymentAttempts?: { status: string; createdAt?: string }[] }) {
  const failed = o.status === "PAYMENT_FAILED";
  const credited = o.status === "CREDITED";
  const review = o.status === "REFUND_REVIEW";
  return [
    { key: "placed", title: "Order placed", time: shortDateTime(o.createdAt), state: "done" as const },
    {
      key: "paid",
      title: failed ? "Payment failed" : review ? "Payment needs review" : "Payment received",
      time: o.paymentAttempts?.[0]?.createdAt ? shortDateTime(o.paymentAttempts[0].createdAt) : undefined,
      state: failed ? ("failed" as const) : credited || review ? ("done" as const) : ("current" as const),
    },
    {
      key: "credited",
      title: "Metal credited to wallet",
      time: credited ? shortDateTime(o.creditedAt) : undefined,
      state: credited ? ("done" as const) : ("upcoming" as const),
    },
  ];
}

export function DigitalMetalsPurchaseDetailPage({ orderId }: { orderId: string }) {
  const ent = useDigitalMetalsServerEntitlement();
  const detail = useGetDigitalMetalsBuyOrderQuery(orderId, { skip: !ent.workspaceVisible });

  if (ent.loading || detail.isLoading) return <PageSkeleton cards={2} />;
  if (detail.isError) return <QueryError error={detail.error} onRetry={detail.refetch} />;
  const o = detail.data as BuyOrderRow & {
    paymentAttempts?: { id: string; status: string; provider?: string; amountPaise?: number; createdAt?: string }[];
  };
  const attempts = o.paymentAttempts ?? [];

  return (
    <div className="space-y-6" data-testid="digital-metals-purchase-detail">
      <PageHeader
        back={{ href: "/digital-metals/purchases", label: "Purchases" }}
        eyebrow={DM_SECTION}
        title={`Purchase ${orderId}`}
        meta={
          <>
            <StatusBadge status={o.status} />
            <MetalPill metal={o.metal} />
            {o.createdAt ? <span>Placed {timeAgo(o.createdAt)}</span> : null}
          </>
        }
        actions={
          o.customer?.id || o.customerId ? (
            <Button variant="outline" asChild className="rounded-xl">
              <Link href={`/customers/${o.customer?.id ?? o.customerId}`}>
                <UserRound /> Customer profile
              </Link>
            </Button>
          ) : null
        }
      />
      {o.paymentExceptionStatus ? (
        <Notice tone="amber" title="Payment exception" icon={CreditCard}>
          {o.paymentExceptionStatus.replaceAll("_", " ").toLowerCase()} — resolve it from Payment exceptions.
        </Notice>
      ) : null}
      <DetailLayout
        main={
          <>
            <Surface>
              <FactGrid>
                <Fact label="Metal" value={dmWeight(o.quantityUg)} detail={o.metal === "SILVER" ? "Silver 999" : "Gold 24K 999"} />
                <Fact label="Customer paid" value={dmInr(o.totalPayablePaise)} detail="Incl. GST and fees" />
                <Fact label="Buy rate" value={o.buyRatePerGramPaise ? formatInrPerGramFromPaise(o.buyRatePerGramPaise) : "—"} detail="Locked at quote" />
                <Fact label="Invoice" value={o.invoiceStatus === "READY" ? "Ready" : "Pending"} detail={o.invoiceStatus === "READY" ? "Sent to customer" : "After credit"} />
              </FactGrid>
            </Surface>
            <Surface icon={ReceiptText} title="Payment attempts" description="Gateway attempts for this order — newest first">
              {attempts.length === 0 ? (
                <p className="px-5 py-4 text-sm text-[#7a6d70]">No payment attempts recorded yet.</p>
              ) : (
                <ul className="divide-y divide-[#f3eae7]">
                  {attempts.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                      <div className="min-w-0">
                        <IdChip>{a.id}</IdChip>
                        <p className="mt-1 text-xs text-[#857a7d]">
                          {[a.provider, a.createdAt ? shortDateTime(a.createdAt) : null].filter(Boolean).join(" · ") || "Gateway"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {a.amountPaise != null ? <span className="font-semibold tabular-nums">{dmInr(a.amountPaise)}</span> : null}
                        <StatusBadge status={a.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Surface>
          </>
        }
        aside={
          <>
            <Surface title="Progress">
              <Timeline steps={buyTimeline(o)} />
            </Surface>
            <Surface icon={FileText} title="Order details">
              <InfoList>
                <InfoRow label="Order ID">{o.id}</InfoRow>
                <InfoRow label="Customer">{o.customer?.name ?? o.customerId ?? "—"}</InfoRow>
                <InfoRow label="Placed">{shortDateTime(o.createdAt)}</InfoRow>
                {o.creditedAt ? <InfoRow label="Credited">{shortDateTime(o.creditedAt)}</InfoRow> : null}
              </InfoList>
            </Surface>
          </>
        }
      />
    </div>
  );
}
