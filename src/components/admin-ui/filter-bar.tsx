"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CalendarRange, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LIST_SEARCH_QUERY_MAX,
  sanitizeListSearchQueryInput,
  validateListSearchQuery,
} from "@/src/lib/list-date-range";

export type FilterOptionItem = { value: string; label: string; count?: number | null };

/** Debounce a fast-changing value (search boxes that hit the server). */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function FilterSearch({
  value,
  onChange,
  placeholder = "Search",
  hint,
  className,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Small helper under the box, e.g. "Type 4+ characters". */
  hint?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const error = validateListSearchQuery(value);
  return (
    <div className={cn("min-w-0 flex-1", className)}>
      <div
        className={cn(
          "group flex h-10 items-center gap-2 rounded-xl border bg-[#fbf8f6] px-3 transition-colors focus-within:border-[#c79aa6] focus-within:bg-white focus-within:ring-[3px] focus-within:ring-[#7b0a2b]/10",
          error ? "border-red-400" : "border-[#e6dad6]",
        )}
      >
        <Search className="size-4 shrink-0 text-[#9a8d90]" aria-hidden />
        <input
          type="search"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(sanitizeListSearchQueryInput(e.target.value))}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-invalid={Boolean(error)}
          maxLength={LIST_SEARCH_QUERY_MAX}
          className="h-full min-w-0 flex-1 bg-transparent text-[0.92rem] text-[#28161a] outline-none placeholder:text-[#a2969a] [&::-webkit-search-cancel-button]:hidden"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="grid size-6 place-items-center rounded-md text-[#9a8d90] hover:bg-[#f1e7e4] hover:text-[#5c3d42]"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-[#9a8d90]">{hint}</p>
      ) : null}
    </div>
  );
}

/** Compact pill-style select: "Status: Paid ▾". Highlights when not on the default value. */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  defaultValue = "ALL",
  icon: Icon,
  className,
  widthClass = "min-w-[9.5rem]",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOptionItem[];
  defaultValue?: string;
  icon?: typeof Search;
  className?: string;
  widthClass?: string;
}) {
  const active = value !== defaultValue;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          "h-10 gap-1.5 rounded-xl border px-3 text-[0.88rem] shadow-none [&>svg:last-child]:opacity-60",
          active
            ? "border-[#d7b2bc] bg-[#fbf1f3] text-[#5e0a20]"
            : "border-[#e6dad6] bg-white text-[#3c2a2e] hover:bg-[#fcf8f6]",
          widthClass,
          className,
        )}
      >
        {Icon ? <Icon className="size-4 text-[#9a6f2a]" aria-hidden /> : null}
        <span className="text-[#8a7c80]">{label}</span>
        <span className="h-3.5 w-px bg-[#e6dad6]" aria-hidden />
        <SelectValue className="truncate font-medium" />
      </SelectTrigger>
      <SelectContent position="popper" align="start" sideOffset={6} className="max-h-80 rounded-xl border-[#eadfdb] p-1 shadow-lg">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className="rounded-lg py-2 pr-8">
            <span className="flex w-full items-center justify-between gap-3">
              {option.label}
              {option.count != null ? (
                <span className="text-xs tabular-nums text-muted-foreground">{option.count}</span>
              ) : null}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Segmented quick views ("All · Needs action · To ship …") with optional counts. */
export function QuickViews({
  value,
  onChange,
  options,
  className,
  ariaLabel = "Quick views",
}: {
  value: string;
  onChange: (value: string) => void;
  options: FilterOptionItem[];
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 scrollbar-none", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[0.84rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7b0a2b]/30",
              active
                ? "border-[#5e0a20] bg-[#5e0a20] text-white shadow-[0_4px_12px_-6px_rgb(94_10_32/70%)]"
                : "border-[#e6dad6] bg-white text-[#5c4a4e] hover:border-[#d8c5c0] hover:text-[#28161a]",
            )}
          >
            {option.label}
            {option.count != null && option.count > 0 ? (
              <span
                className={cn(
                  "grid min-w-5 place-items-center rounded-full px-1.5 text-[0.7rem] font-bold tabular-nums",
                  active ? "bg-white/20 text-white" : "bg-[#f4ebe8] text-[#7b0a2b]",
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** From / to date inputs in one pill. Values are `YYYY-MM-DD`. */
export function FilterDateRange({
  from,
  to,
  onFromChange,
  onToChange,
  label = "Date",
  className,
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  label?: string;
  className?: string;
}) {
  const active = Boolean(from || to);
  return (
    <div
      role="group"
      aria-label={`${label} range`}
      className={cn(
        "flex h-10 items-center gap-1 rounded-xl border px-2.5 text-[0.86rem]",
        active ? "border-[#d7b2bc] bg-[#fbf1f3]" : "border-[#e6dad6] bg-white",
        className,
      )}
    >
      <CalendarRange className="size-4 shrink-0 text-[#9a6f2a]" aria-hidden />
      <span className="hidden text-[#8a7c80] sm:inline">{label}</span>
      <input
        type="date"
        aria-label={`${label} from`}
        value={from}
        max={to || undefined}
        onChange={(e) => onFromChange(e.target.value)}
        className="h-8 w-[8.4rem] rounded-md bg-transparent px-1 text-[#3c2a2e] outline-none focus-visible:ring-2 focus-visible:ring-[#7b0a2b]/25"
      />
      <span className="text-[#b5a7aa]" aria-hidden>
        –
      </span>
      <input
        type="date"
        aria-label={`${label} to`}
        value={to}
        min={from || undefined}
        onChange={(e) => onToChange(e.target.value)}
        className="h-8 w-[8.4rem] rounded-md bg-transparent px-1 text-[#3c2a2e] outline-none focus-visible:ring-2 focus-visible:ring-[#7b0a2b]/25"
      />
      {active ? (
        <button
          type="button"
          onClick={() => {
            onFromChange("");
            onToChange("");
          }}
          className="grid size-6 place-items-center rounded-md text-[#9a8d90] hover:bg-white hover:text-[#5c3d42]"
          aria-label={`Clear ${label.toLowerCase()} range`}
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export type ActiveFilter = { key: string; label: string; onClear: () => void };

/** The full toolbar: search + filters + actions, quick views, then active filter chips & count. */
export function FilterBar({
  search,
  filters,
  actions,
  quickViews,
  activeFilters = [],
  onClearAll,
  resultLabel,
  className,
}: {
  search?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  quickViews?: ReactNode;
  activeFilters?: ActiveFilter[];
  onClearAll?: () => void;
  /** e.g. "24 orders" — shown on the chips row. */
  resultLabel?: ReactNode;
  className?: string;
}) {
  const showChipsRow = activeFilters.length > 0 || resultLabel;
  return (
    <div className={cn("space-y-3 border-b border-[#efe5e1] bg-white px-4 py-3.5 sm:px-5", className)}>
      {quickViews}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
        {search}
        {filters || actions ? (
          <div className="flex flex-wrap items-center gap-2">
            {filters}
            {actions ? <div className="flex items-center gap-2 lg:ml-1">{actions}</div> : null}
          </div>
        ) : null}
      </div>
      {showChipsRow ? (
        <div className="flex flex-wrap items-center gap-2 text-[0.82rem]">
          {resultLabel ? <span className="font-medium text-[#6f6265]">{resultLabel}</span> : null}
          {activeFilters.length ? (
            <>
              {resultLabel ? <span className="h-3.5 w-px bg-[#e6dad6]" aria-hidden /> : null}
              {activeFilters.map((f) => (
                <span
                  key={f.key}
                  className="inline-flex items-center gap-1 rounded-full border border-[#ecd3d9] bg-[#fbf1f3] py-0.5 pl-2.5 pr-1 font-medium text-[#5e0a20]"
                >
                  {f.label}
                  <button
                    type="button"
                    onClick={f.onClear}
                    className="grid size-5 place-items-center rounded-full hover:bg-white"
                    aria-label={`Remove filter ${f.label}`}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              {onClearAll && activeFilters.length > 1 ? (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="font-semibold text-[#7b0a2b] underline-offset-2 hover:underline"
                >
                  Clear all
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Small "More ▾" style toggle used inside toolbars. */
export function ToolbarToggle({
  pressed,
  onPressedChange,
  children,
  label,
}: {
  pressed: boolean;
  onPressedChange: (next: boolean) => void;
  children: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-[0.86rem] font-medium",
        pressed ? "border-[#d7b2bc] bg-[#fbf1f3] text-[#5e0a20]" : "border-[#e6dad6] bg-white text-[#3c2a2e] hover:bg-[#fcf8f6]",
      )}
    >
      {children}
      <ChevronDown className={cn("size-3.5 transition-transform", pressed && "rotate-180")} aria-hidden />
    </button>
  );
}
