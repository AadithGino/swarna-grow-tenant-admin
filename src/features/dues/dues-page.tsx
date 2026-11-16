"use client";

import { CollectionBoardFilters, type CollectionBoardFilterValues } from "@/src/components/common/collection-board-filters";
import { useMemo, useState } from "react";
import {
  CalendarClock,
  Download,
  Link2,
  Phone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toastApiError } from "@/src/lib/api-error";
import { validatePaymentLinkAmount } from "@/src/lib/payment-form-validation";
import { Button } from "@/components/ui/button";
import {
  WorkboardDateRangeFilter,
  type WorkboardDatePreset,
} from "@/src/components/common/date-range-filter";
import { PaginatedDataTable } from "@/src/components/common/paginated-data-table";
import { type FilterOption } from "@/src/components/common/search-filter-bar";
import { Surface } from "@/src/components/common/page-parts";
import { HeroStat, SectionHero, heroButtonClass } from "@/src/components/admin-ui/section-hero";
import { ListPanel } from "@/src/components/admin-ui/admin-table";
import { FilterBar, FilterSearch, QuickViews } from "@/src/components/admin-ui/filter-bar";
import {
  EmptyState,
  PageSkeleton,
  QueryError,
} from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { ChartSeriesView } from "@/src/components/common/chart-series-view";
import { PaymentDialog } from "@/src/features/payments/payment-dialog";
import { downloadCsv } from "@/src/lib/download";
import { idempotencyKey, money } from "@/src/lib/format";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import {
  listSearchQueryForApi,
  shouldSkipListSearchQuery,
} from "@/src/lib/list-date-range";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { useValidatedListDateRange } from "@/src/hooks/use-validated-list-date-range";
import {
  useActingBranchId,
  useActingBranchKey,
} from "@/src/hooks/use-acting-branch-id";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import { useDebouncedValue } from "@/src/hooks/use-debounced-value";
import {
  PageTab,
  PageTabs,
  PageTabsBar,
} from "@/src/components/common/page-tabs";
import {
  useCreatePaymentLinkMutation,
  useGetDefaultersQuery,
  useGetDuesQuery,
  useGetOverduesQuery,
} from "@/src/store/api/admin-api";
import { useAppSelector } from "@/src/store/hooks";
import {
  CustomerLink,
  EnrollmentLink,
} from "@/src/components/common/portal-entity-links";

// Values match the backend workboard states (backend/src/lib/dues-workboard.js).
const DUE_KIND_FILTERS: FilterOption[] = [
  { value: "ALL", label: "All" },
  { value: "DUE", label: "Due now" },
  { value: "GRACE", label: "In grace" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "DEFAULTED", label: "Defaulted" },
];

export function DuesPage() {
  const router = useRouter();
  const [collectionFilters, setCollectionFilters] = useState<CollectionBoardFilterValues>({});
  const collectionFilterKey = JSON.stringify(collectionFilters);
  const [board, setBoard] = useState<"dues" | "overdues" | "defaulters">(
    "dues",
  );
  const [rangeMode, setRangeMode] = useState<WorkboardDatePreset>("CUSTOM");
  const preset = rangeMode === "CUSTOM" ? undefined : rangeMode;
  const [kind, setKind] = useState("ALL");
  const caps = useAppSelector((s) => s.session.session?.capabilities);
  const [createPaymentLink] = useCreatePaymentLinkMutation();
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 350);
  const { from, setFrom, to, setTo, dateRangeError, skipForBadDates } =
    useValidatedListDateRange();
  const branchId = useActingBranchId();
  const branchKey = useActingBranchKey();
  const pager = useCursorPagination(
    8,
    `${board}|${kind}|${rangeMode}|${debouncedQ}|${from}|${to}|${branchKey}|${collectionFilterKey}`,
  );
  const listQueryParams = useMemo(() => {
    const base = {
      q: listSearchQueryForApi(debouncedQ),
      branchId,
      ...collectionFilters,
      ...pager.queryParams,
    };
    if (preset) {
      return { ...base, preset, kind };
    }
    return {
      ...base,
      kind,
      from,
      to,
    };
  }, [
    branchId,
    collectionFilters,
    debouncedQ,
    kind,
    pager.queryParams,
    preset,
    from,
    to,
  ]);

  const overduesListParams = useMemo(() => {
    const { kind, ...rest } = listQueryParams;
    void kind;
    return rest;
  }, [listQueryParams]);

  const skipForSearch = shouldSkipListSearchQuery(debouncedQ);
  const skipList = skipForSearch || (rangeMode === "CUSTOM" && skipForBadDates);
  const defaultersQuery = useGetDefaultersQuery(
    {
      q: listSearchQueryForApi(debouncedQ),
      branchId,
      ...collectionFilters,
      ...pager.queryParams,
    },
    { skip: board !== "defaulters" || skipForSearch },
  );
  const duesQuery = useGetDuesQuery(listQueryParams, {
    skip: board !== "dues" || skipList,
  });
  const overduesQuery = useGetOverduesQuery(overduesListParams, {
    skip: board !== "overdues" || skipList,
  });
  const query =
    board === "overdues"
      ? overduesQuery
      : board === "defaulters"
        ? defaultersQuery
        : duesQuery;
  const invalidCustomRange = rangeMode === "CUSTOM" && skipForBadDates;
  if (invalidCustomRange) {
    return (
      <>
        <SectionHero
          icon={CalendarClock}
          eyebrow="Gold schemes"
          title="Dues & overdue"
          description="Who owes an instalment, who is in grace, and who has slipped into default."
        />
        <Surface title="Invalid period">
          <EmptyState title="Fix the date range" detail={dateRangeError ?? ""} />
        </Surface>
      </>
    );
  }
  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data)
    return <QueryError error={query.error} onRetry={query.refetch} />;
  const s = query.data.summary ?? {};
  const byState = (s as { customersByState?: Record<string, number> })
    .customersByState;
  const customersDetail = (state: string) =>
    byState?.[state] != null
      ? `${byState[state]} customer${byState[state] === 1 ? "" : "s"}`
      : undefined;
  const rows = query.data.items;
  const ageingChart =
    board === "overdues" ? (s as { chart?: unknown })?.chart : undefined;
  const page = query.data.page ?? emptyPageMeta();
  return (
    <>
      <SectionHero
        icon={CalendarClock}
        eyebrow="Gold schemes"
        title="Dues & overdue"
        description="Who owes an instalment, who is in grace, and who has slipped into default. Collect at the counter or copy a pay link from each row."
        actions={
          <button
            type="button"
            className={heroButtonClass}
            onClick={() =>
              downloadCsv(
                "dues-and-overdue.csv",
                ["Customer", "Enrollment", "Due date", "Amount", "Status"],
                rows.map((r: any) => [
                  r.customer,
                  r.enrollmentNo,
                  r.dueDate,
                  r.amount,
                  r.status,
                ]),
              )
            }
          >
            <Download className="size-4" aria-hidden />
            Export
          </button>
        }
      >
        {board === "dues" ? (
          <>
            <HeroStat
              label="Due now"
              value={money(s.due ?? 0)}
              detail={customersDetail("DUE") ?? "Due today or later"}
              active={kind === "DUE"}
              onClick={() => setKind(kind === "DUE" ? "ALL" : "DUE")}
            />
            <HeroStat
              label="In grace"
              value={money(s.grace ?? 0)}
              detail={customersDetail("GRACE") ?? "Past due date, grace running"}
              active={kind === "GRACE"}
              onClick={() => setKind(kind === "GRACE" ? "ALL" : "GRACE")}
            />
            <HeroStat
              label="Overdue"
              value={money(s.overdue ?? 0)}
              detail={customersDetail("OVERDUE") ?? "Grace ended — call today"}
              active={kind === "OVERDUE"}
              onClick={() => setKind(kind === "OVERDUE" ? "ALL" : "OVERDUE")}
            />
            <HeroStat
              label="Defaulted"
              value={money(s.defaulted ?? 0)}
              detail={customersDetail("DEFAULTED") ?? "Arrears on defaulted schemes"}
              active={kind === "DEFAULTED"}
              onClick={() => setKind(kind === "DEFAULTED" ? "ALL" : "DEFAULTED")}
            />
            <HeroStat
              label="Customers"
              value={s.customers ?? 0}
              detail="With any amount pending"
            />
          </>
        ) : board === "overdues" ? (
          <>
            <HeroStat
              label="Overdue amount"
              value={money(s.overdue ?? 0)}
              detail="Unpaid after grace ended"
            />
            <HeroStat
              label="Customers"
              value={s.customers ?? 0}
              detail="Need a follow-up call"
            />
          </>
        ) : (
          <>
            <HeroStat
              label="Defaulted arrears"
              value={money(s.defaulted ?? 0)}
              detail="Unpaid instalments already due"
            />
            <HeroStat
              label="Customers"
              value={s.customers ?? 0}
              detail="With a defaulted scheme"
            />
          </>
        )}
      </SectionHero>
      <PageTabs
        value={board}
        onValueChange={(v) =>
          setBoard(v as "dues" | "overdues" | "defaulters")
        }
      >
        <PageTabsBar sectionLabel="Workboard">
          <PageTab value="dues">Dues</PageTab>
          <PageTab value="overdues">Overdue</PageTab>
          <PageTab value="defaulters">Defaulters registry</PageTab>
        </PageTabsBar>
      </PageTabs>
      {ageingChart ? (
        <Surface
          title="Overdue ageing"
          description="Amount outstanding by days past due"
          className="mb-4"
        >
          <div className="p-4">
            <ChartSeriesView chart={ageingChart as any} />
          </div>
        </Surface>
      ) : null}
      <ListPanel
        title={board === "defaulters" ? "Defaulters registry" : board === "overdues" ? "Overdue workboard" : "Due workboard"}
        toolbar={
          <FilterBar
            quickViews={
              board !== "defaulters" ? (
                <QuickViews value={kind} onChange={setKind} options={DUE_KIND_FILTERS} ariaLabel="Due view" />
              ) : null
            }
            search={<FilterSearch value={q} onChange={setQ} placeholder="Customer, phone or enrollment" />}
            filters={
              board !== "defaulters" ? (
                <div className="space-y-1">
                  <CollectionBoardFilters filters={collectionFilters} onChange={setCollectionFilters} />
                  <WorkboardDateRangeFilter
                    label="Due"
                    mode={rangeMode}
                    onModeChange={setRangeMode}
                    from={from}
                    to={to}
                    onFromChange={setFrom}
                    onToChange={setTo}
                  />
                  {rangeMode === "CUSTOM" ? <FormFieldError message={dateRangeError} /> : null}
                </div>
              ) : <CollectionBoardFilters filters={collectionFilters} onChange={setCollectionFilters} />
            }
            resultLabel={
              board === "defaulters"
                ? "Every scheme in default — open one for recovery actions"
                : "Collect at the counter · Link creates an online pay URL to copy and share"
            }
          />
        }
      >
        <div className="overflow-x-auto">
          <PaginatedDataTable
            rows={rows}
            page={page}
            pageIndex={pager.pageIndex}
            onNext={() => pager.goNext(page.nextCursor)}
            onPrevious={pager.goPrevious}
            canPrevious={pager.canPrevious}
            onRowClick={(r: any) => {
              const target = r.schemeId || r.id;
              if (target) router.push(`/enrollments/${target}`);
              else if (r.customerId) router.push(`/customers/${r.customerId}`);
            }}
            columns={[
              {
                key: "customer",
                header: "Customer",
                render: (r: any) => (
                  <span>
                    <strong>
                      <CustomerLink customerId={r.customerId}>
                        {r.customer}
                      </CustomerLink>
                    </strong>
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {r.phone}
                    </span>
                  </span>
                ),
              },
              {
                key: "enrollment",
                header: "Enrollment",
                render: (r: any) => (
                  <EnrollmentLink schemeId={r.schemeId || r.id}>
                    {r.enrollmentNo}
                  </EnrollmentLink>
                ),
              },
              { key: "plan", header: "Scheme", render: (r: any) => r.collectionFrequency ? `${r.plan} · ${String(r.collectionFrequency).toLowerCase()}` : r.plan },
              { key: "branch", header: "Branch", render: (r: any) => r.branch },
              {
                key: "date",
                header: "Due date",
                render: (r: any) => r.dueDate,
              },
              {
                key: "amount",
                header: board === "defaulters" ? "Arrears" : "Amount",
                render: (r: any) =>
                  board === "defaulters" ||
                  Number(r.openInstalments ?? 1) > 1 ? (
                    <span>
                      <strong>{money(r.totalOpenAmount ?? r.amount)}</strong>
                      {Number(r.openInstalments ?? 1) > 1 ? (
                        <span className="block text-xs text-muted-foreground">
                          {r.openInstalments} instalments · next{" "}
                          {money(r.amount)}
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <strong>{money(r.amount)}</strong>
                  ),
              },
              {
                key: "age",
                header: "Age",
                render: (r: any) =>
                  r.overdueDays
                    ? `${r.overdueDays} day${r.overdueDays === 1 ? "" : "s"} late`
                    : r.status === "DUE"
                      ? "On time"
                      : "—",
              },
              {
                key: "status",
                header: "Status",
                render: (r: any) => <StatusBadge status={r.status} />,
              },
              {
                key: "action",
                header: "Actions",
                className: "w-[1%] whitespace-nowrap text-right align-middle",
                render: (r: any) => (
                  <div
                    className="inline-flex max-w-none flex-nowrap items-center justify-end gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <PaymentDialog
                      customer={r.customer}
                      schemeId={r.schemeId}
                      lockScheme
                      trigger={
                        <Button
                          size="sm"
                          variant="default"
                          className="shrink-0"
                        >
                          Collect
                        </Button>
                      }
                    />
                    {caps?.onlinePayments !== false && r.schemeId ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0"
                        title="Create online payment link for this due amount"
                        onClick={async () => {
                          try {
                            const linkErr = validatePaymentLinkAmount(
                              Number(r.amount),
                            );
                            if (linkErr) {
                              toast.error(linkErr);
                              return;
                            }
                            const link = await createPaymentLink({
                              schemeId: r.schemeId,
                              amount: r.amount,
                              targetCycle: r.targetCycle,
                              idempotencyKey: idempotencyKey(),
                            }).unwrap();
                            const path = link.url ?? "";
                            const href = path.startsWith("http")
                              ? path
                              : `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
                            try {
                              await navigator.clipboard.writeText(href);
                              toast.success("Payment link copied", {
                                description:
                                  "Share with the customer to pay online (PhonePe).",
                              });
                            } catch {
                              toast.success("Payment link created", {
                                description: href,
                              });
                            }
                          } catch (err) {
                            toastApiError(err, "Could not create payment link");
                          }
                        }}
                      >
                        <Link2 />
                        Link
                      </Button>
                    ) : null}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 shrink-0"
                      title={`Call ${r.customer}`}
                      asChild
                    >
                      <a
                        href={`tel:${String(r.phone ?? "").replace(/\s/g, "")}`}
                      >
                        <Phone className="size-4" />
                      </a>
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </ListPanel>
    </>
  );
}
