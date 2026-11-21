/**
 * Client-only navigation for the portal.
 *
 * Every portal route is drawn by one client router (`PortalRouter`, keyed on the browser
 * pathname), so changing pages only needs a history entry. Going through vinext's router
 * instead asks the host for an RSC payload (`?_rsc`), which static hosts (S3 + CloudFront,
 * Netlify) cannot answer, and the fallback is a full page reload.
 *
 * `history.pushState` here goes through vinext's patched history (keeps `usePathname` /
 * `useSearchParams` in sync) and `useBrowserPathname`'s listener (re-renders the router).
 */

/** Paths that are separate Next routes, not part of the client router. These load as documents. */
const DOCUMENT_PATHS = ["/payment-return"];

type NavigateOptions = {
  replace?: boolean;
  /** Scroll to the top after a path change (default true), like next/link. */
  scroll?: boolean;
};

type ScrollState = { __sgScroll?: number } & Record<string, unknown>;

function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

function isDocumentPath(pathname: string): boolean {
  return DOCUMENT_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Returns the same-origin URL this app can handle in-page, or null when the browser should load it. */
export function resolveSpaUrl(href: string): URL | null {
  if (typeof window === "undefined") return null;
  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (isDocumentPath(normalizePath(url.pathname))) return null;
  // A document is already on a document-only route (PhonePe bridge): leave it with a real load.
  if (isDocumentPath(normalizePath(window.location.pathname))) return null;
  return url;
}

/** Remembers the scroll position on the current entry so Back can restore it. */
function rememberScroll() {
  try {
    const state = (window.history.state ?? {}) as ScrollState;
    window.history.replaceState({ ...state, __sgScroll: window.scrollY }, "");
  } catch {
    /* state not cloneable; skip */
  }
}

function scrollToHashOrTop(url: URL) {
  if (url.hash.length > 1) {
    const id = decodeURIComponent(url.hash.slice(1));
    // The new page renders on the next frame.
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView();
    });
    return;
  }
  window.scrollTo(0, 0);
}

export function spaNavigate(href: string, options: NavigateOptions = {}): void {
  if (typeof window === "undefined") return;
  const url = resolveSpaUrl(href);
  if (!url) {
    if (options.replace) window.location.replace(href);
    else window.location.assign(href);
    return;
  }

  const target = `${normalizePath(url.pathname)}${url.search}${url.hash}`;
  const current = `${normalizePath(window.location.pathname)}${window.location.search}${window.location.hash}`;
  const pathChanged = normalizePath(url.pathname) !== normalizePath(window.location.pathname);

  if (target === current) {
    if (pathChanged === false && options.scroll !== false && !url.hash) window.scrollTo(0, 0);
    return;
  }

  if (options.replace) {
    window.history.replaceState({ ...((window.history.state ?? {}) as ScrollState), __sgScroll: 0 }, "", target);
  } else {
    rememberScroll();
    window.history.pushState({ __sgScroll: 0 }, "", target);
  }

  if (options.scroll !== false && (pathChanged || url.hash)) scrollToHashOrTop(url);
}

/** Re-render without leaving the page (stands in for router.refresh on a static host). */
export function spaRefresh(): void {
  if (typeof window === "undefined") return;
  window.history.replaceState(window.history.state, "", window.location.href);
}
