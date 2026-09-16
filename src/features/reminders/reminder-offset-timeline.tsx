"use client";

import { Switch } from "@/components/ui/switch";

type Offset = {
  key: string;
  label: string;
  days: number;
  enabled: boolean;
  messageType: string;
};

export function ReminderOffsetTimeline({
  offsets,
  onToggle,
}: {
  offsets: Offset[];
  onToggle: (key: string, enabled: boolean) => void;
}) {
  const sorted = [...offsets].sort((a, b) => a.days - b.days);
  return (
    <div className="overflow-x-auto p-5">
      <div className="relative min-w-[640px] pt-8">
        <div className="absolute left-0 right-0 top-12 h-0.5 bg-[#eadde0]" />
        <div className="absolute left-1/2 top-8 -translate-x-1/2 rounded-full bg-[#730321] px-3 py-1 text-xs font-bold text-white">
          Due date
        </div>
        <div className="flex justify-between gap-2">
          {sorted.map((o) => (
            <div
              key={o.key}
              className="relative z-10 flex max-w-[100px] flex-col items-center text-center"
            >
              <Switch
                checked={o.enabled}
                onCheckedChange={(v) => onToggle(o.key, v)}
                aria-label={o.label}
              />
              <span className="mt-2 text-[10px] font-semibold uppercase text-muted-foreground">
                {o.days < 0 ? `D${o.days}` : o.days === 0 ? "D-day" : `D+${o.days}`}
              </span>
              <span className="mt-1 text-xs leading-tight">{o.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
