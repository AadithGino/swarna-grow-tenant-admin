import { cn } from "@/lib/utils";

/** Paid cycles as a segmented bar (one segment per instalment, compressed past 24) with "4 / 12" beside it. */
export function CycleProgress({
  progress,
  tenure,
  className,
  tone = "wine",
}: {
  progress: number;
  tenure: number;
  className?: string;
  tone?: "wine" | "gold" | "red";
}) {
  const total = Math.max(1, Number(tenure) || 1);
  const done = Math.max(0, Math.min(total, Number(progress) || 0));
  const segments = Math.min(total, 24);
  const filled = Math.round((done / total) * segments);
  const fill = tone === "gold" ? "bg-[#c99a3c]" : tone === "red" ? "bg-red-500" : "bg-[#7b0a2b]";
  return (
    <div className={cn("flex min-w-[9.5rem] items-center gap-2", className)}>
      <div className="flex flex-1 gap-[2px]" aria-hidden>
        {Array.from({ length: segments }, (_, i) => (
          <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < filled ? fill : "bg-[#efe4e1]")} />
        ))}
      </div>
      <span className="shrink-0 text-xs font-semibold tabular-nums text-[#5c4a4e]">
        {done} / {total}
      </span>
      <span className="sr-only">
        {done} of {total} instalments paid
      </span>
    </div>
  );
}
