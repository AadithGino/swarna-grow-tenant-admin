"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { applyThisMonthRange } from "@/src/lib/list-date-range";

/** Backend workboard presets (see resolveDatePreset). */
export type WorkboardDatePreset =
  | "TODAY"
  | "TOMORROW"
  | "THIS_WEEK"
  | "NEXT_7_DAYS"
  | "CUSTOM";

const WORKBOARD_PRESET_OPTIONS: {
  value: WorkboardDatePreset;
  label: string;
}[] = [
  { value: "TODAY", label: "Today" },
  { value: "TOMORROW", label: "Tomorrow" },
  { value: "THIS_WEEK", label: "This week" },
  { value: "NEXT_7_DAYS", label: "Next 7 days" },
  { value: "CUSTOM", label: "Custom range" },
];

export function WorkboardDateRangeFilter({
  mode,
  onModeChange,
  from,
  to,
  onFromChange,
  onToChange,
  label = "Due",
}: {
  mode: WorkboardDatePreset;
  onModeChange: (mode: WorkboardDatePreset) => void;
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  label?: string;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#eaded9] bg-[#f7f0ec]/70 px-2 py-1.5"
      role="group"
      aria-label={`${label} date range`}
    >
      <span className="hidden pl-1 text-[11px] font-semibold uppercase tracking-wide text-[#776a6d] sm:inline">
        {label}
      </span>
      <Select
        value={mode}
        onValueChange={(v) => onModeChange(v as WorkboardDatePreset)}
      >
        <SelectTrigger className="h-8 w-[9.5rem] border-0 bg-white/80 px-2 text-sm shadow-none">
          <SelectValue placeholder="Period" />
        </SelectTrigger>
        <SelectContent>
          {WORKBOARD_PRESET_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {mode === "CUSTOM" ? (
        <>
          <Input
            type="date"
            aria-label="From date"
            className="h-8 w-[8.75rem] border-0 bg-white/80 px-2 text-sm shadow-none"
            value={from}
            max={to}
            onChange={(e) => onFromChange(e.target.value)}
          />
          <span className="text-xs text-[#9a8a8e]" aria-hidden>
            –
          </span>
          <Input
            type="date"
            aria-label="To date"
            className="h-8 w-[8.75rem] border-0 bg-white/80 px-2 text-sm shadow-none"
            value={to}
            min={from}
            onChange={(e) => onToChange(e.target.value)}
          />
        </>
      ) : null}
    </div>
  );
}

export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  label = "Period",
  presetLabel = "This month",
  onPreset,
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  label?: string;
  presetLabel?: string;
  onPreset?: () => void;
}) {
  const applyPreset =
    onPreset ??
    (() => {
      const { from: presetFrom, to: presetTo } = applyThisMonthRange();
      onFromChange(presetFrom);
      onToChange(presetTo);
    });

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#eaded9] bg-[#f7f0ec]/70 px-2 py-1.5"
      role="group"
      aria-label={`${label} date range`}
    >
      <span className="hidden pl-1 text-[11px] font-semibold uppercase tracking-wide text-[#776a6d] sm:inline">
        {label}
      </span>
      <Input
        type="date"
        aria-label="From date"
        className="h-8 w-[8.75rem] border-0 bg-white/80 px-2 text-sm shadow-none"
        value={from}
        max={to}
        onChange={(e) => onFromChange(e.target.value)}
      />
      <span className="text-xs text-[#9a8a8e]" aria-hidden>
        –
      </span>
      <Input
        type="date"
        aria-label="To date"
        className="h-8 w-[8.75rem] border-0 bg-white/80 px-2 text-sm shadow-none"
        value={to}
        min={from}
        onChange={(e) => onToChange(e.target.value)}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 shrink-0 px-2 text-xs text-[#5c4a4e] hover:bg-white/80"
        onClick={applyPreset}
      >
        {presetLabel}
      </Button>
    </div>
  );
}
