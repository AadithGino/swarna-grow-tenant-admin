"use client";

import { useEffect } from "react";
import { env } from "@/src/config/env";

function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

/** Full document load only when the path changes — never for `?query` sync (Orders filters, etc.). */
function hardPathDestination(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  if (normalizePath(url.pathname) === normalizePath(window.location.pathname)) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Vinext soft navigation does not swap pages on a static Netlify host.
 * Same-origin link clicks that change the path become real document loads.
 * History / router.replace for query-only updates stay in-page on purpose.
 */
export function StaticHardNav() {
  useEffect(() => {
    if (!env.portalHardNav) return;

    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("button, input, textarea, select, label")) return;
      const anchor = target.closest("a[href]");
      if (!anchor) return;
      if (anchor.getAttribute("target") === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || /^(mailto:|tel:|javascript:)/i.test(href)) return;
      const dest = hardPathDestination(href);
      if (!dest) return;
      event.preventDefault();
      window.location.assign(dest);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
