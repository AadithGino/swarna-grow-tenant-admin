import Link from "next/link";
import { ArrowDownRight, ArrowLeft, ArrowUpRight, ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  back,
  icon: Icon,
  meta,
  className,
}: {
  /** Section the page lives in (shown as a small breadcrumb above the title). */
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** Optional "back to list" link shown before the eyebrow. */
  back?: { href: string; label: string };
  icon?: LucideIcon;
  /** Badges / short facts shown under the title (status, ids, dates). */
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {back || eyebrow ? (
          <nav
            aria-label="Breadcrumb"
            className="mb-2 flex flex-wrap items-center gap-1 text-[0.82rem] font-semibold text-[#9a6f2a]"
          >
            {eyebrow ? <span>{eyebrow}</span> : null}
            {back && eyebrow ? (
              <ChevronRight className="size-3.5 text-[#c9ad86]" aria-hidden />
            ) : null}
            {back ? (
              <Link
                href={back.href}
                className="inline-flex items-center gap-1 rounded-md text-[#7b0a2b] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7b0a2b]/40"
              >
                {!eyebrow ? <ArrowLeft className="size-3.5" aria-hidden /> : null}
                {back.label}
              </Link>
            ) : null}
          </nav>
        ) : null}
        <div className="flex items-center gap-3">
          {Icon ? (
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#8e1a36] to-[#5e0a20] text-[#f3dca6] shadow-[0_6px_16px_-8px_rgb(94_10_32/70%)]">
              <Icon className="size-5" aria-hidden />
            </span>
          ) : null}
          <h1 className="min-w-0 text-[1.85rem] font-extrabold leading-tight tracking-[-0.03em] text-[#241316] md:text-[2.05rem]">
            {title}
          </h1>
        </div>
        {meta ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-sm text-[#776a6d]">
            {meta}
          </div>
        ) : null}
        {description && (
          <p className="mt-2 max-w-3xl text-[0.95rem] leading-6 text-[#776a6d]">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}

export function Surface({
  children,
  className,
  title,
  description,
  action,
  icon: Icon,
  bodyClassName,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  icon?: LucideIcon;
  bodyClassName?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, "title">) {
  return (
    <section
      {...rest}
      className={cn(
        "overflow-hidden rounded-[1.15rem] border border-[#e8dcd7] bg-white shadow-[0_1px_2px_rgb(67_15_25/4%),0_8px_24px_-18px_rgb(67_15_25/18%)]",
        className,
      )}
    >
      {(title || description || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#efe5e1] px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            {Icon ? (
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-[#f8eef0] text-[#7b0a2b]">
                <Icon className="size-4" aria-hidden />
              </span>
            ) : null}
            <div className="min-w-0">
              {title && (
                <h2 className="text-[0.98rem] font-bold text-[#2d191d]">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </div>
      )}
      {bodyClassName ? <div className={bodyClassName}>{children}</div> : children}
    </section>
  );
}

/** Section label above detail-page tab bars (use with TabsList variant="detail"). */
export function DetailRecordTabsHeader({ label }: { label: string }) {
  return (
    <p className="mb-3 text-[0.82rem] font-semibold text-[#9a6f2a]">
      {label}
    </p>
  );
}

export const detailRecordTabsChromeClass =
  "border-b border-[#eaded9] bg-[#faf7f5] px-4 py-4 sm:px-5";

export const detailRecordTabContentClass = "p-4 sm:p-5 focus-visible:outline-none";

export type StatTone = "wine" | "gold" | "red" | "green" | "cream" | "blue";

const statToneClasses: Record<StatTone, { chip: string; bar: string }> = {
  wine: { chip: "bg-[#f7ecee] text-[#7b0a2b]", bar: "from-[#7b0a2b]" },
  gold: { chip: "bg-[#fbf1dc] text-[#9a6200]", bar: "from-[#c99a3c]" },
  red: { chip: "bg-[#fff0f0] text-red-600", bar: "from-red-500" },
  green: { chip: "bg-emerald-50 text-emerald-700", bar: "from-emerald-500" },
  cream: { chip: "bg-[#f7ead0] text-[#815b1d]", bar: "from-[#d8b56a]" },
  blue: { chip: "bg-sky-50 text-sky-700", bar: "from-sky-500" },
};

export function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "wine",
  href,
  trend,
  loading,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  tone?: StatTone;
  /** Makes the whole card a link to the related list. */
  href?: string;
  /** Change vs previous period, in percent. */
  trend?: { value: number; label?: string; positiveIsGood?: boolean } | null;
  loading?: boolean;
  className?: string;
}) {
  const toneClasses = statToneClasses[tone] ?? statToneClasses.wine;
  const up = trend ? trend.value >= 0 : false;
  const good = trend ? (trend.positiveIsGood === false ? !up : up) : false;
  const body = (
    <>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r to-transparent opacity-0 transition-opacity group-hover:opacity-100",
          toneClasses.bar,
        )}
      />
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl",
            toneClasses.chip,
          )}
        >
          <Icon className="size-[1.05rem]" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#6f6265]">
          {label}
        </span>
        {href ? (
          <ArrowUpRight
            className="size-4 shrink-0 text-[#c4b2b5] transition-colors group-hover:text-[#7b0a2b]"
            aria-hidden
          />
        ) : null}
      </div>
      <div className="mt-3 flex items-end gap-2">
        {loading ? (
          <span className="h-8 w-24 animate-pulse rounded-lg bg-[#f2e9e6]" />
        ) : (
          <span className="min-w-0 truncate text-[1.65rem] font-extrabold tabular-nums tracking-tight text-[#28161a]">
            {value}
          </span>
        )}
        {trend && !loading ? (
          <span
            className={cn(
              "mb-1.5 inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums",
              good ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
            )}
            title={trend.label}
          >
            {up ? (
              <ArrowUpRight className="size-3" aria-hidden />
            ) : (
              <ArrowDownRight className="size-3" aria-hidden />
            )}
            {Math.abs(Math.round(trend.value * 10) / 10)}%
          </span>
        ) : null}
      </div>
      {detail && (
        <div className="mt-1 line-clamp-2 text-[0.84rem] leading-5 text-[#857a7d]">
          {detail}
        </div>
      )}
    </>
  );
  const shell = cn(
    "group relative block min-w-0 overflow-hidden rounded-[1.15rem] border border-[#e8dcd7] bg-white p-4 shadow-[0_1px_2px_rgb(67_15_25/4%)] sm:p-5",
    href &&
      "transition-[border-color,box-shadow] hover:border-[#dcc3c3] hover:shadow-[0_10px_28px_-18px_rgb(94_10_32/45%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7b0a2b]/40",
    className,
  );
  if (href) {
    return (
      <Link href={href} className={shell}>
        {body}
      </Link>
    );
  }
  return <div className={shell}>{body}</div>;
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label data-field-label="" className="mb-1.5 block text-sm font-medium text-[#4f3d41]">
      {children}
    </label>
  );
}
