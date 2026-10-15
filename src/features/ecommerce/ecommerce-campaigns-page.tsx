"use client";

import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import { CursorPagination } from "@/src/components/common/cursor-pagination";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import { useGetEcommercePromotionCampaignsQuery } from "@/src/store/api/admin-api";
import { EcommerceCatalogNav } from "@/src/features/ecommerce/ecommerce-settings-ui";

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

export function EcommerceCampaignsPage() {
  const pager = useCursorPagination(20, "ecommerce-campaigns");
  const query = useGetEcommercePromotionCampaignsQuery({ ...pager.queryParams });
  if (query.isLoading) return <PageSkeleton cards={2} />;
  if (query.isError) return <QueryError error={query.error} onRetry={query.refetch} />;
  const items = (query.data?.items ?? []) as CampaignRow[];
  const page = {
    ...emptyPageMeta(),
    ...(query.data?.meta as Partial<typeof emptyPageMeta> | undefined),
    limit: pager.limit,
  };

  return (
    <>
      <PageHeader
        eyebrow="Online store"
        title="Push campaigns"
        description="Product and category FCM promotions. Status reflects message dispatch — not just fan-out completion."
      />
      <EcommerceCatalogNav />
      <Surface title="Recent campaigns" className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="p-3 font-medium">Title</th>
                <th className="p-3 font-medium">Kind</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Messages</th>
                <th className="p-3 font-medium">Delivered</th>
                <th className="p-3 font-medium">Failed</th>
                <th className="p-3 font-medium">Pending</th>
                <th className="p-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-[#f0e8e4]">
                  <td className="p-3 font-medium text-[#28161a]">{row.title ?? "—"}</td>
                  <td className="p-3">{row.kind ?? "—"}</td>
                  <td className="p-3">
                    <StatusBadge status={row.status ?? "UNKNOWN"} />
                    {row.skippedReason ? (
                      <span className="ml-2 text-xs text-muted-foreground">{row.skippedReason}</span>
                    ) : null}
                  </td>
                  <td className="p-3">{row.stats?.messagesQueued ?? 0}</td>
                  <td className="p-3">{row.stats?.delivered ?? 0}</td>
                  <td className="p-3">{row.stats?.failed ?? 0}</td>
                  <td className="p-3">{row.stats?.pending ?? 0}</td>
                  <td className="p-3 text-muted-foreground">
                    {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted-foreground">
                    No promotion campaigns yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <CursorPagination
          page={page}
          pageIndex={pager.pageIndex}
          rowCount={items.length}
          onNext={() => pager.goNext(page.nextCursor)}
          onPrevious={pager.goPrevious}
          canPrevious={pager.canPrevious}
        />
      </Surface>
    </>
  );
}
