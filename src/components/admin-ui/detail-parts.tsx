"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Check, Circle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Label/value rows inside a Surface. */
export function InfoList({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn("divide-y divide-[#f3eae7] px-5", className)}>{children}</dl>;
}

export function InfoRow({
  label,
  children,
  hint,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-x-6 gap-y-1 py-3 text-[0.9rem]", className)}>
      <dt className="text-[#7a6d70]">
        {label}
        {hint ? <span className="mt-0.5 block text-xs text-[#a2969a]">{hint}</span> : null}
      </dt>
      <dd className="min-w-0 text-right font-medium text-[#28161a] [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

/** Compact grid of facts (2–4 columns) for summary cards. */
export function FactGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn("grid grid-cols-2 gap-px overflow-hidden bg-[#f1e8e5] sm:grid-cols-4", className)}>{children}</dl>;
}

export function Fact({ label, value, detail }: { label: ReactNode; value: ReactNode; detail?: ReactNode }) {
  return (
    <div className="min-w-0 bg-white px-5 py-3.5">
      <dt className="text-xs font-medium text-[#8a7c80]">{label}</dt>
      <dd className="mt-1 truncate text-[1.05rem] font-bold tabular-nums text-[#28161a]">{value}</dd>
      {detail ? <dd className="mt-0.5 truncate text-xs text-[#9a8d90]">{detail}</dd> : null}
    </div>
  );
}

export type TimelineStep = {
  key: string;
  title: ReactNode;
  time?: ReactNode;
  detail?: ReactNode;
  state: "done" | "current" | "upcoming" | "failed";
};

/** Vertical progress timeline for order / payout lifecycles. */
export function Timeline({ steps, className }: { steps: TimelineStep[]; className?: string }) {
  return (
    <ol className={cn("relative space-y-0 px-5 py-4", className)}>
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
            {!last ? (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[0.6875rem] top-6 h-[calc(100%-1.25rem)] w-px",
                  step.state === "done" ? "bg-[#c99a3c]" : "bg-[#eadfdb]",
                )}
              />
            ) : null}
            <span
              aria-hidden
              className={cn(
                "relative z-[1] mt-0.5 grid size-[1.375rem] shrink-0 place-items-center rounded-full ring-4 ring-white",
                step.state === "done" && "bg-gradient-to-br from-[#e2c88f] to-[#b98a35] text-white",
                step.state === "current" && "bg-[#7b0a2b] text-white",
                step.state === "upcoming" && "border border-[#e2d6d2] bg-white text-[#cbbdc0]",
                step.state === "failed" && "bg-red-600 text-white",
              )}
            >
              {step.state === "done" ? (
                <Check className="size-3" strokeWidth={3} />
              ) : step.state === "current" ? (
                <span className="size-2 animate-pulse rounded-full bg-white" />
              ) : (
                <Circle className="size-2 fill-current" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-[0.9rem] font-semibold",
                  step.state === "upcoming" ? "text-[#a2969a]" : "text-[#28161a]",
                  step.state === "failed" && "text-red-700",
                )}
              >
                {step.title}
              </p>
              {step.time ? <p className="text-xs text-[#8a7c80]">{step.time}</p> : null}
              {step.detail ? <div className="mt-1 text-sm text-[#5c4a4e]">{step.detail}</div> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export type SectionTab = { href: string; label: string; icon?: LucideIcon; count?: number | null; exact?: boolean };

/** Horizontal sub-navigation inside a section (replaces big nav cards). */
export function SectionTabs({ tabs, className, ariaLabel = "Section" }: { tabs: SectionTab[]; className?: string; ariaLabel?: string }) {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label={ariaLabel} className={cn("-mx-1 overflow-x-auto px-1 scrollbar-none", className)}>
      <div className="inline-flex min-w-full gap-1 border-b border-[#eadfdb]">
        {tabs.map(({ href, label, icon: Icon, count, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex h-10 shrink-0 items-center gap-2 rounded-t-lg px-3 text-[0.88rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7b0a2b]/30",
                active ? "text-[#5e0a20]" : "text-[#7a6d70] hover:text-[#28161a]",
              )}
            >
              {Icon ? <Icon className="size-4" aria-hidden /> : null}
              {label}
              {count ? (
                <span className="grid min-w-5 place-items-center rounded-full bg-[#f4ebe8] px-1.5 text-[0.7rem] font-bold tabular-nums text-[#7b0a2b]">
                  {count}
                </span>
              ) : null}
              {active ? (
                <span aria-hidden className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-gradient-to-r from-[#7b0a2b] to-[#b8862f]" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Two-column detail layout: main content + sticky aside on wide screens. */
export function DetailLayout({ main, aside, className }: { main: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]", className)}>
      <div className="min-w-0 space-y-6">{main}</div>
      {aside ? <aside className="min-w-0 space-y-6 xl:sticky xl:top-[6.5rem] xl:self-start">{aside}</aside> : null}
    </div>
  );
}

/** Amber / red / blue notice strip. */
export function Notice({
  tone = "amber",
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  tone?: "amber" | "red" | "blue" | "green" | "wine";
  icon?: LucideIcon;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const tones = {
    amber: "border-amber-200 bg-amber-50/80 text-amber-950 [&_svg]:text-amber-600",
    red: "border-red-200 bg-red-50/80 text-red-900 [&_svg]:text-red-600",
    blue: "border-sky-200 bg-sky-50/80 text-sky-950 [&_svg]:text-sky-600",
    green: "border-emerald-200 bg-emerald-50/80 text-emerald-950 [&_svg]:text-emerald-600",
    wine: "border-[#ecd3d9] bg-[#fbf3f5] text-[#4a0e1c] [&_svg]:text-[#7b0a2b]",
  } as const;
  return (
    <div className={cn("flex flex-wrap items-start gap-3 rounded-2xl border px-4 py-3 text-sm", tones[tone], className)}>
      {Icon ? <Icon className="mt-0.5 size-4 shrink-0" aria-hidden /> : null}
      <div className="min-w-0 flex-1 leading-5">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title && "mt-0.5 opacity-90")}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
