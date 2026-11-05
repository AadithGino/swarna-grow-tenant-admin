/**
 * API mode: defaults to contract-shaped mocks until the backend URL is supplied.
 * Set `NEXT_PUBLIC_USE_MOCKS=false` to connect every RTK Query endpoint to the API.
 */
function readUseMocks(): boolean {
  const raw = process.env.NEXT_PUBLIC_USE_MOCKS?.trim().toLowerCase();
  if (raw === "true" || raw === "1" || raw === "yes") return true;
  if (raw === "false" || raw === "0" || raw === "no") return false;
  return true;
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
