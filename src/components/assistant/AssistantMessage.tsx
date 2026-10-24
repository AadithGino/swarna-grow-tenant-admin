"use client";
import { useState } from "react";

import { ChartSeriesView } from "@/src/components/common/chart-series-view";
import {
  formatAssistantCell,
  renderAssistantCell,
} from "@/src/components/assistant/assistant-format";
import { money } from "@/src/lib/format";
import { AssistantExportControl } from "@/src/components/assistant/AssistantExportControl";
import type { AssistantBundle } from "@/src/types/assistant";
import type { ChartSeriesBlock } from "@/src/types/admin-report";

const CHAT_TABLE_ROW_CAP = 8;

function formatStatValue(value: number, valueType?: string) {
  if (valueType === "currency") return money(value / 100);
  if (valueType === "percent") return `${value}%`;
  if (valueType === "weight") return `${(value / 1000).toFixed(3)} g`;
  return value.toLocaleString("en-IN");
}

function toChartBlock(
  chart: NonNullable<AssistantBundle["chart"]>,
): ChartSeriesBlock {
  const chartType =
    chart.type === "donut" ? "donut" : chart.type === "line" ? "line" : "bar";
  return {
    chartType,
    title: chart.title ?? "Chart",
    yAxis: { type: chart.yAxisType ?? "count" },
    series: chart.series.map((s) => ({
      key: s.name,
      name: s.name,
      data: s.data.map((pt) => ({ x: pt.x, y: pt.y })),
    })),
  };
}

function CompactStatCards({ bundle }: { bundle: AssistantBundle }) {
  if (!bundle.statCards.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {bundle.statCards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-[#eaded9] bg-[#faf7f5] px-3 py-2.5"
        >
          <div className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#9a6f2a]">
            {card.label}
          </div>
          <div className="mt-0.5 text-lg font-bold tabular-nums text-[#28161a]">
            {formatStatValue(card.value, card.valueType)}
          </div>
          {card.delta != null ? (
            <div className="text-xs text-[#807478]">
              {card.delta > 0 ? "+" : ""}
              {card.delta}%
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function AssistantTable({ bundle }: { bundle: AssistantBundle }) {
  const [showAll, setShowAll] = useState(false);
  const columns = bundle.table?.columns ?? [];
  const allRows = bundle.table?.rows ?? [];
  if (!columns.length || !allRows.length) return null;

  const visibleCols = columns.filter((c) => c.key !== "drilldownPath");
  const rows = showAll ? allRows : allRows.slice(0, CHAT_TABLE_ROW_CAP);
  const hidden = allRows.length - rows.length;

  return (
    <div className="rounded-xl border border-[#eaded9] bg-[#faf7f5]">
      <div className="max-h-80 overflow-auto rounded-t-xl">
        <table className="w-full min-w-[18rem] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-[#f3ebe6]">
            <tr>
              {visibleCols.map((col) => (
                <th
                  key={col.key}
                  className="whitespace-nowrap px-3 py-2 text-[0.65rem] font-bold uppercase tracking-wide text-[#74676a]"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={String(row.id ?? row.key ?? index)}
                className="border-t border-[#eaded9]/80 bg-white even:bg-[#fffcfa]"
              >
                {visibleCols.map((col) => (
                  <td
                    key={col.key}
                    className="px-3 py-2 align-top text-[#3d2a2f]"
                  >
                    {renderAssistantCell(row[col.key], col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="relative z-10 flex flex-col gap-2 border-t border-[#eaded9] bg-[#faf7f5] px-3 py-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <p className="text-xs text-[#807478]">
          {hidden > 0
            ? `Showing ${rows.length} of ${allRows.length} rows.`
            : `Showing ${allRows.length} row${allRows.length === 1 ? "" : "s"}.`}
          {bundle.exportRecommended && !bundle.exportable
            ? " Open Reports for the full export."
            : " Use Export for Excel/CSV of the full list."}
        </p>
        {allRows.length > CHAT_TABLE_ROW_CAP ? <button type="button" className="text-xs font-semibold text-[#730321] underline underline-offset-4" onClick={() => setShowAll((value) => !value)}>{showAll ? "Show fewer rows" : `Show all ${allRows.length} loaded rows`}</button> : null}
        <AssistantExportControl bundle={bundle} />
      </div>
    </div>
  );
}

function formatAssistantAsOf(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function AssistantResponseMeta({ bundle }: { bundle: AssistantBundle }) {
  if (!bundle.cached && !bundle.asOf && bundle.cacheAgeSeconds == null) {
    return null;
  }
  const parts: string[] = [];
  if (bundle.cached) parts.push("Cached answer");
  if (bundle.asOf) parts.push(`Data as of ${formatAssistantAsOf(bundle.asOf)}`);
  if (bundle.cacheAgeSeconds != null) {
    parts.push(`Cache age ${bundle.cacheAgeSeconds}s`);
  }
  return (
    <p className="text-[11px] leading-snug text-[#887a7d]">{parts.join(" · ")}</p>
  );
}

export function AssistantMessage({ bundle }: { bundle: AssistantBundle }) {
  const chartBlock = bundle.chart ? toChartBlock(bundle.chart) : null;
  const textOnlyComposite = bundle.vizHint === "composite-text";

  if (textOnlyComposite && bundle.narrative) {
    return (
      <div className="space-y-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#9a6f2a]">
          {bundle.summaryText}
        </p>
        <p className="text-[0.9rem] leading-relaxed text-[#28161a]">
          {bundle.narrative}
        </p>
        <AssistantResponseMeta bundle={bundle} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bundle.narrative ? (
        <>
          <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#9a6f2a]">
            {bundle.summaryText}
          </p>
          <p className="text-[0.9rem] leading-relaxed text-[#28161a]">
            {bundle.narrative}
          </p>
        </>
      ) : (
        <p className="text-[0.9rem] leading-relaxed text-[#28161a]">
          {bundle.summaryText}
        </p>
      )}

      <CompactStatCards bundle={bundle} />

      {chartBlock && (
        <div className="overflow-hidden rounded-xl border border-[#eaded9] bg-[#fffcfa] px-2 py-3">
          <p className="mb-2 px-1 text-xs font-semibold text-[#5c4a4e]">
            {chartBlock.title}
          </p>
          <ChartSeriesView chart={chartBlock} compact />
        </div>
      )}

      <AssistantTable bundle={bundle} />

      <AssistantResponseMeta bundle={bundle} />
    </div>
  );
}

// re-export for tests if needed
export { formatAssistantCell };
