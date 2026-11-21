"use client";

import { useClientMounted } from "@/src/hooks/use-client-mounted";
import { realmHasStoredSession } from "@/src/lib/auth-token-storage";
import { useAppSelector } from "@/src/store/hooks";

/** Tenant admin portal: wait for Redux hydration, then know if a session is active. */
export type TenantAdminSessionGate = "pending" | "signed-out" | "signed-in";

export function useTenantAdminSessionGate(): TenantAdminSessionGate {
  const mounted = useClientMounted();
  const hydrated = useAppSelector((state) => state.session.hydrated);
  const session = useAppSelector((state) => state.session.session);

  if (!mounted || !hydrated) return "pending";
  if (session && realmHasStoredSession("tenant")) return "signed-in";
  return "signed-out";
}

export function useTenantAdminSignedIn(): boolean {
  return useTenantAdminSessionGate() === "signed-in";
}