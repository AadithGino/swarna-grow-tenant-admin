"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  HandCoins,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DateRangeFilter } from "@/src/components/common/date-range-filter";
import { PaginatedDataTable } from "@/src/components/common/paginated-data-table";
import {
  PageHeader,
  StatCard,
  Surface,
} from "@/src/components/common/page-parts";
import {
  PageTab,
  PageTabs,
  PageTabsBar,
  PageTabsPanel,
} from "@/src/components/common/page-tabs";
import {
  EmptyState,
  PageSkeleton,
  QueryError,
} from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { money } from "@/src/lib/format";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { useValidatedListDateRange } from "@/src/hooks/use-validated-list-date-range";
import {
  useActingBranchId,
  useActingBranchKey,
} from "@/src/hooks/use-acting-branch-id";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import {
  ChartSeriesView,
  hasChartSeriesData,
} from "@/src/components/common/chart-series-view";
import { PermissionGate } from "@/src/components/common/permission-gate";
import { ACTION } from "@/src/lib/action-permissions";
import {
  useGetCashHandoversQuery,
  useGetCashOverviewQuery,
  useGetCashReportQuery,
  useGetCashStaffBalancesQuery,
  useResolveHandoverDiscrepancyMutation,
} from "@/src/store/api/admin-api";
import { useAppDispatch } from "@/src/store/hooks";
import { setBranch } from "@/src/store/slices/ui-slice";
import type { ChartSeriesBlock } from "@/src/types/admin-report";
import {
  MarkCashSubmittedDialog,
  type CashStaffRow,
} from "@/src/features/cash/mark-cash-submitted-dialog";
import { AcceptHandoverDialog } from "@/src/features/cash/accept-handover-dialog";
import { HandoverDetailDialog } from "@/src/features/cash/handover-detail-dialog";

export function CashControlPage() {
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { from, setFrom, to, setTo, dateRangeError, skipForBadDates } =
    useValidatedListDateRange();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [acceptTarget, setAcceptTarget] = useState<{
    id: string;
    handoverNo: string;
    amount: number;
    status: string;
  } | null>(null);
  const [submitDialog, setSubmitDialog] = useState<{
    open: boolean;
    staff?: CashStaffRow;
  }>({ open: false });

  const branchId = useActingBranchId();
  const branchKey = useActingBranchKey();

  useEffect(() => {
    const fromUrl = searchParams.get("branchId");
    if (fromUrl && fromUrl !== "ALL") {
      dispatch(setBranch(fromUrl));
    }
  }, [searchParams, dispatch]);
  const staffPager = useCursorPagination(8, `staff|${branchKey}`);
  const handoverPager = useCursorPagination(
    8,
    `${from}|${to}|${branchKey}`,
  );
  const reportPager = useCursorPagination(
    5,
    `${from}|${to}|report|${branchKey}`,
  );

  const overviewQuery = useGetCashOverviewQuery(
    branchId ? { branchId } : undefined,
  );
  const staffQuery = useGetCashStaffBalancesQuery({
    branchId,
    ...staffPager.queryParams,
  });
  const staffPickerQuery = useGetCashStaffBalancesQuery({
    limit: 100,
    branchId,
  });
  const handoverArgs = useMemo(
    () => ({
      from,
      to,
      branchId,
      ...handoverPager.queryParams,
    }),
    [from, to, branchId, handoverPager.queryParams],
  );
  const handoversQuery = useGetCashHandoversQuery(handoverArgs, {
    skip: skipForBadDates,
  });
  const reportArgs = useMemo(
    () => ({
      from,
      to,
      groupBy: "STAFF" as const,
      branchId,
      ...reportPager.queryParams,
    }),
    [from, to, branchId, reportPager.queryParams],
  );
  const reportQuery = useGetCashReportQuery(reportArgs, {
    skip: skipForBadDates,
  });

  const [resolveDiscrepancy] = useResolveHandoverDiscrepancyMutation();

  const loading =
    overviewQuery.isLoading ||
    staffQuery.isLoading ||
    handoversQuery.isLoading ||
    reportQuery.isLoading;

  if (skipForBadDates) {
    return (
      <>
        <PageHeader
          eyebrow="Money & fulfilment"
          title="Cash control"
          description="Staff cash balances, handovers, discrepancies and branch-level cash reporting."
        />
        <Surface title="Invalid period">
          <EmptyState title="Fix the date range" detail={dateRangeError ?? ""} />
        </Surface>
      </>
    );
  }

  if (loading) return <PageSkeleton />;

  if (
    overviewQuery.isError ||
    staffQuery.isError ||
    handoversQuery.isError ||
    reportQuery.isError ||
    !overviewQuery.data ||
    !staffQuery.data ||
    !handoversQuery.data ||
    !reportQuery.data
  ) {
    return (
      <QueryError
        onRetry={() => {
          overviewQuery.refetch();
          staffQuery.refetch();
          handoversQuery.refetch();
          reportQuery.refetch();
        }}
        error={
          overviewQuery.error ??
          staffQuery.error ??
          handoversQuery.error ??
          reportQuery.error
        }
      />
    );
  }

  const s = overviewQuery.data.summary ?? {};
  const staffPage = staffQuery.data.page ?? emptyPageMeta();
  const handoversPage = handoversQuery.data.page ?? emptyPageMeta();
  const reportPage = reportQuery.data.page ?? emptyPageMeta();
  const reportTotals = reportQuery.data.totals;

  const staffRows: CashStaffRow[] = (staffPickerQuery.data?.items ?? []).map(
    (r) => ({
      id: r.id,
      name: r.name,
      branch: r.branch,
      balance: r.balance ?? r.today ?? 0,
      availableForHandover: r.availableForHandover ?? r.balance ?? r.today ?? 0,
    }),
  );

  const openReceive = (staff?: CashStaffRow) =>
    setSubmitDialog({ open: true, staff });

  const staffForChart =
    staffPickerQuery.data?.items ?? staffQuery.data.items ?? [];
  const cashInHandChart = (() => {
    const fromOverview = overviewQuery.data.chart as
      | ChartSeriesBlock
      | undefined;
    if (fromOverview && hasChartSeriesData(fromOverview)) return fromOverview;
    const points = staffForChart
      .filter((row) => (row.balance ?? 0) > 0)
      .sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0))
      .slice(0, 12)
      .map((row) => ({
        x: row.name,
        y: Math.round((row.balance ?? 0) * 100),
        yDisplay: money(row.balance ?? 0),
      }));
    if (!points.length) {
      return fromOverview ?? null;
    }
    return {
      chartType: "horizontalBar",
      title: "Cash in hand by staff",
      yAxis: { type: "currency", label: "Amount" },
      series: [{ key: "CASH_IN_HAND", name: "Cash in hand", data: points }],
    } satisfies ChartSeriesBlock;
  })();

  return (
    <>
      <AcceptHandoverDialog
        handover={acceptTarget}
        open={Boolean(acceptTarget)}
        onOpenChange={(open) => !open && setAcceptTarget(null)}
      />
      <HandoverDetailDialog
        handoverId={detailId}
        open={Boolean(detailId)}
        onOpenChange={(open) => !open && setDetailId(null)}
      />
      <MarkCashSubmittedDialog
        staffList={staffRows}
        staff={submitDialog.staff ?? null}
        open={submitDialog.open}
        onOpenChange={(open) =>
          setSubmitDialog((prev) => ({
            open,
            staff: open ? prev.staff : undefined,
          }))
        }
      />
      <PageHeader
        eyebrow="Money & fulfilment"
        title="Cash control"
        description="Staff cash-in-hand, handover history, and branch verification."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={WalletCards}
          label="Cash in hand"
          value={money(s.inHand ?? 0)}
          detail={
            s.staffHoldingCash != null
              ? `Held by ${s.staffHoldingCash} staff right now`
              : "With collection staff right now"
          }
        />
        <StatCard
          icon={HandCoins}
          label="Awaiting acceptance"
          value={money(s.submitted ?? 0)}
          detail={`${s.pendingHandovers ?? 0} handover${s.pendingHandovers === 1 ? "" : "s"} submitted, not yet accepted`}
          tone={(s.pendingHandovers ?? 0) > 0 ? "gold" : "cream"}
        />
        <StatCard
          icon={AlertTriangle}
          label="Open discrepancies"
          value={money(s.discrepancy ?? 0)}
          detail={
            (s.discrepancy ?? 0) > 0
              ? "Short/excess on handovers — resolve below"
              : "No open discrepancies"
          }
          tone={(s.discrepancy ?? 0) > 0 ? "red" : "green"}
        />
        <StatCard
          icon={UsersRound}
          label="Staff holding cash"
          value={s.staffHoldingCash ?? staffRows.filter((r) => r.balance > 0).length}
          detail="Should hand over before day end"
          tone="cream"
        />
      </div>
      {cashInHandChart ? (
        <Surface
          title={cashInHandChart.title ?? "Cash in hand by staff"}
          description={
            hasChartSeriesData(cashInHandChart)
              ? "Active staff ranked by cash still in hand"
              : "No staff are holding cash right now"
          }
          className="min-h-[320px]"
        >
          <div className="h-[260px] p-5">
            <ChartSeriesView chart={cashInHandChart} />
          </div>
        </Surface>
      ) : null}
      <PageTabs defaultValue="balances">
        <PageTabsBar sectionLabel="Cash views">
          <PageTab value="balances">Staff balances</PageTab>
          <PageTab value="handovers">Submission history</PageTab>
          <PageTab value="report">Cash report</PageTab>
        </PageTabsBar>
        <PageTabsPanel value="balances">
          <Surface
            title="Staff cash balances"
            description="When staff brings cash to the counter, use Receive cash — that records the handover and updates balances in one step."
            action={
              <PermissionGate permission={ACTION.cashHandoverAccept}>
                <Button onClick={() => openReceive()}>
                  <HandCoins />
                  Receive cash from staff
                </Button>
              </PermissionGate>
            }
          >
            <PaginatedDataTable
              rows={staffQuery.data.items}
              page={staffPage}
              pageIndex={staffPager.pageIndex}
              onNext={() => staffPager.goNext(staffPage.nextCursor)}
              onPrevious={staffPager.goPrevious}
              canPrevious={staffPager.canPrevious}
              columns={[
                {
                  key: "staff",
                  header: "Staff",
                  render: (r) => <strong>{r.name}</strong>,
                },
                {
                  key: "branch",
                  header: "Branch",
                  render: (r) => r.branch,
                },
                {
                  key: "today",
                  header: "Collected today",
                  render: (r) => money(r.today),
                },
                {
                  key: "balance",
                  header: "Cash in hand",
                  render: (r) => <strong>{money(r.balance)}</strong>,
                },
                {
                  key: "last",
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
                    <PermissionGate permission={ACTION.cashHandoverAccept}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="font-semibold text-[#730321]"
                        disabled={(r.balance ?? r.today ?? 0) <= 0}
                        onClick={() =>
                          openReceive({
                            id: r.id,
                            name: r.name,
                            branch: r.branch,
                            balance: r.balance ?? r.today ?? 0,
                          })
                        }
                      >
                        Receive cash
                      </Button>
                    </PermissionGate>
                  ),
                },
              ]}
            />
          </Surface>
        </PageTabsPanel>
        <PageTabsPanel value="handovers">
          <Surface
            title="Cash submission history"
            description="Every handover — initiated in the staff app (pending until accepted) or recorded at the branch counter (usually accepted immediately). Open a row for receipts, denominations, and timeline."
            action={
              <div className="space-y-1">
                <DateRangeFilter
                  label="Submitted"
                  from={from}
                  to={to}
                  onFromChange={setFrom}
                  onToChange={setTo}
                />
                <FormFieldError message={dateRangeError} />
              </div>
            }
          >
            <PaginatedDataTable
              rows={handoversQuery.data.items}
              page={handoversPage}
              pageIndex={handoverPager.pageIndex}
              onNext={() => handoverPager.goNext(handoversPage.nextCursor)}
              onPrevious={handoverPager.goPrevious}
              canPrevious={handoverPager.canPrevious}
              onRowClick={(r) => setDetailId(r.id)}
              columns={[
                {
                  key: "number",
                  header: "Handover",
                  render: (r) => <strong>{r.handoverNo}</strong>,
                },
                {
                  key: "source",
                  header: "Source",
                  render: (r) =>
                    r.initiatedBy === "ADMIN" ? "Branch counter" : "Staff app",
                },
                { key: "staff", header: "Staff", render: (r) => r.staff },
                {
                  key: "branch",
                  header: "Branch",
                  render: (r) => r.branch,
                },
                {
                  key: "amount",
                  header: "System amount",
                  render: (r) => money(r.amount),
                },
                {
                  key: "declared",
                  header: "Declared",
                  render: (r) => money(r.declared),
                },
                {
                  key: "payments",
                  header: "Payments",
                  render: (r) => r.payments,
                },
                {
                  key: "submitted",
                  header: "Submitted",
                  render: (r) => r.submittedAt,
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
                    <div
                      className="flex flex-wrap gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        className="font-semibold text-[#730321]"
                        onClick={() => setDetailId(r.id)}
                      >
                        View
                      </Button>
                      {r.status === "PENDING" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setAcceptTarget({
                              id: r.id,
                              handoverNo: r.handoverNo,
                              amount: r.amount,
                              status: r.status,
                            })
                          }
                        >
                          <CheckCircle2 />
                          Accept
                        </Button>
                      )}
                      {r.status === "DISCREPANCY" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await resolveDiscrepancy({
                              id: r.id,
                              acceptedAmountPaise: Math.round(r.amount * 100),
                              reason: "Accepted with noted difference",
                            }).unwrap();
                            toast.success(
                              `${r.handoverNo} discrepancy resolved`,
                            );
                          }}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </Surface>
        </PageTabsPanel>
        <PageTabsPanel value="report">
          <Surface
            title="Cash reconciliation report"
            description="Period totals with a breakdown by staff member."
            action={
              <div className="space-y-1">
                <DateRangeFilter
                  label="Period"
                  from={from}
                  to={to}
                  onFromChange={setFrom}
                  onToChange={setTo}
                />
                <FormFieldError message={dateRangeError} />
              </div>
            }
          >
            <div className="grid gap-4 border-b p-5 md:grid-cols-3">
              {[
                ["Cash collected", money(reportTotals.collected)],
                ["Handed over", money(reportTotals.handedOver)],
                ["Currently in hand", money(reportTotals.inHand)],
                ["Handover count", String(reportTotals.handoverCount)],
                ["Unresolved difference", money(reportTotals.discrepancy)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border bg-[#fbf8f5] p-4">
                  <span className="text-sm text-muted-foreground">{k}</span>
                  <strong className="mt-2 block text-xl">{v}</strong>
                </div>
              ))}
            </div>
            <PaginatedDataTable
              rows={reportQuery.data.groups}
              page={reportPage}
              pageIndex={reportPager.pageIndex}
              onNext={() => reportPager.goNext(reportPage.nextCursor)}
              onPrevious={reportPager.goPrevious}
              canPrevious={reportPager.canPrevious}
              emptyTitle="No breakdown rows for this period"
              columns={[
                {
                  key: "staff",
                  header: "Staff",
                  render: (r) => <strong>{r.label}</strong>,
                },
                {
                  key: "collected",
                  header: "Collected",
                  render: (r) => money(r.collected),
                },
                {
                  key: "handed",
                  header: "Handed over",
                  render: (r) => money(r.handedOver),
                },
                {
                  key: "inHand",
                  header: "In hand",
                  render: (r) => money(r.inHand),
                },
                {
                  key: "count",
                  header: "Handovers",
                  render: (r) => r.handoverCount,
                },
                {
                  key: "disc",
                  header: "Discrepancies",
                  render: (r) => r.discrepancies,
                },
              ]}
            />
          </Surface>
        </PageTabsPanel>
      </PageTabs>
    </>
  );
}
