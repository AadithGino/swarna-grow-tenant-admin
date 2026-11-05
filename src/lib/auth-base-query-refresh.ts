import type {
  BaseQueryApi,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  FetchBaseQueryMeta,
  QueryReturnValue,
} from "@reduxjs/toolkit/query";
import { isUnauthorizedFetchError } from "@/src/lib/auth-logout";
import {
  refreshAuthRealm,
  shouldLogoutAfterRefreshFailure,
} from "@/src/lib/auth-refresh-api";
import type { AuthRealm } from "@/src/lib/auth-token-storage";

export type AuthRetryExtra = { _authRetry?: boolean };

type RefreshGuard = {
  skipRefresh: boolean;
  alreadyRetried: boolean;
};

export function authRefreshGuard(
  url: string,
  extra: AuthRetryExtra | undefined,
  skipPatterns: string[],
): RefreshGuard {
  const alreadyRetried = Boolean(extra?._authRetry);
  const skipRefresh = skipPatterns.some((pattern) => url.includes(pattern));
  return { skipRefresh, alreadyRetried };
}

export async function refreshAfterUnauthorized(
  realm: AuthRealm,
  guard: RefreshGuard,
): Promise<boolean> {
  if (guard.skipRefresh || guard.alreadyRetried) return false;
  const tokens = await refreshAuthRealm(realm);
  return Boolean(tokens?.accessToken);
}

export async function retryAuthorizedRequest<TArgs extends string | FetchArgs>(
  liveBaseQuery: BaseQueryFn<
    string | FetchArgs,
    unknown,
    FetchBaseQueryError,
    AuthRetryExtra,
    FetchBaseQueryMeta
  >,
  requestArgs: TArgs,
  api: BaseQueryApi,
  extra: AuthRetryExtra | undefined,
): Promise<QueryReturnValue<unknown, FetchBaseQueryError, FetchBaseQueryMeta>> {
  return liveBaseQuery(requestArgs, api, { ...extra, _authRetry: true });
}

export function shouldAttemptAuthRefresh(
  error: FetchBaseQueryError | undefined,
  guard: RefreshGuard,
  useMocks: boolean,
): boolean {
  if (useMocks || typeof window === "undefined") return false;
  if (guard.skipRefresh || guard.alreadyRetried) return false;
  return isUnauthorizedFetchError(error);
}

/**
 * After 401, sign out when refresh was not attempted (hard auth failure) or when
 * refresh was attempted but could not obtain a new access token. Keeping the
 * shell "logged in" with a dead access token while a refresh token remains in
 * storage caused stuck screens ("invalid token" + Retry forever).
 */
export function shouldForceAuthLogout(
  _realm: AuthRealm,
  refreshWasAttempted: boolean,
): boolean {
  if (!refreshWasAttempted) return true;
  return shouldLogoutAfterRefreshFailure();
}
