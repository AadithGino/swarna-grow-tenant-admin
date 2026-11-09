"use client";

import { useSyncExternalStore } from "react";

/** Netlify pretty URLs append a trailing slash; treat `/login/` as `/login`. */
export function normalizeBrowserPathname(pathname: string): string {
  const path = (pathname || "/").split("?")[0] || "/";
  if (path === "/") return "/";
  return path.replace(/\/+$/, "") || "/";
}

function readPathname(): string {
  if (typeof window === "undefined") return "/";
  return normalizeBrowserPathname(window.location.pathname || "/");
}

const listeners = new Set<() => void>();
let lastEmittedPathname = "";
let emitScheduled = false;

function emitPathname() {
  if (emitScheduled) return;
  emitScheduled = true;
  queueMicrotask(() => {
    emitScheduled = false;
    const next = readPathname();
    if (next === lastEmittedPathname) return;
    lastEmittedPathname = next;
    for (const listener of listeners) listener();
  });
}

let historyPatched = false;

type HistoryFn = History["pushState"] & { __sgPath?: boolean };

function patchVinextOriginals() {
  const state = (
    window as unknown as Record<symbol, { originalPushState?: HistoryFn; originalReplaceState?: HistoryFn }>
  )[Symbol.for("vinext.clientNavigationState")];
  const wrapOriginal = (key: "originalPushState" | "originalReplaceState") => {
    const native = state?.[key];
    if (!native || native.__sgPath) return;
    const wrapped: HistoryFn = function (this: History, ...args: Parameters<HistoryFn>) {
      const result = native.apply(this, args);
      emitPathname();
      return result;
    };
    wrapped.__sgPath = true;
    state![key] = wrapped;
  };
  wrapOriginal("originalPushState");
  wrapOriginal("originalReplaceState");
}

/** One shared history patch. Per-subscriber wrappers used to overwrite each other, so the sidebar stopped updating after the page did. */
function ensureHistoryPatch() {
  if (typeof window === "undefined") return;
  patchVinextOriginals();
  if (historyPatched) return;
  historyPatched = true;
  lastEmittedPathname = readPathname();

  const wrap = (original: History["pushState"]): History["pushState"] =>
    function (this: History, ...args: Parameters<History["pushState"]>) {
      const result = original.apply(this, args);
      emitPathname();
      return result;
    };

  window.history.pushState = wrap(window.history.pushState);
  window.history.replaceState = wrap(window.history.replaceState);
  window.addEventListener("popstate", emitPathname);
}

function subscribe(onStoreChange: () => void): () => void {
  ensureHistoryPatch();
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

/** Real URL path — use instead of `usePathname()` on static hosts (Netlify + vinext). */
export function useBrowserPathname(): string {
  return useSyncExternalStore(subscribe, readPathname, () => "/");
}
