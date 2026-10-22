"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  categoryXAxisSettings,
  compactCategoryLabel,
  longestCompactLabel,
} from "@/src/lib/chart-axis";
import { money } from "@/src/lib/format";
import type { ChartSeriesBlock } from "@/src/types/admin-report";
import {
  CHART_PALETTE,
  ChartSliceLegend,
  type ChartLegendItem,
} from "@/src/components/common/charts";

const palette = CHART_PALETTE;

function yFormat(yAxis: ChartSeriesBlock["yAxis"], value: number) {
  const t = yAxis?.type;
  if (t === "percent") return `${value}%`;
  if (t === "count") return String(value);
  if (t === "weight") return `${(value / 1000).toFixed(3)} g`;
  // currency charts store y in paise
  return money(value / 100);
}

function yToPlotValue(yAxis: ChartSeriesBlock["yAxis"], value: number) {
  const t = yAxis?.type;
  if (t === "currency" || t == null) return value / 100;
  if (t === "weight") return value / 1000;
  return value;
}

function axisTickFormat(yAxis: ChartSeriesBlock["yAxis"], value: number) {
  const t = yAxis?.type;
  if (t === "percent") return `${value}%`;
  if (t === "count") return String(Math.round(value));
  if (t === "weight") return `${value.toFixed(3)} g`;
  return money(value);
}

function niceAxisTop(max: number): number {
  if (!Number.isFinite(max) || max <= 0) return 1000;
  const padded = max * 1.05;
  const exp = Math.floor(Math.log10(padded));
  const mag = 10 ** exp;
  const norm = padded / mag;
  const niceNorm = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return niceNorm * mag;
}

function linearValueTicks(dataMax: number, segments = 4): number[] {
  const top = niceAxisTop(dataMax);
  const step = top / segments;
  const ticks: number[] = [];
  for (let i = 0; i <= segments; i++) {
    ticks.push(i === segments ? top : Math.round(i * step));
  }
  return [...new Set(ticks)].sort((a, b) => a - b);
}

function rowSeriesTotal(
  row: Record<string, string | number>,
  seriesKeys: string[],
): number {
  return seriesKeys.reduce((sum, key) => sum + Number(row[key] ?? 0), 0);
}

function shouldPercentStackGroupedCurrency(
  grouped: boolean,
  yAxis: ChartSeriesBlock["yAxis"],
  barRows: Record<string, string | number>[],
): boolean {
  return grouped && yAxis?.type === "currency" && barRows.length >= 2;
}

function buildPercentStackRows(
  barRows: Record<string, string | number>[],
  seriesKeys: string[],
): Record<string, string | number>[] {
  return barRows.map((row) => {
    const total = rowSeriesTotal(row, seriesKeys);
    const out: Record<string, string | number> = { x: row.x, totalAmount: total };
    for (const key of seriesKeys) {
      const amount = Number(row[key] ?? 0);
      out[key] = total > 0 ? Math.round((amount / total) * 1000) / 10 : 0;
      out[`${key}Display`] = row[`${key}Display`] ?? "";
    }
    return out;
  });
}

function barValueMax(
  barRows: Record<string, string | number>[],
  seriesKeys: string[],
  stacked: boolean,
): number {
  let max = 0;
  for (const row of barRows) {
    if (stacked) {
      let sum = 0;
      for (const key of seriesKeys) sum += Number(row[key] ?? 0);
      max = Math.max(max, sum);
    } else {
      for (const key of seriesKeys) {
        max = Math.max(max, Number(row[key] ?? 0));
      }
    }
  }
  return max;
}

function truncateCategoryLabel(label: unknown, maxLen = 22): string {
  const s = String(label ?? "");
  return s.length > maxLen ? `${s.slice(0, maxLen - 1)}…` : s;
}

function rowsForBarChart(
  block: ChartSeriesBlock,
  rows: Record<string, string | number>[],
) {
  const yAxis = block.yAxis;
  const series = block.series ?? [];
  return rows.map((row) => {
    const out: Record<string, string | number> = { x: row.x };
    for (const s of series) {
      const raw = Number(row[s.key] ?? 0);
      out[s.key] = yToPlotValue(yAxis, raw);
      out[`${s.key}Display`] = row[`${s.key}Display`] ?? "";
    }
    return out;
  });
}

export function hasChartSeriesData(block?: ChartSeriesBlock | null): boolean {
  if (!block?.series?.length) return false;
  return block.series.some((s) => (s.data?.length ?? 0) > 0);
}

function chartTypeKey(chart: ChartSeriesBlock): string {
  return (chart.chartType ?? "bar").toLowerCase();
}

/** Charts that grow with content (faceted grouped bars, etc.) must not sit in a fixed-height box. */
export function chartUsesFlexibleHeight(chart: ChartSeriesBlock): boolean {
  const type = chartTypeKey(chart);
  return type.includes("groupedbar") || type.includes("grouped_bar");
}

export function chartSurfaceBodyClass(chart: ChartSeriesBlock): string {
  const type = chartTypeKey(chart);
  if (type.includes("donut") || type === "pie") return "min-h-[340px]";
  if (chartUsesFlexibleHeight(chart)) return "min-h-[320px]";
  return "h-[320px]";
}

function seriesToRows(block: ChartSeriesBlock) {
  const series = block.series ?? [];
  if (!series.length) return [];
  const map = new Map<string, Record<string, string | number>>();
  for (const s of series) {
    for (const point of s.data ?? []) {
      const row = map.get(point.x) ?? {
        x: point.x,
        xDisplay: (point as { xDisplay?: string }).xDisplay ?? point.x,
      };
      row[s.key] = point.y;
      row[`${s.key}Display`] = point.yDisplay ?? "";
      map.set(point.x, row);
    }
  }
  return [...map.values()];
}

function fullTrendAxisLabel(value: unknown, rows: Record<string, string | number>[]) {
  const match = rows.find((row) => row.x === value);
  const display = match?.xDisplay;
  if (typeof display === "string" && display.trim()) return display;
  const raw = String(value ?? "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T12:00:00`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  if (/^\d{4}-\d{2}$/.test(raw)) {
    return new Date(`${raw}-01T12:00:00`).toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });
  }
  return raw;
}

function trendAxisTickLabel(value: unknown, rows: Record<string, string | number>[]) {
  return compactCategoryLabel(fullTrendAxisLabel(value, rows));
}

export function ChartSeriesView({
  chart,
  compact = false,
}: {
  chart: ChartSeriesBlock;
  /** Narrow surfaces (e.g. chat): prefer horizontal bars and external legend. */
  compact?: boolean;
}) {
  const type = (chart.chartType ?? "bar").toLowerCase();
  const yAxis = chart.yAxis;
  const rows = seriesToRows(chart);
  const series = chart.series ?? [];

  if (!rows.length) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        No data for this chart in the selected period.
      </p>
    );
  }

  if (type === "donut" || type === "pie") {
    const points = series[0]?.data ?? [];
    const data = points.map((p) => ({
      name: p.x,
      value: Math.max(yToPlotValue(yAxis, p.y), 0),
      display: p.yDisplay ?? yFormat(yAxis, p.y),
    }));
    const legendItems: ChartLegendItem[] = data.map((d, i) => ({
      name: d.name,
      value: d.value,
      display: d.display,
      color: palette[i % palette.length],
    }));
    const innerRadius = type === "donut" ? "58%" : 0;
    const slices = data.filter((d) => d.value > 0);
    const total = slices.reduce((sum, d) => sum + d.value, 0);
    const minPieValue = total > 0 ? total * 0.005 : 0;
    const visibleSlices = slices.filter((d) => d.value >= minPieValue);
    const pieData = visibleSlices.length ? visibleSlices : slices.length ? slices : data;
    const maxShare =
      total > 0 ? Math.max(...pieData.map((d) => d.value)) / total : 1;
    const usePadding = pieData.length > 1 && maxShare < 0.92;
    return (
      <div className="flex w-full flex-col">
        <div className="mx-auto h-[248px] w-full max-w-[300px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={innerRadius}
                outerRadius="76%"
                paddingAngle={usePadding ? 2 : 0}
                label={false}
                labelLine={false}
                stroke="#fff"
                strokeWidth={1}
              >
                {pieData.map((d) => (
                  <Cell
                    key={d.name}
                    fill={
                      palette[
                        slices.findIndex((s) => s.name === d.name) % palette.length
                      ]
                    }
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(_v, _n, props) => [
                  props.payload?.display ?? String(_v),
                  props.payload?.name ?? "",
                ]}
                contentStyle={{ borderRadius: 12, borderColor: "#e4d7d2" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ChartSliceLegend items={legendItems} />
      </div>
    );
  }

  if (type === "line") {
    const tickLabels = rows.map((row) => trendAxisTickLabel(row.x, rows));
    const xAxis = categoryXAxisSettings(rows.length, longestCompactLabel(tickLabels, (v) => String(v)));
    return (
      <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ left: -8, right: 12, top: 8, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke="#eadfda" strokeDasharray="4 4" />
          <XAxis
            dataKey="x"
            tick={{ fontSize: 11, fill: "#7c7072" }}
            axisLine={false}
            tickLine={false}
            interval={xAxis.interval}
            minTickGap={xAxis.minTickGap}
            angle={xAxis.angle}
            textAnchor={xAxis.textAnchor}
            height={xAxis.height}
            tickFormatter={(value) => trendAxisTickLabel(value, rows)}
          />
          <YAxis
            tickFormatter={(v) => yFormat(yAxis, Number(v))}
            tick={{ fontSize: 11, fill: "#7c7072" }}
            axisLine={false}
            tickLine={false}
            domain={[0, "auto"]}
            allowDecimals={false}
          />
          <Tooltip
            formatter={(v) => yFormat(yAxis, Number(v))}
            labelFormatter={(label) => fullTrendAxisLabel(label, rows)}
            contentStyle={{ borderRadius: 12, borderColor: "#e4d7d2" }}
          />
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={palette[i % palette.length]}
              strokeWidth={2.5}
              dot={{
                r: rows.length <= 31 ? 3.5 : 2,
                stroke: palette[i % palette.length],
                strokeWidth: 2,
                fill: "#fff",
              }}
              activeDot={{ r: 5 }}
            />
          ))}
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
      </div>
    );
  }

  if (type === "area") {
    const tickLabels = rows.map((row) => trendAxisTickLabel(row.x, rows));
    const xAxis = categoryXAxisSettings(rows.length, longestCompactLabel(tickLabels, (v) => String(v)));
    return (
      <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ left: -8, right: 12, top: 8, bottom: 4 }}>
          <CartesianGrid vertical={false} stroke="#eadfda" strokeDasharray="4 4" />
          <XAxis
            dataKey="x"
            tick={{ fontSize: 11, fill: "#7c7072" }}
            axisLine={false}
            tickLine={false}
            interval={xAxis.interval}
            minTickGap={xAxis.minTickGap}
            angle={xAxis.angle}
            textAnchor={xAxis.textAnchor}
            height={xAxis.height}
            tickFormatter={(value) => trendAxisTickLabel(value, rows)}
          />
          <YAxis
            tickFormatter={(v) => yFormat(yAxis, Number(v))}
            tick={{ fontSize: 11, fill: "#7c7072" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(v) => yFormat(yAxis, Number(v))}
            labelFormatter={(label) => fullTrendAxisLabel(label, rows)}
          />
          {series.map((s, i) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={palette[i % palette.length]}
              fill={palette[i % palette.length]}
              fillOpacity={0.15}
            />
          ))}
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      </div>
    );
  }

  const horizontalExplicit =
    type === "horizontalbar" || type === "horizontal_bar";
  const grouped = type === "groupedbar" || type === "grouped_bar";
  const hideBarLegend =
    (horizontalExplicit || grouped || compact) && series.length <= 1;
  const stacked = type === "stackedbar" || type === "stacked_bar";
  const barRows = rowsForBarChart(chart, rows);
  const seriesKeys = series.map((s) => s.key);
  const categoryCount = barRows.length;
  const longestCategory = barRows.reduce(
    (m, r) => Math.max(m, String(r.x).length),
    0,
  );
  const verticalLayout =
    horizontalExplicit ||
    grouped ||
    (compact && categoryCount >= 2 && !stacked) ||
    (stacked && categoryCount >= 4) ||
    (stacked && longestCategory > 18);
  const barCategoryLabels = barRows.map((r) => compactCategoryLabel(String(r.x)));
  const barLongestCompact = barCategoryLabels.reduce(
    (m, label) => Math.max(m, label.length),
    0,
  );
  const barXAxis = categoryXAxisSettings(categoryCount, barLongestCompact);
  const tiltXLabels = !verticalLayout && (categoryCount >= 3 || barLongestCompact > 8);
  const scrollable = !verticalLayout && categoryCount > 3;
  const valueMax = barValueMax(barRows, seriesKeys, stacked);
  const valueTop = niceAxisTop(valueMax);
  const valueTicks = linearValueTicks(valueMax);
  const categoryAxisWidth = Math.min(
    168,
    Math.max(96, Math.ceil(longestCategory * 6.2)),
  );
  const autoVerticalHeight =
    verticalLayout && (!horizontalExplicit || grouped)
      ? Math.min(520, Math.max(grouped ? 280 : 300, categoryCount * 52 + 120))
      : null;
  const scrollMinWidth = scrollable ? categoryCount * 88 : undefined;
  const percentStacked = shouldPercentStackGroupedCurrency(
    grouped,
    yAxis,
    barRows,
  );

  if (percentStacked) {
    const activeSeries = series.filter((s) =>
      barRows.some((row) => Number(row[s.key] ?? 0) > 0),
    );
    const percentRows = buildPercentStackRows(barRows, seriesKeys);
    const stackHeight = Math.max(280, categoryCount * 48 + 88);
    const scrollableStack = categoryCount > 6;
    const legendItems: ChartLegendItem[] = activeSeries
      .map((s, i) => {
        const total = barRows.reduce(
          (sum, row) => sum + Number(row[s.key] ?? 0),
          0,
        );
        return {
          name: s.name,
          value: total,
          display: total > 0 ? money(total) : undefined,
          color: palette[i % palette.length],
        };
      })
      .filter((item) => item.value > 0);
    const percentChart = (
      <div className="w-full" style={{ height: stackHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={percentRows}
            layout="vertical"
            margin={{ left: 4, right: 12, top: 8, bottom: hideBarLegend ? 12 : 8 }}
          >
            <CartesianGrid horizontal={false} stroke="#eee3df" />
            <XAxis
              type="number"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11, fill: "#7c7072" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="x"
              type="category"
              width={categoryAxisWidth}
              tick={{ fontSize: 11, fill: "#7c7072" }}
              tickFormatter={(v) => truncateCategoryLabel(v)}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(v, name, item) => {
                const key = String(item?.dataKey ?? "");
                const payload = item?.payload as Record<string, unknown> | undefined;
                const display = payload?.[`${key}Display`];
                const pct = Number(v);
                if (typeof display === "string" && display.trim()) {
                  return [`${display} (${pct.toFixed(1)}%)`, String(name ?? "")];
                }
                return [`${pct.toFixed(1)}%`, String(name ?? "")];
              }}
              labelFormatter={(label) => String(label)}
            />
            {activeSeries.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                stackId="modeMix"
                fill={palette[i % palette.length]}
                barSize={28}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
    return (
      <div className="py-1">
        {scrollableStack ? (
          <div className="max-h-[480px] overflow-y-auto">{percentChart}</div>
        ) : (
          percentChart
        )}
        <ChartSliceLegend items={legendItems} />
      </div>
    );
  }

  const barChart = (
    <ResponsiveContainer width="100%" height={autoVerticalHeight ?? "100%"}>
      <BarChart
        data={barRows}
        layout={verticalLayout ? "vertical" : "horizontal"}
        margin={{
          left: verticalLayout ? 4 : 4,
          right: 12,
          top: 8,
          bottom: hideBarLegend ? 12 : tiltXLabels ? 4 : 28,
        }}
      >
        <CartesianGrid
          horizontal={!verticalLayout}
          vertical={verticalLayout}
          stroke="#eee3df"
        />
        {verticalLayout ? (
          <>
            <XAxis
              type="number"
              domain={[0, valueTop]}
              ticks={valueTicks}
              allowDecimals={false}
              tickFormatter={(v) => axisTickFormat(yAxis, Number(v))}
              tick={{ fontSize: 11, fill: "#7c7072" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              dataKey="x"
              type="category"
              width={categoryAxisWidth}
              tick={{ fontSize: 11, fill: "#7c7072" }}
              tickFormatter={(v) => truncateCategoryLabel(v)}
              axisLine={false}
              tickLine={false}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey="x"
              interval={barXAxis.interval}
              minTickGap={barXAxis.minTickGap}
              angle={barXAxis.angle}
              textAnchor={barXAxis.textAnchor}
              height={barXAxis.height}
              tick={{ fontSize: 11, fill: "#7c7072" }}
              tickFormatter={(v) => compactCategoryLabel(String(v))}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, valueTop]}
              ticks={valueTicks}
              allowDecimals={false}
              tickFormatter={(v) => axisTickFormat(yAxis, Number(v))}
              tick={{ fontSize: 11, fill: "#7c7072" }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
          </>
        )}
        <Tooltip
          formatter={(v, _name, item) => {
            const payload = item?.payload as Record<string, unknown> | undefined;
            const displayKey = series.find((s) => s.key === item?.dataKey)
              ? `${String(item?.dataKey)}Display`
              : null;
            const fromRow =
              displayKey && payload?.[displayKey]
                ? String(payload[displayKey])
                : null;
            return fromRow ?? axisTickFormat(yAxis, Number(v));
          }}
          labelFormatter={(label) => String(label)}
        />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            stackId={stacked ? "stack" : undefined}
            fill={palette[i % palette.length]}
            radius={
              stacked ? 0 : grouped ? [0, 4, 4, 0] : [6, 6, 0, 0]
            }
            barSize={
              verticalLayout ? (grouped ? 10 : 28) : undefined
            }
          />
        ))}
        {!hideBarLegend ? (
          <Legend
            verticalAlign="bottom"
            iconType="square"
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />
        ) : null}
      </BarChart>
    </ResponsiveContainer>
  );

  if (scrollable && scrollMinWidth) {
    return (
      <div className="h-[280px] w-full overflow-x-auto overflow-y-hidden">
        <div className="h-full" style={{ minWidth: scrollMinWidth }}>
          {barChart}
        </div>
      </div>
    );
  }

  if (horizontalExplicit) {
    const barHeight = Math.min(480, Math.max(200, categoryCount * 52 + 48));
    return <div className="w-full" style={{ height: barHeight }}>{barChart}</div>;
  }

  const compactLegendItems: ChartLegendItem[] | null =
    compact && hideBarLegend && series.length === 1
      ? rows.map((row, i) => {
          const key = seriesKeys[0];
          const raw = Number(row[key] ?? 0);
          const display = row[`${key}Display`];
          return {
            name: String(row.x),
            value: yToPlotValue(yAxis, raw),
            display:
              typeof display === "string" && display.trim()
                ? display
                : yFormat(yAxis, raw),
            color: palette[i % palette.length],
          };
        })
      : null;

  if (autoVerticalHeight) {
    const body = (
      <div style={{ height: autoVerticalHeight }}>{barChart}</div>
    );
    return (
      <div className="w-full">
        <div className={compact ? "max-h-[320px] overflow-y-auto" : "max-h-[480px] overflow-y-auto"}>
          {body}
        </div>
        {compactLegendItems?.length ? (
          <ChartSliceLegend items={compactLegendItems} className="mt-2" />
        ) : null}
      </div>
    );
  }

  const defaultHeight = compact ? Math.min(320, Math.max(200, categoryCount * 44 + 72)) : 280;

  return (
    <div className="w-full">
      <div className="w-full" style={{ height: defaultHeight }}>
        {barChart}
      </div>
      {compactLegendItems?.length ? (
        <ChartSliceLegend items={compactLegendItems} className="mt-2" />
      ) : null}
    </div>
  );
}
