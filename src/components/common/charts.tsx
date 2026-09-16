"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { money } from "@/src/lib/format";

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
          <span className="shrink-0 text-[#8a787c]">
            {item.display ?? money(item.value)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Short label on pie slices when the segment is large enough to read. */
export function pieSliceLabel(props: {
  name?: string;
  percent?: number;
}) {
  const name = props.name ?? "";
  const pct = (props.percent ?? 0) * 100;
  if (pct < 6 || !name) return null;
  return `${name} ${pct.toFixed(0)}%`;
}

export function CollectionTrendChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ left: -10, right: 12, top: 12, bottom: 0 }}
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
          tick={{ fontSize: 12, fill: "#7c7072" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `${Math.round(v / 1000)}k`}
          tick={{ fontSize: 12, fill: "#7c7072" }}
          axisLine={false}
          tickLine={false}
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
        />
        <Area
          type="monotone"
          dataKey="digital"
          name="Digital"
          stroke={rose}
          strokeWidth={3}
          fill="transparent"
        />
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
}: {
  data: { name: string; value: number }[];
  centre?: string;
  showLegend?: boolean;
}) {
  const legendItems: ChartLegendItem[] = data.map((item, i) => ({
    name: item.name,
    value: item.value,
    display: money(item.value),
    color: CHART_PALETTE[i % CHART_PALETTE.length],
  }));
  return (
    <div className="flex w-full flex-col">
      <div className="relative h-[240px] w-full shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={2}
              label={pieSliceLabel}
              labelLine={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
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
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <strong className="text-xl text-[#2e181d]">{centre}</strong>
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
        <Bar dataKey="value" fill={wine} radius={[0, 8, 8, 0]} barSize={32} />
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
        <Bar stackId="a" dataKey="due" name="Due" fill={green} />
        <Bar stackId="a" dataKey="grace" name="Grace" fill={gold} />
        <Bar
          stackId="a"
          dataKey="overdue"
          name="Overdue"
          fill="#c2281c"
          radius={[6, 6, 0, 0]}
        />
        <Legend
          verticalAlign="bottom"
          iconType="square"
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
