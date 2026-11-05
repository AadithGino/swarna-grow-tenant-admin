import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Quiet page header for section overview pages (Enrollments, Online store, Digital Gold…).
 * Light surface + maroon accent — no stripe textures or full-bleed wine gradients.
 */
export function SectionHero({
  icon: Icon,
  eyebrow,
  title,
  description,
  status,
  actions,
  children,
  className,
}: {
  icon?: LucideIcon;
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  /** Small live/paused pill next to the title. */
  status?: ReactNode;
  actions?: ReactNode;
  /** Usually a row of <HeroStat/>. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[1.25rem] border border-[#eadfdb] bg-white shadow-[0_12px_32px_-24px_rgb(61_12_21/28%)]",
        className,
      )}
    >
      <div className="flex flex-col gap-5 border-b border-[#eadfdb] px-5 py-5 sm:px-6 sm:py-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[#9a6f2a]">
              {eyebrow}
            </p>
          ) : null}
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            {Icon ? (
              <span className="grid size-10 place-items-center rounded-xl bg-[#730321] text-[#f3d9a4]">
                <Icon className="size-[1.15rem]" aria-hidden />
              </span>
            ) : null}
            <h1 className="text-[1.65rem] font-extrabold leading-tight tracking-[-0.03em] text-[#28161a] sm:text-[1.85rem]">
              {title}
            </h1>
            {status}
          </div>
          {description ? (
            <p className="mt-2 max-w-2xl text-[0.92rem] leading-6 text-[#6f5c60]">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children ? (
        <div className="-ml-px grid grid-cols-2 bg-[#fcfaf8] sm:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]">
          {children}
        </div>
      ) : null}
    </section>
  );
}

export function HeroStat({
  label,
  value,
  detail,
  trend,
  href,
  onClick,
  active,
  loading,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  trend?: number | null;
  href?: string;
  /** Makes the stat a filter toggle (e.g. switch the list's quick view). */
  onClick?: () => void;
  /** Highlights the stat when its filter is applied. */
  active?: boolean;
  loading?: boolean;
}) {
  const body = (
    <>
      <p className="text-[0.78rem] font-medium text-[#8a7579]">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        {loading ? (
          <span className="h-7 w-20 animate-pulse rounded-md bg-[#eadfdb]" />
        ) : (
          <span className="truncate text-[1.4rem] font-extrabold tabular-nums tracking-tight text-[#28161a]">
            {value}
          </span>
        )}
        {trend != null && !loading ? (
          <span
            className={cn(
              "inline-flex items-center text-xs font-bold tabular-nums",
              trend >= 0 ? "text-emerald-700" : "text-rose-700",
            )}
          >
            {trend >= 0 ? <ArrowUpRight className="size-3" aria-hidden /> : <ArrowDownRight className="size-3" aria-hidden />}
            {Math.abs(Math.round(trend * 10) / 10)}%
          </span>
        ) : null}
      </div>
      {detail ? <p className="mt-0.5 truncate text-xs text-[#9a8d90]">{detail}</p> : null}
    </>
  );
  const cls = cn(
    "block min-w-0 border-l border-[#eadfdb] px-5 py-4 text-left sm:px-6",
    active && "bg-white shadow-[inset_0_-3px_0_#730321]",
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          cls,
          "w-full transition-colors hover:bg-white focus-visible:bg-white focus-visible:outline-none",
        )}
      >
        {body}
      </button>
    );
  }
  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          cls,
          "transition-colors hover:bg-white focus-visible:bg-white focus-visible:outline-none",
        )}
      >
        {body}
      </Link>
    );
  }
  return <div className={cls}>{body}</div>;
}

/** Pill shown beside the hero title: Live / Paused / Not live. */
export function HeroStatusPill({ tone, children }: { tone: "live" | "paused" | "off"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
        tone === "live" && "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
        tone === "paused" && "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
        tone === "off" && "bg-[#f4eeeb] text-[#6f5c60] ring-1 ring-[#e3d5d0]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          tone === "live" && "animate-pulse bg-emerald-500",
          tone === "paused" && "bg-amber-500",
          tone === "off" && "bg-[#a2969a]",
        )}
      />
      {children}
    </span>
  );
}

/** Secondary action on the light hero. */
export const heroButtonClass =
  "inline-flex h-10 items-center gap-2 rounded-xl border border-[#e3d5d0] bg-white px-4 text-sm font-semibold text-[#28161a] transition-colors hover:border-[#d9b6c0] hover:bg-[#fff6f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#730321]/35";

export const heroPrimaryButtonClass =
  "inline-flex h-10 items-center gap-2 rounded-xl bg-[#730321] px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#5e0a20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#730321]/40";
