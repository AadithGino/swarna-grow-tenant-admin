"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssistantFloatingWindow } from "@/src/components/assistant/AssistantFloatingWindow";

export function AssistantPanel({ open, onOpenChange }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <>
      {!open && (
        <Button
          type="button"
          onClick={() => onOpenChange(true)}
          aria-label="Open Sidekick analytics assistant"
          className="fixed bottom-6 right-6 z-50 hidden h-14 gap-3 rounded-2xl bg-[#730321] px-5 shadow-xl hover:bg-[#5a021a] md:flex"
        >
          <Sparkles className="size-5" />
          <span className="text-left"><span className="block font-semibold">Ask Sidekick</span><span className="block text-[11px] font-normal text-white/75">Your business, in conversation</span></span>
        </Button>
      )}

      <AssistantFloatingWindow open={open} onOpenChange={onOpenChange} />
    </>
  );
}
