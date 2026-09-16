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
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
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
  defaultListRangeFrom,
  defaultListRangeTo,
} from "@/src/lib/list-date-range";
import {
  useActingBranchId,
  useActingBranchKey,
} from "@/src/hooks/use-acting-branch-id";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import { useDebouncedValue } from "@/src/hooks/use-debounced-value";
import { useThrottledValue } from "@/src/hooks/use-throttled-value";
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
  const [board, setBoard] = useState<"dues" | "overdues">("dues");
  const [rangeMode, setRangeMode] = useState<WorkboardDatePreset>("CUSTOM");
  const preset = rangeMode === "CUSTOM" ? undefined : rangeMode;
  const [kind, setKind] = useState("ALL");
  const [bulkResult, setBulkResult] = useState<BulkJobResult | null>(null);
  const [bulkSheetOpen, setBulkSheetOpen] = useState(false);
  const caps = useAppSelector((s) => s.session.session?.capabilities);
  const [createPaymentLink] = useCreatePaymentLinkMutation();
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 350);
  const [from, setFrom] = useState(() => defaultListRangeFrom());
  const [to, setTo] = useState(() => defaultListRangeTo());
  const throttledFrom = useThrottledValue(from, 400);
  const throttledTo = useThrottledValue(to, 400);
  const branchId = useActingBranchId();
  const branchKey = useActingBranchKey();
  const pager = useCursorPagination(
    8,
    `${board}|${kind}|${rangeMode}|${debouncedQ}|${throttledFrom}|${throttledTo}|${branchKey}`,
  );
  const listQueryParams = useMemo(() => {
    const base = {
      q: debouncedQ || undefined,
      branchId,
      ...pager.queryParams,
    };
    if (preset) {
      return { ...base, preset, kind };
    }
    return {
      ...base,
      kind,
      from: throttledFrom,
      to: throttledTo,
    };
  }, [
    branchId,
    debouncedQ,
    kind,
    pager.queryParams,
    preset,
    throttledFrom,
    throttledTo,
  ]);

  const overduesListParams = useMemo(() => {
    const { kind: _kind, ...rest } = listQueryParams;
    return rest;
  }, [listQueryParams]);

  const duesQuery = useGetDuesQuery(listQueryParams, {
    skip: board === "overdues",
  });
  const overduesQuery = useGetOverduesQuery(overduesListParams, {
    skip: board === "dues",
  });
  const query = board === "overdues" ? overduesQuery : duesQuery;
  const [bulkReminders] = useBulkSendOverdueRemindersMutation();
  const [bulkLinks] = useBulkSendDueLinksMutation();
  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data)
    return <QueryError onRetry={query.refetch} />;
  const rows = query.data.items;
  const s = query.data.summary ?? {};
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
            <WorkboardDateRangeFilter
              label="Due"
              mode={rangeMode}
              onModeChange={setRangeMode}
              from={from}
              to={to}
              onFromChange={setFrom}
              onToChange={setTo}
            />
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
        onValueChange={(v) => setBoard(v as "dues" | "overdues")}
      >
        <PageTabsBar sectionLabel="Workboard">
          <PageTab value="dues">Dues</PageTab>
          <PageTab value="overdues">Overdue</PageTab>
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
      <Surface
        title="Due workboard"
        description="Collect at counter · Link creates an online pay URL · Bell queues WhatsApp reminder"
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
