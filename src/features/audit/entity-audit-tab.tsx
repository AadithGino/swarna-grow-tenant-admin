"use client";

import { useState } from "react";
import { PaginatedDataTable } from "@/src/components/common/paginated-data-table";
import { Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import { useGetEntityAuditQuery } from "@/src/store/api/admin-api";

export function EntityAuditTab({
  entityType,
  entityId,
}: {
  entityType:
    | "customer"
    | "scheme"
    | "payment"
    | "grievance"
    | "handover"
    | "redemption";
  entityId: string;
}) {
  const pager = useCursorPagination(8, entityId);
  const query = useGetEntityAuditQuery({
    entityType,
    entityId,
    ...pager.queryParams,
  });
  const [expanded, setExpanded] = useState<string | null>(null);
  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data)
    return <QueryError onRetry={query.refetch} />;
  const page = query.data.page ?? emptyPageMeta();
  return (
    <Surface title="Activity & audit" description="Immutable audit trail for this record">
      <PaginatedDataTable
        rows={query.data.items}
        page={page}
        pageIndex={pager.pageIndex}
        onNext={() => pager.goNext(page.nextCursor)}
        onPrevious={pager.goPrevious}
        canPrevious={pager.canPrevious}
        onRowClick={(r: any) =>
          setExpanded(expanded === r.id ? null : r.id)
        }
        columns={[
          {
            key: "at",
            header: "When",
            className: "whitespace-nowrap w-[1%]",
            render: (r: any) => r.at,
          },
          {
            key: "actor",
            header: "Actor",
            className: "whitespace-nowrap",
            render: (r: any) => r.actor,
          },
          {
            key: "action",
            header: "Action",
            className: "whitespace-nowrap",
            render: (r: any) => (
              <span className="font-medium">{r.action}</span>
            ),
          },
          {
            key: "summary",
            header: "Summary",
            render: (r: any) => (
              <div>
                <span>{r.summary ?? r.entity ?? "—"}</span>
                {expanded === r.id && r.changes?.length ? (
                  <table className="mt-2 w-full text-xs">
                    <tbody>
                      {r.changes.map((c: any, i: number) => (
                        <tr key={i} className="border-t">
                          <td className="py-1 pr-2 font-medium">{c.field}</td>
                          <td className="py-1 text-muted-foreground">
                            {c.from}
                          </td>
                          <td className="py-1">→</td>
                          <td className="py-1">{c.to}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
              </div>
            ),
          },
        ]}
      />
    </Surface>
  );
}
