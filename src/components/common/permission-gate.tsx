"use client";

import type { ReactNode } from "react";
import { hasCapability, hasPermission } from "@/src/lib/permissions";
import { useAppSelector } from "@/src/store/hooks";
import type { PortalCapabilities } from "@/src/types/session";

export function PermissionGate({
  permission,
  permissions,
  capability,
  fallback = null,
  children,
}: {
  permission?: string;
  permissions?: string[];
  capability?: keyof PortalCapabilities;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const session = useAppSelector((s) => s.session.session);
  const user = session?.user;
  const caps = session?.capabilities;

  if (permission && !hasPermission(user, permission)) return fallback;
  if (permissions?.length) {
    const ok = permissions.some((p) => hasPermission(user, p));
    if (!ok) return fallback;
  }
  if (capability && !hasCapability(caps, capability)) return fallback;

  return children;
}
