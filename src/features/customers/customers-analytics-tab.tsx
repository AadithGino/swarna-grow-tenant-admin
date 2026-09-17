"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartSeriesView } from "@/src/components/common/chart-series-view";
import { DateRangeFilter } from "@/src/components/common/date-range-filter";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { ReportSummaryStrip } from "@/src/features/reports/report-summary-strip";
import { useActingBranchId } from "@/src/hooks/use-acting-branch-id";
import { useClientMounted } from "@/src/hooks/use-client-mounted";
import { portalPathFromContract } from "@/src/lib/contract-paths";
import {
  applyThisMonthRange,
  validateListDateRange,
} from "@/src/lib/list-date-range";
import { useGetCustomerAnalyticsQuery } from "@/src/store/api/admin-api";
import type { ChartSeriesBlock } from "@/src/types/admin-report";

const PERIOD_OPTIONS = [
  { value: "THIS_MONTH", label: "This month" },
  { value: "LAST_MONTH", label: "Last month" },
  { value: "THIS_WEEK", label: "This week" },
  { value: "LAST_3_MONTHS", label: "Last 3 months" },
] as const;

function chartPanelMinHeight(chart: ChartSeriesBlock): string | undefined {
  const t = (chart.chartType ?? "bar").toLowerCase();
  if (t === "donut" || t === "pie") return undefined;
  if (t === "horizontalbar" || t === "horizontal_bar") return undefined;
  return "min-h-[260px]";
}

export function CustomersAnalyticsTab() {
  const router = useRouter();
  const mounted = useClientMounted();
  const branchId = useActingBranchId();
  const [rangeMode, setRangeMode] = useState<"preset" | "custom">("preset");
  const [period, setPeriod] = useState<string>("THIS_MONTH");
  const initialRange = applyThisMonthRange();
  const [customFrom, setCustomFrom] = useState(initialRange.from);
  const [customTo, setCustomTo] = useState(initialRange.to);

  const customRangeError = useMemo(() => {
    if (rangeMode !== "custom") return undefined;
    if (!customFrom.trim() && !customTo.trim()) return undefined;
    return validateListDateRange(customFrom, customTo);
  }, [rangeMode, customFrom, customTo]);

  const customRangeReady =
    rangeMode === "custom" &&
    Boolean(customFrom.trim()) &&
    Boolean(customTo.trim()) &&
    !customRangeError;

  const skipQuery = rangeMode === "custom" && !customRangeReady;

  const queryArg = useMemo(() => {
    const base: Record<string, string | undefined> = { branchId };
    if (customRangeReady) {
      return { ...base, period: "CUSTOM", from: customFrom, to: customTo };
    }
    return { ...base, period };
  }, [branchId, customFrom, customTo, customRangeReady, period]);

  const query = useGetCustomerAnalyticsQuery(queryArg, {
    skip: skipQuery || !mounted,
  });

  const rangeControls = (
    <div className="flex flex-wrap items-start gap-3">
      <Select
        value={rangeMode}
        onValueChange={(value) => setRangeMode(value as "preset" | "custom")}
      >
        <SelectTrigger className="w-[10rem]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="preset">Preset period</SelectItem>
          <SelectItem value="custom">Custom range</SelectItem>
        </SelectContent>
      </Select>
      {rangeMode === "preset" ? (
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[11rem]">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="space-y-1">
          <DateRangeFilter
            from={customFrom}
            to={customTo}
            onFromChange={setCustomFrom}
            onToChange={setCustomTo}
            label="Analytics"
            presetLabel="This month"
            onPreset={() => {
              const next = applyThisMonthRange();
              setCustomFrom(next.from);
              setCustomTo(next.to);
            }}
          />
          <FormFieldError message={customRangeError} />
        </div>
      )}
    </div>
  );

  if (!mounted) return <PageSkeleton />;
  if (skipQuery) {
    return (
      <div className="space-y-5">
        {rangeControls}
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Choose a valid start and end date to load customer analytics.
        </p>
      </div>
    );
  }
  if (query.isLoading) {
    return (
      <div className="space-y-5">
        {rangeControls}
        <PageSkeleton />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className="space-y-5">
        {rangeControls}
        <QueryError error={query.error} onRetry={query.refetch} />
      </div>
    );
  }

  const charts = query.data.charts ?? {};
  const periodLabel = query.data.period?.label;
  const comparedLabel = query.data.period?.comparedTo?.label;

  return (
    <div className="space-y-5">
      {rangeControls}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <p>
          {query.data.scope?.label ? `${query.data.scope.label} · ` : ""}
          {periodLabel ?? "Selected period"}
        </p>
        {comparedLabel ? (
          <p className="text-xs">New customers compared to {comparedLabel}</p>
        ) : null}
      </div>
      <ReportSummaryStrip items={query.data.summary ?? []} />
      <div className="grid gap-4 lg:grid-cols-2">
        {Object.entries(charts).map(([key, chart]) => (
          <div
            key={key}
            className="cursor-pointer overflow-hidden rounded-xl border bg-white p-4 shadow-[0_2px_5px_rgb(67_15_25/3%)]"
            onClick={() => {
              const drill = (chart as ChartSeriesBlock & { drilldown?: string })
                ?.drilldown;
              if (drill) router.push(portalPathFromContract(drill));
            }}
          >
            <div className="mb-3">
              <h3 className="font-semibold">
                {(chart as ChartSeriesBlock).title ?? key}
              </h3>
              {(chart as ChartSeriesBlock).subtitle ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {(chart as ChartSeriesBlock).subtitle}
                </p>
              ) : null}
            </div>
            <div className={chartPanelMinHeight(chart as ChartSeriesBlock)}>
              <ChartSeriesView chart={chart as ChartSeriesBlock} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
