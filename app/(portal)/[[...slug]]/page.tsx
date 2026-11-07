"use client";

import { usePathname } from "next/navigation";
import { PortalRouter } from "@/src/app/portal-router";
import { pathnameToPortalSlug } from "@/src/lib/portal-path-slug";

/** Client slug from URL — required for static hosts (Netlify) where RSC params stay at "/". */
export default function PortalPage() {
  const pathname = usePathname() ?? "/";
  const slug = pathnameToPortalSlug(pathname);
  return <PortalRouter slug={slug} />;
}
