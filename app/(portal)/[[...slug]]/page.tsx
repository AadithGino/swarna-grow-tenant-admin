"use client";

import { PortalRouter } from "@/src/app/portal-router";
import { useBrowserPathname } from "@/src/hooks/use-browser-pathname";
import { pathnameToPortalSlug } from "@/src/lib/portal-path-slug";

/** Client slug from URL — required for static hosts (Netlify) where RSC params stay at "/". */
export default function PortalPage() {
  const pathname = useBrowserPathname();
  const slug = pathnameToPortalSlug(pathname);
  // Remount when the real URL changes (vinext client router on static hosts).
  return <PortalRouter key={pathname} slug={slug} />;
}
