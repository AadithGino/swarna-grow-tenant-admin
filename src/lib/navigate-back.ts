import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

/** True when the browser likely has a prior in-app page to return to. */
export function canNavigateBack(): boolean {
  if (typeof window === "undefined") return false;
  return window.history.length > 1;
}

/** Prefer browser back; use fallback when opened directly or with no history. */
export function navigateBack(router: AppRouterInstance, fallbackHref: string) {
  if (canNavigateBack()) {
    router.back();
    return;
  }
  router.push(fallbackHref);
}
