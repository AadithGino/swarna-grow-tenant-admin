"use client";

import { useSyncExternalStore } from "react";

function readPathname(): string {
  if (typeof window === "undefined") return "/";
  return window.location.pathname || "/";
}

function subscribe(onStoreChange: () => void): () => void {
  const onPop = () => onStoreChange();
  window.addEventListener("popstate", onPop);
  const { pushState, replaceState } = window.history;
  const wrap =
    (original: typeof pushState) =>
    (...args: Parameters<typeof pushState>) => {
      const result = original.apply(window.history, args);
      onStoreChange();
      return result;
    };
  window.history.pushState = wrap(pushState);
  window.history.replaceState = wrap(replaceState);
  return () => {
    window.removeEventListener("popstate", onPop);
    window.history.pushState = pushState;
    window.history.replaceState = replaceState;
  };
}

/** Real URL path — use instead of `usePathname()` on static hosts (Netlify + vinext). */
export function useBrowserPathname(): string {
  return useSyncExternalStore(subscribe, readPathname, () => "/");
}
