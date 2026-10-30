"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangeFilter } from "@/src/components/common/date-range-filter";
import { PaginatedDataTable } from "@/src/components/common/paginated-data-table";
import { Surface } from "@/src/components/common/page-parts";
import { HeroStat, SectionHero } from "@/src/components/admin-ui/section-hero";
import {
  PageTab,
  PageTabs,
  PageTabsBar,
  PageTabsPanel,
} from "@/src/components/common/page-tabs";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { grams, money } from "@/src/lib/format";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import {
  useActingBranchId,
  useActingBranchKey,
} from "@/src/hooks/use-acting-branch-id";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import { useValidatedListDateRange } from "@/src/hooks/use-validated-list-date-range";
import { FormFieldError } from "@/src/components/common/form-field-error";
import {
  appTodayYmd,
  applyWideListRangePreset,
  wideListRangePresetLabel,
} from "@/src/lib/list-date-range";
import {
  useGetMaturitiesCalendarQuery,
  useGetMaturitiesQuery,
} from "@/src/store/api/admin-api";
import { SettlementPreviewDialog } from "@/src/features/enrollments/settlement-dialogs";
import { RedemptionsQueue } from "@/src/features/maturity/redemptions-queue";
import { FlexibleLocksPanel } from "@/src/features/maturity/flexible-locks-panel";
import {
  CustomerLink,
  EnrollmentLink,
} from "@/src/components/common/portal-entity-links";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthBounds(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  const mm = String(m).padStart(2, "0");
  return {
    from: `${y}-${mm}-01`,
    to: `${y}-${mm}-${String(last.getDate()).padStart(2, "0")}`,
    year: y,
    monthIndex: m - 1,
    daysInMonth: last.getDate(),
    startWeekday: first.getDay(),
    label: first.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    }),
  };
}

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function openListForMaturityDate(
  dateKey: string,
  setFrom: (v: string) => void,
  setTo: (v: string) => void,
  setView: (v: string) => void,
) {
  setFrom(dateKey);
  setTo(dateKey);
  setView("list");
}

function maturitySettlementAction(
  row: { id: string; status?: string; pendingRedemption?: unknown },
  openSettlement: (schemeId: string) => void,
  goToRedemptions: () => void,
) {
  const status = String(row.status ?? "");
  if (status === "REDEEMED" || status === "CLOSED_PREMATURE") {
    return (
      <Button size="sm" variant="outline" asChild>
        <Link href={`/enrollments/${row.id}`}>View enrollment</Link>
      </Button>
    );
  }
  if (row.pendingRedemption) {
    return (
      <Button size="sm" variant="outline" onClick={goToRedemptions}>
        Redemption queue
      </Button>
    );
  }
  return (
    <Button size="sm" variant="outline" onClick={() => openSettlement(row.id)}>
      Preview settlement
    </Button>
  );
}

export function MaturityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reviewRedemptionId = searchParams.get("review");
  const { from, setFrom, to, setTo, dateRangeError, skipForBadDates } =
    useValidatedListDateRange();
  const [calendarMonth, setCalendarMonth] = useState(() =>
    appTodayYmd().slice(0, 7),
  );
  const [view, setView] = useState(
    reviewRedemptionId ? "redemptions" : "month",
  );
  const [settlementSchemeId, setSettlementSchemeId] = useState<string | null>(
    null,
  );
  const [settlementPreviewOpen, setSettlementPreviewOpen] = useState(false);

  function openSettlement(schemeId: string) {
    setSettlementSchemeId(schemeId);
    setSettlementPreviewOpen(true);
  }

  const monthMeta = monthBounds(calendarMonth);
  const queryFrom = view === "month" ? monthMeta.from : from;
  const queryTo = view === "month" ? monthMeta.to : to;
  const branchId = useActingBranchId();
  const branchKey = useActingBranchKey();
  const pager = useCursorPagination(
    8,
    `${view}|${queryFrom}|${queryTo}|${branchKey}`,
  );
  const statsQuery = useGetMaturitiesQuery(
    {
      from: queryFrom,
      to: queryTo,
      branchId,
      limit: 1,
    },
    { skip: view === "redemptions" },
  );

  const listQuery = useGetMaturitiesQuery(
    {
      from,
      to,
      branchId,
      ...pager.queryParams,
    },
    { skip: view !== "list" || skipForBadDates },
  );

  const calendarQuery = useGetMaturitiesCalendarQuery(
    { month: calendarMonth, branchId },
    { skip: view !== "month" },
  );

  const eventMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const row of calendarQuery.data?.items ?? []) {
      const key = String(row.maturityDate ?? row.maturity ?? "")
        .replace(/,/g, "")
        .slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
      (map[key] ??= []).push(row);
    }
    return map;
  }, [calendarQuery.data?.items]);

  const loading =
    view === "redemptions"
      ? false
      : view === "month"
        ? statsQuery.isLoading || calendarQuery.isLoading
        : listQuery.isLoading;
  const loadError =
    view === "month"
      ? statsQuery.isError || calendarQuery.isError
      : view === "list"
        ? listQuery.isError
        : false;

  if (loading) return <PageSkeleton cards={6} />;
  if (loadError)
    return (
      <QueryError
        onRetry={() => {
          if (view === "month") {
            void statsQuery.refetch();
            void calendarQuery.refetch();
          } else if (view === "list") {
            void listQuery.refetch();
          }
        }}
        title="Could not load maturity data"
        error={
          calendarQuery.error ?? listQuery.error ?? statsQuery.error
        }
      />
    );

  const s = statsQuery.data?.summary ?? {
    upcoming: 0,
    maturedToday: 0,
    incomplete: 0,
    notRedeemed: 0,
    liability: 0,
    gold: 0,
  };
  const page = listQuery.data?.page ?? emptyPageMeta();
  const items = listQuery.data?.items ?? [];

  const calendarCells: ({ type: "pad" } | { type: "day"; day: number })[] = [];
  for (let i = 0; i < monthMeta.startWeekday; i += 1) {
    calendarCells.push({ type: "pad" });
  }
  for (let day = 1; day <= monthMeta.daysInMonth; day += 1) {
    calendarCells.push({ type: "day", day });
  }

  return (
    <>
      {settlementSchemeId ? (
        <>
          <SettlementPreviewDialog
            schemeId={settlementSchemeId}
            type="MATURITY_REDEMPTION"
            open={settlementPreviewOpen}
            onOpenChange={(open) => {
              setSettlementPreviewOpen(open);
              if (!open) {
                setSettlementSchemeId(null);
                void listQuery.refetch();
                void statsQuery.refetch();
                void calendarQuery.refetch();
              }
            }}
            redemptionWizard
          />
        </>
      ) : null}
      <SectionHero
        icon={Gift}
        eyebrow="Gold schemes"
        title="Maturity & redemption"
        description="Schemes reaching the end of their term, what the shop owes on them, and the redemptions waiting to be handed over."
      >
        <HeroStat
          label="Maturing in next 30 days"
          value={s.upcoming ?? 0}
          detail={`${money(s.upcomingLiability ?? 0)} paid in so far`}
        />
        <HeroStat
          label="Maturing today"
          value={s.maturedToday ?? 0}
          detail={`${money(s.maturedTodayLiability ?? 0)} paid in`}
        />
        <HeroStat
          label="Term ended, incomplete"
          value={s.incomplete ?? 0}
          detail={`Defaulted · ${money(s.incompleteLiability ?? 0)} paid in`}
        />
        <HeroStat
          label="Matured, not redeemed"
          value={s.notRedeemed ?? 0}
          detail={`${money(s.notRedeemedLiability ?? 0)} to hand over`}
        />
        <HeroStat
          label={view === "month" ? "Maturing in selected month" : "Maturing in chosen dates"}
          value={money(s.liability ?? 0)}
          detail={`${s.periodCount ?? 0} schemes · ${grams(s.gold ?? 0)} gold`}
        />
      </SectionHero>
      <PageTabs value={view} onValueChange={setView}>
        <PageTabsBar sectionLabel="Maturity views">
          <PageTab value="month">Month</PageTab>
          <PageTab value="list">List</PageTab>
          <PageTab value="redemptions">Redemption queue</PageTab>
          <PageTab value="flex-locks">Flexible locks</PageTab>
        </PageTabsBar>
        <PageTabsPanel value="month" flush>
          <Surface>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#efe5e1] p-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => setCalendarMonth((m) => shiftMonth(m, -1))}
              >
                ← Previous
              </Button>
              <div className="text-center">
                <h2 className="text-xl font-extrabold tracking-tight text-[#28161a]">{monthMeta.label}</h2>
                <p className="text-xs text-[#857a7d]">
                  {Object.values(eventMap).reduce((n, list) => n + list.length, 0)} schemes mature this month
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setCalendarMonth(appTodayYmd().slice(0, 7))}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setCalendarMonth((m) => shiftMonth(m, 1))}
                >
                  Next →
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-7 border-b border-[#efe5e1] bg-[#fbf8f5] text-center text-xs font-semibold text-[#857a7d]">
              {WEEKDAYS.map((d) => (
                <div key={d} className="p-2.5">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarCells.map((cell, index) => {
                if (cell.type === "pad") {
                  return (
                    <div
                      key={`pad-${index}`}
                      className="min-h-20 border-b border-r border-[#f3eae7] bg-[#fbf8f6] sm:min-h-28"
                    />
                  );
                }
                const dateKey = `${calendarMonth}-${String(cell.day).padStart(2, "0")}`;
                const dayEvents = eventMap[dateKey] ?? [];
                const isToday = dateKey === appTodayYmd();
                return (
                  <div
                    key={dateKey}
                    className={
                      dayEvents.length
                        ? "min-h-20 border-b border-r border-[#f3eae7] bg-[#fffaf0] p-1.5 sm:min-h-28 sm:p-2"
                        : "min-h-20 border-b border-r border-[#f3eae7] p-1.5 sm:min-h-28 sm:p-2"
                    }
                  >
                    <span
                      className={
                        isToday
                          ? "grid size-7 place-items-center rounded-full bg-[#730321] text-xs font-bold text-white"
                          : "inline-grid size-7 place-items-center text-xs font-medium text-[#5c4a4e]"
                      }
                    >
                      {cell.day}
                    </span>
                    <div className="mt-1 space-y-1">
                      {dayEvents.slice(0, 2).map((r: any) => (
                        <Link
                          key={r.id}
                          href={`/enrollments/${r.id}`}
                          className="block rounded-lg border border-[#ead5ad] bg-gradient-to-br from-[#fff8e8] to-[#fbefd2] p-1.5 text-[0.68rem] transition-colors hover:border-[#c9a227] sm:p-2"
                        >
                          <strong className="block truncate">
                            {r.customer}
                          </strong>
                          <span className="block truncate text-muted-foreground">
                            {r.plan}
                          </span>
                          <span>
                            {r.valueBasis === "GOLD_WEIGHT"
                              ? grams(r.accumulatedGold ?? 0)
                              : money(r.paid)}
                          </span>
                        </Link>
                      ))}
                      {dayEvents.length > 2 ? (
                        <button
                          type="button"
                          className="w-full rounded-lg border border-dashed border-[#c9a227] bg-white/80 px-2 py-1.5 text-[0.68rem] font-semibold text-[#730321] hover:bg-[#fff8e8]"
                          onClick={() =>
                            openListForMaturityDate(
                              dateKey,
                              setFrom,
                              setTo,
                              setView,
                            )
                          }
                        >
                          View all ({dayEvents.length})
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </Surface>
        </PageTabsPanel>
        <PageTabsPanel value="list" flush>
          <Surface
            title="Maturity list"
            description="Schemes maturing in the chosen dates"
            action={
              <div className="space-y-1">
                <DateRangeFilter
                  label="Maturity"
                  from={from}
                  to={to}
                  onFromChange={setFrom}
                  onToChange={setTo}
                  presetLabel={wideListRangePresetLabel()}
                  onPreset={() => {
                    const { from: nextFrom, to: nextTo } =
                      applyWideListRangePreset();
                    setFrom(nextFrom);
                    setTo(nextTo);
                  }}
                />
                <FormFieldError message={dateRangeError} />
              </div>
            }
          >
            <PaginatedDataTable
              rows={items}
              page={page}
              pageIndex={pager.pageIndex}
              onNext={() => pager.goNext(page.nextCursor)}
              onPrevious={pager.goPrevious}
              canPrevious={pager.canPrevious}
              onRowClick={(r: { id: string }) =>
                router.push(`/enrollments/${r.id}`)
              }
              columns={[
                {
                  key: "customer",
                  header: "Customer",
                  render: (r: any) => (
                    <strong>
                      <CustomerLink customerId={r.customerId}>
                        {r.customer}
                      </CustomerLink>
                    </strong>
                  ),
                },
                {
                  key: "enr",
                  header: "Enrollment",
                  render: (r: any) => (
                    <EnrollmentLink schemeId={r.id}>
                      {r.enrollmentNo}
                    </EnrollmentLink>
                  ),
                },
                { key: "plan", header: "Plan", render: (r: any) => r.plan },
                {
                  key: "maturity",
                  header: "Maturity",
                  render: (r: any) => r.maturity,
                },
                {
                  key: "paid",
                  header: "Contribution",
                  render: (r: any) => money(r.paid),
                },
                {
                  key: "gold",
                  header: "Gold",
                  render: (r: any) =>
                    r.accumulatedGold ? grams(r.accumulatedGold) : "—",
                },
                {
                  key: "status",
                  header: "Status",
                  render: (r: any) => <StatusBadge status={r.status} />,
                },
                {
                  key: "action",
                  header: "",
                  render: (r: any) =>
                    maturitySettlementAction(r, openSettlement, () =>
                      setView("redemptions"),
                    ),
                },
              ]}
            />
          </Surface>
        </PageTabsPanel>
        <PageTabsPanel value="redemptions" flush>
          <RedemptionsQueue />
        </PageTabsPanel>
        <PageTabsPanel value="flex-locks" flush>
          <FlexibleLocksPanel />
        </PageTabsPanel>
      </PageTabs>
    </>
  );
}
