"use client";

import {
  PageTab,
  PageTabs,
  PageTabsBar,
  PageTabsPanel,
} from "@/src/components/common/page-tabs";
import { Layers3, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  filterLabelFor,
  type FilterOption,
} from "@/src/components/common/search-filter-bar";
import { CursorPagination } from "@/src/components/common/cursor-pagination";
import { HeroStat, SectionHero, heroPrimaryButtonClass } from "@/src/components/admin-ui/section-hero";
import {
  AdminTable,
  CellStack,
  InitialsAvatar,
  ListPanel,
  type AdminColumn,
} from "@/src/components/admin-ui/admin-table";
import { FilterBar, FilterSearch, QuickViews } from "@/src/components/admin-ui/filter-bar";
import { CycleProgress } from "@/src/features/enrollments/cycle-progress";
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
import {
  CustomerLink,
  EnrollmentLink,
} from "@/src/components/common/portal-entity-links";

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

  const rows = query.data.items as any[];
  const statusLabel = filterLabelFor(ENROLLMENT_STATUS_FILTERS, status);
  const columns: AdminColumn<any>[] = [
    {
      key: "no",
      header: "Enrollment",
      primary: true,
      cell: (r) => (
        <CellStack
          primary={
            <EnrollmentLink schemeId={r.id}>
              <span className="font-semibold">{r.enrollmentNo}</span>
            </EnrollmentLink>
          }
          secondary={`${r.plan} · ${r.paymentPattern === "FLEXIBLE" ? "Flexible" : "Fixed date"}`}
        />
      ),
      sortValue: (r) => String(r.enrollmentNo ?? ""),
    },
    {
      key: "customer",
      header: "Customer",
      primary: true,
      cell: (r) => (
        <CellStack
          leading={<InitialsAvatar name={r.customer} className="size-8" />}
          primary={<CustomerLink customerId={r.customerId}>{r.customer}</CustomerLink>}
          secondary={r.branch}
        />
      ),
      sortValue: (r) => String(r.customer ?? ""),
    },
    {
      key: "progress",
      header: "Instalments",
      cell: (r) => (
        <CycleProgress
          progress={Number(r.progress ?? 0)}
          tenure={Number(r.tenure ?? 0)}
          tone={r.status === "DEFAULTED" ? "red" : r.status === "MATURED" ? "gold" : "wine"}
        />
      ),
      sortValue: (r) => Number(r.progress ?? 0) / Math.max(1, Number(r.tenure ?? 1)),
    },
    {
      key: "paid",
      header: "Paid",
      align: "right",
      cell: (r) => <span className="font-semibold tabular-nums">{money(r.paid)}</span>,
      sortValue: (r) => Number(r.paid ?? 0),
    },
    {
      key: "next",
      header: "Next due",
      cell: (r) =>
        r.nextDue ? (
          <CellStack primary={money(r.nextDueAmount ?? r.installment)} secondary={r.nextDue} />
        ) : (
          <span className="text-[#a2969a]">—</span>
        ),
      hideOnMobile: true,
    },
    {
      key: "maturity",
      header: "Maturity",
      cell: (r) => <span className="text-sm text-[#5c4a4e]">{r.maturity ?? "—"}</span>,
      hideOnMobile: true,
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <StatusBadge status={r.status} />,
      sortValue: (r) => String(r.status ?? ""),
    },
  ];

  return (
    <>
      <SectionHero
        icon={Layers3}
        eyebrow="Gold schemes"
        title="Enrollments"
        description="Every customer's scheme account — instalments paid, what's due next and when it matures."
        actions={
          <EnrollmentsCreateDialog
            trigger={
              <button type="button" className={heroPrimaryButtonClass}>
                <Plus className="size-4" aria-hidden />
                Create enrollment
              </button>
            }
          />
        }
      >
        <HeroStat
          label="Active & capped"
          value={activeAndLockedCount}
          loading={analyticsQuery.isLoading}
          detail={`${openEnrollmentCount} open incl. defaulted`}
          active={status === "ACTIVE"}
          onClick={() => setStatus("ACTIVE")}
        />
        <HeroStat
          label="Capped"
          value={lockedCount}
          detail="Flexible plans that hit the limit"
          active={status === "LOCKED"}
          onClick={() => setStatus("LOCKED")}
        />
        <HeroStat
          label="Defaulted"
          value={defaultedCount}
          detail="Missed instalments beyond grace"
          active={status === "DEFAULTED"}
          onClick={() => setStatus("DEFAULTED")}
        />
        <HeroStat
          label="Matured"
          value={maturedCount}
          detail="Waiting to be redeemed"
          active={status === "MATURED"}
          onClick={() => setStatus("MATURED")}
        />
        <HeroStat
          label="Redeemed / closed"
          value={redeemedCount}
          detail="Completed accounts"
          active={status === "PAST"}
          onClick={() => setStatus("PAST")}
        />
      </SectionHero>
      <PageTabs defaultValue="directory">
        <PageTabsBar sectionLabel="Enrollments">
          <PageTab value="directory">Directory</PageTab>
          <PageTab value="analytics">Analytics</PageTab>
        </PageTabsBar>
        <PageTabsPanel value="analytics">
          <EnrollmentsAnalyticsTab />
        </PageTabsPanel>
        <PageTabsPanel value="directory">
          <ListPanel
            className="rounded-none border-0 shadow-none"
            toolbar={
              <FilterBar
                quickViews={
                  <QuickViews
                    value={status}
                    onChange={setStatus}
                    options={ENROLLMENT_STATUS_FILTERS.map((f) => ({
                      value: f.value,
                      label: f.label.replace(" (status)", ""),
                    }))}
                    ariaLabel="Enrollment status"
                  />
                }
                search={
                  <FilterSearch
                    value={q}
                    onChange={setQ}
                    placeholder="Enrollment number, customer or phone"
                  />
                }
                activeFilters={q.trim() ? [{ key: "q", label: `“${q.trim()}”`, onClear: () => setQ("") }] : []}
                resultLabel={`${statusLabel.replace(" (status)", "")} · ${rows.length}${page.hasMore ? "+" : ""} shown`}
              />
            }
          >
            <AdminTable
              columns={columns}
              rows={rows}
              getRowId={(r) => String(r.id)}
              onRowClick={(r) => router.push(`/enrollments/${r.id}`)}
              fetching={query.isFetching}
              caption="Enrollments"
              empty={
                <p className="px-5 py-10 text-center text-sm text-[#857a7d]">
                  No {statusLabel.replace(" (status)", "").toLowerCase()} enrollments
                  {q.trim() ? ` match “${q.trim()}”` : ""}.
                </p>
              }
            />
            <CursorPagination
              page={page}
              pageIndex={pager.pageIndex}
              rowCount={rows.length}
              onNext={() => pager.goNext(page.nextCursor)}
              onPrevious={pager.goPrevious}
              canPrevious={pager.canPrevious}
            />
          </ListPanel>
        </PageTabsPanel>
      </PageTabs>
    </>
  );
}
