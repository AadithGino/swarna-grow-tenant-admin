"use client";

import { useEffect } from "react";
import { env } from "@/src/config/env";
import { readJwtExpiryMs } from "@/src/lib/auth-jwt";
import { refreshAuthRealm } from "@/src/lib/auth-refresh-api";
import {
  TOKEN_KEYS,
  type AuthRealm,
} from "@/src/lib/auth-token-storage";

const REALMS: AuthRealm[] = ["tenant", "customer", "platform", "agent"];
const REFRESH_LEAD_MS = 3 * 60 * 1000;
const MIN_DELAY_MS = 15_000;
const EXPIRED_RETRY_MS = 1_000;

function scheduleRealmRefresh(realm: AuthRealm) {
  if (typeof window === "undefined" || env.useMocks) return () => {};

  const accessKey = TOKEN_KEYS[realm].access;
  const refreshKey =
    "refresh" in TOKEN_KEYS[realm] ? TOKEN_KEYS[realm].refresh : null;
  if (!refreshKey) return () => {};

  let timer: number | undefined;

  const plan = () => {
    if (timer) window.clearTimeout(timer);
    const accessToken = localStorage.getItem(accessKey);
    const refreshToken = localStorage.getItem(refreshKey);
    if (!accessToken || !refreshToken) return;

    const expiresAt = readJwtExpiryMs(accessToken);
    if (!expiresAt) return;

    const msUntilRefresh = expiresAt - Date.now() - REFRESH_LEAD_MS;
    const delay =
      msUntilRefresh <= 0
        ? EXPIRED_RETRY_MS
        : Math.max(MIN_DELAY_MS, msUntilRefresh);
    timer = window.setTimeout(() => {
      void refreshAuthRealm(realm).finally(plan);
    }, delay);
  };

  plan();

  const onStorage = (event: StorageEvent) => {
    if (event.key === accessKey || event.key === refreshKey) plan();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    if (timer) window.clearTimeout(timer);
    window.removeEventListener("storage", onStorage);
  };
}

/** Refresh access tokens a few minutes before JWT expiry so users stay signed in. */
export function AuthProactiveRefresh() {
  useEffect(() => {
    const cleanups = REALMS.map((realm) => scheduleRealmRefresh(realm));
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, []);

  return null;
}
