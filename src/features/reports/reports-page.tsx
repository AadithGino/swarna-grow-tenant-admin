"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ChartSeriesView,
  chartSurfaceBodyClass,
  chartUsesFlexibleHeight,
} from "@/src/components/common/chart-series-view";
import { CursorPagination } from "@/src/components/common/cursor-pagination";
import { ReportTable } from "@/src/components/common/report-table";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
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
import { useClientMounted } from "@/src/hooks/use-client-mounted";
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
import { ReportFiltersPanel } from "@/src/features/reports/report-filters-panel";
import { ReportSummaryStrip } from "@/src/features/reports/report-summary-strip";
import { ExportsPanel } from "@/src/features/reports/exports-panel";
import {
  reportSupportsBranchFilter,
  reportSupportsPlanFilter,
  reportUsesBranchFocusSelector,
  reportUsesCustomerFocusSelector,
  reportUsesSchemeFocusSelector,
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

const REPORTS_HEADER_FALLBACK =
  "Operational and financial reporting with summary, charts, and detailed tables.";

export function ReportsPage() {
  const mounted = useClientMounted();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createExport] = useCreateReportExportMutation();
  const [fetchExportStatus] = useLazyGetExportStatusQuery();
  const [exportFormat, setExportFormat] = useState("CSV");
  const [reportKey, setReportKey] = useState<AdminReportKey>("COLLECTION");
  const [from, setFrom] = useState(() => defaultListRangeFrom());
  const [to, setTo] = useState(() => defaultListRangeTo());
  const [reportBranchId, setReportBranchId] = useState("ALL");
  const [planId, setPlanId] = useState("ALL");
  const [focusBranchId, setFocusBranchId] = useState("ALL");
  const [focusPlanId, setFocusPlanId] = useState("ALL");
  const [groupBy, setGroupBy] = useState("BRANCH");
  const [customerFocusMode, setCustomerFocusMode] = useState<"ALL" | "INDIVIDUAL">(
    "ALL",
  );
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const throttledCustomerId = useThrottledValue(customerId, 400);
  const debouncedCustomerSearch = useDebouncedValue(customerSearch, 350);
  const isCustomerPerformance = reportKey === "CUSTOMER_PERFORMANCE";
  const selectedCustomerId = throttledCustomerId.trim();
  const skipReportQuery =
    isCustomerPerformance &&
    customerFocusMode === "INDIVIDUAL" &&
    !selectedCustomerId;
  const dateRangeError = useMemo(
    () => validateListDateRange(from, to),
    [from, to],
  );
  const skipReportForBadDates = Boolean(dateRangeError);
  const customerLedgerError =
    isCustomerPerformance &&
    customerFocusMode === "INDIVIDUAL" &&
    !selectedCustomerId
      ? "Select a customer to view their ledger."
      : undefined;
  const session = useAppSelector((s) => s.session.session);
  const multiBranch = session?.capabilities?.multiBranch !== false;
  const tenantWideReports =
    session?.user?.role === "TENANT_OWNER" ||
    session?.user?.role === "TENANT_ADMIN";
  const isBranchPerformance = reportKey === "BRANCH_PERFORMANCE";
  const isSchemePerformance = reportKey === "SCHEME_PERFORMANCE";
  const showBranchFilter =
    multiBranch &&
    tenantWideReports &&
    reportSupportsBranchFilter(reportKey) &&
    !isBranchPerformance;
  const showPlanFilter =
    reportSupportsPlanFilter(reportKey) && !isSchemePerformance;
  const showBranchFocus =
    multiBranch &&
    tenantWideReports &&
    reportUsesBranchFocusSelector(reportKey);
  const showSchemeFocus = reportUsesSchemeFocusSelector(reportKey);
  const showCustomerFocus = reportUsesCustomerFocusSelector(reportKey);
  const plansQuery = useGetPlansQuery(
    { status: "ACTIVE", limit: 100 },
    { skip: !showPlanFilter && !showSchemeFocus },
  );
  const branchesQuery = useGetBranchesQuery(
    { limit: 100 },
    { skip: !showBranchFocus && !showBranchFilter },
  );
  const plans = plansQuery.data?.items ?? [];
  const branches = branchesQuery.data?.items ?? [];

  useEffect(() => {
    if (isCustomerPerformance) return;
    setCustomerFocusMode("ALL");
    setCustomerId("");
    setCustomerSearch("");
  }, [isCustomerPerformance]);

  useEffect(() => {
    if (!isBranchPerformance) setFocusBranchId("ALL");
    if (!isSchemePerformance) setFocusPlanId("ALL");
    if (!isCustomerPerformance) setCustomerFocusMode("ALL");
    if (!showBranchFilter) setReportBranchId("ALL");
  }, [
    isBranchPerformance,
    isSchemePerformance,
    isCustomerPerformance,
    showBranchFilter,
    reportKey,
  ]);

  useEffect(() => {
    const key = searchParams.get("reportKey");
    const branchFromUrl = searchParams.get("branchId");
    const planFromUrl = searchParams.get("planId");
    const customerFromUrl = searchParams.get("customerId");
    const normalizedKey =
      key === "CUSTOMER_LEDGER" ? "CUSTOMER_PERFORMANCE" : key;
    if (
      normalizedKey &&
      (ADMIN_REPORT_KEYS as readonly string[]).includes(normalizedKey)
    ) {
      setReportKey(normalizedKey as AdminReportKey);
    }
    if (branchFromUrl) setFocusBranchId(branchFromUrl);
    if (planFromUrl) setFocusPlanId(planFromUrl);
    if (customerFromUrl) {
      setCustomerFocusMode("INDIVIDUAL");
      setCustomerId(customerFromUrl);
    }
  }, [searchParams]);

  const customerSearchError = validateListSearchQuery(customerSearch);
  const customersQuery = useGetCustomersQuery(
    { q: listSearchQueryForApi(debouncedCustomerSearch), limit: 40 },
    {
      skip:
        !isCustomerPerformance ||
        customerFocusMode !== "INDIVIDUAL" ||
        shouldSkipListSearchQuery(debouncedCustomerSearch),
    },
  );
  const customerOptions = customersQuery.data?.items ?? [];

  const pager = useCursorPagination(
    8,
    `${reportKey}|${from}|${to}|${reportBranchId}|${planId}|${focusBranchId}|${focusPlanId}|${customerFocusMode}|${groupBy}|${throttledCustomerId}`,
  );

  const queryArgs = useMemo(
    () => ({
      reportKey,
      period: "CUSTOM",
      from,
      to,
      groupBy: reportKey === "COLLECTION" ? groupBy : undefined,
      branchId: isBranchPerformance
        ? focusBranchId !== "ALL"
          ? focusBranchId
          : "ALL"
        : showBranchFilter
          ? reportBranchId !== "ALL"
            ? reportBranchId
            : "ALL"
          : undefined,
      planId: isSchemePerformance
        ? focusPlanId !== "ALL"
          ? focusPlanId
          : "ALL"
        : showPlanFilter && planId !== "ALL"
          ? planId
          : undefined,
      customerId:
        isCustomerPerformance &&
        customerFocusMode === "INDIVIDUAL" &&
        selectedCustomerId
          ? selectedCustomerId
          : undefined,
      ...pager.queryParams,
    }),
    [
      reportKey,
      from,
      to,
      groupBy,
      reportBranchId,
      planId,
      focusBranchId,
      focusPlanId,
      isBranchPerformance,
      isSchemePerformance,
      showBranchFilter,
      showPlanFilter,
      selectedCustomerId,
      customerFocusMode,
      isCustomerPerformance,
      pager.queryParams,
    ],
  );

  const query = useGetReportsQuery(queryArgs, {
    skip: skipReportQuery || skipReportForBadDates || !mounted,
  });
  const report = skipReportQuery || !mounted ? undefined : query.data;
  const page = report?.page ?? emptyPageMeta();
  const chartEntries = Object.entries(report?.charts ?? {});
  const reportTitle = report?.title ?? ADMIN_REPORT_LABELS[reportKey];
  const reportHeaderDescription = useMemo(() => {
    if (!mounted) return REPORTS_HEADER_FALLBACK;
    if (skipReportQuery) {
      return "Choose an individual customer to load their ledger for the selected period.";
    }
    const parts = [
      report?.scope?.label,
      report?.period?.label ?? `${from} – ${to}`,
      report?.generatedAt ? `Generated ${report.generatedAt}` : null,
    ].filter(Boolean);
    return parts.join(" · ") || REPORTS_HEADER_FALLBACK;
  }, [mounted, skipReportQuery, report, from, to]);

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
      requireCustomer:
        isCustomerPerformance && customerFocusMode === "INDIVIDUAL",
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
        ...(isCustomerPerformance &&
        customerFocusMode === "INDIVIDUAL" &&
        customerId.trim()
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
      requireCustomer:
        isCustomerPerformance && customerFocusMode === "INDIVIDUAL",
    }) || skipReportQuery;

  if (!mounted) {
    return <PageSkeleton cards={5} />;
  }

  return (
    <>
      <PageHeader
        eyebrow="Reports & controls"
        title={reportTitle}
        description={reportHeaderDescription}
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

      <ReportFiltersPanel
        reportKey={reportKey}
        onReportKeyChange={setReportKey}
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
        dateRangeError={dateRangeError}
        showBranchFilter={showBranchFilter}
        reportBranchId={reportBranchId}
        onReportBranchIdChange={setReportBranchId}
        branches={branches}
        showPlanFilter={showPlanFilter}
        planId={planId}
        onPlanIdChange={setPlanId}
        plans={plans}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        showBranchFocus={showBranchFocus}
        focusBranchId={focusBranchId}
        onFocusBranchIdChange={setFocusBranchId}
        showSchemeFocus={showSchemeFocus}
        focusPlanId={focusPlanId}
        onFocusPlanIdChange={setFocusPlanId}
        showCustomerFocus={showCustomerFocus}
        customerFocusMode={customerFocusMode}
        onCustomerFocusModeChange={(mode) => {
          setCustomerFocusMode(mode);
          if (mode === "ALL") {
            setCustomerId("");
            setCustomerSearch("");
          }
        }}
        customerSearch={customerSearch}
        onCustomerSearchChange={(value) =>
          setCustomerSearch(sanitizeListSearchQueryInput(value))
        }
        customerSearchError={customerSearchError}
        customerId={customerId}
        onCustomerIdChange={setCustomerId}
        customerOptions={customerOptions}
        customerLedgerError={customerLedgerError}
        customersLoading={customersQuery.isLoading}
        onApply={() => query.refetch()}
        applyDisabled={skipReportQuery || Boolean(dateRangeError)}
      />

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
            detail="Search and pick a customer above, or click a row in the overview table to drill down."
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
                  <div className={`p-4 ${chartSurfaceBodyClass(chart)}`}>
                    <div
                      className={
                        chartUsesFlexibleHeight(chart) ? undefined : "h-full"
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
