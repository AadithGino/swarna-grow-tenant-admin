"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  categoryXAxisSettings,
  compactCategoryLabel,
  longestCompactLabel,
} from "@/src/lib/chart-axis";
import { compactMoney, money } from "@/src/lib/format";

export const CHART_PALETTE = [
  "#730321",
  "#a44a61",
  "#d59a16",
  "#27845a",
  "#8a787c",
  "#e4c277",
];

const wine = CHART_PALETTE[0];
const rose = CHART_PALETTE[1];
const gold = CHART_PALETTE[2];
const green = CHART_PALETTE[3];

export type ChartLegendItem = {
  name: string;
  value: number;
  display?: string;
  color?: string;
};

export function ChartSliceLegend({
  items,
  className,
}: {
  items: ChartLegendItem[];
  className?: string;
}) {
  if (!items.length) return null;
  return (
    <ul
      className={cn(
        "mt-4 flex shrink-0 flex-wrap gap-x-5 gap-y-3 border-t border-[#eaded9] px-1 pb-1 pt-4",
        className,
      )}
      aria-label="Chart legend"
    >
      {items.map((item, i) => (
        <li
          key={`${item.name}-${i}`}
          className="flex max-w-full items-center gap-2.5 text-sm text-[#5c4a4e]"
        >
          <span
            className="size-3 shrink-0 rounded-full"
            style={{
              backgroundColor:
                item.color ?? CHART_PALETTE[i % CHART_PALETTE.length],
            }}
            aria-hidden
          />
          <span className="truncate font-medium">{item.name}</span>
          {(item.display ??
            (Number.isFinite(item.value) ? money(item.value) : null)) && (
            <span className="shrink-0 text-[#8a787c]">
              {item.display ??
                (Number.isFinite(item.value) ? money(item.value) : "")}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Rupee amount on a pie slice when the segment is large enough to read. */
export function pieSliceLabel(props: {
  value?: number;
  percent?: number;
}) {
  const pct = (props.percent ?? 0) * 100;
  const value = Number(props.value ?? 0);
  if (pct < 7 || !value) return null;
  return compactMoney(value);
}

function rupeePointLabel(value: unknown) {
  const amount = Number(value ?? 0);
  return amount ? compactMoney(amount) : "";
}

export function CollectionTrendChart({ data }: { data: any[] }) {
  const dayLabels = data.map((row) => compactCategoryLabel(String(row.day ?? "")));
  const xAxis = categoryXAxisSettings(data.length, longestCompactLabel(dayLabels, (v) => String(v)));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ left: 4, right: 12, top: 28, bottom: 4 }}
      >
        <defs>
          <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={wine} stopOpacity={0.18} />
            <stop offset="100%" stopColor={wine} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          stroke="#eadfda"
          strokeDasharray="4 4"
        />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: "#7c7072" }}
          axisLine={false}
          tickLine={false}
          interval={xAxis.interval}
          minTickGap={xAxis.minTickGap}
          angle={xAxis.angle}
          textAnchor={xAxis.textAnchor}
          height={xAxis.height}
          tickFormatter={(value) => compactCategoryLabel(String(value))}
        />
        <YAxis
          tickFormatter={(v) => compactMoney(Number(v))}
          tick={{ fontSize: 11, fill: "#7c7072" }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip
          formatter={(v) => money(Number(v))}
          contentStyle={{
            borderRadius: 12,
            borderColor: "#e4d7d2",
            boxShadow: "0 8px 24px rgba(65,14,26,.12)",
          }}
        />
        <Area
          type="monotone"
          dataKey="cash"
          name="Cash"
          stroke={wine}
          strokeWidth={3}
          fill="url(#cashFill)"
        >
          <LabelList
            dataKey="cash"
            position="top"
            formatter={rupeePointLabel}
            style={{ fontSize: 10, fontWeight: 600, fill: "#5c4a4e" }}
          />
        </Area>
        <Area
          type="monotone"
          dataKey="digital"
          name="Digital"
          stroke={rose}
          strokeWidth={3}
          fill="transparent"
        >
          <LabelList
            dataKey="digital"
            position="top"
            formatter={rupeePointLabel}
            style={{ fontSize: 10, fontWeight: 600, fill: "#5c4a4e" }}
          />
        </Area>
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data,
  centre,
  showLegend = true,
  showSliceLabels = false,
}: {
  data: { name: string; value: number }[];
  centre?: string;
  showLegend?: boolean;
  /** Slice labels overlap the hole when a legend is shown — off by default. */
  showSliceLabels?: boolean;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const minPieValue = total > 0 ? total * 0.005 : 0;
  const pieData = data.filter((item) => item.value >= minPieValue);
  const chartData = pieData.length ? pieData : data;
  const maxShare =
    total > 0 ? Math.max(...chartData.map((item) => item.value)) / total : 1;
  const usePadding =
    chartData.length > 1 && maxShare < 0.92 && minPieValue > 0;

  const legendItems: ChartLegendItem[] = data.map((item, i) => ({
    name: item.name,
    value: item.value,
    display: money(item.value),
    color: CHART_PALETTE[i % CHART_PALETTE.length],
  }));
  const colourFor = (name: string) => {
    const index = data.findIndex((item) => item.name === name);
    return CHART_PALETTE[(index >= 0 ? index : 0) % CHART_PALETTE.length];
  };

  return (
    <div className="flex w-full flex-col">
      <div className="relative mx-auto h-[220px] w-full max-w-[280px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="80%"
              paddingAngle={usePadding ? 2 : 0}
              label={showSliceLabels ? pieSliceLabel : false}
              labelLine={showSliceLabels}
              stroke="#fff"
              strokeWidth={1}
            >
              {chartData.map((item) => (
                <Cell key={item.name} fill={colourFor(item.name)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v, _n, props) => [
                money(Number(v)),
                props.payload?.name ?? "",
              ]}
              contentStyle={{ borderRadius: 12, borderColor: "#e4d7d2" }}
            />
          </PieChart>
        </ResponsiveContainer>
        {centre && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center">
            <p className="max-w-[9.5rem] text-sm font-bold leading-snug text-[#2e181d] sm:text-base">
              {centre}
            </p>
          </div>
        )}
      </div>
      {showLegend && <ChartSliceLegend items={legendItems} />}
    </div>
  );
}

export function BranchBarChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 14, right: 24 }}>
        <CartesianGrid horizontal={false} stroke="#eee3df" />
        <XAxis
          type="number"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          dataKey="name"
          type="category"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          formatter={(v) => money(Number(v))}
          contentStyle={{ borderRadius: 12, borderColor: "#e4d7d2" }}
        />
        <Bar dataKey="value" fill={wine} radius={[0, 8, 8, 0]} barSize={32}>
          <LabelList
            dataKey="value"
            position="right"
            formatter={rupeePointLabel}
            style={{ fontSize: 11, fontWeight: 600, fill: "#5c4a4e" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AgingChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: -10, right: 12 }}>
        <CartesianGrid vertical={false} stroke="#eee3df" />
        <XAxis
          dataKey="bucket"
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `${Math.round(v / 1000)}k`}
          tick={{ fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(v) => money(Number(v))}
          contentStyle={{ borderRadius: 12, borderColor: "#e4d7d2" }}
        />
        <Bar stackId="a" dataKey="due" name="Due" fill={green}>
          <LabelList dataKey="due" position="center" formatter={rupeePointLabel} style={{ fontSize: 10, fontWeight: 600, fill: "#fff" }} />
        </Bar>
        <Bar stackId="a" dataKey="grace" name="Grace" fill={gold}>
          <LabelList dataKey="grace" position="center" formatter={rupeePointLabel} style={{ fontSize: 10, fontWeight: 600, fill: "#2e181d" }} />
        </Bar>
        <Bar
          stackId="a"
          dataKey="overdue"
          name="Overdue"
          fill="#c2281c"
          radius={[6, 6, 0, 0]}
        >
          <LabelList dataKey="overdue" position="center" formatter={rupeePointLabel} style={{ fontSize: 10, fontWeight: 600, fill: "#fff" }} />
        </Bar>
        <Legend
          verticalAlign="bottom"
          iconType="square"
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
