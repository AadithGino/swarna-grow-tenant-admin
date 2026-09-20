"use client";

import { Switch } from "@/components/ui/switch";

type Offset = {
  key: string;
  label: string;
  days: number;
  enabled: boolean;
  messageType: string;
};

/** Fixed-installment due/overdue offsets only (excludes flex nudge, lock, maturity). */
function fixedInstallmentOffsets(offsets: Offset[]) {
  return offsets.filter((o) => /^D_/.test(o.key));
}

export function ReminderOffsetTimeline({
  offsets,
  onToggle,
}: {
  offsets: Offset[];
  onToggle: (key: string, enabled: boolean) => void;
}) {
  const sorted = [...fixedInstallmentOffsets(offsets)].sort(
    (a, b) => a.days - b.days,
  );
  if (sorted.length === 0) return null;

  return (
    <div className="overflow-x-auto p-5">
      <p className="mb-4 text-sm text-muted-foreground">
        Fixed scheme instalments — toggle each point on the timeline or in the list
        below.
      </p>
      <div
        className="relative pt-8"
        style={{ minWidth: `${Math.max(720, sorted.length * 88)}px` }}
      >
        <div className="absolute left-4 right-4 top-12 h-0.5 bg-[#eadde0]" />
        <div className="absolute left-1/2 top-6 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#730321] px-3 py-1 text-xs font-bold text-white">
          Due date
        </div>
        <div className="flex justify-between gap-1 px-2">
          {sorted.map((o) => (
            <div
              key={o.key}
              className="relative z-10 flex w-[72px] shrink-0 flex-col items-center text-center"
            >
              <Switch
                checked={o.enabled}
                onCheckedChange={(v) => onToggle(o.key, v)}
                aria-label={o.label}
              />
              <span className="mt-2 text-[10px] font-semibold uppercase text-muted-foreground">
                {o.days < 0 ? `D${o.days}` : o.days === 0 ? "D-day" : `D+${o.days}`}
              </span>
              <span className="mt-1 line-clamp-2 text-[11px] leading-tight">
                {o.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
