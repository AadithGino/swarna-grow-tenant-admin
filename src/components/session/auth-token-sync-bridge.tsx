"use client";

import { useEffect } from "react";
import {
  applyCrossTabTokenUpdate,
  onTokensPersisted,
  TOKEN_KEYS,
} from "@/src/lib/auth-token-storage";
import {
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

function isAgentAppPath(pathname: string) {
  return pathname.startsWith("/agent") && pathname !== "/agent/login";
}

function isCustomerAppPath(pathname: string) {
  return (
    pathname.startsWith("/customer") &&
    !pathname.endsWith("/login") &&
    pathname !== "/customer/login"
  );
}

export function AuthTokenSyncBridge() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const unsubs = [
      onTokensPersisted("tenant", (tokens) => {
        dispatch(patchSessionTokens(tokens));
      }),
      onTokensPersisted("agent", (tokens) => {
        dispatch(patchAgentTokens(tokens));
      }),
    ];

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.newValue === event.oldValue) return;

      const logoutKeys = new Set<string>([
        TOKEN_KEYS.tenant.refresh,
        TOKEN_KEYS.platform.refresh,
        TOKEN_KEYS.customer.refresh,
        TOKEN_KEYS.agent.refresh,
      ]);
      if (logoutKeys.has(event.key) && !event.newValue) {
        const pathname = window.location.pathname;
        if (event.key === TOKEN_KEYS.tenant.refresh && isTenantAppPath(pathname)) {
          handleTenantUnauthorized(dispatch);
        } else if (
          event.key === TOKEN_KEYS.platform.refresh &&
          isPlatformAppPath(pathname)
        ) {
          handlePlatformUnauthorized(dispatch);
        } else if (
          event.key === TOKEN_KEYS.customer.refresh &&
          isCustomerAppPath(pathname)
        ) {
          handleCustomerUnauthorized(dispatch);
        } else if (
          event.key === TOKEN_KEYS.agent.refresh &&
          isAgentAppPath(pathname)
        ) {
          window.location.assign("/agent/login");
        }
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
