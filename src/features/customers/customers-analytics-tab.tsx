"use client";

import { useRouter } from "next/navigation";
import { ChartSeriesView } from "@/src/components/common/chart-series-view";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { ReportSummaryStrip } from "@/src/features/reports/report-summary-strip";
import { portalPathFromContract } from "@/src/lib/contract-paths";
import { useActingBranchId } from "@/src/hooks/use-acting-branch-id";
import { useGetCustomerAnalyticsQuery } from "@/src/store/api/admin-api";
import type { ChartSeriesBlock } from "@/src/types/admin-report";

function chartPanelMinHeight(chart: ChartSeriesBlock): string | undefined {
  const t = (chart.chartType ?? "bar").toLowerCase();
  if (t === "donut" || t === "pie") return undefined;
  if (t === "horizontalbar" || t === "horizontal_bar") return undefined;
  return "min-h-[260px]";
}

export function CustomersAnalyticsTab() {
  const router = useRouter();
  const branchId = useActingBranchId();
  const query = useGetCustomerAnalyticsQuery(
    branchId ? { branchId } : undefined,
  );
  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data)
    return <QueryError onRetry={query.refetch} />;
  const charts = query.data.charts ?? {};
  return (
    <div className="space-y-5">
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
            <h3 className="mb-3 font-semibold">
              {(chart as ChartSeriesBlock).title ?? key}
            </h3>
            <div className={chartPanelMinHeight(chart as ChartSeriesBlock)}>
              <ChartSeriesView chart={chart as ChartSeriesBlock} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
