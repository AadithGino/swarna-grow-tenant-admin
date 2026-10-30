"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { SidekickOrb } from "@/src/components/assistant/sidekick-primitives";
import { TOUR_UI_ATTR } from "@/src/lib/tours/dom";
import { useAppSelector } from "@/src/store/hooks";
import { useTours } from "./tour-provider";

/**
 * First visit to the dashboard: offer the 1-minute welcome tour. Answering
 * either way is remembered, and the tour stays in the Guides menu.
 */
export function WelcomeTourPrompt() {
  const pathname = usePathname();
  const { progress, activeTourId, start, markWelcomeSeen, canRun } = useTours();
  const firstName = useAppSelector((s) => s.session.session?.user.name ?? "").split(" ")[0];
  const [visible, setVisible] = useState(false);

  const eligible = pathname === "/" && !progress.welcomeSeen && !activeTourId && canRun("welcome");

  useEffect(() => {
    if (!eligible) return;
    const timer = window.setTimeout(() => setVisible(true), 900);
    return () => window.clearTimeout(timer);
  }, [eligible]);

  if (!visible || !eligible) return null;

  return (
    <div
      {...{ [TOUR_UI_ATTR]: "" }}
      role="dialog"
      aria-labelledby="welcome-tour-title"
      className="sidekick sk-pop fixed inset-x-3 bottom-3 z-[85] rounded-2xl border border-[var(--sk-line-2)] bg-white p-5 shadow-[0_30px_60px_-24px_rgba(62,12,21,0.55)] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[23rem]"
    >
      <button
        type="button"
        onClick={markWelcomeSeen}
        aria-label="Dismiss"
        className="absolute right-3 top-3 grid size-7 place-items-center rounded-lg text-[var(--sk-muted)] hover:bg-[var(--sk-cream-2)] hover:text-[var(--sk-ink)]"
      >
        <X className="size-4" />
      </button>
      <div className="flex items-start gap-3">
        <SidekickOrb size={40} />
        <div className="min-w-0 pr-5">
          <h2 id="welcome-tour-title" className="text-[17px] font-extrabold leading-tight tracking-[-0.02em] text-[var(--sk-ink)]">
            Welcome{firstName ? `, ${firstName}` : ""}! New here?
          </h2>
          <p className="mt-1.5 text-[13px] leading-5 text-[var(--sk-ink-2)]">
            Take a 1-minute tour of the portal. Later, if you forget how to do something, just ask Sidekick and it will
            show you on screen.
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={markWelcomeSeen}
          className="h-9 rounded-xl px-3 text-[13px] font-semibold text-[var(--sk-ink-2)] hover:bg-[var(--sk-cream-2)]"
        >
          Maybe later
        </button>
        <button
          type="button"
          onClick={() => start("welcome", "welcome")}
          className="h-9 rounded-xl bg-gradient-to-br from-[var(--sk-maroon-2)] to-[var(--sk-maroon)] px-4 text-[13px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(115,3,33,0.9)] hover:-translate-y-px"
        >
          Show me around
        </button>
      </div>
    </div>
  );
}
