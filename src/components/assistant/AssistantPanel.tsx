"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AssistantFloatingWindow } from "@/src/components/assistant/AssistantFloatingWindow";

export function AssistantPanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {!open && (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 gap-2 rounded-full bg-[#730321] px-5 shadow-lg hover:bg-[#5a021a]"
        >
          <Sparkles className="size-5" />
          Sidekick
        </Button>
      )}

      <AssistantFloatingWindow open={open} onOpenChange={setOpen} />
    </>
  );
}
