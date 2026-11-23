"use client";

import { useEffect } from "react";
import { resolveSpaUrl, spaNavigate } from "@/src/lib/spa/spa-navigate";

function findAnchor(event: MouseEvent): HTMLAnchorElement | null {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const target = event.target;
  if (!(target instanceof Element)) return null;
  const anchor = target.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  const tgt = anchor.getAttribute("target");
  if ((tgt && tgt !== "_self") || anchor.hasAttribute("download")) return null;
  if (anchor.dataset.hardNav !== undefined || anchor.getAttribute("rel")?.includes("external")) return null;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || /^(mailto:|tel:|javascript:|sms:|whatsapp:)/i.test(href)) return null;
  return anchor;
}

/**
 * Plain `<a href="/...">` links (not next/link) would load a whole new document.
 * This keeps same-origin portal links in-page. next/link already handles its own clicks
 * (it calls preventDefault), so those are skipped here.
 * Add `data-hard-nav` to a link to force a real page load for that link.
 */
const STALE_RELOAD_KEY = "sg:stale-chunk-reload";
const STALE_IMPORT = /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i;

/**
 * After a new deploy, a tab still on the old build may ask for a JS file that is gone. With
 * CloudFront error responses that request gets index.html instead, and the import fails.
 * Reload once to pick up the new build (at most once a minute, so it can never loop).
 */
function reloadForNewBuild(event?: Event) {
  try {
    const last = Number(sessionStorage.getItem(STALE_RELOAD_KEY) || 0);
    if (Date.now() - last < 60_000) return;
    sessionStorage.setItem(STALE_RELOAD_KEY, String(Date.now()));
  } catch {
    /* storage blocked: still reload once */
  }
  event?.preventDefault();
  window.location.reload();
}

function onStaleChunk(event: Event) {
  reloadForNewBuild(event);
}

function onRejectedImport(event: PromiseRejectionEvent) {
  const message = String((event.reason as { message?: string } | undefined)?.message ?? event.reason ?? "");
  if (STALE_IMPORT.test(message)) reloadForNewBuild();
}

export function StaticHardNav() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      const anchor = findAnchor(event);
      if (!anchor) return;
      const href = anchor.getAttribute("href")!;
      const url = resolveSpaUrl(href);
      if (!url) return;
      event.preventDefault();
      spaNavigate(href);
    };

    document.addEventListener("click", onClick);
    window.addEventListener("vite:preloadError", onStaleChunk);
    window.addEventListener("unhandledrejection", onRejectedImport);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("vite:preloadError", onStaleChunk);
      window.removeEventListener("unhandledrejection", onRejectedImport);
    };
  }, []);

  return null;
}
