"use client";

import { Sparkles } from "lucide-react";
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { money } from "@/src/lib/format";

export const ASSISTANT_NAME = "Sidekick";

/** Spinning maroon→gold orb used for the assistant's identity and busy state. */
export function SidekickOrb({
  size = 40,
  busy = false,
  className,
}: {
  size?: number;
  busy?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("sk-orb sk-orb-live inline-grid shrink-0 place-items-center", busy && "sk-orb-busy", className)}
      style={{ width: size, height: size }}
    >
      <span className="grid place-items-center text-[var(--sk-maroon)]">
        <Sparkles style={{ width: size * 0.36, height: size * 0.36 }} strokeWidth={2.2} />
      </span>
    </span>
  );
}

/** Small square avatar used on answer cards. */
export function SidekickBadge({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-[7px] bg-gradient-to-br from-[var(--sk-maroon-2)] to-[var(--sk-maroon)] text-[var(--sk-gold-2)]",
        className,
      )}
    >
      <Sparkles className="size-3.5" strokeWidth={2.4} />
    </span>
  );
}

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Animated number (count-up) for stat tiles. */
export function useCountUp(target: number, { enabled = true, duration = 900 } = {}) {
  const animate = enabled && !prefersReducedMotion();
  const [value, setValue] = useState(animate ? 0 : target);
  useEffect(() => {
    if (!animate) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, animate, duration]);
  return animate ? value : target;
}

export function formatStatValue(value: number, valueType?: string) {
  if (valueType === "currency") return money(value / 100);
  if (valueType === "percent") return `${Math.round(value * 10) / 10}%`;
  if (valueType === "weight") return `${(value / 1000).toFixed(3)} g`;
  return Math.round(value).toLocaleString("en-IN");
}

/** Compact axis/label formatting: ₹1.2L, ₹45K, 1.2 kg … */
export function formatCompact(value: number, valueType?: string) {
  if (valueType === "currency") {
    const r = value / 100;
    const abs = Math.abs(r);
    if (abs >= 1e7) return `₹${(r / 1e7).toFixed(abs >= 1e8 ? 0 : 1)}Cr`;
    if (abs >= 1e5) return `₹${(r / 1e5).toFixed(abs >= 1e6 ? 0 : 1)}L`;
    if (abs >= 1e3) return `₹${(r / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}K`;
    return `₹${Math.round(r)}`;
  }
  if (valueType === "weight") {
    const g = value / 1000;
    return g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${g >= 100 ? Math.round(g) : g.toFixed(1)} g`;
  }
  const abs = Math.abs(value);
  if (abs >= 1e5) return `${(value / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return String(Math.round(value));
}

/** **bold** and line breaks only — never HTML. */
function inline(text: string, keyBase: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={`${keyBase}-${i}`} className="font-semibold text-[var(--sk-maroon)]">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={`${keyBase}-${i}`}>{part}</Fragment>
    ),
  );
}

/** Renders the assistant's short text: paragraphs, "- " bullets and **bold**. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const lines = text.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = (key: string) => {
    if (!bullets.length) return;
    blocks.push(
      <ul key={key} className="my-1.5 space-y-1 pl-1">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-[var(--sk-gold)]" />
            <span>{inline(b, `${key}-${i}`)}</span>
          </li>
        ))}
      </ul>,
    );
    bullets = [];
  };
  lines.forEach((line, i) => {
    const m = line.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)$/);
    if (m) {
      bullets.push(m[1]);
      return;
    }
    flush(`ul-${i}`);
    if (line.trim()) blocks.push(<p key={`p-${i}`}>{inline(line, `p-${i}`)}</p>);
  });
  flush("ul-end");
  return <div className={cn("space-y-1.5", className)}>{blocks}</div>;
}

/** Word-by-word reveal for a freshly arrived answer. */
export function useRevealText(text: string, enabled: boolean, wordsPerTick = 2, tickMs = 28) {
  const animate = enabled && !prefersReducedMotion();
  const words = useMemo(() => text.split(/(\s+)/), [text]);
  const [progress, setProgress] = useState({ text, count: 0 });
  useEffect(() => {
    if (!animate) return;
    let n = 0;
    const id = window.setInterval(() => {
      n += wordsPerTick * 2;
      setProgress({ text, count: n });
      if (n >= words.length) window.clearInterval(id);
    }, tickMs);
    return () => window.clearInterval(id);
  }, [text, animate, words.length, wordsPerTick, tickMs]);
  if (!animate) return { shown: text, done: true };
  const count = progress.text === text ? progress.count : 0;
  const done = count >= words.length;
  return { shown: done ? text : words.slice(0, count).join(""), done };
}
