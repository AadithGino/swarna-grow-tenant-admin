#!/usr/bin/env node
/**
 * Build gate: same production public-env rules as src/config/env.ts (AUD-11).
 * Run with NODE_ENV=production before `vite build` / Vinext build so misconfiguration
 * fails before emitting artifacts.
 */
const TRUTHY = new Set(["true", "1", "yes"]);
const FALSY = new Set(["false", "0", "no"]);
const LOCAL_HOST_SUBSTRINGS = ["localhost", "127.0.0.1", "[::1]", "0.0.0.0"];

function parseApiMode(raw) {
  const v = raw?.trim().toLowerCase();
  if (!v) return "unset";
  if (TRUTHY.has(v)) return "mocks";
  if (FALSY.has(v)) return "live";
  return "invalid";
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function main() {
  if (process.env.NODE_ENV !== "production") {
    process.exit(0);
  }
  const mode = parseApiMode(process.env.NEXT_PUBLIC_USE_MOCKS);
  if (mode !== "live") {
    fail(
      `[AUD-11] Production build requires NEXT_PUBLIC_USE_MOCKS=false. Got: ${JSON.stringify(process.env.NEXT_PUBLIC_USE_MOCKS ?? "")}`,
    );
  }
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? "";
  if (!base) {
    fail("[AUD-11] Production build requires a nonempty NEXT_PUBLIC_API_BASE_URL (https, ending in /api/v1).");
  }
  let url;
  try {
    url = new URL(base);
  } catch {
    fail(`[AUD-11] NEXT_PUBLIC_API_BASE_URL is not a valid URL: ${JSON.stringify(base)}`);
  }
  if (url.protocol !== "https:") {
    fail(`[AUD-11] NEXT_PUBLIC_API_BASE_URL must use https. Got ${url.protocol}`);
  }
  const path = `${url.pathname}`.replace(/\/$/, "") || "";
  if (!path.endsWith("/api/v1")) {
    fail("[AUD-11] NEXT_PUBLIC_API_BASE_URL must end with /api/v1 (contract base).");
  }
  const host = url.hostname.toLowerCase();
  if (LOCAL_HOST_SUBSTRINGS.some((s) => host.includes(s.replace(/[\[\]]/g, "")))) {
    fail("[AUD-11] NEXT_PUBLIC_API_BASE_URL must not point to localhost or loopback.");
  }
  const testUi = process.env.NEXT_PUBLIC_ECOMMERCE_PAYMENT_TEST_UI?.trim().toLowerCase();
  if (testUi === "true" || testUi === "1" || testUi === "yes") {
    fail("[AUD-11] NEXT_PUBLIC_ECOMMERCE_PAYMENT_TEST_UI must not be enabled for production builds.");
  }
}

main();
