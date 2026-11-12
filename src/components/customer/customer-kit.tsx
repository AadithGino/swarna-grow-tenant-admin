"use client";

/**
 * Customer portal UI kit (v2 design): flat white cards on a warm background,
 * hairline borders, Inter only, Lucide icons. Brand colour comes from the tenant
 * (`--customer-primary`), so every jeweller's app keeps its own colour.
 */
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const CK_PRIMARY = "var(--customer-primary, #5e1622)";
export const CK_PRIMARY_SOFT = "rgba(var(--customer-primary-rgb, 94, 22, 34), 0.08)";

export function CkCard({
  className,
  children,
  as: As = "div",
  ...rest
}: React.HTMLAttributes<HTMLElement> & { as?: "div" | "section" | "article" }) {
  return (
    <As className={cn("rounded-[1.15rem] border border-[var(--ck-line)] bg-white", className)} {...rest}>
      {children}
    </As>
  );
}

export function CkSection({
  title,
  href,
  linkLabel = "View all",
  className,
  children,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("mt-7", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold tracking-[-0.015em] text-[var(--ck-ink)]">{title}</h2>
        {href ? (
          <Link href={href} className="inline-flex items-center gap-0.5 text-[0.8rem] font-semibold" style={{ color: CK_PRIMARY }}>
            {linkLabel}
            <ChevronRight className="size-3.5" strokeWidth={2.25} />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export type CkTone = "ok" | "warn" | "bad" | "blue" | "brand" | "gold" | "muted";

const toneClass: Record<CkTone, string> = {
  ok: "bg-[var(--ck-ok-soft)] text-[var(--ck-ok)]",
  warn: "bg-[var(--ck-warn-soft)] text-[var(--ck-warn)]",
  bad: "bg-[var(--ck-bad-soft)] text-[var(--ck-bad)]",
  blue: "bg-[var(--ck-blue-soft)] text-[var(--ck-blue)]",
  brand: "",
  gold: "bg-[var(--ck-gold-soft)] text-[#8a6a24]",
  muted: "bg-[#f1ece6] text-[var(--ck-muted)]",
};

/** Small status label. `dot` adds a leading status dot (use for states, not for types). */
export function CkBadge({
  tone = "muted",
  dot = false,
  className,
  children,
}: {
  tone?: CkTone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[7px] px-2 py-[3px] text-[0.6875rem] font-semibold leading-none",
        toneClass[tone],
        className,
      )}
      style={tone === "brand" ? { background: CK_PRIMARY_SOFT, color: CK_PRIMARY } : undefined}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}

/** Plain progress bar in the brand colour. */
export function CkBar({ percent, className, color }: { percent: number; className?: string; color?: string }) {
  const w = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-[var(--ck-track)]", className)} role="progressbar" aria-valuenow={w} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${w}%`, background: color ?? CK_PRIMARY }} />
    </div>
  );
}

/**
 * One segment per instalment / month: paid segments filled, the due one hatched,
 * an optional benefit segment outlined in gold.
 */
export function CkSegments({
  total,
  filled,
  due,
  benefit,
  className,
  height = 6,
}: {
  total: number;
  filled: number;
  due?: number | null;
  benefit?: number | null;
  className?: string;
  height?: number;
}) {
  const count = Math.max(1, Math.min(total, 36));
  return (
    <div className={cn("flex gap-[3px]", className)} aria-label={`${filled} of ${total} complete`}>
      {Array.from({ length: count }, (_, i) => {
        const n = i + 1;
        const state = n <= filled ? "paid" : n === due ? "due" : n === benefit ? "benefit" : "open";
        return (
          <span
            key={n}
            className="flex-1 rounded-[3px]"
            style={{
              height,
              background:
                state === "paid"
                  ? CK_PRIMARY
                  : state === "due"
                    ? "repeating-linear-gradient(-45deg, var(--ck-gold) 0 3px, #e8d6ad 3px 6px)"
                    : state === "benefit"
                      ? "var(--ck-gold-soft)"
                      : "var(--ck-track)",
              boxShadow: state === "benefit" ? "inset 0 0 0 1.5px var(--ck-gold)" : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

export type CkStepState = "complete" | "current" | "upcoming" | "failed" | "cancelled";

/** Horizontal order tracker. */
export function CkTracker({ steps, className }: { steps: { id: string; label: string; state: CkStepState }[]; className?: string }) {
  return (
    <ol className={cn("flex items-start", className)}>
      {steps.map((step, i) => {
        const done = step.state === "complete";
        const current = step.state === "current";
        const bad = step.state === "failed" || step.state === "cancelled";
        return (
          <li key={step.id} className="relative flex-1 text-center">
            {i < steps.length - 1 ? (
              <span
                className="absolute left-[calc(50%+7px)] right-[calc(-50%+7px)] top-[5px] h-0.5"
                style={{ background: done ? "var(--ck-ok)" : "#e7ddd1" }}
                aria-hidden
              />
            ) : null}
            <span
              className="relative z-[1] mx-auto mb-1.5 block size-3 rounded-full"
              style={
                done
                  ? { background: "var(--ck-ok)" }
                  : current
                    ? { background: "#fff", border: `3.5px solid ${CK_PRIMARY}`, boxShadow: `0 0 0 3px ${CK_PRIMARY_SOFT}` }
                    : bad
                      ? { background: "var(--ck-bad)" }
                      : { background: "#fff", border: "2px solid #ddd2c5" }
              }
              aria-hidden
            />
            <span
              className={cn(
                "block px-0.5 text-[0.625rem] leading-tight",
                current ? "font-bold text-[var(--ck-ink)]" : done ? "font-medium text-[var(--ck-ink-2)]" : "font-medium text-[#ad9fa2]",
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Label + value pairs in a hairline grid. */
export function CkStats({ items, className }: { items: { label: string; value: React.ReactNode }[]; className?: string }) {
  return (
    <div
      className={cn("grid gap-px overflow-hidden rounded-[0.9rem] border border-[var(--ck-line-soft)] bg-[var(--ck-line-soft)]", className)}
      style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, minmax(0, 1fr))` }}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0 bg-white px-3 py-2.5">
          <p className="truncate text-[0.72rem] text-[var(--ck-muted)]">{item.label}</p>
          <p className="mt-0.5 truncate text-[0.95rem] font-semibold tabular-nums text-[var(--ck-ink)]">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

/** Info / warning note. */
export function CkNote({
  icon: Icon,
  tone = "neutral",
  className,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "neutral" | "blue" | "warn";
  className?: string;
  children: React.ReactNode;
}) {
  const bg = tone === "blue" ? "bg-[var(--ck-blue-soft)]" : tone === "warn" ? "bg-[var(--ck-warn-soft)]" : "bg-[#f2ece4]";
  const ic = tone === "blue" ? "text-[var(--ck-blue)]" : tone === "warn" ? "text-[var(--ck-warn)]" : "text-[var(--ck-muted)]";
  return (
    <div className={cn("flex gap-2.5 rounded-[0.9rem] px-3.5 py-3 text-[0.8rem] leading-relaxed text-[var(--ck-ink-2)]", bg, className)}>
      {Icon ? <Icon className={cn("mt-0.5 size-4 shrink-0", ic)} /> : null}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Round icon tile used in rows and benefit cards. */
export function CkIcon({
  icon: Icon,
  tone = "neutral",
  className,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone?: "neutral" | "brand" | "gold" | "ok" | "silver";
  className?: string;
}) {
  const style =
    tone === "brand"
      ? { background: CK_PRIMARY_SOFT, color: CK_PRIMARY }
      : undefined;
  const cls =
    tone === "gold"
      ? "bg-[var(--ck-gold-soft)] text-[#8a6a24]"
      : tone === "ok"
        ? "bg-[var(--ck-ok-soft)] text-[var(--ck-ok)]"
        : tone === "silver"
          ? "bg-[#eef0f2] text-[#6f7781]"
          : tone === "neutral"
            ? "bg-[#f4eee7] text-[var(--ck-ink-2)]"
            : "";
  return (
    <span className={cn("grid size-[2.4rem] shrink-0 place-items-center rounded-xl", cls, className)} style={style}>
      <Icon className="size-[1.15rem]" strokeWidth={1.8} />
    </span>
  );
}

/** Segmented control (tabs). */
export function CkSegmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex rounded-xl bg-[#efe8df] p-[3px]", className)} role="tablist">
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 rounded-[9px] px-2 py-2 text-[0.82rem] font-semibold transition",
              on ? "bg-white text-[var(--ck-ink)] shadow-[0_1px_2px_rgba(40,20,20,.08),0_0_0_1px_rgba(40,20,20,.04)]" : "text-[var(--ck-muted)]",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Sub-page top bar (back · title · optional action). The shell hides its brand header on
 * mobile for these routes, so this becomes the page's header, as in the plan.
 */
export function CkNavBar({
  title,
  backHref,
  right,
  className,
}: {
  title: string;
  backHref?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  const btn = "grid size-10 shrink-0 place-items-center rounded-full border border-[var(--ck-line)] bg-white text-[var(--ck-ink)]";
  return (
    <div className={cn("-mx-4 -mt-5 mb-3 flex items-center gap-2.5 px-4 pb-2 pt-3 lg:hidden", className)}>
      {backHref ? (
        <Link href={backHref} aria-label="Back" className={btn}>
          <ChevronLeft className="size-4" strokeWidth={2} />
        </Link>
      ) : (
        <button type="button" aria-label="Back" className={btn} onClick={() => window.history.back()}>
          <ChevronLeft className="size-4" strokeWidth={2} />
        </button>
      )}
      <h1 className="min-w-0 flex-1 truncate text-[1.03rem] font-semibold tracking-[-0.01em] text-[var(--ck-ink)]">{title}</h1>
      {right ?? <span className="size-10 shrink-0" aria-hidden />}
    </div>
  );
}

/** Round icon button for CkNavBar's right slot. */
export function CkNavAction({ label, onClick, href, children }: { label: string; onClick?: () => void; href?: string; children: React.ReactNode }) {
  const cls = "grid size-10 shrink-0 place-items-center rounded-full border border-[var(--ck-line)] bg-white text-[var(--ck-ink)]";
  return href ? (
    <Link href={href} aria-label={label} className={cls}>
      {children}
    </Link>
  ) : (
    <button type="button" aria-label={label} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

/** Routes whose page draws its own CkNavBar (shell hides the brand header on mobile). */
export function isCustomerSubPage(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const i = parts.indexOf("customer");
  const rest = i >= 0 ? parts.slice(i + 2) : [];
  if (rest.length === 1 && rest[0] === "shop") return true;
  if (rest.length < 2) return false;
  if (rest[0] === "schemes") return true;
  if (rest[0] === "digital-metals") return true;
  if (rest[0] === "shop" && !["cart", "orders", "order", "quote", "policies"].includes(rest[1])) return true;
  return false;
}

/** Product pages show their own sticky Add to bag / Buy now bar instead of the tab bar. */
export function isCustomerShopProductPage(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const i = parts.indexOf("customer");
  const rest = i >= 0 ? parts.slice(i + 2) : [];
  return rest.length === 2 && rest[0] === "shop" && !["cart", "orders", "order", "quote", "policies"].includes(rest[1]);
}
