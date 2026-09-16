"use client";

import { usePathname } from "next/navigation";
import { AdminShell } from "@/src/components/layout/admin-shell";

/** Keeps sidebar + topbar mounted across in-app navigations (see [[...slug]] page). */
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname === "/login") return children;
  return <AdminShell>{children}</AdminShell>;
}
