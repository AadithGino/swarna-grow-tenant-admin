"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type TrendPoint = { label: string; value: number };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

/**
 * Area/line trend with hover read-out. Values are plain numbers; `format` turns them into labels.
 * Used for gold-rate history and daily store sales.
 */
export function TrendChart({
  points,
  format = (v) => String(v),
  height = 180,
  tone = "gold",
  showAxis = true,
  className,
  ariaLabel,
  bars = false,
}: {
  points: TrendPoint[];
  format?: (v: number) => string;
  height?: number;
  tone?: "gold" | "wine";
  showAxis?: boolean;
  className?: string;
  ariaLabel: string;
  /** Render columns instead of an area. */
  bars?: boolean;
}) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const gid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const padL = showAxis ? 4 : 0;
  const padR = 4;
  const padT = 12;
  const padB = showAxis ? 24 : 4;
  const w = Math.max(width, 120);
  const h = height;

  const { min, max } = useMemo(() => {
    if (!points.length) return { min: 0, max: 1 };
    let lo = Math.min(...points.map((p) => p.value));
    let hi = Math.max(...points.map((p) => p.value));
    if (bars) lo = Math.min(0, lo);
    if (lo === hi) {
      lo -= 1;
      hi += 1;
    }
    const pad = (hi - lo) * 0.12;
    return { min: bars ? lo : lo - pad, max: hi + pad };
  }, [points, bars]);

  const colors =
    tone === "gold"
      ? { line: "#b8862f", fillTop: "rgba(214,180,110,0.45)", fillBottom: "rgba(214,180,110,0)", dot: "#8a5c12", bar: "#d7b46e" }
      : { line: "#7b0a2b", fillTop: "rgba(123,10,43,0.22)", fillBottom: "rgba(123,10,43,0)", dot: "#5e0a20", bar: "#a33a56" };

  const n = points.length;
  const xAt = (i: number) => (n <= 1 ? padL + (w - padL - padR) / 2 : padL + (i * (w - padL - padR)) / (n - 1));
  const yAt = (v: number) => padT + (1 - (v - min) / (max - min)) * (h - padT - padB);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(p.value).toFixed(1)}`).join(" ");
  const area = n ? `${line} L${xAt(n - 1).toFixed(1)},${h - padB} L${xAt(0).toFixed(1)},${h - padB} Z` : "";
  const slot = n ? (w - padL - padR) / n : 0;

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!n) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * w;
    let best = 0;
    let dist = Infinity;
    for (let i = 0; i < n; i++) {
      const cx = bars ? padL + slot * (i + 0.5) : xAt(i);
      const d = Math.abs(cx - x);
      if (d < dist) {
        dist = d;
        best = i;
      }
    }
    setHover(best);
  }

  const active = hover != null ? points[hover] : points[n - 1];
  const activeX = hover != null ? (bars ? padL + slot * (hover + 0.5) : xAt(hover)) : null;
  const labelEvery = Math.max(1, Math.ceil(n / 6));

  return (
    <div ref={ref} className={cn("relative w-full select-none", className)}>
      {active ? (
        <div className="pointer-events-none mb-1 flex items-baseline gap-2 text-sm">
          <span className="font-bold tabular-nums text-[#28161a]">{format(active.value)}</span>
          <span className="text-xs text-[#9a8d90]">{active.label}</span>
        </div>
      ) : null}
      {width > 0 ? (
        <svg
          role="img"
          aria-label={ariaLabel}
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          className="block touch-none"
        >
          <defs>
            <linearGradient id={`f${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={colors.fillTop} />
              <stop offset="1" stopColor={colors.fillBottom} />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((t) => (
            <line
              key={t}
              x1={padL}
              x2={w - padR}
              y1={padT + t * (h - padT - padB)}
              y2={padT + t * (h - padT - padB)}
              stroke="#f1e8e5"
              strokeDasharray="3 4"
            />
          ))}
          {bars ? (
            points.map((p, i) => {
              const bw = Math.max(3, slot * 0.58);
              const x = padL + slot * (i + 0.5) - bw / 2;
              const y = yAt(Math.max(0, p.value));
              const y0 = yAt(0);
              return (
                <rect
                  key={i}
                  x={x}
                  y={Math.min(y, y0)}
                  width={bw}
                  height={Math.max(1.5, Math.abs(y0 - y))}
                  rx={Math.min(5, bw / 2)}
                  fill={hover === i ? colors.line : colors.bar}
                />
              );
            })
          ) : (
            <>
              <path d={area} fill={`url(#f${gid})`} />
              <path d={line} fill="none" stroke={colors.line} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
            </>
          )}
          {activeX != null && !bars ? (
            <>
              <line x1={activeX} x2={activeX} y1={padT} y2={h - padB} stroke="#d9c9c4" strokeDasharray="3 3" />
              <circle cx={activeX} cy={yAt(points[hover!].value)} r={4.5} fill="#fff" stroke={colors.dot} strokeWidth={2} />
            </>
          ) : null}
          {showAxis
            ? points.map((p, i) =>
                (i % labelEvery === 0 && n - 1 - i >= Math.max(1, labelEvery / 2)) || i === n - 1 ? (
                  <text
                    key={i}
                    x={bars ? (i === 0 ? padL : i === n - 1 ? w - padR : padL + slot * (i + 0.5)) : xAt(i)}
                    y={h - 6}
                    textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
                    fontSize={11}
                    fill="#9a8d90"
                  >
                    {p.label}
                  </text>
                ) : null,
              )
            : null}
        </svg>
      ) : (
        <div style={{ height: h }} />
      )}
    </div>
  );
}
