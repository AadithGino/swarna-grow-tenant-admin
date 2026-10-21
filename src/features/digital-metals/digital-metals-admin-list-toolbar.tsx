"use client";

import { ListSearchInput } from "@/src/components/common/list-search-input";
import { FieldLabel } from "@/src/components/common/page-parts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DigitalMetalsAdminListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search by order id",
  status,
  onStatusChange,
  statusOptions,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  status: string;
  onStatusChange: (v: string) => void;
  statusOptions: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="min-w-[12rem] flex-1">
        <FieldLabel>Search</FieldLabel>
        <ListSearchInput value={search} onChange={onSearchChange} placeholder={searchPlaceholder} />
      </div>
      <div className="w-full sm:w-48">
        <FieldLabel>Status</FieldLabel>
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/** Client-side filter when API has no text search. */
export function filterRowsByIdPrefix<T extends { id: string }>(rows: T[], q: string): T[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((r) => r.id.toLowerCase().includes(needle));
}
