"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaginatedDataTable } from "@/src/components/common/paginated-data-table";
import { Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { DateRangeFilter } from "@/src/components/common/date-range-filter";
import { RedemptionDetailSheet } from "@/src/features/maturity/redemption-detail-sheet";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import { useThrottledValue } from "@/src/hooks/use-throttled-value";
import { apiErrorMessage } from "@/src/lib/api-error";
import { money } from "@/src/lib/format";
import { useActingBranchId } from "@/src/hooks/use-acting-branch-id";
import { useGetRedemptionsQuery } from "@/src/store/api/admin-api";

export function RedemptionsQueue({
  initialReviewId,
}: {
  initialReviewId?: string | null;
} = {}) {
  const branchId = useActingBranchId();
  const searchParams = useSearchParams();
  const reviewFromUrl = searchParams.get("review");
  /** Default: no date filter so open requests always appear (incl. created “today”). */
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialReviewId ?? reviewFromUrl,
  );

  useEffect(() => {
    const id = initialReviewId ?? reviewFromUrl;
    if (id) setSelectedId(id);
  }, [initialReviewId, reviewFromUrl]);
  const throttledFrom = useThrottledValue(from, 400);
  const throttledTo = useThrottledValue(to, 400);
  const pager = useCursorPagination(
    8,
    `redemptions|${branchId ?? "all"}|${status}|${throttledFrom}|${throttledTo}`,
  );

  const queryParams = useMemo(() => {
    const params: Record<string, string | number | undefined> = {
      ...pager.queryParams,
      limit: status === "OPEN" ? 50 : pager.queryParams.limit,
      branchId,
    };
    if (throttledFrom) params.from = throttledFrom;
    if (throttledTo) params.to = throttledTo;
    if (status === "OPEN") params.open = "true";
    else if (status !== "ALL") params.status = status;
    return params;
  }, [branchId, pager.queryParams, status, throttledFrom, throttledTo]);

  const query = useGetRedemptionsQuery(queryParams);

  const rows = query.data?.items ?? [];

  if (query.isLoading) return <PageSkeleton />;
  if (query.isError) {
    return (
      <QueryError
        onRetry={query.refetch}
        title="Could not load redemption queue"
        detail={apiErrorMessage(query.error)}
      />
    );
  }

  const page = query.data?.page ?? emptyPageMeta();

  return (
    <>
      <Surface
        title="Redemption queue"
        description="Review each request for settlement detail, then approve or complete handover."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <DateRangeFilter
              label="Requested"
              from={from}
              to={to}
              onFromChange={setFrom}
              onToChange={setTo}
              presetLabel="All time"
              onPreset={() => {
                setFrom("");
                setTo("");
              }}
            />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">Open (action needed)</SelectItem>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="PENDING_APPROVAL">
                  Pending approval
                </SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      >
        <PaginatedDataTable
          rows={rows}
          page={page}
          pageIndex={pager.pageIndex}
          onNext={() => pager.goNext(page.nextCursor)}
          onPrevious={pager.goPrevious}
          canPrevious={pager.canPrevious}
          onRowClick={(r) => setSelectedId(r.id)}
          emptyTitle={
            status === "OPEN"
              ? "No open redemption requests. Try All statuses or clear the date range."
              : "No redemptions match these filters."
          }
          columns={[
            {
              key: "no",
              header: "Redemption",
              render: (r: { id: string; redemptionNumber?: string }) =>
                r.redemptionNumber ?? r.id,
            },
            {
              key: "customer",
              header: "Customer",
              render: (r: { customer?: string; id: string }) =>
                r.customer ?? "—",
            },
            {
              key: "scheme",
              header: "Scheme",
              render: (r: { scheme?: string }) => r.scheme ?? "—",
            },
            {
              key: "amount",
              header: "Value",
              render: (r: { amount?: number }) => money(r.amount ?? 0),
            },
            {
              key: "status",
              header: "Status",
              render: (r: { status?: string }) => (
                <StatusBadge status={String(r.status ?? "—")} />
              ),
            },
            {
              key: "submitted",
              header: "Requested",
              render: (r: { submittedAt?: string }) => r.submittedAt ?? "—",
            },
            {
              key: "action",
              header: "",
              className: "w-[1%] whitespace-nowrap",
              render: (r: { id: string }) => (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(r.id);
                  }}
                >
                  Review
                </Button>
              ),
            },
          ]}
        />
        {rows.length > 0 ? (
          <p className="border-t border-[#eaded9] px-4 py-3 text-xs text-muted-foreground">
            Click a row or <strong>Review</strong> to open settlement detail
            before approving or completing handover.
          </p>
        ) : null}
      </Surface>

      <RedemptionDetailSheet
        redemptionId={selectedId}
        onClose={() => setSelectedId(null)}
        onUpdated={() => query.refetch()}
      />
    </>
  );
}
