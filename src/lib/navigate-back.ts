import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  isPortalInternalPath,
  readPreviousPortalPath,
  samePortalRealm,
} from "@/src/lib/portal-nav";

function historyIndex(): number | null {
  if (typeof window === "undefined") return null;
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  return typeof idx === "number" ? idx : null;
}

/** True when browser back likely stays inside the current portal context. */
export function canNavigateBackInPortal(): boolean {
  if (typeof window === "undefined") return false;
  const idx = historyIndex();
  if (idx == null || idx <= 0) return false;
  const previousPath = readPreviousPortalPath();
  if (!previousPath || !isPortalInternalPath(previousPath)) return false;
  return samePortalRealm(window.location.pathname, previousPath);
}

/** Prefer browser back when prior in-app navigation exists; otherwise use fallback. */
export function navigateBack(router: AppRouterInstance, fallbackHref: string) {
  if (canNavigateBackInPortal()) {
    router.back();
    return;
  }
  router.push(fallbackHref);
}
