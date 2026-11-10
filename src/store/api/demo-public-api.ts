import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError, FetchBaseQueryMeta } from "@reduxjs/toolkit/query";
import { env } from "@/src/config/env";
import { rtkDataResult, rtkErrorResult } from "@/src/lib/rtk-query-result";

/**
 * Public, pre-authentication Demo Builder endpoints — the branded splash screen reached at
 * /demo/:publicId and the secret-for-session exchange it performs on load. No auth token is
 * ever attached here; this mirrors backend `demo-session.service.js`'s public surface
 * (GET /public/demo/:publicId/branding, POST /public/demo/:publicId/session) exactly, and is
 * intentionally its own small API slice rather than folded into platform-api.ts or
 * customer-api.ts, since it needs neither tenant context nor platform auth.
 */

export type DemoPublicBranding = {
  tenantCode?: string;
  displayName: string;
  appDisplayName?: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  status: string;
  splashBackgroundColor: string | null;
  splashTagline: string | null;
  splashEnabled: boolean;
};

export type DemoSessionExchangeResult = {
  accessToken: string;
  refreshToken: string;
  sessionId?: string;
  tenant: DemoPublicBranding & { id: string };
  customer: { id: string; name: string; customerNumber: string };
};

type DemoPublicArgs = FetchArgs & { mockKey: string; mockParams?: Record<string, unknown> };

const wait = () => new Promise((resolve) => setTimeout(resolve, env.mockDelayMs));

async function demoPublicMockRequest({ mockKey, params = {} }: { mockKey: string; params: Record<string, unknown> }) {
  await wait();
  const publicId = String(params.publicId ?? "");
  if (mockKey === "demoPublicBranding") {
    if (!publicId.startsWith("pub_")) {
      return rtkErrorResult({ status: 410, data: { success: false, error: { code: "DEMO_LINK_INVALID", message: "This demo link is not valid." } } });
    }
    return rtkDataResult<DemoPublicBranding>({
      tenantCode: "DEMOCO",
      displayName: "Demo Jewellers",
      logoUrl: null,
      primaryColor: "#730321",
      accentColor: "#C9A227",
      status: "READY",
      splashBackgroundColor: "#fbf1f3",
      splashTagline: "Your gold savings, simplified",
      splashEnabled: true,
    });
  }
  if (mockKey === "demoSessionExchange") {
    if (!publicId.startsWith("pub_")) {
      return rtkErrorResult({ status: 410, data: { success: false, error: { code: "DEMO_LINK_INVALID", message: "This demo link is not valid." } } });
    }
    return rtkDataResult<DemoSessionExchangeResult>({
      accessToken: `mock-demo-access-${publicId}`,
      refreshToken: `mock-demo-refresh-${publicId}`,
      sessionId: `sess_${publicId}`,
      tenant: {
        id: `tnt_demo_${publicId}`,
        tenantCode: "DEMOCO",
        displayName: "Demo Jewellers",
        logoUrl: null,
        primaryColor: "#730321",
        accentColor: "#C9A227",
        status: "READY",
        splashBackgroundColor: "#fbf1f3",
        splashTagline: "Your gold savings, simplified",
        splashEnabled: true,
      },
      customer: { id: "cus_demo_sample", name: "Demo Customer", customerNumber: "DEMO-0001" },
    });
  }
  throw new Error(`Unknown demo public mock request: ${mockKey}`);
}

const liveBaseQuery = fetchBaseQuery({ baseUrl: env.apiBaseUrl });

const baseQuery: BaseQueryFn<DemoPublicArgs, unknown, FetchBaseQueryError, {}, FetchBaseQueryMeta> = async (args, api, extraOptions) => {
  if (env.useMocks) {
    const { mockKey, mockParams } = args;
    try {
      const result = await demoPublicMockRequest({ mockKey, params: mockParams ?? {} });
      if (result && typeof result === "object" && "error" in result) return result as ReturnType<typeof rtkErrorResult>;
      return result as ReturnType<typeof rtkDataResult>;
    } catch (err) {
      return rtkErrorResult({ status: "CUSTOM_ERROR", error: String((err as Error)?.message ?? err) } as FetchBaseQueryError);
    }
  }
  const { mockKey, mockParams, ...rest } = args;
  const result = await liveBaseQuery(rest, api, extraOptions);
  if (result.error) return result as ReturnType<typeof rtkErrorResult>;
  if (result.data && typeof result.data === "object" && "success" in (result.data as object)) {
    const body = result.data as { success: boolean; data: unknown };
    return rtkDataResult(body.data, result.meta);
  }
  return result as ReturnType<typeof rtkDataResult>;
};

export const demoPublicApi = createApi({
  reducerPath: "demoPublicApi",
  baseQuery,
  endpoints: (builder) => ({
    getDemoPublicBranding: builder.query<DemoPublicBranding, string>({
      query: (publicId) => ({ url: `/public/demo/${publicId}/branding`, mockKey: "demoPublicBranding", mockParams: { publicId } }),
    }),
    exchangeDemoSession: builder.mutation<DemoSessionExchangeResult, { publicId: string; secret: string }>({
      query: ({ publicId, secret }) => ({
        url: `/public/demo/${publicId}/session`,
        method: "POST",
        body: { secret, device: { deviceId: "demo-web", platform: "web", appVersion: "demo-entry" } },
        mockKey: "demoSessionExchange",
        mockParams: { publicId },
      }),
    }),
  }),
});

export const { useGetDemoPublicBrandingQuery, useExchangeDemoSessionMutation } = demoPublicApi;
