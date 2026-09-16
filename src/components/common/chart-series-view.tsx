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
import { money } from "@/src/lib/format";
import type { ChartSeriesBlock } from "@/src/types/admin-report";
import {
  CHART_PALETTE,
  ChartSliceLegend,
  pieSliceLabel,
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

function seriesToRows(block: ChartSeriesBlock) {
  const series = block.series ?? [];
  if (!series.length) return [];
  const map = new Map<string, Record<string, string | number>>();
  for (const s of series) {
    for (const point of s.data ?? []) {
      const row = map.get(point.x) ?? { x: point.x };
      row[s.key] = point.y;
      row[`${s.key}Display`] = point.yDisplay ?? "";
      map.set(point.x, row);
    }
  }
  return [...map.values()];
}

export function ChartSeriesView({ chart }: { chart: ChartSeriesBlock }) {
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
    const pieData = slices.length ? slices : data;
    return (
      <div className="flex w-full flex-col">
        <div className="h-[248px] w-full shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={innerRadius}
                outerRadius="76%"
                paddingAngle={2}
                label={pieSliceLabel}
                labelLine={false}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={palette[i % palette.length]} />
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
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ left: -8, right: 12, top: 8 }}>
          <CartesianGrid vertical={false} stroke="#eadfda" strokeDasharray="4 4" />
          <XAxis dataKey="x" tick={{ fontSize: 11, fill: "#7c7072" }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(v) => yFormat(yAxis, Number(v))}
            tick={{ fontSize: 11, fill: "#7c7072" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(v) => yFormat(yAxis, Number(v))}
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
              dot={false}
            />
          ))}
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === "area") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ left: -8, right: 12, top: 8 }}>
          <CartesianGrid vertical={false} stroke="#eadfda" strokeDasharray="4 4" />
          <XAxis dataKey="x" tick={{ fontSize: 11, fill: "#7c7072" }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(v) => yFormat(yAxis, Number(v))}
            tick={{ fontSize: 11, fill: "#7c7072" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip formatter={(v) => yFormat(yAxis, Number(v))} />
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
    );
  }

  const horizontalExplicit =
    type === "horizontalbar" || type === "horizontal_bar";
  const hideBarLegend = horizontalExplicit && series.length <= 1;
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
    (stacked && categoryCount >= 4) ||
    (stacked && longestCategory > 18);
  const tiltXLabels = !verticalLayout && categoryCount >= 3;
  const scrollable = !verticalLayout && categoryCount > 3;
  const valueMax = barValueMax(barRows, seriesKeys, stacked);
  const valueTop = niceAxisTop(valueMax);
  const valueTicks = linearValueTicks(valueMax);
  const categoryAxisWidth = Math.min(
    168,
    Math.max(96, Math.ceil(longestCategory * 6.2)),
  );
  const autoVerticalHeight =
    verticalLayout && !horizontalExplicit
      ? Math.min(480, Math.max(300, categoryCount * 48 + 120))
      : null;
  const scrollMinWidth = scrollable ? categoryCount * 88 : undefined;

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
              interval={0}
              angle={tiltXLabels ? -32 : 0}
              textAnchor={tiltXLabels ? "end" : "middle"}
              height={tiltXLabels ? 56 : 30}
              tick={{ fontSize: 11, fill: "#7c7072" }}
              tickFormatter={(v) => truncateCategoryLabel(v, 18)}
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
            radius={stacked ? 0 : [6, 6, 0, 0]}
            barSize={verticalLayout ? 28 : undefined}
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

  if (autoVerticalHeight) {
    return (
      <div className="max-h-[480px] w-full overflow-y-auto">
        <div style={{ height: autoVerticalHeight }}>{barChart}</div>
      </div>
    );
  }

  return <div className="h-[280px] w-full">{barChart}</div>;
}
