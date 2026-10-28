"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { formatCompact, formatStatValue } from "@/src/components/assistant/sidekick-primitives";
import type { AssistantChart } from "@/src/types/assistant";

const SERIES_COLORS = ["#730321", "#c3a264", "#a44a61", "#27845a", "#d59a16", "#5b6b8c"];

function prettyX(x: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(x)) {
    const d = new Date(`${x}T12:00:00+05:30`);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }
  return x;
}

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * p;
}

function Legend({ names }: { names: string[] }) {
  if (names.length < 2) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--sk-muted)]">
      {names.map((n, i) => (
        <span key={n} className="inline-flex items-center gap-1.5">
          <i className="block size-2.5 rounded-[3px]" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
          {n}
        </span>
      ))}
    </div>
  );
}

/** Vertical columns like the landing page: grow-in animation, the peak bar in gold. */
function BarChart({ chart }: { chart: AssistantChart }) {
  const [hover, setHover] = useState<number | null>(null);
  const multi = chart.series.length > 1;
  const xs = chart.series[0]?.data.map((d) => d.x) ?? [];
  const max = niceMax(Math.max(0, ...chart.series.flatMap((s) => s.data.map((d) => d.y))));
  const peak = useMemo(() => {
    if (multi) return -1;
    const data = chart.series[0]?.data ?? [];
    let best = -1;
    let bestY = -Infinity;
    data.forEach((d, i) => {
      if (d.y > bestY) {
        bestY = d.y;
        best = i;
      }
    });
    return best;
  }, [chart, multi]);
  const dense = xs.length > 14;
  const labelEvery = xs.length > 20 ? Math.ceil(xs.length / 8) : xs.length > 10 ? 2 : 1;

  return (
    <div>
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
          {[1, 0.5, 0].map((f) => (
            <div key={f} className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-right text-[10px] tabular-nums text-[var(--sk-muted)]">
                {formatCompact(max * f, chart.yAxisType)}
              </span>
              <span className="h-px flex-1 border-t border-dashed border-[var(--sk-line)]" />
            </div>
          ))}
        </div>
        <div className={cn("relative ml-12 flex h-36 items-end", dense ? "gap-[3px]" : "gap-2")}>
          {xs.map((x, i) => (
            <div
              key={`${x}-${i}`}
              className="relative flex h-full min-w-0 flex-1 items-end justify-center gap-[2px]"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              {chart.series.map((s, si) => {
                const y = s.data[i]?.y ?? 0;
                const h = Math.max(y > 0 ? 3 : 0, (y / max) * 100);
                const isPeak = i === peak;
                return (
                  <span
                    key={s.name}
                    className="sk-bar block w-full rounded-t-[6px] rounded-b-[2px]"
                    style={{
                      height: `${h}%`,
                      maxWidth: multi ? 18 : 40,
                      animationDelay: `${Math.min(i, 24) * 22}ms`,
                      background: multi
                        ? SERIES_COLORS[si % SERIES_COLORS.length]
                        : isPeak
                          ? "linear-gradient(180deg,#e2c88f,#c3a264)"
                          : hover === i
                            ? "#a44a61"
                            : "#e7d1d6",
                      boxShadow: isPeak && !multi ? "0 6px 14px -8px rgba(154,119,54,0.8)" : undefined,
                    }}
                  />
                );
              })}
              {hover === i ? (
                <div className="sk-pop pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-lg bg-[var(--sk-maroon-deep)] px-2.5 py-1.5 text-[11px] text-white shadow-lg">
                  <div className="font-semibold">{prettyX(x)}</div>
                  {chart.series.map((s) => (
                    <div key={s.name} className="tabular-nums text-white/85">
                      {multi ? `${s.name}: ` : ""}
                      {formatStatValue(s.data[i]?.y ?? 0, chart.yAxisType ?? "count")}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <div className={cn("ml-12 mt-1.5 flex", dense ? "gap-[3px]" : "gap-2")}>
        {xs.map((x, i) => (
          <span
            key={`${x}-l-${i}`}
            className={cn(
              "min-w-0 flex-1 truncate text-center text-[10px] text-[var(--sk-muted)]",
              i === peak && "font-semibold text-[var(--sk-maroon)]",
            )}
          >
            {i % labelEvery === 0 ? prettyX(x) : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Width of an element in CSS px (so SVG text stays 1:1 at any panel size). */
function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0]?.contentRect.width ?? fallback);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallback]);
  return { ref, width };
}

/** Line chart with a draw-in stroke and soft area fill. */
function LineChart({ chart }: { chart: AssistantChart }) {
  const [hover, setHover] = useState<number | null>(null);
  const { ref, width } = useWidth<HTMLDivElement>(560);
  const W = Math.max(280, width);
  const H = W > 900 ? 220 : 160;
  const PAD_L = 44;
  const PAD_B = 4;
  const xs = chart.series[0]?.data.map((d) => d.x) ?? [];
  const max = niceMax(Math.max(0, ...chart.series.flatMap((s) => s.data.map((d) => d.y))));
  const n = Math.max(1, xs.length - 1);
  const px = (i: number) => PAD_L + (i / n) * (W - PAD_L - 6);
  const py = (y: number) => 8 + (1 - y / max) * (H - 8 - PAD_B);
  const labelEvery = xs.length > 16 ? Math.ceil(xs.length / 7) : xs.length > 8 ? 2 : 1;

  return (
    <div ref={ref}>
      <svg width={W} height={H + 18} viewBox={`0 0 ${W} ${H + 18}`} className="block max-w-full overflow-visible" onMouseLeave={() => setHover(null)}>
        {[1, 0.5, 0].map((f) => (
          <g key={f}>
            <line x1={PAD_L} x2={W - 4} y1={py(max * f)} y2={py(max * f)} stroke="#ede0d4" strokeDasharray="3 4" />
            <text x={PAD_L - 6} y={py(max * f) + 3} textAnchor="end" className="fill-[#8a757e] text-[10px]">
              {formatCompact(max * f, chart.yAxisType)}
            </text>
          </g>
        ))}
        {chart.series.map((s, si) => {
          const color = SERIES_COLORS[si % SERIES_COLORS.length];
          const pts = s.data.map((d, i) => `${px(i)},${py(d.y)}`).join(" ");
          const area = `M${px(0)},${py(0)} L${s.data.map((d, i) => `${px(i)},${py(d.y)}`).join(" L")} L${px(s.data.length - 1)},${py(0)} Z`;
          return (
            <g key={s.name}>
              {si === 0 && chart.series.length === 1 ? (
                <path d={area} fill="url(#skArea)" className="sk-fade" style={{ animationDelay: "0.4s" }} />
              ) : null}
              <polyline
                points={pts}
                fill="none"
                stroke={color}
                strokeWidth={2.2}
                strokeLinejoin="round"
                strokeLinecap="round"
                pathLength={1}
                className="sk-draw"
                style={{ animationDelay: `${si * 0.15}s` }}
              />
            </g>
          );
        })}
        <defs>
          <linearGradient id="skArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#730321" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#730321" stopOpacity="0" />
          </linearGradient>
        </defs>
        {xs.map((x, i) => (
          <g key={`${x}-${i}`}>
            <rect
              x={px(i) - (W - PAD_L) / n / 2}
              y={0}
              width={(W - PAD_L) / n}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
            {i % labelEvery === 0 ? (
              <text x={px(i)} y={H + 14} textAnchor="middle" className="fill-[#8a757e] text-[10px]">
                {prettyX(x)}
              </text>
            ) : null}
          </g>
        ))}
        {hover != null ? (
          <g pointerEvents="none">
            <line x1={px(hover)} x2={px(hover)} y1={8} y2={H} stroke="#dfccbd" />
            {chart.series.map((s, si) => (
              <circle key={s.name} cx={px(hover)} cy={py(s.data[hover]?.y ?? 0)} r={4} fill="#fff" stroke={SERIES_COLORS[si % SERIES_COLORS.length]} strokeWidth={2} />
            ))}
          </g>
        ) : null}
      </svg>
      {hover != null ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[var(--sk-ink-2)]">
          <span className="font-semibold text-[var(--sk-ink)]">{prettyX(xs[hover])}</span>
          {chart.series.map((s) => (
            <span key={s.name} className="tabular-nums">
              {chart.series.length > 1 ? `${s.name}: ` : ""}
              {formatStatValue(s.data[hover]?.y ?? 0, chart.yAxisType ?? "count")}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Donut for share-of-total (≤ 6 parts). */
function DonutChart({ chart }: { chart: AssistantChart }) {
  const data = chart.series[0]?.data ?? [];
  const total = data.reduce((a, d) => a + Math.max(0, d.y), 0) || 1;
  const R = 42;
  const C = 2 * Math.PI * R;
  const lens = data.map((d) => (Math.max(0, d.y) / total) * C);
  const offsets = lens.map((_, i) => lens.slice(0, i).reduce((a, b) => a + b, 0));
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg viewBox="0 0 120 120" className="size-32 shrink-0 -rotate-90">
        <circle cx="60" cy="60" r={R} fill="none" stroke="#f6ede3" strokeWidth="16" />
        {data.map((d, i) => (
          <circle
            key={d.x}
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
            strokeWidth="16"
            strokeDasharray={`${lens[i]} ${C - lens[i]}`}
            strokeDashoffset={-offsets[i]}
            className="sk-fade"
            style={{ animationDelay: `${i * 90}ms` }}
          />
        ))}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
        {data.map((d, i) => (
          <li key={d.x} className="flex items-center gap-2">
            <i className="block size-2.5 shrink-0 rounded-[3px]" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
            <span className="min-w-0 flex-1 truncate text-[var(--sk-ink-2)]">{d.x}</span>
            <span className="tabular-nums font-semibold text-[var(--sk-ink)]">{formatStatValue(d.y, chart.yAxisType ?? "count")}</span>
            <span className="w-10 text-right tabular-nums text-[var(--sk-muted)]">{Math.round((Math.max(0, d.y) / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Ranked horizontal bars for categories with long names (customers, products). */
function RankChart({ chart }: { chart: AssistantChart }) {
  const data = chart.series[0]?.data ?? [];
  const max = Math.max(1, ...data.map((d) => d.y));
  return (
    <div className="space-y-2.5">
      {data.slice(0, 10).map((d, i) => (
        <div key={`${d.x}-${i}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="min-w-0 truncate font-medium text-[var(--sk-ink)]">
              {d.x}
              {i === 0 ? (
                <em className="ml-1.5 rounded-full bg-[var(--sk-ok-soft)] px-1.5 py-px text-[10px] font-bold not-italic text-[var(--sk-ok)]">Top</em>
              ) : null}
            </span>
            <span className="shrink-0 tabular-nums font-semibold text-[var(--sk-ink)]">{formatStatValue(d.y, chart.yAxisType ?? "count")}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--sk-cream-2)]">
            <i
              className="sk-hbar block h-full rounded-full"
              style={{
                width: `${(d.y / max) * 100}%`,
                animationDelay: `${i * 60}ms`,
                background: i === 0 ? "linear-gradient(90deg,#c3a264,#e2c88f)" : "linear-gradient(90deg,#730321,#a3485a)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SidekickChart({ chart }: { chart: AssistantChart }) {
  const names = chart.series.map((s) => s.name);
  const points = chart.series[0]?.data ?? [];
  if (!points.length) return null;
  const isTime = points.every((p) => /^\d{4}-\d{2}(-\d{2})?$|^[A-Z][a-z]{2} \d{4}$|^\d{1,2} [A-Z][a-z]{2}/.test(String(p.x)));
  const longLabels = points.some((p) => String(p.x).length > 10);
  let body;
  if (chart.type === "donut") body = <DonutChart chart={chart} />;
  else if (chart.type === "bar" && chart.series.length === 1 && !isTime && (longLabels || points.length <= 8)) body = <RankChart chart={chart} />;
  else if (chart.type === "line" && points.length > 1) body = <LineChart chart={chart} />;
  else body = <BarChart chart={chart} />;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[var(--sk-ink-2)]">{chart.title ?? "Chart"}</p>
        {chart.type !== "donut" ? <Legend names={names} /> : null}
      </div>
      {body}
    </div>
  );
}
