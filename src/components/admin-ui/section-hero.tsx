import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Deep-wine band used at the top of a section's overview page (Online store, Digital Gold).
 * Keeps the brand's maroon/gold identity; everything below it stays quiet and white.
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
        "relative isolate overflow-hidden rounded-[1.5rem] bg-[#3d0c15] text-white shadow-[0_24px_48px_-28px_rgb(61_12_21/85%)]",
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(120%_140%_at_0%_0%,#8e1a36_0%,#5e0a20_45%,#3d0c15_100%)]"
      />
      <div
        aria-hidden
        className="absolute -right-24 -top-28 -z-10 size-[26rem] rounded-full bg-[radial-gradient(circle,rgba(226,200,143,0.30),rgba(226,200,143,0)_65%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.07] [background-image:repeating-linear-gradient(135deg,#e2c88f_0,#e2c88f_1px,transparent_1px,transparent_14px)]"
      />
      <div className="flex flex-col gap-5 px-5 pb-5 pt-6 sm:px-7 sm:pt-7 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className="text-[0.82rem] font-semibold text-[#e2c88f]">{eyebrow}</p> : null}
          <div className="mt-1 flex flex-wrap items-center gap-3">
            {Icon ? (
              <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-[#f3dca6] to-[#c3a264] text-[#4a0e1c] shadow-[0_8px_18px_-8px_rgba(226,200,143,0.7)]">
                <Icon className="size-5" aria-hidden />
              </span>
            ) : null}
            <h1 className="text-[1.9rem] font-extrabold leading-tight tracking-[-0.03em] sm:text-[2.2rem]">{title}</h1>
            {status}
          </div>
          {description ? (
            <p className="mt-2 max-w-2xl text-[0.95rem] leading-6 text-[#f1dfe2]/85">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children ? (
        <div className="overflow-hidden border-t border-[#e2c88f]/20 bg-black/10">
          <div className="-ml-px grid grid-cols-2 sm:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]">{children}</div>
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
      <p className="text-[0.8rem] font-medium text-[#e2c88f]/90">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        {loading ? (
          <span className="h-7 w-20 animate-pulse rounded-md bg-white/15" />
        ) : (
          <span className="truncate text-[1.45rem] font-extrabold tabular-nums tracking-tight">{value}</span>
        )}
        {trend != null && !loading ? (
          <span
            className={cn(
              "inline-flex items-center text-xs font-bold tabular-nums",
              trend >= 0 ? "text-emerald-300" : "text-rose-300",
            )}
          >
            {trend >= 0 ? <ArrowUpRight className="size-3" aria-hidden /> : <ArrowDownRight className="size-3" aria-hidden />}
            {Math.abs(Math.round(trend * 10) / 10)}%
          </span>
        ) : null}
      </div>
      {detail ? <p className="mt-0.5 truncate text-xs text-white/60">{detail}</p> : null}
    </>
  );
  const cls = cn(
    "block min-w-0 border-l border-[#e2c88f]/15 px-5 py-4 text-left sm:px-7",
    active && "bg-white/10 shadow-[inset_0_-3px_0_#e2c88f]",
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(cls, "w-full transition-colors hover:bg-white/5 focus-visible:bg-white/10 focus-visible:outline-none")}
      >
        {body}
      </button>
    );
  }
  if (href) {
    return (
      <Link href={href} className={cn(cls, "transition-colors hover:bg-white/5 focus-visible:bg-white/10 focus-visible:outline-none")}>
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
        tone === "live" && "bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-300/30",
        tone === "paused" && "bg-amber-400/15 text-amber-200 ring-1 ring-amber-300/30",
        tone === "off" && "bg-white/10 text-white/75 ring-1 ring-white/20",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          tone === "live" && "animate-pulse bg-emerald-300",
          tone === "paused" && "bg-amber-300",
          tone === "off" && "bg-white/60",
        )}
      />
      {children}
    </span>
  );
}

/** Light/ghost button for use on the dark hero. */
export const heroButtonClass =
  "inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e2c88f]/60";

export const heroPrimaryButtonClass =
  "inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-b from-[#f3dca6] to-[#d6b46e] px-4 text-sm font-bold text-[#3d0c15] shadow-[0_8px_20px_-10px_rgba(226,200,143,0.9)] transition-[filter] hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70";
