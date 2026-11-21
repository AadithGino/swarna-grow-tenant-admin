"use client";

import { useEffect } from "react";
import { env } from "@/src/config/env";
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
 *
 * Escape hatch: NEXT_PUBLIC_PORTAL_HARD_NAV=true turns every path change back into a
 * full page load (old Netlify behaviour). Add `data-hard-nav` to a link to force a load.
 */
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
      if (env.portalHardNav) {
        if (url.pathname.replace(/\/+$/, "") !== window.location.pathname.replace(/\/+$/, "")) {
          const dest = url.href;
          window.location.assign(dest);
        } else spaNavigate(href);
        return;
      }
      spaNavigate(href);
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
