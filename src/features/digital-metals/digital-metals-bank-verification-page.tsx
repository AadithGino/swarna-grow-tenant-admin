"use client";

import { useState } from "react";
import { BadgeCheck, Landmark } from "lucide-react";
import { PageHeader } from "@/src/components/common/page-parts";
import { EmptyState, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import {
  AdminTable,
  ListPanel,
  LoadMoreFooter,
  type AdminColumn,
} from "@/src/components/admin-ui/admin-table";
import { FilterBar, FilterSearch, QuickViews } from "@/src/components/admin-ui/filter-bar";
import { Notice } from "@/src/components/admin-ui/detail-parts";
import { useLoadMoreList } from "@/src/hooks/use-load-more-list";
import { useGetDigitalMetalsBankVerificationQueueQuery } from "@/src/store/api/admin-api";
import { useDigitalMetalsServerEntitlement } from "./digital-metals-admin-shared";
import { DM_SECTION, DmCustomerCell, DmGate, shortDateTime } from "./digital-metals-admin-ui";

type BankRow = Record<string, unknown> & { id: string };

const STATUS_VIEWS = [
  { value: "PENDING_VERIFICATION", label: "To verify" },
  { value: "ACTIVE", label: "Verified" },
  { value: "DISABLED", label: "Disabled" },
  { value: "ALL", label: "All" },
];

const rowId = (r: BankRow) => String(r.id);

export function DigitalMetalsBankVerificationPage() {
  const ent = useDigitalMetalsServerEntitlement();
  const [status, setStatus] = useState("PENDING_VERIFICATION");
  const [search, setSearch] = useState("");
  const list = useLoadMoreList<BankRow>(status, rowId);
  const queue = useGetDigitalMetalsBankVerificationQueueQuery(
    { status: status === "ALL" ? undefined : status, limit: 25, cursor: list.cursor },
    { skip: !ent.workspaceVisible },
  );

  const merged = list.merge((queue.data?.items ?? []) as BankRow[]);
  const needle = search.trim().toLowerCase();
  const rows = needle
    ? merged.filter((r) => {
        const c = r.customer as { name?: string; customerNumber?: string } | null;
        return [r.accountHolderName, r.ifsc, r.bankName, r.accountLast4, c?.name, c?.customerNumber]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle));
      })
    : merged;
  const meta = queue.data?.meta;

  const columns: AdminColumn<BankRow>[] = [
    {
      key: "customer",
      header: "Customer",
      primary: true,
      cell: (r) => <DmCustomerCell customer={r.customer as Parameters<typeof DmCustomerCell>[0]["customer"]} />,
      sortValue: (r) => String((r.customer as { name?: string } | null)?.name ?? ""),
    },
    {
      key: "account",
      header: "Account",
      cell: (r) => (
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-[#f6efec] text-[#7b0a2b]">
            <Landmark className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{String(r.accountHolderName ?? "Account")}</p>
            <p className="truncate text-xs text-[#857a7d]">
              {r.bankName ? `${String(r.bankName)} · ` : ""}••••{String(r.accountLast4 ?? "????")}
            </p>
          </div>
        </div>
      ),
    },
    { key: "ifsc", header: "IFSC", cell: (r) => <span className="tabular-nums">{String(r.ifsc ?? "—")}</span>, hideOnMobile: true },
    {
      key: "added",
      header: "Added",
      cell: (r) => <span className="text-sm text-[#5c4a4e]">{shortDateTime(r.createdAt as string | undefined)}</span>,
      sortValue: (r) => String(r.createdAt ?? ""),
      hideOnMobile: true,
    },
    {
      key: "status",
      header: "Status",
      primary: true,
      cell: (r) => (
        <StatusBadge
          status={String(r.status ?? "")}
          label={r.status === "PENDING_VERIFICATION" ? "To verify" : r.status === "ACTIVE" ? "Verified" : undefined}
        />
      ),
    },
  ];

  return (
    <DmGate loading={ent.loading} visible={ent.workspaceVisible} message={ent.disabledMessage} title="Bank verification">
      <div className="space-y-6" data-testid="digital-metals-bank-verification-queue">
        <PageHeader
          eyebrow={DM_SECTION}
          icon={BadgeCheck}
          title="Bank verification"
          description="Customers add a bank account before their first sale. Verify it from the customer's profile — full account numbers are never shown here."
        />
        <Notice tone="blue" icon={BadgeCheck}>
          Open a row to go to the customer, then verify or disable the account from their Digital Gold tab after checking a
          cancelled cheque or statement.
        </Notice>
        <ListPanel
          toolbar={
            <FilterBar
              quickViews={<QuickViews value={status} onChange={setStatus} options={STATUS_VIEWS} ariaLabel="Verification status" />}
              search={<FilterSearch value={search} onChange={setSearch} placeholder="Search name, bank, IFSC or last 4 digits" />}
              resultLabel={`${rows.length}${meta?.hasMore ? "+" : ""} accounts`}
            />
          }
        >
          {queue.isError ? (
            <QueryError error={queue.error} onRetry={queue.refetch} />
          ) : (
            <AdminTable
              columns={columns}
              rows={rows}
              getRowId={rowId}
              rowHref={(r) => {
                const id = (r.customer as { id?: string } | null)?.id;
                return id ? `/customers/${id}` : undefined;
              }}
              loading={queue.isLoading}
              fetching={queue.isFetching && !queue.isLoading}
              caption="Bank accounts awaiting verification"
              empty={
                <EmptyState
                  icon={BadgeCheck}
                  title={status === "PENDING_VERIFICATION" ? "All caught up" : "No accounts match"}
                  detail={status === "PENDING_VERIFICATION" ? "No bank accounts are waiting for verification." : "Try another status."}
                />
              }
              footer={
                <LoadMoreFooter
                  shown={rows.length}
                  hasMore={meta?.hasMore}
                  loading={queue.isFetching}
                  noun="accounts"
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
