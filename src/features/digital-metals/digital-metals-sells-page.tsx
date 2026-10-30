"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Clock3, HandCoins, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { DetailLayout, Fact, FactGrid, Notice, Timeline, type TimelineStep } from "@/src/components/admin-ui/detail-parts";
import { useLoadMoreList } from "@/src/hooks/use-load-more-list";
import { toastApiError } from "@/src/lib/api-error";
import { formatInrPerGramFromPaise } from "@/src/lib/digital-metals-display";
import {
  useApproveDigitalMetalsSellOrderMutation,
  useGetDigitalMetalsSellOrderQuery,
  useGetDigitalMetalsSellOrdersQuery,
} from "@/src/store/api/admin-api";
import { useDigitalMetalsServerEntitlement } from "./digital-metals-admin-shared";
import { AdminDigitalMetalsDocumentPanel } from "./digital-metals-admin-document-panel";
import { filterSellRowsBySearch, sellBankPreview, type SellAdminRow } from "./digital-metals-sell-admin-shared";
import {
  DigitalMetalsSellBankPanel,
  DigitalMetalsSellCustomerPanel,
  DigitalMetalsSellQuotePanel,
} from "./digital-metals-sell-order-detail-parts";
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

const SELL_STATUS_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "PENDING_APPROVAL", label: "To approve" },
  { value: "PAYABLE_OPEN", label: "Payout due" },
  { value: "SETTLED", label: "Settled" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "EXPIRED", label: "Expired" },
];

const METAL_OPTIONS = [
  { value: "ALL", label: "All metals" },
  { value: "GOLD", label: "Gold" },
  { value: "SILVER", label: "Silver" },
];

const rowId = (r: SellAdminRow) => String(r.id);

export function DigitalMetalsSellsPage() {
  const ent = useDigitalMetalsServerEntitlement();
  const [status, setStatus] = useState("PENDING_APPROVAL");
  const [metal, setMetal] = useState("ALL");
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim(), 350);
  const q = debounced.length >= 4 ? debounced : undefined;
  const list = useLoadMoreList<SellAdminRow>(`${status}|${q ?? ""}`, rowId);
  const orders = useGetDigitalMetalsSellOrdersQuery(
    {
      ...(status !== "ALL" ? { status } : {}),
      limit: 20,
      cursor: list.cursor,
      ...(q ? { q } : {}),
    },
    { skip: !ent.workspaceVisible },
  );
  const pendingCount = useGetDigitalMetalsSellOrdersQuery(
    { status: "PENDING_APPROVAL", limit: 50 },
    { skip: !ent.workspaceVisible },
  );

  const merged = list.merge((orders.data?.items ?? []) as SellAdminRow[]);
  const rows = useMemo(() => {
    const byMetal = metal === "ALL" ? merged : merged.filter((r) => String(r.metal ?? "").toUpperCase() === metal);
    return q ? byMetal : filterSellRowsBySearch(byMetal, search);
  }, [merged, metal, search, q]);
  const meta = orders.data?.meta;
  const toApprove = pendingCount.data?.items?.length ?? null;

  const columns: AdminColumn<SellAdminRow>[] = [
    {
      key: "customer",
      header: "Customer",
      primary: true,
      cell: (r) => <DmCustomerCell customer={r.customer} fallbackId={r.id} />,
      sortValue: (r) => r.customer?.name ?? "",
    },
    {
      key: "sale",
      header: "Sale",
      cell: (r) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MetalPill metal={r.metal} />
            <span className="tabular-nums">{dmWeight(r.quantityUg)}</span>
          </div>
          <p className="max-w-[16rem] truncate text-xs text-[#9a8d90]">{sellBankPreview(r.bankDestination)}</p>
        </div>
      ),
      sortValue: (r) => Number(r.quantityUg ?? 0),
    },
    {
      key: "when",
      header: "Requested",
      cell: (r) => (
        <div className="space-y-0.5 text-sm">
          <p className="text-[#3c2a2e]">{shortDateTime(r.createdAt)}</p>
          {r.status === "PENDING_APPROVAL" && r.approvalExpiresAt ? (
            <p className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
              <Clock3 className="size-3" aria-hidden /> Expires {timeAgo(r.approvalExpiresAt)}
            </p>
          ) : r.executedAt ? (
            <p className="text-xs text-[#9a8d90]">Executed {shortDateTime(r.executedAt)}</p>
          ) : null}
        </div>
      ),
      sortValue: (r) => r.createdAt ?? "",
      hideOnMobile: true,
    },
    {
      key: "status",
      header: "Status",
      primary: true,
      cell: (r) => <StatusBadge status={r.status} label={r.status === "PENDING_APPROVAL" ? "To approve" : undefined} />,
      sortValue: (r) => r.status,
    },
    {
      key: "amount",
      header: "Customer gets",
      align: "right",
      cell: (r) => <span className="font-bold text-[#28161a]">{dmInr(r.settlementPaise)}</span>,
      sortValue: (r) => Number(r.settlementPaise ?? 0),
    },
  ];

  const views = SELL_STATUS_OPTIONS.map((o) => (o.value === "PENDING_APPROVAL" ? { ...o, count: toApprove } : o));
  const activeFilters = [
    ...(metal !== "ALL" ? [{ key: "metal", label: metal === "GOLD" ? "Gold" : "Silver", onClear: () => setMetal("ALL") }] : []),
    ...(search.trim() ? [{ key: "q", label: `“${search.trim()}”`, onClear: () => setSearch("") }] : []),
  ];

  return (
    <DmGate loading={ent.loading} visible={ent.workspaceVisible} message={ent.disabledMessage} title="Sell approvals">
      <div className="space-y-6" data-testid="digital-metals-sells-list">
        <PageHeader
          eyebrow={DM_SECTION}
          icon={HandCoins}
          title="Sell approvals"
          description="Executing a sale debits the customer's metal. The bank payout is a separate step under Payouts."
        />
        <ListPanel
          toolbar={
            <FilterBar
              quickViews={<QuickViews value={status} onChange={setStatus} options={views} ariaLabel="Sell status" />}
              search={
                <FilterSearch
                  value={search}
                  onChange={setSearch}
                  placeholder="Search order ID, customer or IFSC"
                  hint="Type 4+ characters to search all sell orders"
                />
              }
              filters={<FilterSelect label="Metal" value={metal} onChange={setMetal} options={METAL_OPTIONS} />}
              activeFilters={activeFilters}
              onClearAll={() => {
                setMetal("ALL");
                setSearch("");
              }}
              resultLabel={`${rows.length}${meta?.hasMore ? "+" : ""} sell orders`}
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
              rowHref={(r) => `/digital-metals/sells/${r.id}`}
              loading={orders.isLoading}
              fetching={orders.isFetching && !orders.isLoading}
              rowClassName={(r) => (r.status === "PENDING_APPROVAL" ? "bg-[#fffbf3]" : undefined)}
              caption="Customer sell orders"
              empty={
                <EmptyState
                  icon={HandCoins}
                  title={status === "PENDING_APPROVAL" ? "Nothing to approve" : "No sell orders match"}
                  detail={
                    status === "PENDING_APPROVAL"
                      ? "When a customer confirms a sale it waits here for you to execute."
                      : "Try another status or clear the search."
                  }
                />
              }
              footer={
                <LoadMoreFooter
                  shown={rows.length}
                  hasMore={meta?.hasMore}
                  loading={orders.isFetching}
                  noun="sell orders"
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

function sellTimeline(o: SellAdminRow & { payable?: { status?: string } }): TimelineStep[] {
  const executed = Boolean(o.executedAt) || ["PAYABLE_OPEN", "SETTLED"].includes(o.status);
  const ended = ["CANCELLED", "EXPIRED"].includes(o.status);
  return [
    { key: "req", title: "Customer requested sale", time: shortDateTime(o.createdAt), state: "done" },
    { key: "conf", title: "Customer confirmed quote", time: o.confirmedAt ? shortDateTime(o.confirmedAt) : undefined, state: o.confirmedAt || executed ? "done" : "upcoming" },
    ended
      ? { key: "end", title: o.status === "EXPIRED" ? "Approval window expired" : "Cancelled", state: "failed" }
      : {
          key: "exec",
          title: "Sale executed · metal debited",
          time: o.executedAt ? shortDateTime(o.executedAt) : o.approvalExpiresAt ? `Approve before ${shortDateTime(o.approvalExpiresAt)}` : undefined,
          state: executed ? "done" : "current",
        },
    ...(ended
      ? []
      : [
          {
            key: "paid",
            title: "Bank payout settled",
            state: (o.status === "SETTLED" ? "done" : executed ? "current" : "upcoming") as TimelineStep["state"],
          },
        ]),
  ];
}

export function DigitalMetalsSellDetailPage({ orderId }: { orderId: string }) {
  const ent = useDigitalMetalsServerEntitlement();
  const detail = useGetDigitalMetalsSellOrderQuery(orderId, { skip: !ent.workspaceVisible });
  const [approve, approveState] = useApproveDigitalMetalsSellOrderMutation();
  const [executeAttestation, setExecuteAttestation] = useState(false);

  if (ent.loading || detail.isLoading) return <PageSkeleton cards={2} />;
  if (detail.isError) return <QueryError error={detail.error} onRetry={detail.refetch} />;

  const o = detail.data as
    | (SellAdminRow & {
        version?: number;
        payable?: { outstandingPaise?: number; status?: string };
        sellSummary?: { sellRatePerGramPaise?: number | null };
        snapshot?: { rateSnapshot?: { sellRatePerGramPaise?: number } };
      })
    | undefined;
  if (!o?.id) {
    return (
      <div className="space-y-6">
        <PageHeader back={{ href: "/digital-metals/sells", label: "Sell approvals" }} eyebrow={DM_SECTION} title={`Sell ${orderId}`} />
        <div className="rounded-[1.15rem] border border-[#e8dcd7] bg-white">
          <EmptyState title="Sell order not found" detail="It may have been removed, or the link is wrong." />
        </div>
      </div>
    );
  }

  const sellRate = o.sellSummary?.sellRatePerGramPaise ?? o.snapshot?.rateSnapshot?.sellRatePerGramPaise ?? null;
  const pending = o.status === "PENDING_APPROVAL";

  const approvalCard = pending ? (
    <Surface icon={ShieldCheck} title="Execute this sale" description="Debits metal from the customer's wallet and opens an INR payable." className="ring-1 ring-[#ecd3d9]">
      <div className="space-y-4 px-5 py-4">
        {o.approvalExpiresAt ? (
          <Notice tone="amber" icon={Clock3}>
            Approve before <strong>{shortDateTime(o.approvalExpiresAt)}</strong> ({timeAgo(o.approvalExpiresAt)}) or the quote expires.
          </Notice>
        ) : null}
        <label className="flex items-start gap-3 rounded-xl border border-[#efe5e1] bg-[#fcf9f8] p-3 text-sm leading-5 text-[#3c2a2e]">
          <Checkbox checked={executeAttestation} onCheckedChange={(v) => setExecuteAttestation(v === true)} className="mt-0.5" />
          <span>
            I confirm this sale matches the locked customer quote and I am authorised to debit metal from the customer wallet.
          </span>
        </label>
        <Button
          className="h-11 w-full rounded-xl text-[0.95rem]"
          disabled={approveState.isLoading || !executeAttestation}
          onClick={() => {
            void approve({ orderId, expectedVersion: o.version })
              .unwrap()
              .then(() => toast.success("Sale executed — metal debited."))
              .catch((err) => toastApiError(err));
          }}
        >
          Execute sale · {dmInr(o.settlementPaise)}
        </Button>
      </div>
    </Surface>
  ) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/digital-metals/sells", label: "Sell approvals" }}
        eyebrow={DM_SECTION}
        title={o.customer?.name ? `${o.customer.name} is selling ${dmWeight(o.quantityUg)}` : "Sell order"}
        meta={
          <>
            <StatusBadge status={o.status} label={pending ? "To approve" : undefined} />
            <MetalPill metal={o.metal} />
            <IdChip>{orderId}</IdChip>
          </>
        }
        actions={
          o.customer?.id ? (
            <Button variant="outline" asChild className="rounded-xl">
              <Link href={`/customers/${o.customer.id}`}>
                <UserRound /> Customer profile
              </Link>
            </Button>
          ) : null
        }
      />
      <DetailLayout
        main={
          <>
            <Surface>
              <FactGrid>
                <Fact label="Quantity" value={dmWeight(o.quantityUg)} detail={o.metal === "SILVER" ? "Silver 999" : "Gold 24K 999"} />
                <Fact label="Customer gets" value={dmInr(o.settlementPaise)} detail="Net settlement" />
                <Fact label="Sell rate" value={sellRate != null ? formatInrPerGramFromPaise(sellRate) : "—"} detail="Locked at quote" />
                <Fact
                  label="Payable"
                  value={o.payable ? dmInr(o.payable.outstandingPaise ?? 0) : "—"}
                  detail={o.payable?.status ? `${o.payable.status.toLowerCase()} · outstanding` : "Opens after execution"}
                />
              </FactGrid>
            </Surface>
            <div className="grid items-start gap-6 lg:grid-cols-2">
              <DigitalMetalsSellCustomerPanel customer={o.customer} />
              <DigitalMetalsSellBankPanel bank={o.bankDestination} />
            </div>
            <DigitalMetalsSellQuotePanel
              metal={o.metal ?? null}
              finenessPpm={o.finenessPpm != null ? Number(o.finenessPpm) : null}
              quantityUg={o.quantityUg != null ? String(o.quantityUg) : null}
              settlementPaise={o.settlementPaise ?? null}
              sellRatePerGramPaise={sellRate}
            />
            {["PAYABLE_OPEN", "SETTLED"].includes(String(o.status ?? "")) ? (
              <AdminDigitalMetalsDocumentPanel title="Sale acknowledgement" docType="SELL_ACKNOWLEDGEMENT" subjectId={orderId} />
            ) : null}
          </>
        }
        aside={
          <>
            {approvalCard}
            <Surface title="Progress">
              <Timeline steps={sellTimeline(o)} />
            </Surface>
            {o.status === "PAYABLE_OPEN" ? (
              <Button asChild variant="outline" className="h-11 w-full rounded-xl">
                <Link href="/digital-metals/payouts">Go to payouts</Link>
              </Button>
            ) : null}
          </>
        }
      />
    </div>
  );
}
