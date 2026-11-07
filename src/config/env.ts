/**
 * API mode: in non-production bundles, defaults to contract-shaped mocks until the backend URL is supplied.
 * Set `NEXT_PUBLIC_USE_MOCKS=false` to connect every RTK Query endpoint to the API.
 *
 * Production bundles (NODE_ENV === "production" at build time) fail closed unless
 * live API mode and a valid HTTPS API base are explicitly set.
 */

const TRUTHY = new Set(["true", "1", "yes"]);
const FALSY = new Set(["false", "0", "no"]);

/** Reserved for dev/preview; production rejects these hosts. */
const LOCAL_HOST_SUBSTRINGS = ["localhost", "127.0.0.1", "[::1]", "0.0.0.0"];

function isProductionBundle(): boolean {
  if (process.env.SWARNA_PRODUCTION_PUBLIC_ENV_STRICT === "1") return true;
  return process.env.NODE_ENV === "production";
}

function skipProductionGuard(): boolean {
  if (process.env.SWARNA_PRODUCTION_PUBLIC_ENV_STRICT === "1") return false;
  return (
    process.env.VITEST === "true" ||
    process.env.SWARNA_SKIP_PRODUCTION_ENV_GUARD === "1"
  );
}

function parseApiMode(raw: string | undefined): "live" | "mocks" | "unset" | "invalid" {
  const v = raw?.trim().toLowerCase();
  if (!v) return "unset";
  if (TRUTHY.has(v)) return "mocks";
  if (FALSY.has(v)) return "live";
  return "invalid";
}

function validateProductionPublicEnv(): void {
  if (!isProductionBundle() || skipProductionGuard()) return;

  const mode = parseApiMode(process.env.NEXT_PUBLIC_USE_MOCKS);
  if (mode !== "live") {
    throw new Error(
      `[AUD-11] Production build requires NEXT_PUBLIC_USE_MOCKS=false (explicit live API mode). Got: ${JSON.stringify(process.env.NEXT_PUBLIC_USE_MOCKS ?? "")}`,
    );
  }

  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? "";
  if (!base) {
    throw new Error(
      "[AUD-11] Production build requires a nonempty NEXT_PUBLIC_API_BASE_URL (HTTPS API base, ending in /api/v1).",
    );
  }
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new Error(
      `[AUD-11] Production NEXT_PUBLIC_API_BASE_URL is not a valid URL: ${JSON.stringify(base)}`,
    );
  }
  if (url.protocol !== "https:") {
    throw new Error(
      `[AUD-11] Production NEXT_PUBLIC_API_BASE_URL must use https. Got protocol ${url.protocol}`,
    );
  }
  const path = `${url.pathname}`.replace(/\/$/, "") || "";
  if (!path.endsWith("/api/v1")) {
    throw new Error(
      "[AUD-11] Production NEXT_PUBLIC_API_BASE_URL must end with /api/v1 (contract base).",
    );
  }
  const host = url.hostname.toLowerCase();
  if (LOCAL_HOST_SUBSTRINGS.some((s) => host.includes(s.replace(/[\[\]]/g, "")))) {
    throw new Error(
      "[AUD-11] Production NEXT_PUBLIC_API_BASE_URL must not point to localhost or loopback.",
    );
  }

  const testUi = process.env.NEXT_PUBLIC_ECOMMERCE_PAYMENT_TEST_UI?.trim().toLowerCase();
  if (testUi === "true" || testUi === "1" || testUi === "yes") {
    throw new Error(
      "[AUD-11] NEXT_PUBLIC_ECOMMERCE_PAYMENT_TEST_UI must not be enabled in production builds.",
    );
  }
}

validateProductionPublicEnv();

function readUseMocks(): boolean {
  if (isProductionBundle() && !skipProductionGuard()) {
    return false;
  }
  const mode = parseApiMode(process.env.NEXT_PUBLIC_USE_MOCKS);
  if (mode === "live") return false;
  if (mode === "mocks" || mode === "unset") return true;
  return true;
}

function readPortalHardNav(): boolean {
  const raw = process.env.NEXT_PUBLIC_PORTAL_HARD_NAV?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "no") return false;
  if (raw === "true" || raw === "1" || raw === "yes") return true;
  // Static Netlify deploy: live HTTPS API builds default to full-page sidebar nav.
  if (isProductionBundle() && !skipProductionGuard()) {
    const mode = parseApiMode(process.env.NEXT_PUBLIC_USE_MOCKS);
    const api = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? "";
    if (
      mode === "live" &&
      api.startsWith("https://") &&
      !LOCAL_HOST_SUBSTRINGS.some((h) => api.includes(h.replace(/[\[\]]/g, "")))
    ) {
      return true;
    }
  }
  return false;
}

function readPhonePeEnvironment(): "SANDBOX" | "PRODUCTION" {
  const raw = process.env.NEXT_PUBLIC_PHONEPE_ENV?.trim().toUpperCase();
  if (raw === "SANDBOX" || raw === "UAT" || raw === "PREPROD" || raw === "TEST") return "SANDBOX";
  if (raw === "PRODUCTION" || raw === "LIVE") return "PRODUCTION";
  const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  if (/localhost|127\.0\.0\.1/i.test(api)) return "SANDBOX";
  return "PRODUCTION";
}

export const env = {
  apiBaseUrl:
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1",
  useMocks: readUseMocks(),
  /** Full page loads for portal sidebar links (required on vinext static / Netlify). */
  portalHardNav: readPortalHardNav(),
  /** Must match backend `PHONEPE_ENV` when opening hosted PhonePe checkout in the browser. */
  phonePeEnvironment: readPhonePeEnvironment(),
  mockDelayMs: Number(process.env.NEXT_PUBLIC_MOCK_DELAY_MS ?? 420),
  /** Fallback tenant when URL has no slug (dev only). Must match a real `Tenant.code` in the API. */
  customerTenantCode:
    process.env.NEXT_PUBLIC_CUSTOMER_TENANT_CODE?.trim().toUpperCase() ?? "",
  /** Optional default tenant code on collection-agent login (e.g. KAIRALI). */
  agentTenantCode:
    process.env.NEXT_PUBLIC_AGENT_TENANT_CODE?.trim().toUpperCase() ?? "",
  /** Show TEST ONLY mock PhonePe completion on customer order page (local harness API only). */
  ecommercePaymentTestUi:
    process.env.NEXT_PUBLIC_ECOMMERCE_PAYMENT_TEST_UI?.trim().toLowerCase() === "true",
};

/** Host root for routes outside `/api/v1` (e.g. `/health`). */
export function apiOrigin(): string {
  return env.apiBaseUrl.replace(/\/api\/v1\/?$/, "") || env.apiBaseUrl;
}

/** Exported for unit tests (production guard helpers). */
export function __testOnlyValidateProductionPublicEnv(): void {
  validateProductionPublicEnv();
}
