import { Layers3 } from "lucide-react";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#720321] shadow-sm"
        aria-hidden
      >
        <Layers3 className="size-6" strokeWidth={1.8} />
      </div>
      {!compact && (
        <div className="min-w-0">
          <div className="whitespace-nowrap text-[0.98rem] font-extrabold tracking-[0.1em] text-white">
            SWARNA GROW
          </div>
          <div className="mt-0.5 whitespace-nowrap text-[0.66rem] font-semibold tracking-[0.18em] text-[#e9c98e]">
            GOLD SCHEME OS
          </div>
        </div>
      )}
    </div>
  );
}
