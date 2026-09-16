"use client";

import type { ReactNode } from "react";
import { ListFilter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { Surface } from "@/src/components/common/page-parts";
import {
  sanitizeListSearchQueryInput,
  validateListSearchQuery,
} from "@/src/lib/list-date-range";
import { cn } from "@/lib/utils";

export type FilterOption = { value: string; label: string };

const toolbarChrome =
  "overflow-hidden rounded-xl border border-[#e8dde2] bg-white shadow-sm";

const searchFieldClass =
  "h-11 border-0 bg-transparent pl-10 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0";

/** Search + filter in one toolbar row (use inside ListToolbar or any Surface). */
export function SearchFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filterValue,
  onFilterChange,
  filterOptions,
  filterLabel = "Status",
  className,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  filterValue: string;
  onFilterChange: (value: string) => void;
  filterOptions: FilterOption[];
  filterLabel?: string;
  className?: string;
}) {
  const selectedLabel = filterLabelFor(filterOptions, filterValue);
  const searchError = validateListSearchQuery(searchValue);

  return (
    <div className={cn("space-y-1", className)}>
      <div
        className={cn(
          "flex flex-col sm:flex-row sm:items-stretch",
          toolbarChrome,
        )}
      >
      <div className="relative min-w-0 flex-1 border-b border-[#efe6ea] bg-[#faf6f7] sm:border-b-0 sm:border-r">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchValue}
          onChange={(e) =>
            onSearchChange(sanitizeListSearchQueryInput(e.target.value))
          }
          placeholder={searchPlaceholder}
          className={cn(
            searchFieldClass,
            "rounded-none sm:rounded-l-xl",
            searchError && "border-red-600",
          )}
          aria-label="Search"
          aria-invalid={Boolean(searchError)}
        />
      </div>

      <Select value={filterValue} onValueChange={onFilterChange}>
        <SelectTrigger
          aria-label={`${filterLabel}: ${selectedLabel}`}
          className="h-11 w-full min-h-11 gap-2 rounded-none border-0 bg-[#faf6f7] px-3 shadow-none focus-visible:ring-2 focus-visible:ring-[#730321]/20 focus-visible:ring-offset-0 sm:w-[min(100%,17.5rem)] sm:shrink-0 sm:rounded-r-xl sm:px-4 [&>svg:last-child]:ml-auto [&>svg:last-child]:opacity-50"
        >
          <ListFilter
            className="size-4 shrink-0 text-[#730321]"
            aria-hidden
          />
          <span className="hidden text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:inline">
            {filterLabel}
          </span>
          <span
            className="hidden h-4 w-px shrink-0 bg-[#e8dde2] sm:inline"
            aria-hidden
          />
          <SelectValue className="min-w-0 flex-1 text-left font-medium text-foreground" />
        </SelectTrigger>
        <SelectContent
          position="popper"
          align="start"
          sideOffset={6}
          className={cn(
            "max-h-80 rounded-xl border-[#e8dde2] p-1 shadow-lg",
            "w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]",
          )}
        >
          <SelectGroup>
            <SelectLabel className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {filterLabel}
            </SelectLabel>
            {filterOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="rounded-lg py-2 pr-8"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      </div>
      <FormFieldError message={searchError} />
    </div>
  );
}

/** Standard list page toolbar shell (search bar + optional bulk/footer slot). */
export function ListToolbar({
  children,
  footer,
  className,
}: {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Surface className={cn("overflow-visible", className)}>
      <div className="p-4">{children}</div>
      {footer}
    </Surface>
  );
}

export function filterLabelFor(
  options: FilterOption[],
  value: string,
  fallback = "All",
) {
  return options.find((option) => option.value === value)?.label ?? fallback;
}

/** Search-only toolbar (same chrome as SearchFilterBar search half). */
export function SearchToolbar({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  const searchError = validateListSearchQuery(value);

  return (
    <div className={cn("space-y-1", className)}>
      <div className={cn(toolbarChrome, "bg-[#faf6f7]")}>
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) =>
              onChange(sanitizeListSearchQueryInput(e.target.value))
            }
            placeholder={placeholder}
            className={cn(
              searchFieldClass,
              "rounded-xl",
              searchError && "border-red-600",
            )}
            aria-label="Search"
            aria-invalid={Boolean(searchError)}
          />
        </div>
      </div>
      <FormFieldError message={searchError} />
    </div>
  );
}
