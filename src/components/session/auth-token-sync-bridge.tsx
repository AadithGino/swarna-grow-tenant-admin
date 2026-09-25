"use client";

import { useEffect } from "react";
import {
  applyCrossTabTokenUpdate,
  onTokensPersisted,
  realmHasStoredSession,
  TOKEN_KEYS,
  type AuthRealm,
} from "@/src/lib/auth-token-storage";
import {
  handleAgentUnauthorized,
  handleCustomerUnauthorized,
  handlePlatformUnauthorized,
  handleTenantUnauthorized,
} from "@/src/lib/auth-logout";
import { useAppDispatch } from "@/src/store/hooks";
import { patchAgentTokens } from "@/src/store/slices/agent-session-slice";
import { patchSessionTokens } from "@/src/store/slices/session-slice";

function isPlatformAppPath(pathname: string) {
  return (
    pathname.startsWith("/platform") &&
    pathname !== "/platform/login" &&
    !pathname.startsWith("/platform/login/")
  );
}

function isTenantAppPath(pathname: string) {
  return (
    pathname !== "/login" &&
    !pathname.startsWith("/login/") &&
    !pathname.startsWith("/platform") &&
    !pathname.startsWith("/agent") &&
    !pathname.startsWith("/customer")
  );
}

function isAgentLoginPath(pathname: string) {
  return (
    pathname === "/agent/login" ||
    /^\/agent\/[^/]+\/login\/?$/.test(pathname)
  );
}

function isAgentAppPath(pathname: string) {
  return pathname.startsWith("/agent") && !isAgentLoginPath(pathname);
}

function isCustomerAppPath(pathname: string) {
  return (
    pathname.startsWith("/customer") &&
    !pathname.endsWith("/login") &&
    pathname !== "/customer/login"
  );
}

function realmForStorageKey(key: string): AuthRealm | null {
  for (const realm of Object.keys(TOKEN_KEYS) as AuthRealm[]) {
    const keys = TOKEN_KEYS[realm];
    if (keys.access === key) return realm;
    if ("refresh" in keys && keys.refresh === key) return realm;
  }
  return null;
}

function handleCrossTabLogout(realm: AuthRealm, dispatch: ReturnType<typeof useAppDispatch>) {
  const pathname = window.location.pathname;
  if (realm === "tenant" && isTenantAppPath(pathname)) {
    handleTenantUnauthorized(dispatch);
    return;
  }
  if (realm === "platform" && isPlatformAppPath(pathname)) {
    handlePlatformUnauthorized(dispatch);
    return;
  }
  if (realm === "customer" && isCustomerAppPath(pathname)) {
    handleCustomerUnauthorized(dispatch);
    return;
  }
  if (realm === "agent" && isAgentAppPath(pathname)) {
    handleAgentUnauthorized(dispatch);
  }
}

export function AuthTokenSyncBridge() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const unsubs = [
      onTokensPersisted("tenant", (tokens) => {
        queueMicrotask(() => dispatch(patchSessionTokens(tokens)));
      }),
      onTokensPersisted("agent", (tokens) => {
        queueMicrotask(() => dispatch(patchAgentTokens(tokens)));
      }),
    ];

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.newValue === event.oldValue) return;

      const realm = realmForStorageKey(event.key);
      if (realm && !event.newValue) {
        window.setTimeout(() => {
          if (realmHasStoredSession(realm)) return;
          handleCrossTabLogout(realm, dispatch);
        }, 250);
        return;
      }

      applyCrossTabTokenUpdate(event.key, event.newValue);
    };

    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      for (const unsub of unsubs) unsub();
    };
  }, [dispatch]);

  return null;
}
