"use client";

import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

function subscribeMedia(query: string) {
  return (onChange: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  };
}

/** `false` during server render, live value in the browser. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribeMedia(query),
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

const noopSubscribe = () => () => {};

/** `true` only after hydration, so random/visual-only markup never mismatches the server HTML. */
export function useMounted(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/** Fires `onChange(isIntersecting, entry)` for one element. */
export function useIntersection(
  ref: RefObject<Element | null>,
  onChange: (visible: boolean, entry: IntersectionObserverEntry) => void,
  options: IntersectionObserverInit = {},
) {
  const { threshold, rootMargin } = options;
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry) onChange(entry.isIntersecting, entry);
    }, { threshold, rootMargin });
    io.observe(el);
    return () => io.disconnect();
    // onChange is read fresh through the closure on each observer callback
  }, [ref, threshold, rootMargin]);
}

/**
 * Same behaviour as the static page: every `.rv` element fades up once it scrolls
 * into view. The class is added straight to the DOM because the elements' own
 * className props never change, so React never overwrites it.
 */
export function useRevealOnScroll(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("on");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    root.querySelectorAll(".rv").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootRef]);
}

/** Index of the card nearest the centre of a horizontally scrolling row (phone carousels). */
export function useCarouselIndex(
  rowRef: RefObject<HTMLElement | null>,
  itemSelector: string,
): number {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const onScroll = () => {
      const cards = row.querySelectorAll<HTMLElement>(itemSelector);
      const mid = row.scrollLeft + row.clientWidth / 2;
      let best = 0;
      let bestDistance = Infinity;
      cards.forEach((card, i) => {
        const d = Math.abs(card.offsetLeft + card.offsetWidth / 2 - mid);
        if (d < bestDistance) {
          bestDistance = d;
          best = i;
        }
      });
      setIndex(best);
    };
    row.addEventListener("scroll", onScroll, { passive: true });
    return () => row.removeEventListener("scroll", onScroll);
  }, [rowRef, itemSelector]);
  return index;
}

/** Deterministic pseudo-random sequence (mulberry32), so decorative layouts are stable. */
export function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
