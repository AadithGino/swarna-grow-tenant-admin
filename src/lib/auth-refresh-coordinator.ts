import type { AuthRealm } from "@/src/lib/auth-token-storage";

export type RefreshTokenPayload = {
  accessToken: string;
  refreshToken?: string;
} | null;

const inFlight = new Map<AuthRealm, Promise<RefreshTokenPayload>>();

/** Serialize refresh calls per realm (in-tab and cross-tab when Web Locks are available). */
export async function coordinateTokenRefresh(
  realm: AuthRealm,
  refresh: () => Promise<RefreshTokenPayload>,
): Promise<RefreshTokenPayload> {
  const pending = inFlight.get(realm);
  if (pending) return pending;

  const run = async (): Promise<RefreshTokenPayload> => {
    if (typeof navigator !== "undefined" && "locks" in navigator) {
      try {
        return await navigator.locks.request(
          `swarnagrow-auth-refresh-${realm}`,
          refresh,
        );
      } catch {
        return refresh();
      }
    }
    return refresh();
  };

  const promise = run().finally(() => {
    if (inFlight.get(realm) === promise) inFlight.delete(realm);
  });
  inFlight.set(realm, promise);
  return promise;
}
