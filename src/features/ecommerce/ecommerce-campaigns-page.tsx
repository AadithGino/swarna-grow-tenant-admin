"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { PageHeader } from "@/src/components/common/page-parts";
import { EmptyState, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import { CursorPagination } from "@/src/components/common/cursor-pagination";
import { AdminTable, ListPanel, type AdminColumn } from "@/src/components/admin-ui/admin-table";
import { FilterBar, FilterSearch, QuickViews } from "@/src/components/admin-ui/filter-bar";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import { useGetEcommercePromotionCampaignsQuery } from "@/src/store/api/admin-api";

type CampaignRow = {
  id: string;
  kind?: string;
  status?: string;
  title?: string;
  productId?: string | null;
  categoryId?: string | null;
  stats?: {
    eligibleCustomers?: number;
    messagesQueued?: number;
    delivered?: number;
    failed?: number;
    pending?: number;
  };
  skippedReason?: string | null;
  createdAt?: string;
};

function DeliveryBar({ stats }: { stats?: CampaignRow["stats"] }) {
  const queued = Number(stats?.messagesQueued ?? 0);
  const delivered = Number(stats?.delivered ?? 0);
  const failed = Number(stats?.failed ?? 0);
  const pct = queued > 0 ? (delivered / queued) * 100 : 0;
  return (
    <div className="min-w-[10rem]">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold tabular-nums text-[#28161a]">
          {delivered} / {queued}
        </span>
        {failed ? <span className="text-red-700">{failed} failed</span> : <span className="text-[#9a8d90]">{Number(stats?.pending ?? 0)} pending</span>}
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#f3ebe8]">
        <div className="h-full rounded-full bg-gradient-to-r from-[#d6b46e] to-[#b8862f]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function EcommerceCampaignsPage() {
  const pager = useCursorPagination(20, "ecommerce-campaigns");
  const query = useGetEcommercePromotionCampaignsQuery({ ...pager.queryParams });
  const [kind, setKind] = useState("ALL");
  const [search, setSearch] = useState("");
  const items = (query.data?.items ?? []) as CampaignRow[];
  const page = {
    ...emptyPageMeta(),
    ...(query.data?.meta as Partial<ReturnType<typeof emptyPageMeta>> | undefined),
    limit: pager.limit,
  };
  const needle = search.trim().toLowerCase();
  const rows = items.filter(
    (r) => (kind === "ALL" || String(r.kind ?? "").includes(kind)) && (!needle || String(r.title ?? "").toLowerCase().includes(needle)),
  );

  const columns: AdminColumn<CampaignRow>[] = [
    {
      key: "title",
      header: "Campaign",
      primary: true,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#28161a]">{r.title ?? "—"}</p>
          <p className="text-xs text-[#857a7d]">{String(r.kind ?? "").replaceAll("_", " ").toLowerCase() || "promotion"}</p>
        </div>
      ),
      sortValue: (r) => r.title ?? "",
    },
    {
      key: "status",
      header: "Status",
      primary: true,
      cell: (r) => (
        <div className="space-y-0.5">
          <StatusBadge status={r.status ?? "UNKNOWN"} />
          {r.skippedReason ? <p className="text-xs text-[#857a7d]">{r.skippedReason}</p> : null}
        </div>
      ),
    },
    { key: "reach", header: "Eligible", align: "right", cell: (r) => r.stats?.eligibleCustomers ?? "—", sortValue: (r) => Number(r.stats?.eligibleCustomers ?? 0), hideOnMobile: true },
    { key: "delivery", header: "Delivered", cell: (r) => <DeliveryBar stats={r.stats} /> },
    {
      key: "created",
      header: "Sent",
      cell: (r) => <span className="text-sm text-[#5c4a4e]">{r.createdAt ? new Date(r.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}</span>,
      sortValue: (r) => r.createdAt ?? "",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Online store"
        icon={Megaphone}
        title="Push campaigns"
        description="Notifications sent to customers about a product or category. Status reflects delivery, not just sending."
      />
      <ListPanel
        toolbar={
          <FilterBar
            quickViews={
              <QuickViews
                value={kind}
                onChange={setKind}
                options={[
                  { value: "ALL", label: "All" },
                  { value: "PRODUCT", label: "Products" },
                  { value: "CATEGORY", label: "Categories" },
                ]}
                ariaLabel="Campaign type"
              />
            }
            search={<FilterSearch value={search} onChange={setSearch} placeholder="Search campaign title" />}
            resultLabel={`${rows.length} campaigns on this page`}
          />
        }
      >
        {query.isError ? (
          <QueryError error={query.error} onRetry={query.refetch} />
        ) : (
          <AdminTable
            columns={columns}
            rows={rows}
            getRowId={(r) => r.id}
            loading={query.isLoading}
            caption="Push campaigns"
            empty={
              <EmptyState
                icon={Megaphone}
                title="No campaigns yet"
                detail="Use “Notify” on a published product or category to send customers a push notification."
              />
            }
            footer={
              <CursorPagination
                page={page}
                pageIndex={pager.pageIndex}
                rowCount={items.length}
                onNext={() => pager.goNext(page.nextCursor)}
                onPrevious={pager.goPrevious}
                canPrevious={pager.canPrevious}
              />
            }
          />
        )}
      </ListPanel>
    </div>
  );
}
