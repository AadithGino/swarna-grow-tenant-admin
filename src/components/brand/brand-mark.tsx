import { Layers3 } from "lucide-react";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-[#720321] shadow-sm"
        aria-label="Swarna Grow logo placeholder"
      >
        <Layers3 className="size-7" strokeWidth={1.8} />
      </div>
      {!compact && (
        <div className="min-w-0">
          <div className="truncate text-[1.05rem] font-extrabold tracking-[0.15em] text-white">
            SWARNA GROW
          </div>
          <div className="mt-1 truncate text-[0.72rem] font-semibold tracking-[0.22em] text-[#e4b94d]">
            GOLD SCHEME OS
          </div>
        </div>
      )}
    </div>
  );
}
