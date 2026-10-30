"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Banknote, Check, CreditCard, Smartphone, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { CounterPaymentMode } from "@/src/lib/counter-trade-types";

/** Maroon band at the top of every counter dialog: what is happening, and for whom. */
export function CounterDialogBand({
  icon: Icon,
  title,
  customerName,
  steps,
  current,
}: {
  icon: LucideIcon;
  title: string;
  customerName: string;
  steps: string[];
  current: number;
}) {
  return (
    <div className="relative isolate overflow-hidden bg-[#3d0c15] px-6 pb-4 pt-5 text-white">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(120%_160%_at_0%_0%,#8e1a36_0%,#5e0a20_50%,#3d0c15_100%)]"
      />
      <div className="flex items-center gap-3 pr-8">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#f3dca6] to-[#c3a264] text-[#4a0e1c]">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[0.8rem] font-medium text-[#e2c88f]">At the counter for {customerName}</p>
          <h2 className="truncate text-lg font-extrabold tracking-tight">{title}</h2>
        </div>
      </div>
      <ol className="mt-4 flex items-center gap-2 text-xs font-semibold" aria-label="Progress">
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
                  active && "bg-[#e2c88f] text-[#3d0c15]",
                  done && "bg-white/15 text-white",
                  !active && !done && "text-white/55",
                )}
              >
                {done ? <Check className="size-3" aria-hidden /> : <span className="tabular-nums">{i + 1}</span>}
                {label}
              </span>
              {i < steps.length - 1 ? <span aria-hidden className="h-px w-4 bg-white/25" /> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode; icon?: LucideIcon; hint?: ReactNode; disabled?: boolean }[];
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("grid gap-2", className)} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((opt) => {
        const selected = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex min-w-0 flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7b0a2b]/40 disabled:cursor-not-allowed disabled:opacity-50",
              selected
                ? "border-[#7b0a2b] bg-[#fbf3f5] text-[#4a0e1c] shadow-[inset_0_0_0_1px_#7b0a2b]"
                : "border-[#eadfe2] bg-white text-[#3a2a2f] hover:border-[#c9a3ad]",
            )}
          >
            <span className="flex items-center gap-1.5 font-semibold">
              {Icon ? <Icon className="size-4" aria-hidden /> : null}
              {opt.label}
            </span>
            {opt.hint ? <span className="truncate text-xs text-[#8a7c80]">{opt.hint}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export const PAYMENT_MODE_OPTIONS: { value: CounterPaymentMode; label: string; icon: LucideIcon; hint: string }[] = [
  { value: "CASH", label: "Cash", icon: Banknote, hint: "Goes to your cash in hand" },
  { value: "UPI", label: "UPI", icon: Smartphone, hint: "Enter the UTR" },
  { value: "CARD", label: "Card", icon: CreditCard, hint: "Enter the slip number" },
];

export function PaymentModeFields({
  mode,
  onModeChange,
  reference,
  onReferenceChange,
  amountLabel,
}: {
  mode: CounterPaymentMode;
  onModeChange: (mode: CounterPaymentMode) => void;
  reference: string;
  onReferenceChange: (value: string) => void;
  amountLabel: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-[#28161a]">How did the customer pay?</p>
        <p className="text-sm text-[#7a6d70]">Collect {amountLabel}</p>
      </div>
      <Segmented label="Payment method" value={mode} onChange={onModeChange} options={PAYMENT_MODE_OPTIONS} />
      {mode !== "CASH" ? (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-[#3a2a2f]">
            {mode === "UPI" ? "UPI reference (UTR)" : "Card slip or approval number"}
          </span>
          <Input
            value={reference}
            onChange={(e) => onReferenceChange(e.target.value.slice(0, 120))}
            placeholder={mode === "UPI" ? "e.g. 429815536671" : "e.g. 558214"}
            autoComplete="off"
          />
        </label>
      ) : null}
    </div>
  );
}

export function referenceMissing(mode: CounterPaymentMode, reference: string) {
  return mode !== "CASH" && reference.trim().length < 4;
}

export function ConsentCheck({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#eadfe2] bg-[#fdfafb] px-3.5 py-3 text-sm text-[#3a2a2f]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[#7b0a2b]"
      />
      <span className="leading-5">{children}</span>
    </label>
  );
}

/** Seconds left on a quote; returns 0 once expired. */
export function useSecondsLeft(expiresAt?: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [expiresAt]);
  if (!expiresAt) return 0;
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
}

export function QuoteTimer({ secondsLeft }: { secondsLeft: number }) {
  const m = Math.floor(secondsLeft / 60);
  const s = String(secondsLeft % 60).padStart(2, "0");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
        secondsLeft === 0
          ? "bg-red-50 text-red-700 ring-1 ring-red-200"
          : secondsLeft < 120
            ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
            : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
      )}
    >
      {secondsLeft === 0 ? "Price expired" : `Price held ${m}:${s}`}
    </span>
  );
}

/** Receipt-style breakdown. The last row (total) is set larger. */
export function PriceSheet({
  rows,
  total,
  aside,
}: {
  rows: { label: ReactNode; value: ReactNode; muted?: boolean }[];
  total: { label: ReactNode; value: ReactNode };
  aside?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#eadfe2] bg-white">
      <dl className="divide-y divide-dashed divide-[#efe4e7] px-4">
        {rows.map((row, i) => (
          <div key={i} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
            <dt className="text-[#7a6d70]">{row.label}</dt>
            <dd className={cn("text-right font-medium tabular-nums", row.muted ? "text-[#8a7c80]" : "text-[#28161a]")}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex items-end justify-between gap-4 border-t border-[#eadfe2] bg-[#fbf6f2] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[#4a0e1c]">{total.label}</p>
          {aside ? <div className="mt-1">{aside}</div> : null}
        </div>
        <p className="text-2xl font-extrabold tabular-nums tracking-tight text-[#28161a]">{total.value}</p>
      </div>
    </div>
  );
}

/** Done state: big check, one line, then whatever follow-up actions the flow offers. */
export function CounterDone({
  title,
  children,
  tone = "green",
}: {
  title: string;
  children?: ReactNode;
  tone?: "green" | "amber";
}) {
  return (
    <div className="flex flex-col items-center px-2 py-4 text-center">
      <span
        className={cn(
          "grid size-14 place-items-center rounded-full",
          tone === "green" ? "bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60" : "bg-amber-50 text-amber-600 ring-8 ring-amber-50/60",
        )}
      >
        <Check className="size-7" aria-hidden />
      </span>
      <h3 className="mt-4 text-lg font-extrabold tracking-tight text-[#28161a]">{title}</h3>
      {children ? <div className="mt-2 w-full space-y-3 text-sm text-[#5d4f53]">{children}</div> : null}
    </div>
  );
}

export function gramsInputToUg(input: string): number | null {
  const n = Number(input.trim());
  if (!input.trim() || !Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 1_000_000);
}
