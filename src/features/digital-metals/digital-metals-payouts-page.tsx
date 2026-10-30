"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Banknote, Clock3, Landmark, Send } from "lucide-react";
import { PageHeader, StatCard } from "@/src/components/common/page-parts";
import { EmptyState, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import {
  AdminTable,
  IdChip,
  ListPanel,
  LoadMoreFooter,
  type AdminColumn,
} from "@/src/components/admin-ui/admin-table";
import { FilterBar, FilterSearch, QuickViews } from "@/src/components/admin-ui/filter-bar";
import { useLoadMoreList } from "@/src/hooks/use-load-more-list";
import {
  useGetDigitalMetalsPayablesQuery,
  useGetDigitalMetalsPayoutsQuery,
} from "@/src/store/api/admin-api";
import { useDigitalMetalsServerEntitlement } from "./digital-metals-admin-shared";
import { DM_SECTION, DmCustomerCell, DmGate, dmInr, dmInrShort, shortDateTime } from "./digital-metals-admin-ui";

type Customer = { id?: string; name?: string; mobile?: string; customerNumber?: string } | null;

type PayableRow = {
  id: string;
  sellOrderId: string;
  outstandingPaise: number;
  status: string;
  customer?: Customer;
  createdAt?: string | null;
};

type PayoutRow = {
  id: string;
  status: string;
  amountPaise: number;
  sellOrderId: string;
  customer?: Customer;
  bankReference?: string | null;
  destinationSnapshot?: { bankName?: string; accountLast4?: string } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

const PAYOUT_VIEWS = [
  { value: "ALL", label: "All instructions" },
  { value: "PENDING_APPROVAL", label: "To approve" },
  { value: "APPROVED", label: "To send" },
  { value: "SUBMITTED", label: "Awaiting bank" },
  { value: "SETTLED", label: "Settled" },
  { value: "FAILED", label: "Failed" },
];

const payoutId = (r: PayoutRow) => r.id;
const payableId = (r: PayableRow) => r.id;

function matches(q: string, values: (string | undefined | null)[]) {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return values.filter(Boolean).some((v) => String(v).toLowerCase().includes(needle));
}

export function DigitalMetalsPayoutsPage() {
  const ent = useDigitalMetalsServerEntitlement();
  const [tab, setTab] = useState<"payouts" | "payables">("payouts");
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const payablesList = useLoadMoreList<PayableRow>("payables", payableId);
  const payoutsList = useLoadMoreList<PayoutRow>("payouts", payoutId);

  const payables = useGetDigitalMetalsPayablesQuery(
    { limit: 25, cursor: payablesList.cursor },
    { skip: !ent.workspaceVisible },
  );
  const payouts = useGetDigitalMetalsPayoutsQuery(
    { limit: 25, cursor: payoutsList.cursor },
    { skip: !ent.workspaceVisible },
  );

  const openPayables = payablesList.merge((payables.data?.items ?? []) as PayableRow[]);
  const payoutRows = payoutsList.merge((payouts.data?.items ?? []) as PayoutRow[]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of payoutRows) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [payoutRows]);
  const outstanding = openPayables.reduce((s, p) => s + Number(p.outstandingPaise ?? 0), 0);
  const inFlight = payoutRows
    .filter((p) => ["APPROVED", "SUBMITTED"].includes(p.status))
    .reduce((s, p) => s + Number(p.amountPaise ?? 0), 0);

  const visiblePayouts = payoutRows.filter(
    (p) =>
      (status === "ALL" || p.status === status) &&
      matches(search, [p.id, p.sellOrderId, p.customer?.name, p.bankReference]),
  );
  const visiblePayables = openPayables.filter((p) => matches(search, [p.id, p.sellOrderId, p.customer?.name]));

  const payoutColumns: AdminColumn<PayoutRow>[] = [
    {
      key: "customer",
      header: "Customer",
      primary: true,
      cell: (r) => <DmCustomerCell customer={r.customer} fallbackId={`Sell ${r.sellOrderId}`} />,
      sortValue: (r) => r.customer?.name ?? r.sellOrderId,
    },
    {
      key: "instruction",
      header: "Instruction",
      cell: (r) => (
        <div className="space-y-1">
          <IdChip>{r.id}</IdChip>
          <p className="text-xs text-[#9a8d90]">
            {r.destinationSnapshot?.bankName ? `${r.destinationSnapshot.bankName} ••${r.destinationSnapshot.accountLast4 ?? ""}` : `Sell ${r.sellOrderId}`}
          </p>
        </div>
      ),
      hideOnMobile: true,
    },
    {
      key: "ref",
      header: "Bank reference",
      cell: (r) => <span className="tabular-nums text-[#5c4a4e]">{r.bankReference ?? "—"}</span>,
      hideOnMobile: true,
    },
    {
      key: "updated",
      header: "Updated",
      cell: (r) => <span className="text-sm text-[#5c4a4e]">{shortDateTime(r.updatedAt ?? r.createdAt)}</span>,
      sortValue: (r) => r.updatedAt ?? r.createdAt ?? "",
      hideOnMobile: true,
    },
    { key: "status", header: "Status", primary: true, cell: (r) => <StatusBadge status={r.status} />, sortValue: (r) => r.status },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (r) => <span className="font-bold">{dmInr(r.amountPaise)}</span>,
      sortValue: (r) => Number(r.amountPaise ?? 0),
    },
  ];

  const payableColumns: AdminColumn<PayableRow>[] = [
    {
      key: "customer",
      header: "Customer",
      primary: true,
      cell: (r) => <DmCustomerCell customer={r.customer} fallbackId={r.id} />,
      sortValue: (r) => r.customer?.name ?? r.id,
    },
    {
      key: "sell",
      header: "From sale",
      cell: (r) => (
        <Link
          href={`/digital-metals/sells/${r.sellOrderId}`}
          onClick={(e) => e.stopPropagation()}
          className="font-semibold text-[#7b0a2b] hover:underline"
        >
          {r.sellOrderId}
        </Link>
      ),
    },
    {
      key: "since",
      header: "Owed since",
      cell: (r) => <span className="text-sm text-[#5c4a4e]">{shortDateTime(r.createdAt)}</span>,
      sortValue: (r) => r.createdAt ?? "",
      hideOnMobile: true,
    },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status === "OPEN" ? "PAYABLE_OPEN" : r.status} label={r.status === "OPEN" ? "Open" : undefined} /> },
    {
      key: "amount",
      header: "Outstanding",
      align: "right",
      primary: true,
      cell: (r) => <span className="font-bold">{dmInr(r.outstandingPaise)}</span>,
      sortValue: (r) => Number(r.outstandingPaise ?? 0),
    },
  ];

  const loading = payables.isLoading || payouts.isLoading;

  return (
    <DmGate loading={ent.loading} visible={ent.workspaceVisible} message={ent.disabledMessage} title="Payouts">
      <div className="space-y-6" data-testid="digital-metals-payouts-workspace">
        <PageHeader
          eyebrow={DM_SECTION}
          icon={Banknote}
          title="Payouts & payables"
          description="Bank payouts are separate from executing a sale. Settling needs approver attestation and bank evidence — a reference alone isn't proof of credit."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Banknote} label="Owed to customers" value={dmInrShort(outstanding)} loading={payables.isLoading} detail={`${openPayables.length} open payables`} tone="gold" />
          <StatCard icon={Clock3} label="To approve" value={String(counts.PENDING_APPROVAL ?? 0)} loading={payouts.isLoading} detail="Instructions waiting for an approver" tone={counts.PENDING_APPROVAL ? "red" : "wine"} />
          <StatCard icon={Send} label="In flight" value={dmInrShort(inFlight)} loading={payouts.isLoading} detail="Approved or sent to the bank" tone="blue" />
          <StatCard icon={Landmark} label="Settled" value={String(counts.SETTLED ?? 0)} loading={payouts.isLoading} detail="Confirmed customer credits (loaded)" tone="green" />
        </div>
        <ListPanel
          toolbar={
            <FilterBar
              quickViews={
                <div className="flex flex-wrap items-center gap-3">
                  <div role="tablist" aria-label="List" className="inline-flex rounded-xl border border-[#e6dad6] bg-[#fbf8f6] p-1">
                    {(
                      [
                        ["payouts", `Payout instructions (${payoutRows.length}${payouts.data?.meta?.hasMore ? "+" : ""})`],
                        ["payables", `Open payables (${openPayables.length}${payables.data?.meta?.hasMore ? "+" : ""})`],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={tab === key}
                        onClick={() => setTab(key)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${tab === key ? "bg-white text-[#5e0a20] shadow-sm" : "text-[#7a6d70] hover:text-[#28161a]"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              }
              search={<FilterSearch value={search} onChange={setSearch} placeholder="Search customer, sell order or UTR" />}
              filters={
                tab === "payouts" ? (
                  <QuickViews
                    value={status}
                    onChange={setStatus}
                    options={PAYOUT_VIEWS.map((v) => (v.value === "ALL" ? v : { ...v, count: counts[v.value] ?? 0 }))}
                    ariaLabel="Payout status"
                  />
                ) : null
              }
            />
          }
        >
          {payouts.isError || payables.isError ? (
            <QueryError
              error={payouts.error ?? payables.error}
              onRetry={() => {
                payouts.refetch();
                payables.refetch();
              }}
            />
          ) : tab === "payouts" ? (
            <AdminTable
              columns={payoutColumns}
              rows={visiblePayouts}
              getRowId={payoutId}
              rowHref={(r) => `/digital-metals/payouts/${r.id}`}
              loading={loading}
              caption="Payout instructions"
              empty={<EmptyState icon={Send} title="No payout instructions" detail="Instructions are created from open payables after a sale is executed." />}
              footer={
                <LoadMoreFooter
                  shown={visiblePayouts.length}
                  hasMore={payouts.data?.meta?.hasMore}
                  loading={payouts.isFetching}
                  noun="instructions"
                  onLoadMore={() => payoutsList.loadMore(payoutRows, payouts.data?.meta?.nextCursor)}
                />
              }
            />
          ) : (
            <AdminTable
              columns={payableColumns}
              rows={visiblePayables}
              getRowId={payableId}
              rowHref={(r) => `/digital-metals/sells/${r.sellOrderId}`}
              loading={loading}
              caption="Open payables"
              empty={<EmptyState icon={Banknote} title="Nothing owed" detail="Every executed sale has been paid out." />}
              footer={
                <LoadMoreFooter
                  shown={visiblePayables.length}
                  hasMore={payables.data?.meta?.hasMore}
                  loading={payables.isFetching}
                  noun="payables"
                  onLoadMore={() => payablesList.loadMore(openPayables, payables.data?.meta?.nextCursor)}
                />
              }
            />
          )}
        </ListPanel>
      </div>
    </DmGate>
  );
}
