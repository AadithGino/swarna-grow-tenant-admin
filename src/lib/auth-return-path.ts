/** Safe same-origin return path from `?next=` after login / unauthorized redirect. */

const BLOCKED_PREFIXES = [
  "/login",
  "/platform/login",
  "/agent/login",
  "/customer/login",
];

function isBlockedAuthSurface(path: string): boolean {
  if (BLOCKED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return true;
  }
  // /customer/:slug/login|onboarding
  if (/^\/customer\/[^/]+\/(login|onboarding)\/?$/.test(path)) return true;
  return false;
}

/**
 * Returns a safe in-app path for post-login redirect, or `fallback` when missing/unsafe.
 */
export function safeAuthReturnPath(
  next: string | null | undefined,
  fallback: string,
): string {
  if (!next || typeof next !== "string") return fallback;
  let decoded = next;
  try {
    decoded = decodeURIComponent(next);
  } catch {
    return fallback;
  }
  const path = decoded.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  if (path.includes("://") || path.includes("\\")) return fallback;
  if (isBlockedAuthSurface(path)) return fallback;
  return path;
}
