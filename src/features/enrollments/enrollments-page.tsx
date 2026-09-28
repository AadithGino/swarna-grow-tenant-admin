"use client";

import {
  PageTab,
  PageTabs,
  PageTabsBar,
  PageTabsPanel,
} from "@/src/components/common/page-tabs";
import { Clock3, Gift, IndianRupee, Layers3, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PaginatedDataTable } from "@/src/components/common/paginated-data-table";
import {
  filterLabelFor,
  ListToolbar,
  SearchFilterBar,
  type FilterOption,
} from "@/src/components/common/search-filter-bar";
import {
  PageHeader,
  StatCard,
  Surface,
} from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { money } from "@/src/lib/format";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import { useDebouncedValue } from "@/src/hooks/use-debounced-value";
import {
  listSearchQueryForApi,
  shouldSkipListSearchQuery,
} from "@/src/lib/list-date-range";
import { EnrollmentsCreateDialog } from "@/src/features/enrollments/enrollments-create-dialog";
import { EnrollmentsAnalyticsTab } from "@/src/features/enrollments/enrollments-analytics-tab";
import {
  useGetEnrollmentAnalyticsQuery,
  useGetEnrollmentsQuery,
} from "@/src/store/api/admin-api";
import {
  useActingBranchId,
  useActingBranchKey,
} from "@/src/hooks/use-acting-branch-id";

const ENROLLMENT_STATUS_FILTERS: FilterOption[] = [
  { value: "OPEN", label: "Open" },
  { value: "ACTIVE", label: "Active (status)" },
  { value: "LOCKED", label: "Capped / locked" },
  { value: "DEFAULTED", label: "Defaulted" },
  { value: "MATURED", label: "Matured" },
  { value: "REDEEMED", label: "Redeemed" },
  { value: "CLOSED_PREMATURE", label: "Closed premature" },
  { value: "PAST", label: "Past (redeemed / closed)" },
];

export function EnrollmentsPage() {
  const router = useRouter();
  const branchKey = useActingBranchKey();
  const branchId = useActingBranchId();
  const [status, setStatus] = useState("ACTIVE");
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 350);
  const pager = useCursorPagination(
    8,
    `${debouncedQ}|${status}|${branchKey}`,
  );
  const query = useGetEnrollmentsQuery(
    {
      q: listSearchQueryForApi(debouncedQ),
      status: status === "PAST" || status === "OPEN" ? undefined : status,
      group: status === "PAST" ? "PAST" : status === "OPEN" ? "OPEN" : undefined,
      branchId,
      ...pager.queryParams,
    },
    { skip: shouldSkipListSearchQuery(debouncedQ) },
  );
  const analyticsQuery = useGetEnrollmentAnalyticsQuery({
    branchId,
    period: "THIS_MONTH",
  });

  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data)
    return <QueryError error={query.error} onRetry={query.refetch} />;

  const summary = query.data.summary;
  const page = query.data.page ?? emptyPageMeta();
  const analyticsSummary = analyticsQuery.data?.summary ?? [];
  const analyticsTotals = analyticsQuery.data?.totals as
    | {
        activeEnrollments?: number;
        activeAndLockedEnrollments?: number;
        openEnrollments?: number;
        lockedEnrollments?: number;
        defaultedEnrollments?: number;
        maturedEnrollments?: number;
        redeemedOrClosedEnrollments?: number;
      }
    | undefined;
  const asCount = (value: unknown, fallback = 0): number =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const metric = (key: string): number | undefined => {
    const value = analyticsSummary.find((m) => m.key === key)?.value;
    return typeof value === "number" && Number.isFinite(value)
      ? value
      : undefined;
  };

  const lockedCount = asCount(
    analyticsTotals?.lockedEnrollments,
    asCount(summary.locked),
  );
  const defaultedCount = asCount(
    analyticsTotals?.defaultedEnrollments,
    asCount(metric("DEFAULTED"), asCount(summary.defaulted)),
  );
  const activeAndLockedCount = asCount(
    analyticsTotals?.activeAndLockedEnrollments,
    asCount(
      analyticsTotals?.activeEnrollments,
      asCount(
        metric("ACTIVE_ENROLLMENTS"),
        asCount(
          (summary as { activeAndLocked?: number }).activeAndLocked,
          asCount(summary.active),
        ),
      ),
    ),
  );
  const openEnrollmentCount = asCount(
    analyticsTotals?.openEnrollments,
    asCount(
      (summary as { open?: number }).open,
      activeAndLockedCount + defaultedCount,
    ),
  );
  const maturedCount = asCount(
    analyticsTotals?.maturedEnrollments,
    asCount(metric("MATURED"), asCount(summary.matured)),
  );
  const redeemedCount = asCount(
    analyticsTotals?.redeemedOrClosedEnrollments,
    asCount(summary.redeemed),
  );

  return (
    <>
      <PageHeader
        eyebrow="Customer operations"
        title="Enrollments"
        description="Lifecycle-driven scheme accounts with cycles, payments, maturity and state-specific actions."
        actions={
          <EnrollmentsCreateDialog
            trigger={
              <Button>
                <Plus />
                Create enrollment
              </Button>
            }
          />
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={Layers3}
          label="Active & capped"
          value={activeAndLockedCount}
          detail={
            analyticsQuery.isFetching
              ? "Updating tenant totals…"
              : `${openEnrollmentCount} open on dashboard (incl. defaulted)`
          }
        />
        <StatCard
          icon={IndianRupee}
          label="Locked / capped"
          value={lockedCount}
          detail="Current snapshot"
          tone="gold"
        />
        <StatCard
          icon={Clock3}
          label="Defaulted"
          value={defaultedCount}
          detail="Current snapshot"
          tone="red"
        />
        <StatCard
          icon={Gift}
          label="Matured"
          value={maturedCount}
          detail="Current snapshot"
          tone="cream"
        />
        <StatCard
          icon={Gift}
          label="Redeemed / closed"
          value={redeemedCount}
          detail="Current snapshot"
          tone="wine"
        />
      </div>
      <PageTabs defaultValue="directory">
        <PageTabsBar sectionLabel="Enrollments">
          <PageTab value="directory">Directory</PageTab>
          <PageTab value="analytics">Analytics</PageTab>
        </PageTabsBar>
        <PageTabsPanel value="analytics">
          <EnrollmentsAnalyticsTab />
        </PageTabsPanel>
        <PageTabsPanel value="directory">
          <ListToolbar>
            <SearchFilterBar
              searchValue={q}
              onSearchChange={setQ}
              searchPlaceholder="Enrollment number, customer, phone…"
              filterValue={status}
              onFilterChange={setStatus}
              filterOptions={ENROLLMENT_STATUS_FILTERS}
              filterLabel="Status"
            />
          </ListToolbar>
          <Surface
            title={`${filterLabelFor(ENROLLMENT_STATUS_FILTERS, status)} enrollments`}
            description="Select a row to open the complete scheme account"
          >
            <PaginatedDataTable
              rows={query.data.items}
              page={page}
              pageIndex={pager.pageIndex}
              onNext={() => pager.goNext(page.nextCursor)}
              onPrevious={pager.goPrevious}
              canPrevious={pager.canPrevious}
              onRowClick={(row: any) => router.push(`/enrollments/${row.id}`)}
              columns={[
                {
                  key: "no",
                  header: "Enrollment",
                  render: (r: any) => <strong>{r.enrollmentNo}</strong>,
                },
                {
                  key: "customer",
                  header: "Customer",
                  render: (r: any) => r.customer,
                },
                { key: "scheme", header: "Scheme", render: (r: any) => r.plan },
                {
                  key: "type",
                  header: "Type",
                  render: (r: any) =>
                    r.paymentPattern === "FLEXIBLE" ? "Flexible" : "Fixed",
                },
                { key: "branch", header: "Branch", render: (r: any) => r.branch },
                {
                  key: "progress",
                  header: "Progress",
                  render: (r: any) => `${r.progress} / ${r.tenure}`,
                },
                {
                  key: "paid",
                  header: "Paid",
                  render: (r: any) => money(r.paid),
                },
                {
                  key: "next",
                  header: "Next due",
                  render: (r: any) =>
                    r.nextDue
                      ? `${money(r.nextDueAmount ?? r.installment)} · ${r.nextDue}`
                      : "—",
                },
                {
                  key: "maturity",
                  header: "Maturity",
                  render: (r: any) => r.maturity ?? "—",
                },
                {
                  key: "status",
                  header: "Status",
                  render: (r: any) => <StatusBadge status={r.status} />,
                },
                {
                  key: "view",
                  header: "",
                  render: (r: any) => (
                    <Button
                      variant="link"
                      className="h-auto p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/enrollments/${r.id}`);
                      }}
                    >
                      View
                    </Button>
                  ),
                },
              ]}
            />
          </Surface>
        </PageTabsPanel>
      </PageTabs>
    </>
  );
}
