"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/src/components/common/query-state";

export type AdminColumn<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  /** Extra classes for both th and td (width etc). */
  className?: string;
  /** Enables client-side sorting on the loaded rows. */
  sortValue?: (row: T) => string | number | null | undefined;
  /** Hidden in the stacked mobile card. */
  hideOnMobile?: boolean;
  /** Mobile card: shown as the card title (first match) or subtitle (second). */
  primary?: boolean;
};

type SortState = { key: string; dir: "asc" | "desc" } | null;

function alignClass(align?: "left" | "right" | "center") {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}

/**
 * Responsive data table for admin lists: sticky header, hover rows, optional row links,
 * client-side sort on loaded rows, skeleton loading, empty state, and stacked cards on phones.
 */
export function AdminTable<T>({
  columns,
  rows,
  getRowId,
  rowHref,
  onRowClick,
  loading,
  fetching,
  empty,
  footer,
  initialSort = null,
  rowClassName,
  caption,
  className,
}: {
  columns: AdminColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  rowHref?: (row: T) => string | undefined;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  /** Background refetch — dims the rows a little. */
  fetching?: boolean;
  empty?: ReactNode;
  footer?: ReactNode;
  initialSort?: SortState;
  rowClassName?: (row: T) => string | undefined;
  caption?: string;
  className?: string;
}) {
  const router = useRouter();
  const [sort, setSort] = useState<SortState>(initialSort);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * factor;
      return String(av).localeCompare(String(bv), "en-IN", { numeric: true }) * factor;
    });
  }, [rows, sort, columns]);

  function toggleSort(key: string) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "desc" };
      if (prev.dir === "desc") return { key, dir: "asc" };
      return null;
    });
  }

  function activate(row: T) {
    if (onRowClick) return onRowClick(row);
    const href = rowHref?.(row);
    if (href) router.push(href);
  }

  const interactive = Boolean(onRowClick || rowHref);
  const primaryCols = columns.filter((c) => c.primary);
  const titleCol = primaryCols[0] ?? columns[0];
  const subtitleCol = primaryCols[1];
  const mobileCols = columns.filter((c) => c !== titleCol && c !== subtitleCol && !c.hideOnMobile);

  if (loading) {
    return (
      <div className={cn("divide-y divide-[#f1e8e5]", className)} aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <span className="size-9 animate-pulse rounded-xl bg-[#f3ebe8]" />
            <span className="h-4 flex-1 animate-pulse rounded bg-[#f3ebe8]" style={{ maxWidth: `${60 - i * 5}%` }} />
            <span className="h-4 w-20 animate-pulse rounded bg-[#f3ebe8]" />
          </div>
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return <div className={className}>{empty ?? <EmptyState />}</div>;
  }

  return (
    <div className={cn("relative", className)}>
      {fetching ? (
        <div className="pointer-events-none absolute right-4 top-2.5 z-10 flex items-center gap-1.5 text-xs text-[#9a8d90]">
          <Loader2 className="size-3.5 animate-spin" aria-hidden /> Updating
        </div>
      ) : null}
      {/* Desktop table */}
      <div className={cn("hidden overflow-x-auto md:block", fetching && "opacity-70 transition-opacity")}>
        <table className="w-full border-collapse text-[0.9rem]">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="border-b border-[#efe5e1] bg-[#fbf8f6]">
              {columns.map((col) => {
                const sortable = Boolean(col.sortValue);
                const activeSort = sort?.key === col.key ? sort.dir : null;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={activeSort === "asc" ? "ascending" : activeSort === "desc" ? "descending" : undefined}
                    className={cn(
                      "h-10 whitespace-nowrap px-4 text-[0.78rem] font-semibold text-[#7a6d70] first:pl-5 last:pr-5",
                      alignClass(col.align),
                      col.className,
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md hover:text-[#28161a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7b0a2b]/30",
                          activeSort && "text-[#5e0a20]",
                          col.align === "right" && "flex-row-reverse",
                        )}
                      >
                        {col.header}
                        {activeSort === "asc" ? (
                          <ArrowUp className="size-3" aria-hidden />
                        ) : activeSort === "desc" ? (
                          <ArrowDown className="size-3" aria-hidden />
                        ) : (
                          <ArrowUpDown className="size-3 opacity-40" aria-hidden />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
              {interactive ? <th aria-hidden className="w-8 pr-4" /> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f3eae7]">
            {sorted.map((row) => {
              const id = getRowId(row);
              const href = rowHref?.(row);
              return (
                <tr
                  key={id}
                  tabIndex={interactive ? 0 : undefined}
                  onClick={interactive ? () => activate(row) : undefined}
                  onKeyDown={
                    interactive
                      ? (e) => {
                          if (e.target !== e.currentTarget) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            activate(row);
                          }
                        }
                      : undefined
                  }
                  className={cn(
                    "group transition-colors",
                    interactive
                      ? "cursor-pointer hover:bg-[#fcf6f4] focus-visible:bg-[#fcf6f4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7b0a2b]/40"
                      : "hover:bg-[#fdfaf9]",
                    rowClassName?.(row),
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3 align-middle text-[#2f1d21] first:pl-5 last:pr-5",
                        alignClass(col.align),
                        col.align === "right" && "tabular-nums",
                        col.className,
                      )}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                  {interactive ? (
                    <td className="w-8 pr-4 text-right">
                      {href ? (
                        <Link
                          href={href}
                          onClick={(e) => e.stopPropagation()}
                          tabIndex={-1}
                          aria-hidden
                          className="inline-grid size-7 place-items-center rounded-lg text-[#c4b2b5] group-hover:bg-white group-hover:text-[#7b0a2b]"
                        >
                          <ChevronRight className="size-4" />
                        </Link>
                      ) : (
                        <ChevronRight className="ml-auto size-4 text-[#c4b2b5] group-hover:text-[#7b0a2b]" aria-hidden />
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Phone cards */}
      <ul className="divide-y divide-[#f1e8e5] md:hidden">
        {sorted.map((row) => {
          const id = getRowId(row);
          const href = rowHref?.(row);
          const inner = (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="min-w-0 font-semibold text-[#28161a]">{titleCol.cell(row)}</div>
                  {subtitleCol ? <div className="mt-0.5 min-w-0 text-sm text-[#776a6d]">{subtitleCol.cell(row)}</div> : null}
                </div>
                {interactive ? <ChevronRight className="mt-0.5 size-4 shrink-0 text-[#c4b2b5]" aria-hidden /> : null}
              </div>
              {mobileCols.length ? (
                <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {mobileCols.map((col) => (
                    <div key={col.key} className="min-w-0">
                      <dt className="text-xs text-[#9a8d90]">{col.header}</dt>
                      <dd className="mt-0.5 min-w-0 text-[#2f1d21]">{col.cell(row)}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </>
          );
          return (
            <li key={id} className={rowClassName?.(row)}>
              {href ? (
                <Link href={href} className="block px-4 py-3.5 active:bg-[#fcf6f4]">
                  {inner}
                </Link>
              ) : onRowClick ? (
                <button type="button" onClick={() => onRowClick(row)} className="block w-full px-4 py-3.5 text-left active:bg-[#fcf6f4]">
                  {inner}
                </button>
              ) : (
                <div className="px-4 py-3.5">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
      {footer}
    </div>
  );
}

/** "Showing 20 · Load more" footer for cursor lists. */
export function LoadMoreFooter({
  shown,
  hasMore,
  onLoadMore,
  loading,
  noun = "records",
}: {
  shown: number;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loading?: boolean;
  noun?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#efe5e1] bg-[#fbf8f6] px-5 py-3 text-sm text-[#776a6d]">
      <span>
        Showing <span className="font-semibold tabular-nums text-[#3c2a2e]">{shown}</span> {noun}
        {hasMore ? " · more available" : ""}
      </span>
      {hasMore && onLoadMore ? (
        <Button type="button" variant="outline" size="sm" onClick={onLoadMore} disabled={loading} className="rounded-lg">
          {loading ? <Loader2 className="animate-spin" /> : null}
          Load more
        </Button>
      ) : null}
    </div>
  );
}

/** Surface that hosts a FilterBar + AdminTable as one panel. */
export function ListPanel({
  toolbar,
  children,
  className,
  title,
  action,
}: {
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[1.15rem] border border-[#e8dcd7] bg-white shadow-[0_1px_2px_rgb(67_15_25/4%),0_8px_24px_-18px_rgb(67_15_25/18%)]",
        className,
      )}
    >
      {title || action ? (
        <div className="flex items-center justify-between gap-3 border-b border-[#efe5e1] px-5 py-3.5">
          <h2 className="font-bold text-[#2d191d]">{title}</h2>
          {action}
        </div>
      ) : null}
      {toolbar}
      {children}
    </section>
  );
}

/** Two-line cell: bold primary + muted secondary. */
export function CellStack({
  primary,
  secondary,
  leading,
  className,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  leading?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      {leading}
      <div className="min-w-0">
        <div className="truncate font-semibold text-[#28161a]">{primary}</div>
        {secondary ? <div className="mt-0.5 truncate text-[0.8rem] text-[#857a7d]">{secondary}</div> : null}
      </div>
    </div>
  );
}

/** Round initials avatar for people rows. */
export function InitialsAvatar({ name, className }: { name?: string | null; className?: string }) {
  const text = (name ?? "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase() || "?";
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#fbf0dc] to-[#f1dcb4] text-[0.78rem] font-bold text-[#6b4413] ring-1 ring-[#ead5ad]",
        className,
      )}
    >
      {text}
    </span>
  );
}

/** Monospace-free short id chip, e.g. order numbers. */
export function IdChip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex max-w-full items-center truncate rounded-md bg-[#f6efec] px-1.5 py-0.5 text-[0.76rem] font-semibold tabular-nums text-[#5c4a4e]", className)}>
      {children}
    </span>
  );
}
