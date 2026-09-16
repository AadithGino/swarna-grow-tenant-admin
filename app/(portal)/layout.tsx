"use client";

import { usePathname } from "next/navigation";
import { AdminShell } from "@/src/components/layout/admin-shell";
import { PlatformShell } from "@/src/components/layout/platform-shell";

/** Keeps sidebar + topbar mounted across in-app navigations (see [[...slug]] page). */
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname === "/login") return children;
  if (pathname === "/platform/login") return children;
  if (pathname.startsWith("/platform")) return <PlatformShell>{children}</PlatformShell>;
  return <AdminShell>{children}</AdminShell>;
}
