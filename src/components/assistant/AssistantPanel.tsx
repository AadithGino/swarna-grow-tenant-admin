"use client";

import { AssistantFloatingWindow } from "@/src/components/assistant/AssistantFloatingWindow";
import { ASSISTANT_NAME, SidekickOrb } from "@/src/components/assistant/sidekick-primitives";

export function AssistantPanel({ open, onOpenChange }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          aria-label={`Open ${ASSISTANT_NAME} AI assistant`}
          className="sidekick group fixed bottom-6 right-6 z-50 hidden items-center gap-3 rounded-2xl bg-gradient-to-br from-[var(--sk-maroon-2)] to-[var(--sk-maroon)] py-2.5 pl-2.5 pr-5 text-left text-white shadow-[0_18px_40px_-16px_rgba(115,3,33,0.75)] transition hover:-translate-y-0.5 md:flex"
        >
          <SidekickOrb size={36} />
          <span>
            <span className="block text-[14px] font-bold leading-tight">Ask {ASSISTANT_NAME}</span>
            <span className="block text-[11px] font-normal text-white/75">Anything about your business</span>
          </span>
        </button>
      )}

      <AssistantFloatingWindow open={open} onOpenChange={onOpenChange} />
    </>
  );
}
