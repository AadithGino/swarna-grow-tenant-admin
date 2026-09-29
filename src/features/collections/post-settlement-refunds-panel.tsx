"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PaginatedDataTable } from "@/src/components/common/paginated-data-table";
import { Surface } from "@/src/components/common/page-parts";
import { PageFilterTabs, PageTab } from "@/src/components/common/page-tabs";
import {
  EmptyState,
  PageSkeleton,
  QueryError,
} from "@/src/components/common/query-state";
import { money } from "@/src/lib/format";
import {
  buildPostSettlementResolveBody,
  formatIstDateTime,
  postSettlementCaseId,
  type PostSettlementRefundCaseRow,
} from "@/src/lib/post-settlement-refund-case";
import { hasPermission } from "@/src/lib/permissions";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import { useAppSelector } from "@/src/store/hooks";
import {
  useGetPostSettlementRefundCaseQuery,
  useGetPostSettlementRefundCasesQuery,
  useResolvePostSettlementRefundCaseMutation,
} from "@/src/store/api/admin-api";
import { StatusBadge } from "@/src/components/common/status-badge";
import { PostSettlementRefundCaseDialog } from "@/src/features/collections/post-settlement-refund-case-dialog";

type CaseTab = "pending" | "history";

export function PostSettlementRefundsPanel() {
  const user = useAppSelector((s) => s.session.session?.user);
  const canResolve = hasPermission(user, "payment.reverse");
  const [tab, setTab] = useState<CaseTab>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const pendingQuery = useGetPostSettlementRefundCasesQuery({
    status: "PENDING_RESOLUTION",
  });
  const historyQuery = useGetPostSettlementRefundCasesQuery({
    status: "RESOLVED",
  });
  const detailQuery = useGetPostSettlementRefundCaseQuery(selectedId ?? "", {
    skip: !selectedId,
  });
  const [resolveCase, resolveState] = useResolvePostSettlementRefundCaseMutation();

  const listQuery = tab === "pending" ? pendingQuery : historyQuery;
  const rows = (listQuery.data?.data ?? []) as PostSettlementRefundCaseRow[];

  const columns = useMemo(
    () => [
      {
        key: "amount",
        header: "Refund",
        render: (row: PostSettlementRefundCaseRow) => (
          <strong>{money(Number(row.refundAmountPaise ?? 0) / 100)}</strong>
        ),
      },
      {
        key: "completed",
        header: "Completed (IST)",
        render: (row: PostSettlementRefundCaseRow) =>
          formatIstDateTime(row.refundCompletedAt),
      },
      {
        key: "status",
        header: "Status",
        render: (row: PostSettlementRefundCaseRow) => (
          <StatusBadge status={String(row.status ?? "")} />
        ),
      },
      {
        key: "refs",
        header: "Enrollment / payment",
        render: (row: PostSettlementRefundCaseRow) => (
          <div className="text-xs text-muted-foreground">
            <p>Scheme {String(row.schemeId ?? "—")}</p>
            <p>Payment {String(row.paymentId ?? "—")}</p>
          </div>
        ),
      },
      {
        key: "action",
        header: "",
        render: (row: PostSettlementRefundCaseRow) => {
          const id = postSettlementCaseId(row);
          const pendingRow =
            String(row.status ?? "") === "PENDING_RESOLUTION" ||
            String(row.status ?? "") === "PENDING";
          return (
            <Button
              size="sm"
              variant={pendingRow ? "default" : "outline"}
              onClick={() => {
                setSelectedId(id);
                setDialogOpen(true);
              }}
            >
              {pendingRow ? "Review" : "View"}
            </Button>
          );
        },
      },
    ],
    [],
  );

  const caseForDialog = (detailQuery.data ?? null) as PostSettlementRefundCaseRow | null;

  async function refreshDetail() {
    if (!selectedId) return undefined;
    const result = await detailQuery.refetch();
    return result.data as PostSettlementRefundCaseRow | undefined;
  }

  if (listQuery.isLoading) return <PageSkeleton />;
  if (listQuery.isError)
    return <QueryError error={listQuery.error} onRetry={listQuery.refetch} />;

  return (
    <>
      <Surface
        title="Post-settlement gateway refunds"
        description="Provider refunds after scheme settlement need an operator disposition (not another cash movement)."
        className="overflow-visible"
      >
        <PageFilterTabs
          sectionLabel="Case queue"
          value={tab}
          onValueChange={(v) => setTab(v as CaseTab)}
        >
          <PageTab value="pending">
            Pending
            {(pendingQuery.data?.meta?.pendingCount ?? 0) > 0
              ? ` (${pendingQuery.data?.meta?.pendingCount})`
              : ""}
          </PageTab>
          <PageTab value="history">Resolved history</PageTab>
        </PageFilterTabs>
        {rows.length === 0 ? (
          <EmptyState
            title={tab === "pending" ? "No pending cases" : "No resolved cases yet"}
            detail={
              tab === "pending"
                ? "All post-settlement refunds are resolved."
                : "Resolved cases appear here for audit."
            }
          />
        ) : (
          <PaginatedDataTable
            rows={rows.map((row) => ({
              ...row,
              id: postSettlementCaseId(row),
            }))}
            page={emptyPageMeta()}
            pageIndex={0}
            onNext={() => {}}
            onPrevious={() => {}}
            canPrevious={false}
            columns={columns}
          />
        )}
      </Surface>
      <PostSettlementRefundCaseDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedId(null);
        }}
        caseRow={
          detailQuery.isLoading && selectedId ? null : caseForDialog
        }
        canResolve={canResolve}
        busy={resolveState.isLoading || detailQuery.isFetching}
        onRefreshCase={refreshDetail}
        onResolve={async ({ disposition, reason }) => {
          const fresh = await detailQuery.refetch();
          const row = (fresh.data ?? caseForDialog) as PostSettlementRefundCaseRow;
          const body = buildPostSettlementResolveBody(row, disposition, reason);
          await resolveCase(body).unwrap();
          await Promise.all([
            pendingQuery.refetch(),
            historyQuery.refetch(),
            detailQuery.refetch(),
          ]);
        }}
      />
    </>
  );
}
