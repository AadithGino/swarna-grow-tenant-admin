"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  MousePointerClick,
  RotateCw,
  SearchX,
  TriangleAlert,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useClientMounted } from "@/src/hooks/use-client-mounted";
import { SidekickOrb } from "@/src/components/assistant/sidekick-primitives";
import { clickableWithin, isDisabledControl, stepHasTarget, TOUR_UI_ATTR } from "@/src/lib/tours/dom";
import type { Tour, TourPlacement, TourStep } from "@/src/lib/tours/types";

export type TourPhase = "locating" | "showing" | "missing";

type Rect = { top: number; left: number; width: number; height: number };
type Size = { w: number; h: number };

const PAD = 6;
const GAP = 14;
const EDGE = 12;
/** How long a glide between two targets takes (keep in sync with .tour-glide in globals.css). */
const GLIDE_MS = 520;
const DIM = "rgba(34, 18, 25, 0.52)";
const DIM_IN_DIALOG = "rgba(34, 18, 25, 0.26)";

type CardPos = { top: number; left: number };

/** Where the card goes: the requested side if it fits, otherwise the roomiest side. */
function placeCard(rect: Rect | null, size: Size, vp: Size, preferred: TourPlacement = "auto"): CardPos {
  if (!rect) {
    return { top: Math.max(EDGE, (vp.h - size.h) / 2), left: Math.max(EDGE, (vp.w - size.w) / 2) };
  }
  const space = {
    bottom: vp.h - (rect.top + rect.height) - GAP,
    top: rect.top - GAP,
    right: vp.w - (rect.left + rect.width) - GAP,
    left: rect.left - GAP,
  };
  const fits = {
    bottom: space.bottom >= size.h + EDGE,
    top: space.top >= size.h + EDGE,
    right: space.right >= size.w + EDGE,
    left: space.left >= size.w + EDGE,
  };
  const order: Array<keyof typeof fits> =
    preferred !== "auto" ? [preferred, "bottom", "top", "right", "left"] : ["bottom", "top", "right", "left"];
  let side = order.find((s) => fits[s]);
  if (!side) {
    side = (Object.keys(space) as Array<keyof typeof space>).reduce((a, b) =>
      space[a] / (a === "left" || a === "right" ? size.w : size.h) >=
      space[b] / (b === "left" || b === "right" ? size.w : size.h)
        ? a
        : b,
    );
  }
  let top: number;
  let left: number;
  if (side === "bottom" || side === "top") {
    top = side === "bottom" ? rect.top + rect.height + GAP : rect.top - GAP - size.h;
    left = rect.left + rect.width / 2 - size.w / 2;
  } else {
    left = side === "right" ? rect.left + rect.width + GAP : rect.left - GAP - size.w;
    top = rect.top + Math.min(rect.height, 160) / 2 - 36;
  }
  top = Math.min(Math.max(EDGE, top), vp.h - size.h - EDGE);
  left = Math.min(Math.max(EDGE, left), vp.w - size.w - EDGE);
  return { top, left };
}

function ExampleChip({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-[var(--sk-gold)] bg-[var(--sk-gold-soft)] px-3 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9a6f2a]">Example</span>
      <span className="min-w-0 flex-1 truncate font-mono text-[13px] font-semibold text-[var(--sk-maroon)]">{value}</span>
      <button
        type="button"
        className="grid size-7 shrink-0 place-items-center rounded-lg text-[var(--sk-ink-2)] transition hover:bg-white hover:text-[var(--sk-maroon)]"
        aria-label={copied ? "Copied" : `Copy example ${value}`}
        title="Copy, then paste it into the field"
        onClick={() => {
          void navigator.clipboard?.writeText(value).then(
            () => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1400);
            },
            () => undefined,
          );
        }}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}

/**
 * Positions the spotlight and card straight on the DOM every animation frame, so
 * following a scrolling page costs no React renders. When the target changes the
 * two elements get `data-glide` and CSS transitions carry them to the new spot.
 */
function useStage({
  target,
  phase,
  placement,
  stepKey,
}: {
  target: HTMLElement | null;
  phase: TourPhase;
  placement: TourPlacement | undefined;
  stepKey: string;
}) {
  const spotRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const live = useRef({ target, phase, placement });
  const glideUntil = useRef(0);
  useLayoutEffect(() => {
    live.current = { target, phase, placement };
  }, [target, phase, placement]);
  // Glide on every new step (and on the first frame).
  useLayoutEffect(() => {
    glideUntil.current = performance.now() + GLIDE_MS;
  }, [stepKey]);

  useLayoutEffect(() => {
    const spot = spotRef.current;
    const card = cardRef.current;
    const inner = innerRef.current;
    if (!spot || !card || !inner) return;
    let frame = 0;
    let lastTarget: HTMLElement | null = null;
    let lastSpot: Rect | null = null; // kept while the next target is being found
    let prev = "";

    const tick = () => {
      const now = performance.now();
      const { target: el, phase: ph, placement: pl } = live.current;
      const vp = { w: window.innerWidth, h: window.innerHeight };
      const mobile = vp.w < 640;

      // ---- read ----
      let rect: Rect | null = null;
      if (el && ph === "showing" && el.isConnected) {
        const r = el.getBoundingClientRect();
        rect = { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
        if (el !== lastTarget) {
          lastTarget = el;
          glideUntil.current = now + GLIDE_MS;
        }
        lastSpot = rect;
      } else if (ph === "locating" && lastSpot) {
        rect = lastSpot; // hold still until the next element turns up
      } else if (ph !== "locating") {
        lastSpot = null;
        lastTarget = null;
      }
      const contentH = inner.offsetHeight;
      const cardW = mobile ? vp.w - EDGE * 2 : 344;
      const inDialog = Boolean(el?.closest("[role='dialog']:not([data-tour-ui]), [role='alertdialog']"));

      // ---- write ----
      const gliding = now < glideUntil.current;
      const spotRect = rect ?? { top: vp.h / 2, left: vp.w / 2, width: 0, height: 0 };
      const dim = inDialog ? DIM_IN_DIALOG : ph === "locating" && !rect ? "rgba(34,18,25,0.14)" : DIM;
      let dock = "";
      let pos: CardPos | null = null;
      if (mobile) {
        dock = rect && rect.top + rect.height > vp.h - contentH - 24 && rect.top > contentH + 24 ? "top" : "bottom";
      } else {
        pos = placeCard(rect, { w: cardW, h: contentH }, vp, pl);
      }
      const sig = [
        Math.round(spotRect.left * 2), Math.round(spotRect.top * 2), Math.round(spotRect.width * 2), Math.round(spotRect.height * 2),
        dim, dock, pos ? Math.round(pos.left * 2) : "", pos ? Math.round(pos.top * 2) : "", contentH, gliding, mobile,
      ].join("|");
      if (sig !== prev) {
        prev = sig;
        spot.toggleAttribute("data-glide", gliding);
        card.toggleAttribute("data-glide", gliding);
        spot.style.transform = `translate3d(${spotRect.left}px, ${spotRect.top}px, 0)`;
        spot.style.width = `${spotRect.width}px`;
        spot.style.height = `${spotRect.height}px`;
        spot.style.boxShadow = `0 0 0 200vmax ${dim}`;
        spot.style.outlineColor = rect ? "" : "transparent";
        card.style.height = `${contentH}px`;
        if (mobile) {
          card.dataset.dock = dock;
          card.setAttribute("data-mobile", "");
          card.style.transform = "";
          card.style.width = "";
        } else {
          card.removeAttribute("data-mobile");
          card.style.width = `${cardW}px`;
          card.style.transform = `translate3d(${pos!.left}px, ${pos!.top}px, 0)`;
        }
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return { spotRef, cardRef, innerRef };
}

export function TourOverlay({
  tour,
  step,
  index,
  total,
  phase,
  target,
  canGoBack,
  onPrimary,
  onBack,
  onSkipStep,
  onRetry,
  onClose,
}: {
  tour: Tour;
  step: TourStep;
  index: number;
  total: number;
  phase: TourPhase;
  target: HTMLElement | null;
  canGoBack: boolean;
  onPrimary: () => void;
  onBack: () => void;
  onSkipStep: () => void;
  onRetry: () => void;
  onClose: () => void;
}) {
  const mounted = useClientMounted();
  const showing = phase === "showing";
  const spotEl = showing ? target : null;
  const { spotRef, cardRef, innerRef } = useStage({
    target,
    phase,
    placement: step.placement,
    stepKey: `${tour.id}:${step.id}`,
  });

  // Move keyboard focus to the card when a new step appears (not while typing in a form).
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (phase !== "showing") return;
    const active = document.activeElement;
    const typing = active instanceof HTMLElement && active.matches("input, textarea, select, [contenteditable='true']");
    if (!typing) titleRef.current?.focus({ preventScroll: true });
  }, [phase, index]);

  if (!mounted) return null;

  const isClick = step.advance === "click" || step.advance === "selected";
  const isRoute = typeof step.advance === "object";
  const disabled = Boolean(spotEl && isClick && isDisabledControl(clickableWithin(spotEl)));
  const last = index >= total - 1;

  const primaryLabel = isClick
    ? disabled
      ? "Skip this step"
      : "Do it for me"
    : isRoute
      ? "Open the first one"
      : last
        ? "Finish"
        : "Next";

  return createPortal(
    <div className="sidekick" {...{ [TOUR_UI_ATTR]: "" }}>
      {/* Spotlight: a hole in a dim layer. Pointer events pass through so the real UI stays usable. */}
      <div ref={spotRef} aria-hidden className="tour-spot pointer-events-none">
        <span className={cn("tour-ring", showing && isClick && !disabled && "tour-ring-pulse")} />
      </div>

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-step-title"
        data-step={step.id}
        data-phase={phase}
        data-index={index}
        data-total={total}
        className="tour-card"
        style={{ pointerEvents: "auto" }}
      >
        <div ref={innerRef}>
          <div className="h-1 w-full bg-[var(--sk-cream-2)]">
            <div
              className="h-full bg-gradient-to-r from-[var(--sk-maroon)] to-[var(--sk-gold)] transition-[width] duration-500"
              style={{ width: `${((index + 1) / Math.max(total, 1)) * 100}%` }}
            />
          </div>

          <div key={`${tour.id}:${step.id}:${phase}`}
            className={cn("p-4", phase === "locating" ? "tour-step-wait" : "tour-step-in")}
          >
            <div className="flex items-center gap-2">
              <SidekickOrb size={22} busy={phase === "locating"} />
              <p className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-[var(--sk-ink-2)]">
                {tour.title}
                <span className="font-normal text-[var(--sk-muted)]"> · {index + 1} of {total}</span>
              </p>
              <button
                type="button"
                onClick={onClose}
                aria-label="End guide"
                title="End guide"
                className="grid size-7 shrink-0 place-items-center rounded-lg text-[var(--sk-muted)] transition hover:bg-[var(--sk-cream-2)] hover:text-[var(--sk-ink)]"
              >
                <X className="size-4" />
              </button>
            </div>

            {phase === "missing" ? (
              <>
                <h3 ref={titleRef} tabIndex={-1} id="tour-step-title" className="mt-3 flex items-center gap-2 text-[16px] font-bold leading-snug outline-none">
                  <SearchX className="size-4 shrink-0 text-[var(--sk-bad)]" />
                  I can&apos;t find this on screen
                </h3>
                <p className="mt-1.5 text-[13px] leading-5 text-[var(--sk-ink-2)]">
                  I was looking for <strong>{step.title.toLowerCase()}</strong>. The page may still be loading, the form may
                  be closed, or your role may not include this.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                  <button type="button" onClick={onClose} className="mr-auto text-[12.5px] font-medium text-[var(--sk-muted)] hover:text-[var(--sk-ink)]">
                    End guide
                  </button>
                  <button
                    type="button"
                    onClick={onSkipStep}
                    className="h-9 rounded-xl border border-[var(--sk-line-2)] px-3 text-[13px] font-semibold text-[var(--sk-ink-2)] hover:border-[var(--sk-maroon)] hover:text-[var(--sk-maroon)]"
                  >
                    Skip step
                  </button>
                  <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-br from-[var(--sk-maroon-2)] to-[var(--sk-maroon)] px-3.5 text-[13px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(115,3,33,0.9)]"
                  >
                    <RotateCw className="size-3.5" />
                    Try again
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3
                  ref={titleRef}
                  tabIndex={-1}
                  id="tour-step-title"
                  aria-live="polite"
                  className="mt-3 text-[16px] font-bold leading-snug tracking-[-0.01em] outline-none"
                >
                  {phase === "locating" ? <span className="sk-shimmer">{step.title}</span> : step.title}
                </h3>
                <p className="mt-1.5 text-[13px] leading-5 text-[var(--sk-ink-2)]">{step.body}</p>
                {step.example ? <ExampleChip value={step.example} /> : null}
                {showing && isClick && !disabled ? (
                  <p className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-[var(--sk-maroon)]">
                    <MousePointerClick className="size-3.5" />
                    Click the highlighted{" "}
                    {spotEl?.getAttribute("role") === "tab" ? "tab" : spotEl?.matches("a") ? "link" : "button"} to continue
                  </p>
                ) : null}
                {showing && isRoute ? (
                  <p className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-[var(--sk-maroon)]">
                    <MousePointerClick className="size-3.5" />
                    Click a row to continue
                  </p>
                ) : null}
                {disabled ? (
                  <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-[#fff6e5] px-2.5 py-2 text-[12px] leading-4 text-[#8a5a00]">
                    <TriangleAlert className="mt-px size-3.5 shrink-0" />
                    This button is turned off right now. Your plan or role may not allow it yet.
                  </p>
                ) : null}

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="mr-auto text-[12.5px] font-medium text-[var(--sk-muted)] transition hover:text-[var(--sk-ink)]"
                  >
                    {index === 0 ? "Not now" : "Skip guide"}
                  </button>
                  {canGoBack ? (
                    <button
                      type="button"
                      onClick={onBack}
                      aria-label="Previous step"
                      className="grid size-9 place-items-center rounded-xl border border-[var(--sk-line-2)] text-[var(--sk-ink-2)] transition hover:border-[var(--sk-maroon)] hover:text-[var(--sk-maroon)]"
                    >
                      <ArrowLeft className="size-4" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={onPrimary}
                    disabled={phase === "locating" && stepHasTarget(step)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-br from-[var(--sk-maroon-2)] to-[var(--sk-maroon)] px-3.5 text-[13px] font-semibold text-white shadow-[0_8px_18px_-10px_rgba(115,3,33,0.9)] transition hover:-translate-y-px disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {primaryLabel}
                    {last && !isClick && !isRoute ? <Check className="size-4" /> : <ArrowRight className="size-4" />}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
