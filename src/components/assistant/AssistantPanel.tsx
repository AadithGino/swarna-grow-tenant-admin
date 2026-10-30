"use client";

import { cn } from "@/lib/utils";
import { AssistantFloatingWindow } from "@/src/components/assistant/AssistantFloatingWindow";

/**
 * Right-hand Sidekick column. Desktop: a sticky column in the shell's flex row,
 * so the page narrows beside it and nothing is hidden underneath. Phones and
 * tablets: a full-screen sheet. Opened from the "Ask Sidekick" button in the
 * top bar — there is no floating launcher covering page content.
 */
export function AssistantPanel({
  open,
  onOpenChange,
  wide,
  onToggleWide,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wide: boolean;
  onToggleWide: () => void;
}) {
  if (!open) return null;
  return (
    <aside
      aria-label="Sidekick assistant"
      className={cn(
        "fixed inset-0 z-[60] bg-white",
        "lg:sticky lg:inset-auto lg:top-0 lg:z-30 lg:h-screen lg:shrink-0 lg:border-l lg:border-[#e8dcd7] lg:shadow-[-12px_0_32px_-24px_rgb(61_12_21/35%)]",
        wide ? "lg:w-[min(40rem,42vw)]" : "lg:w-[24rem] 2xl:w-[27rem]",
      )}
    >
      <AssistantFloatingWindow
        open={open}
        onOpenChange={onOpenChange}
        wide={wide}
        onToggleWide={onToggleWide}
      />
    </aside>
  );
}
