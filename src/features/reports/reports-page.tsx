"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangeFilter } from "@/src/components/common/date-range-filter";
import { ChartSeriesView } from "@/src/components/common/chart-series-view";
import { CursorPagination } from "@/src/components/common/cursor-pagination";
import { ReportTable } from "@/src/components/common/report-table";
import {
  FieldLabel,
  PageHeader,
  Surface,
} from "@/src/components/common/page-parts";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { toastApiError } from "@/src/lib/api-error";
import {
  listSearchQueryForApi,
  sanitizeListSearchQueryInput,
  shouldSkipListSearchQuery,
  validateListDateRange,
  validateListSearchQuery,
} from "@/src/lib/list-date-range";
import {
  reportExportReady,
  validateReportExportRequest,
} from "@/src/lib/report-export-validation";
import {
  EmptyState,
  PageSkeleton,
  QueryError,
} from "@/src/components/common/query-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { downloadCsv } from "@/src/lib/download";
import { fetchAuthorizedBlob } from "@/src/lib/download-api";
import { env } from "@/src/config/env";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import {
  defaultListRangeFrom,
  defaultListRangeTo,
} from "@/src/lib/list-date-range";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import { useDebouncedValue } from "@/src/hooks/use-debounced-value";
import { useThrottledValue } from "@/src/hooks/use-throttled-value";
import {
  useCreateReportExportMutation,
  useGetBranchesQuery,
  useGetCustomersQuery,
  useGetPlansQuery,
  useGetReportsQuery,
  useLazyGetExportStatusQuery,
} from "@/src/store/api/admin-api";
import { useAppSelector } from "@/src/store/hooks";
import { portalPathFromContract } from "@/src/lib/contract-paths";
import {
  ADMIN_REPORT_KEYS,
  ADMIN_REPORT_LABELS,
  type AdminReportKey,
} from "@/src/types/admin-report";
import { ReportSummaryStrip } from "@/src/features/reports/report-summary-strip";
import { ExportsPanel } from "@/src/features/reports/exports-panel";
import {
  reportSupportsBranchFilter,
  reportSupportsPlanFilter,
} from "@/src/features/reports/report-filter-support";

function cellExportValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    if (o.amountDisplay) return String(o.amountDisplay);
    if (o.weightDisplay) return String(o.weightDisplay);
    if (o.name) return String(o.name);
    if (o.label) return String(o.label);
  }
  return String(value);
}

export function ReportsPage() {
  const router = useRouter();
  const [createExport] = useCreateReportExportMutation();
  const [fetchExportStatus] = useLazyGetExportStatusQuery();
  const [exportFormat, setExportFormat] = useState("CSV");
  const [reportKey, setReportKey] = useState<AdminReportKey>("COLLECTION");
  const [from, setFrom] = useState(() => defaultListRangeFrom());
  const [to, setTo] = useState(() => defaultListRangeTo());
  const globalBranchKey = useAppSelector((s) => s.ui.branchId);
  const actingBranchId =
    globalBranchKey && globalBranchKey !== "ALL" ? globalBranchKey : undefined;
  const [planId, setPlanId] = useState("ALL");
  const [groupBy, setGroupBy] = useState("BRANCH");
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const throttledCustomerId = useThrottledValue(customerId, 400);
  const debouncedCustomerSearch = useDebouncedValue(customerSearch, 350);
  const isCustomerLedger = reportKey === "CUSTOMER_LEDGER";
  const selectedCustomerId = throttledCustomerId.trim();
  const skipReportQuery = isCustomerLedger && !selectedCustomerId;
  const dateRangeError = useMemo(
    () => validateListDateRange(from, to),
    [from, to],
  );
  const skipReportForBadDates = Boolean(dateRangeError);
  const customerLedgerError =
    isCustomerLedger && !selectedCustomerId
      ? "Select a customer for the ledger report."
      : undefined;
  const multiBranch = useAppSelector(
    (s) => s.session.session?.capabilities?.multiBranch !== false,
  );
  const showBranchFilter = multiBranch && reportSupportsBranchFilter(reportKey);
  const showPlanFilter = reportSupportsPlanFilter(reportKey);
  const plansQuery = useGetPlansQuery(
    { status: "ACTIVE", limit: 100 },
    { skip: !showPlanFilter },
  );
  const plans = plansQuery.data?.items ?? [];

  useEffect(() => {
    if (isCustomerLedger) return;
    setCustomerId("");
    setCustomerSearch("");
  }, [isCustomerLedger]);

  const customerSearchError = validateListSearchQuery(customerSearch);
  const customersQuery = useGetCustomersQuery(
    { q: listSearchQueryForApi(debouncedCustomerSearch), limit: 40 },
    {
      skip:
        !isCustomerLedger ||
        shouldSkipListSearchQuery(debouncedCustomerSearch),
    },
  );
  const customerOptions = customersQuery.data?.items ?? [];

  const pager = useCursorPagination(
    8,
    `${reportKey}|${from}|${to}|${globalBranchKey}|${planId}|${groupBy}|${throttledCustomerId}`,
  );

  const queryArgs = useMemo(
    () => ({
      reportKey,
      period: "CUSTOM",
      from,
      to,
      groupBy: reportKey === "COLLECTION" ? groupBy : undefined,
      branchId: showBranchFilter ? actingBranchId : undefined,
      planId: showPlanFilter && planId !== "ALL" ? planId : undefined,
      customerId:
        isCustomerLedger && selectedCustomerId ? selectedCustomerId : undefined,
      ...pager.queryParams,
    }),
    [
      reportKey,
      from,
      to,
      groupBy,
      actingBranchId,
      planId,
      showBranchFilter,
      showPlanFilter,
      selectedCustomerId,
      isCustomerLedger,
      pager.queryParams,
    ],
  );

  const query = useGetReportsQuery(queryArgs, {
    skip: skipReportQuery || skipReportForBadDates,
  });
  const report = skipReportQuery ? undefined : query.data;
  const page = report?.page ?? emptyPageMeta();
  const chartEntries = Object.entries(report?.charts ?? {});
  const reportTitle = report?.title ?? ADMIN_REPORT_LABELS[reportKey];

  const exportCsv = () => {
    if (!report) return;
    const headers = report.columns.map((c) => c.label);
    const keys = report.columns.map((c) => c.key);
    const body = report.rows.map((row) =>
      keys.map((k) => cellExportValue(row[k])),
    );
    if (report.totalsRow) {
      body.push(keys.map((k) => cellExportValue(report.totalsRow?.[k])));
    }
    downloadCsv(
      `swarnagrow-${report.reportKey.toLowerCase()}.csv`,
      headers,
      body,
    );
    toast.success("CSV downloaded");
  };

  const pollExport = async (exportId: string) => {
    if (!exportId) {
      toast.error("Export id missing — check Async export jobs below");
      return;
    }
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 800));
      try {
        const status = await fetchExportStatus(exportId).unwrap();
        if (!status?.status || status.status === "UNKNOWN") continue;
        if (status.status === "FAILED") {
          toast.error("Export failed");
          return;
        }
        if (status.status === "READY") {
          if (!env.useMocks) {
            try {
              const blob = await fetchAuthorizedBlob(
                `/admin/exports/${exportId}/file`,
              );
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `swarnagrow-export-${exportId}.csv`;
              link.click();
              URL.revokeObjectURL(url);
              toast.success("Export ready — download started");
              return;
            } catch {
              toast.success(
                "Export ready — use Download in Async export jobs below",
              );
              return;
            }
          }
          toast.success("Export ready");
          return;
        }
      } catch {
        /* keep polling */
      }
    }
    toast.info("Export still processing — see Async export jobs below");
  };

  const exportAsync = () => {
    const clientErrors = validateReportExportRequest({
      reportKey,
      format: exportFormat,
      from,
      to,
      customerId: customerId.trim(),
      requireCustomer: isCustomerLedger,
    });
    if (Object.keys(clientErrors).length) {
      const first = Object.values(clientErrors)[0];
      toast.error(first ?? "Fix export filters.");
      return;
    }
    void createExport({
      reportKey,
      format: exportFormat,
      params: {
        from,
        to,
        ...(isCustomerLedger && customerId.trim()
          ? { customerId: customerId.trim() }
          : {}),
      },
    })
      .unwrap()
      .then((job) => {
        if (!job.exportId) {
          toast.error("Export queued but id was missing — refresh export jobs");
          return;
        }
        toast.info(`Export ${job.exportId} queued…`);
        void pollExport(job.exportId);
      })
      .catch((err) => toastApiError(err, "Export failed"));
  };

  const exportAsyncDisabled =
    !reportExportReady({
      reportKey,
      format: exportFormat,
      from,
      to,
      customerId: customerId.trim(),
      requireCustomer: isCustomerLedger,
    }) || skipReportQuery;

  return (
    <>
      <PageHeader
        eyebrow="Reports & controls"
        title={reportTitle}
        description={
          skipReportQuery
            ? "Choose a customer to load their ledger statement for the selected period."
            : [
                report?.scope?.label,
                report?.period?.label ?? `${from} – ${to}`,
                report?.generatedAt ? `Generated ${report.generatedAt}` : null,
              ]
                .filter(Boolean)
                .join(" · ") ||
              "Operational and financial reporting with summary, charts, and detailed tables."
        }
        actions={
          skipReportQuery ? undefined : (
            <>
              {(report?.exportFormats ?? ["CSV"]).includes("CSV") && (
                <Button variant="outline" onClick={exportCsv}>
                  <Download />
                  Export CSV
                </Button>
              )}
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CSV">CSV</SelectItem>
                  <SelectItem value="XLSX">Excel</SelectItem>
                  <SelectItem value="PDF">PDF</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                disabled={exportAsyncDisabled}
                onClick={exportAsync}
              >
                <FileText />
                Export async
              </Button>
            </>
          )
        }
      />

      <Surface>
        <div className="flex flex-col gap-4 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="min-w-0 sm:col-span-2 lg:col-span-1">
              <FieldLabel>Report</FieldLabel>
              <Select
                value={reportKey}
                onValueChange={(v) => setReportKey(v as AdminReportKey)}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_REPORT_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {ADMIN_REPORT_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {showPlanFilter && (
              <div className="min-w-0">
                <FieldLabel>Scheme plan</FieldLabel>
                <Select value={planId} onValueChange={setPlanId}>
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="All plans" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All plans</SelectItem>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                        {p.code ? ` (${p.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {reportKey === "COLLECTION" && (
              <div className="min-w-0">
                <FieldLabel>Group by</FieldLabel>
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRANCH">Branch</SelectItem>
                    <SelectItem value="DAY">Day</SelectItem>
                    <SelectItem value="STAFF">Staff</SelectItem>
                    <SelectItem value="MODE">Mode</SelectItem>
                    <SelectItem value="PLAN">Plan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {isCustomerLedger && (
            <div className="grid gap-3 border-t border-[#efe6ea] pt-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <FieldLabel>Customer</FieldLabel>
                <Input
                  className="h-11"
                  placeholder="Search by name, mobile, or passbook no."
                  value={customerSearch}
                  onChange={(e) =>
                    setCustomerSearch(
                      sanitizeListSearchQueryInput(e.target.value),
                    )
                  }
                  aria-invalid={Boolean(customerSearchError)}
                />
                <FormFieldError message={customerSearchError} />
                <Select
                  value={customerId || undefined}
                  onValueChange={setCustomerId}
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue placeholder="Select customer for ledger" />
                  </SelectTrigger>
                  <SelectContent>
                    {customerOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} · {c.customerNo}
                        {c.mobile ? ` · ${c.mobile}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormFieldError message={customerLedgerError} />
                <p className="text-xs text-muted-foreground">
                  {customersQuery.isLoading
                    ? "Loading customers…"
                    : customerOptions.length === 0
                      ? "No customers match — try a different search."
                      : `${customerOptions.length} customer(s) — pick one to load the ledger.`}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#efe6ea] pt-4">
            <div className="min-w-0 flex-1">
              <DateRangeFilter
                label="Period"
                from={from}
                to={to}
                onFromChange={setFrom}
                onToChange={setTo}
              />
              <div className="mt-2">
                <FormFieldError message={dateRangeError} />
              </div>
            </div>
            <Button
              className="h-10 shrink-0"
              variant="outline"
              disabled={skipReportQuery || Boolean(dateRangeError)}
              onClick={() => query.refetch()}
            >
              <SlidersHorizontal />
              Apply filters
            </Button>
          </div>
        </div>
      </Surface>

      {skipReportForBadDates && !skipReportQuery ? (
        <Surface title="Invalid period">
          <EmptyState
            title="Fix the date range"
            detail={dateRangeError ?? ""}
          />
        </Surface>
      ) : null}
      {skipReportQuery ? (
        <Surface title="Customer ledger">
          <EmptyState
            title="Select a customer to view their ledger"
            detail="Use the search box and dropdown above, or open a customer profile and run the ledger from there."
          />
          <div className="flex justify-center gap-3 pb-8">
            <Button variant="outline" onClick={() => router.push("/customers")}>
              Browse customers
            </Button>
          </div>
        </Surface>
      ) : query.isLoading ? (
        <PageSkeleton cards={2} />
      ) : query.isError || !report ? (
        <QueryError error={query.error} onRetry={query.refetch} />
      ) : (
        <>
          <ReportSummaryStrip items={report.summary} />

          {report.valuationRate && (
            <Surface
              title="Valuation rate"
              description="Gold reports use this rate for liability."
            >
              <p className="p-5 text-sm text-muted-foreground">
                {(report.valuationRate as { ratePerGramDisplay?: string })
                  .ratePerGramDisplay ?? "—"}{" "}
                as of{" "}
                {(report.valuationRate as { asOf?: string }).asOf ?? "today"}
              </p>
            </Surface>
          )}

          {chartEntries.length > 0 && (
            <div
              className={`grid gap-5 ${chartEntries.length >= 3 ? "xl:grid-cols-3" : chartEntries.length === 2 ? "md:grid-cols-2" : ""}`}
            >
              {chartEntries.map(([key, chart]) => (
                <Surface
                  key={key}
                  title={chart.title}
                  description={chart.subtitle}
                >
                  <div
                    className={`p-4 ${
                      (chart.chartType ?? "").toLowerCase().includes("donut") ||
                      (chart.chartType ?? "").toLowerCase() === "pie"
                        ? "min-h-[340px]"
                        : "h-[320px]"
                    }`}
                  >
                    <div
                      className={
                        (chart.chartType ?? "")
                          .toLowerCase()
                          .includes("donut") ||
                        (chart.chartType ?? "").toLowerCase() === "pie"
                          ? undefined
                          : "h-full"
                      }
                    >
                      <ChartSeriesView chart={chart} />
                    </div>
                  </div>
                </Surface>
              ))}
            </div>
          )}

          <Surface
            title="Report table"
            description="Report columns, rows, and totals for the selected period."
          >
            <ReportTable
              columns={report.columns}
              rows={report.rows}
              totalsRow={report.totalsRow}
              onRowClick={(row) => {
                if (row.drilldownPath) {
                  router.push(
                    portalPathFromContract(String(row.drilldownPath)),
                  );
                }
              }}
            />
            <CursorPagination
              page={page}
              pageIndex={pager.pageIndex}
              rowCount={report.rows.length}
              onNext={() => pager.goNext(page.nextCursor)}
              onPrevious={pager.goPrevious}
              canPrevious={pager.canPrevious}
            />
          </Surface>
        </>
      )}
      <div className="mt-6">
        <ExportsPanel />
      </div>
    </>
  );
}
