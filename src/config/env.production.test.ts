/**
 * AUD-11: Production public env fail-closed (build + module load).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("production public env (AUD-11)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts explicit live mode with https API base ending in /api/v1", async () => {
    vi.stubEnv("SWARNA_PRODUCTION_PUBLIC_ENV_STRICT", "1");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.com/api/v1");
    const { env } = await import("./env");
    expect(env.useMocks).toBe(false);
    expect(env.apiBaseUrl).toBe("https://api.example.com/api/v1");
  });

  it("rejects mocks in production", async () => {
    vi.stubEnv("SWARNA_PRODUCTION_PUBLIC_ENV_STRICT", "1");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "true");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.com/api/v1");
    await expect(async () => import("./env")).rejects.toThrow(/NEXT_PUBLIC_USE_MOCKS=false/);
  });

  it("rejects non-https API base", async () => {
    vi.stubEnv("SWARNA_PRODUCTION_PUBLIC_ENV_STRICT", "1");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://api.example.com/api/v1");
    await expect(async () => import("./env")).rejects.toThrow(/https/);
  });

  it("rejects localhost API base", async () => {
    vi.stubEnv("SWARNA_PRODUCTION_PUBLIC_ENV_STRICT", "1");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://127.0.0.1:4444/api/v1");
    await expect(async () => import("./env")).rejects.toThrow(/localhost/);
  });

  it("rejects missing /api/v1 suffix", async () => {
    vi.stubEnv("SWARNA_PRODUCTION_PUBLIC_ENV_STRICT", "1");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.com/v1");
    await expect(async () => import("./env")).rejects.toThrow(/api\/v1/);
  });

  it("rejects ecommerce payment test UI in production", async () => {
    vi.stubEnv("SWARNA_PRODUCTION_PUBLIC_ENV_STRICT", "1");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "false");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.com/api/v1");
    vi.stubEnv("NEXT_PUBLIC_ECOMMERCE_PAYMENT_TEST_UI", "true");
    await expect(async () => import("./env")).rejects.toThrow(/ECOMMERCE_PAYMENT_TEST_UI/);
  });

  it("development keeps mocks default when unset", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000/api/v1");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "");
    const { env } = await import("./env");
    expect(env.useMocks).toBe(true);
  });
});
