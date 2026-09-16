"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PaginatedDataTable } from "@/src/components/common/paginated-data-table";
import { Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { formatRoleLabel } from "@/src/features/access/access-detail-parts";
import { money } from "@/src/lib/format";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import { useGetStaffQuery } from "@/src/store/api/admin-api";

export function BranchStaffTab({ branchId }: { branchId: string }) {
  const router = useRouter();
  const pager = useCursorPagination(10, `branch-staff|${branchId}`);
  const query = useGetStaffQuery({
    branchId,
    status: "ACTIVE",
    ...pager.queryParams,
  });

  if (query.isLoading && !query.data) {
    return <PageSkeleton cards={2} />;
  }
  if (query.isError || !query.data) {
    return (
      <QueryError error={query.error} onRetry={query.refetch} title="Could not load staff roster" />
    );
  }

  const page = query.data.page ?? emptyPageMeta();
  const rows = query.data.items;

  return (
    <Surface
      title="Staff at this branch"
      description="Active team members assigned to this showroom"
    >
      <PaginatedDataTable
        rows={rows}
        page={page}
        pageIndex={pager.pageIndex}
        onNext={() => pager.goNext(page.nextCursor)}
        onPrevious={pager.goPrevious}
        canPrevious={pager.canPrevious}
        onRowClick={(r) => router.push(`/staff-branches/staff/${r.id}`)}
        columns={[
          {
            key: "name",
            header: "Name",
            render: (r) => <strong>{r.name}</strong>,
          },
          {
            key: "role",
            header: "Role",
            render: (r) => formatRoleLabel(r.role),
          },
          {
            key: "today",
            header: "Today",
            render: (r) => money(r.today),
          },
          {
            key: "sessions",
            header: "Sessions",
            render: (r) => `${r.sessions} active`,
          },
          {
            key: "seen",
            header: "Last seen",
            render: (r) => r.lastSeen,
          },
          {
            key: "status",
            header: "Status",
            render: (r) => <StatusBadge status={r.status} />,
          },
          {
            key: "action",
            header: "",
            render: (r) => (
              <Button
                size="sm"
                variant="ghost"
                className="font-semibold text-[#730321]"
                asChild
                onClick={(e) => e.stopPropagation()}
              >
                <Link href={`/staff-branches/staff/${r.id}`}>View</Link>
              </Button>
            ),
          },
        ]}
      />
    </Surface>
  );
}
