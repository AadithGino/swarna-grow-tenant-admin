/** Central localStorage keys and helpers for auth tokens (incl. multi-tab sync). */

export const TOKEN_KEYS = {
  tenant: {
    access: "swarnagrow.accessToken",
    refresh: "swarnagrow.refreshToken",
    session: "swarnagrow.session",
  },
  platform: {
    access: "swarnagrow.platformAccessToken",
    refresh: "swarnagrow.platformRefreshToken",
    user: "swarnagrow.platformUser",
  },
  customer: {
    access: "swarnagrow.customer.accessToken",
    refresh: "swarnagrow.customer.refreshToken",
  },
  agent: {
    access: "swarnagrow.agent.accessToken",
    refresh: "swarnagrow.agent.refreshToken",
    session: "swarnagrow.agent.session",
  },
} as const;

export type AuthRealm = keyof typeof TOKEN_KEYS;

export type StoredTokens = {
  accessToken: string;
  refreshToken?: string;
};

type TokenListener = (tokens: StoredTokens) => void;

const tokenListeners: Record<AuthRealm, Set<TokenListener>> = {
  tenant: new Set(),
  platform: new Set(),
  customer: new Set(),
  agent: new Set(),
};

function patchJsonSession(
  sessionKey: string,
  patch: (session: Record<string, unknown>) => void,
) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(sessionKey);
    if (!raw) return;
    const session = JSON.parse(raw) as Record<string, unknown>;
    patch(session);
    localStorage.setItem(sessionKey, JSON.stringify(session));
  } catch {
    // Ignore corrupt session JSON.
  }
}

function emitTokens(realm: AuthRealm, tokens: StoredTokens) {
  for (const listener of tokenListeners[realm]) listener(tokens);
}

export function onTokensPersisted(
  realm: AuthRealm,
  listener: TokenListener,
): () => void {
  tokenListeners[realm].add(listener);
  return () => tokenListeners[realm].delete(listener);
}

export function persistTenantTokens(
  accessToken: string,
  refreshToken?: string,
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEYS.tenant.access, accessToken);
  if (refreshToken) {
    localStorage.setItem(TOKEN_KEYS.tenant.refresh, refreshToken);
  }
  patchJsonSession(TOKEN_KEYS.tenant.session, (session) => {
    session.accessToken = accessToken;
  });
  emitTokens("tenant", { accessToken, refreshToken });
}

export function clearTenantTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEYS.tenant.access);
  localStorage.removeItem(TOKEN_KEYS.tenant.refresh);
}

/** Write platform token keys only — safe inside Redux reducers (no store listeners). */
export function writePlatformTokenStorage(
  accessToken: string,
  refreshToken?: string,
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEYS.platform.access, accessToken);
  if (refreshToken) {
    localStorage.setItem(TOKEN_KEYS.platform.refresh, refreshToken);
  }
}

export function persistPlatformTokens(
  accessToken: string,
  refreshToken?: string,
) {
  if (typeof window === "undefined") return;
  writePlatformTokenStorage(accessToken, refreshToken);
  emitTokens("platform", { accessToken, refreshToken });
}

export function clearPlatformTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEYS.platform.access);
  localStorage.removeItem(TOKEN_KEYS.platform.refresh);
  localStorage.removeItem(TOKEN_KEYS.platform.user);
}

/** Write customer token keys only — safe inside Redux reducers (no store listeners). */
export function writeCustomerTokenStorage(
  accessToken: string,
  refreshToken?: string,
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEYS.customer.access, accessToken);
  if (refreshToken) {
    localStorage.setItem(TOKEN_KEYS.customer.refresh, refreshToken);
  }
}

export function persistCustomerTokens(
  accessToken: string,
  refreshToken?: string,
) {
  if (typeof window === "undefined") return;
  writeCustomerTokenStorage(accessToken, refreshToken);
  emitTokens("customer", { accessToken, refreshToken });
}

export function clearCustomerTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEYS.customer.access);
  localStorage.removeItem(TOKEN_KEYS.customer.refresh);
}

/** Write agent token keys only — safe inside Redux reducers (no store listeners). */
export function writeAgentTokenStorage(
  accessToken: string,
  refreshToken?: string,
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEYS.agent.access, accessToken);
  if (refreshToken) {
    localStorage.setItem(TOKEN_KEYS.agent.refresh, refreshToken);
  }
}

export function persistAgentTokens(
  accessToken: string,
  refreshToken?: string,
) {
  if (typeof window === "undefined") return;
  writeAgentTokenStorage(accessToken, refreshToken);
  patchJsonSession(TOKEN_KEYS.agent.session, (session) => {
    session.accessToken = accessToken;
    if (refreshToken) session.refreshToken = refreshToken;
  });
  emitTokens("agent", { accessToken, refreshToken });
}

export function clearAgentTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEYS.agent.access);
  localStorage.removeItem(TOKEN_KEYS.agent.refresh);
}

export function hasPlatformSession(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    localStorage.getItem(TOKEN_KEYS.platform.access) ||
      localStorage.getItem(TOKEN_KEYS.platform.refresh),
  );
}

export function readStoredRefreshToken(realm: AuthRealm): string | null {
  if (typeof window === "undefined") return null;
  const keys = TOKEN_KEYS[realm];
  return "refresh" in keys
    ? localStorage.getItem(keys.refresh)
    : null;
}

export function readStoredAccessToken(realm: AuthRealm): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEYS[realm].access);
}

export function realmHasStoredSession(realm: AuthRealm): boolean {
  return Boolean(
    readStoredAccessToken(realm) || readStoredRefreshToken(realm),
  );
}

/** Apply token updates from another tab's storage event. Returns realm if signed out. */
export function applyCrossTabTokenUpdate(
  key: string,
  newValue: string | null,
): AuthRealm | null {
  if (typeof window === "undefined") return null;

  for (const realm of Object.keys(TOKEN_KEYS) as AuthRealm[]) {
    const keys = TOKEN_KEYS[realm];
    if ("refresh" in keys && key === keys.refresh && !newValue) {
      return realm;
    }
    if (key === keys.access) {
      if (!newValue) return realm;
      const refreshToken = readStoredRefreshToken(realm) ?? undefined;
      if (realm === "tenant") {
        patchJsonSession(TOKEN_KEYS.tenant.session, (session) => {
          session.accessToken = newValue;
        });
      } else if (realm === "agent") {
        patchJsonSession(TOKEN_KEYS.agent.session, (session) => {
          session.accessToken = newValue;
          if (refreshToken) session.refreshToken = refreshToken;
        });
      }
      emitTokens(realm, { accessToken: newValue, refreshToken });
      return null;
    }
    if ("refresh" in keys && key === keys.refresh && newValue) {
      const accessToken = localStorage.getItem(keys.access);
      if (accessToken) {
        if (realm === "agent") {
          patchJsonSession(TOKEN_KEYS.agent.session, (session) => {
            session.accessToken = accessToken;
            session.refreshToken = newValue;
          });
        }
        emitTokens(realm, { accessToken, refreshToken: newValue });
      }
      return null;
    }
  }

  return null;
}
