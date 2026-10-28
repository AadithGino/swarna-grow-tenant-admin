"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidekickOrb } from "@/src/components/assistant/sidekick-primitives";
import type { AssistantStep } from "@/src/types/assistant";

function StepIcon({ status }: { status: AssistantStep["status"] }) {
  if (status === "running") return <i aria-hidden className="sk-spinner block size-3.5 shrink-0" />;
  if (status === "error")
    return (
      <i aria-hidden className="grid size-3.5 shrink-0 place-items-center rounded-full bg-[var(--sk-line-2)] text-white">
        <X className="size-2.5" strokeWidth={3} />
      </i>
    );
  return (
    <i aria-hidden className="grid size-3.5 shrink-0 place-items-center rounded-full bg-[var(--sk-ok)] text-white">
      <Check className="size-2.5" strokeWidth={3.5} />
    </i>
  );
}

/** Live checklist while Sidekick works — mirrors the landing page "thinking" card. */
export function AssistantThinking({ steps }: { steps: AssistantStep[] }) {
  const visible = steps.length ? steps : [{ id: "think", label: "Understanding your question", status: "running" as const }];
  const running = visible.some((s) => s.status === "running");
  return (
    <div className="sk-pop flex items-start gap-3" role="status" aria-live="polite">
      <SidekickOrb size={30} busy className="mt-0.5" />
      <div className="min-w-[15rem] max-w-md rounded-2xl rounded-tl-md border border-[var(--sk-line)] bg-white px-4 py-3 shadow-[var(--sk-shadow)]">
        <ul className="space-y-2 text-[12.5px]">
          {visible.map((step) => (
            <li key={step.id} className={cn("flex items-center gap-2.5", step.status !== "running" && "text-[var(--sk-ink-2)]")}>
              <StepIcon status={step.status} />
              <span className={cn("min-w-0 flex-1 truncate", step.status === "running" ? "sk-shimmer font-medium" : "")}>
                {step.label}
              </span>
              {step.detail && step.status !== "running" ? (
                <span className="shrink-0 text-[11px] text-[var(--sk-muted)]">{step.detail}</span>
              ) : null}
            </li>
          ))}
          {!running ? (
            <li className="flex items-center gap-2.5">
              <i aria-hidden className="sk-spinner block size-3.5 shrink-0" />
              <span className="sk-shimmer font-medium">Writing the answer</span>
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
