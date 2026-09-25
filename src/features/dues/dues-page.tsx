"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  Download,
  IndianRupee,
  Link2,
  Phone,
  ShieldAlert,
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
import {
  EmptyState,
  PageSkeleton,
  QueryError,
} from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { ChartSeriesView } from "@/src/components/common/chart-series-view";
import {
  BulkJobResultSheet,
  type BulkJobResult,
} from "@/src/features/dues/bulk-job-result-sheet";
import { PaymentDialog } from "@/src/features/payments/payment-dialog";
import { downloadCsv } from "@/src/lib/download";
import { idempotencyKey, money } from "@/src/lib/format";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import {
  applyWideListRangePreset,
  defaultListRangeFrom,
  defaultListRangeTo,
  listSearchQueryForApi,
  shouldSkipListSearchQuery,
  wideListRangePresetLabel,
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
  PageTabsPanel,
} from "@/src/components/common/page-tabs";
import {
  useBulkSendDueLinksMutation,
  useBulkSendOverdueRemindersMutation,
  useCreatePaymentLinkMutation,
  useGetDefaultersQuery,
  useGetDuesQuery,
  useGetOverduesQuery,
} from "@/src/store/api/admin-api";
import { useAppSelector } from "@/src/store/hooks";

const DUE_KIND_FILTERS: FilterOption[] = [
  { value: "ALL", label: "All" },
  { value: "DUE", label: "Due today" },
  { value: "GRACE", label: "Grace" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "DEFAULTED", label: "Defaulters" },
];

export function DuesPage() {
  const router = useRouter();
  const [board, setBoard] = useState<"dues" | "overdues" | "defaulters">(
    "dues",
  );
  const [rangeMode, setRangeMode] = useState<WorkboardDatePreset>("CUSTOM");
  const preset = rangeMode === "CUSTOM" ? undefined : rangeMode;
  const [kind, setKind] = useState("ALL");
  const [bulkResult, setBulkResult] = useState<BulkJobResult | null>(null);
  const [bulkSheetOpen, setBulkSheetOpen] = useState(false);
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
    `${board}|${kind}|${rangeMode}|${debouncedQ}|${from}|${to}|${branchKey}`,
  );
  const listQueryParams = useMemo(() => {
    const base = {
      q: listSearchQueryForApi(debouncedQ),
      branchId,
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
    debouncedQ,
    kind,
    pager.queryParams,
    preset,
    from,
    to,
  ]);

  const overduesListParams = useMemo(() => {
    const { kind: _kind, ...rest } = listQueryParams;
    return rest;
  }, [listQueryParams]);

  const skipForSearch = shouldSkipListSearchQuery(debouncedQ);
  const skipList = skipForSearch || (rangeMode === "CUSTOM" && skipForBadDates);
  const defaultersQuery = useGetDefaultersQuery(
    {
      q: listSearchQueryForApi(debouncedQ),
      branchId,
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
  const [bulkReminders] = useBulkSendOverdueRemindersMutation();
  const [bulkLinks] = useBulkSendDueLinksMutation();
  const invalidCustomRange = rangeMode === "CUSTOM" && skipForBadDates;
  if (invalidCustomRange) {
    return (
      <>
        <PageHeader
          eyebrow="Customer operations"
          title="Dues & overdue"
          description="Work through current dues, grace-period accounts, overdue cycles and default risk."
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
  const rows =
    board === "defaulters"
      ? query.data.items.map((r: Record<string, unknown>) => ({
          id: String(r.id ?? r._id ?? ""),
          schemeId: String(r.id ?? r._id ?? ""),
          customerId: String(
            r.customerId ??
              (r.customer as { id?: string })?.id ??
              "",
          ),
          customer:
            typeof r.customer === "string"
              ? r.customer
              : ((r.customer as { name?: string })?.name ?? "—"),
          phone:
            (r.customer as { mobile?: string })?.mobile ??
            String(r.phone ?? "—"),
          enrollmentNo: String(
            r.enrollmentNumber ?? r.enrollmentNo ?? "—",
          ),
          plan:
            (r.plan as { name?: string })?.name ??
            (r.planSnapshot as { name?: string })?.name ??
            String(r.plan ?? "—"),
          branch:
            typeof r.branch === "string"
              ? r.branch
              : ((r.branch as { name?: string })?.name ?? "—"),
          dueDate: "—",
          amount: 0,
          overdueDays: 0,
          status: "DEFAULTED",
        }))
      : query.data.items;
  const ageingChart =
    board === "overdues" ? (s as { chart?: unknown })?.chart : undefined;
  const page = query.data.page ?? emptyPageMeta();
  return (
    <>
      <BulkJobResultSheet
        result={bulkResult}
        open={bulkSheetOpen}
        onOpenChange={setBulkSheetOpen}
      />
      <PageHeader
        eyebrow="Customer operations"
        title="Dues & overdue"
        description="Work through current dues, grace-period accounts, overdue cycles and default risk."
        actions={
          <>
            <div className="space-y-1">
              <WorkboardDateRangeFilter
                label="Due"
                mode={rangeMode}
                onModeChange={setRangeMode}
                from={from}
                to={to}
                onFromChange={setFrom}
                onToChange={setTo}
              />
              {rangeMode === "CUSTOM" ? (
                <FormFieldError message={dateRangeError} />
              ) : null}
            </div>
            <Button
              variant="ghost"
              className="shrink-0"
              onClick={() => {
                setRangeMode("CUSTOM");
                const next = applyWideListRangePreset();
                setFrom(next.from);
                setTo(next.to);
              }}
            >
              {wideListRangePresetLabel()}
            </Button>
            <Button
              variant="outline"
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
              <Download />
              Export
            </Button>
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={CalendarClock}
          label="Due"
          value={money(s.due ?? 0)}
          detail={`${s.customers ?? 0} customers · board totals`}
        />
        <StatCard
          icon={IndianRupee}
          label="Grace period"
          value={money(s.grace ?? 0)}
          detail="Follow up gently"
          tone="gold"
        />
        <StatCard
          icon={AlertTriangle}
          label="Overdue"
          value={money(s.overdue ?? 0)}
          detail="Action required"
          tone="red"
        />
        <StatCard
          icon={ShieldAlert}
          label="Defaulted"
          value={money(s.defaulted ?? 0)}
          detail="Escalated accounts"
          tone="red"
        />
        <StatCard
          icon={Bell}
          label="Customers"
          value={s.customers ?? 0}
          detail="In current view"
          tone="cream"
        />
      </div>
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
      {board !== "defaulters" ? (
        <ListToolbar>
          <SearchFilterBar
            searchValue={q}
            onSearchChange={setQ}
            searchPlaceholder="Search customer, phone or enrollment"
            filterValue={kind}
            onFilterChange={setKind}
            filterOptions={DUE_KIND_FILTERS}
            filterLabel="View"
          />
        </ListToolbar>
      ) : (
        <ListToolbar>
          <SearchFilterBar
            searchValue={q}
            onSearchChange={setQ}
            searchPlaceholder="Search customer, phone or enrollment"
            filterValue="ALL"
            onFilterChange={() => {}}
            filterOptions={[{ value: "ALL", label: "All" }]}
            filterLabel="View"
          />
        </ListToolbar>
      )}
      <Surface
        title={
          board === "defaulters" ? "Defaulters registry" : "Due workboard"
        }
        description={
          board === "defaulters"
            ? "All schemes in DEFAULTED status · open enrollment for recovery actions"
            : "Collect at counter · Link creates an online pay URL · Bell queues WhatsApp reminder"
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
            onRowClick={(r: any) => router.push(`/customers/${r.customerId}`)}
            columns={[
              {
                key: "customer",
                header: "Customer",
                render: (r: any) => (
                  <span>
                    <strong>{r.customer}</strong>
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
                render: (r: any) => r.enrollmentNo,
              },
              { key: "plan", header: "Scheme", render: (r: any) => r.plan },
              { key: "branch", header: "Branch", render: (r: any) => r.branch },
              {
                key: "date",
                header: "Due date",
                render: (r: any) => r.dueDate,
              },
              {
                key: "amount",
                header: "Amount",
                render: (r: any) => <strong>{money(r.amount)}</strong>,
              },
              {
                key: "age",
                header: "Age",
                render: (r: any) =>
                  r.overdueDays ? `${r.overdueDays} days` : "Today",
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
                      customerId={r.customerId}
                      schemeId={r.schemeId}
                      lockScheme
                      targetCycle={r.targetCycle}
                      suggestedAmountRupees={Number(r.amount) || undefined}
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
                      variant="outline"
                      className="size-8 shrink-0"
                      title={
                        r.status === "OVERDUE" || r.status === "DEFAULTED"
                          ? "Queue overdue WhatsApp reminder"
                          : "Queue due payment link on WhatsApp"
                      }
                      onClick={async () => {
                        try {
                          const res =
                            r.status === "OVERDUE" || r.status === "DEFAULTED"
                              ? await bulkReminders({
                                  installmentIds: [r.id],
                                }).unwrap()
                              : await bulkLinks({
                                  installmentIds: [r.id],
                                }).unwrap();
                          setBulkResult(res);
                          setBulkSheetOpen(true);
                        } catch (err) {
                          toastApiError(
                            err,
                            "Could not queue WhatsApp message",
                          );
                        }
                      }}
                    >
                      <Bell className="size-4" />
                    </Button>
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
      </Surface>
    </>
  );
}
