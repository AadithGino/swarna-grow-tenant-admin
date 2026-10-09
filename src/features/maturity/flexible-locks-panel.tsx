"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PaginatedDataTable } from "@/src/components/common/paginated-data-table";
import { Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import { useActingBranchId, useActingBranchKey } from "@/src/hooks/use-acting-branch-id";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import { useGetFlexibleLocksQuery } from "@/src/store/api/admin-api";
import { CustomerLink } from "@/src/components/common/portal-entity-links";

export function FlexibleLocksPanel() {
  const branchId = useActingBranchId();
  const branchKey = useActingBranchKey();
  const pager = useCursorPagination(8, `flex-locks|${branchKey}`);
  const query = useGetFlexibleLocksQuery({
    branchId,
    ...pager.queryParams,
  });

  if (query.isLoading) return <PageSkeleton />;
  if (query.isError) {
    return (
      <QueryError error={query.error} onRetry={query.refetch} title="Could not load flexible locks" />
    );
  }

  const rows = query.data?.items ?? [];
  const page = query.data?.page ?? emptyPageMeta();

  return (
    <Surface
      title="Flexible lock queue"
      description="Flexible-phase schemes ready for cap lock or premature close"
    >
      <PaginatedDataTable
        rows={rows.map((r: Record<string, unknown>) => ({
          ...r,
          id: String(r.id ?? r._id ?? ""),
        }))}
        page={page}
        pageIndex={pager.pageIndex}
        onNext={() => pager.goNext(page.nextCursor)}
        onPrevious={pager.goPrevious}
        canPrevious={pager.canPrevious}
        emptyTitle="No flexible schemes in lock queue"
        columns={[
          {
            key: "enrollment",
            header: "Enrollment",
            render: (r: Record<string, unknown>) => (
              <Link
                href={`/enrollments/${String(r.id ?? r._id ?? "")}`}
                className="font-mono text-xs text-[#730321] hover:underline"
              >
                {String(r.enrollmentNumber ?? r.enrollmentNo ?? "—")}
              </Link>
            ),
          },
          {
            key: "customer",
            header: "Customer",
            render: (r: Record<string, unknown>) => {
              const c = r.customer as
                | { name?: string; id?: string; _id?: string }
                | string
                | undefined;
              const customerId =
                typeof c === "object" && c
                  ? String(c.id ?? c._id ?? r.customerId ?? "")
                  : String(r.customerId ?? "");
              const name =
                typeof c === "string" ? c : (c?.name ?? "—");
              return (
                <CustomerLink customerId={customerId}>{name}</CustomerLink>
              );
            },
          },
          {
            key: "status",
            header: "Status",
            render: (r: Record<string, unknown>) => (
              <StatusBadge status={String(r.status ?? "—")} />
            ),
          },
          {
            key: "actions",
            header: "",
            render: (r: Record<string, unknown>) => (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/enrollments/${String(r.id ?? r._id ?? "")}`}>
                  Open
                </Link>
              </Button>
            ),
          },
        ]}
      />
    </Surface>
  );
}
