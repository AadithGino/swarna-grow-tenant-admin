import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { apiOrigin, env } from "@/src/config/env";
import {
  handlePlatformUnauthorized,
  isUnauthorizedFetchError,
} from "@/src/lib/auth-logout";
import { TOKEN_KEYS } from "@/src/lib/auth-token-storage";
import { normalizeFetchBaseQueryError } from "@/src/lib/api-error";
import type { AppDispatch } from "@/src/store";
import {
  authRefreshGuard,
  refreshAfterUnauthorized,
  retryAuthorizedRequest,
  shouldAttemptAuthRefresh,
  shouldForceAuthLogout,
} from "@/src/lib/auth-base-query-refresh";
import { readContractResponseBody } from "@/src/lib/contract-response";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { ensureMutationJsonBody } from "@/src/lib/rtk-mutation-body";
import { platformMockRequest } from "@/src/mocks/platform-server";
import {
  emptyPageMeta,
  type ListPageMeta,
} from "@/src/lib/cursor-pagination";
import type { AuditLog, ErrorLog, PlatformDashboardSummary, PlatformInvoice, PlatformPlan, PlatformTenantDetail, PlatformTenantListResponse, PlatformTenantRow, TemplateDefinition, TenantTemplate, UsageMetric, WebhookFailure } from "@/src/types/platform";

export type PlatformAuditLogsResult = {
  items: AuditLog[];
  page: ListPageMeta;
};

function auditPageFromMeta(
  meta: Record<string, unknown> | undefined,
  fallbackLimit: number,
): ListPageMeta {
  if (!meta) return emptyPageMeta(fallbackLimit);
  return {
    nextCursor:
      meta.nextCursor != null ? String(meta.nextCursor) : null,
    hasMore: Boolean(meta.hasMore),
    limit: Number(meta.limit) || fallbackLimit,
    total: typeof meta.total === "number" ? meta.total : undefined,
  };
}

function toUsageMetric(block: unknown): UsageMetric {
  if (block && typeof block === "object" && "used" in block) {
    const row = block as { used: number; limit?: number | null; percent?: number | null; percentage?: number | null; resetDate?: string };
    return {
      used: row.used ?? 0,
      limit: row.limit ?? null,
      percentage: row.percent ?? row.percentage ?? 0,
      ...(row.resetDate ? { resetDate: row.resetDate } : {}),
    };
  }
  return { used: 0, limit: null, percentage: 0 };
}

/** Maps GET /platform/tenants/:id to PlatformTenantDetail (supports legacy nested usage). */
export function normalizeTenantDetail(raw: Record<string, unknown>): PlatformTenantDetail {
  const usage = (raw.usage ?? {}) as Record<string, unknown>;
  const hasFlatUsage = typeof usage.activeCustomers === "number";
  const hasUsageDetail = raw.usageDetail && typeof raw.usageDetail === "object";

  if (hasFlatUsage && hasUsageDetail) return raw as PlatformTenantDetail;

  const usageDetail = hasUsageDetail
    ? (raw.usageDetail as Record<string, UsageMetric>)
    : {
        activeCustomers: toUsageMetric(usage.activeCustomers),
        branches: toUsageMetric(usage.branches),
        staff: toUsageMetric(usage.staff),
        schemePlans: toUsageMetric(usage.schemePlans),
        whatsappMessages: toUsageMetric(usage.whatsappMessages),
      };

  const flatUsage = hasFlatUsage
    ? (usage as PlatformTenantDetail["usage"])
    : {
        activeCustomers: toUsageMetric(usage.activeCustomers).used,
        branches: toUsageMetric(usage.branches).used,
        staff: toUsageMetric(usage.staff).used,
        whatsappUsedThisMonth: toUsageMetric(usage.whatsappMessages).used,
      };

  const integrations = (raw.integrations ?? {}) as PlatformTenantDetail["integrations"];
  const templates = (raw.templates ?? { configured: 0, required: 8, missing: [] }) as PlatformTenantDetail["templates"];

  return {
    ...(raw as PlatformTenantDetail),
    usage: flatUsage,
    usageDetail,
    provisioning: (raw.provisioning as PlatformTenantDetail["provisioning"]) ?? {
      whatsappConfigured: Boolean(integrations?.whatsapp?.configured),
      paymentGatewayConfigured: Boolean(integrations?.paymentGateway?.configured),
      templatesConfigured: templates.configured ?? 0,
      templatesRequired: templates.required ?? 8,
      readyToGoLive: false,
    },
    owner: (raw.owner as PlatformTenantDetail["owner"]) ?? { id: "", name: "—", mobile: "—", email: "" },
    flags: (raw.flags as Record<string, boolean>) ?? {},
    effectiveFlags: (raw.effectiveFlags as Record<string, boolean>) ?? {},
  };
}

export function normalizeTenantListPayload(data: unknown): PlatformTenantListResponse {
  if (data && typeof data === "object" && "rows" in data) return data as PlatformTenantListResponse;
  const rows = Array.isArray(data) ? (data as PlatformTenantRow[]) : [];
  return {
    rows,
    meta: {
      summary: {
        total: rows.length,
        active: rows.filter((r) => r.status === "ACTIVE").length,
        pendingSetup: rows.filter((r) => r.status === "PENDING_SETUP").length,
        suspended: rows.filter((r) => r.status === "SUSPENDED").length,
        cancelled: rows.filter((r) => r.status === "CANCELLED").length,
        atCustomerLimit: rows.filter((r) => {
          const limit = r.usage.limits?.activeCustomers;
          if (limit == null || limit <= 0) return false;
          return r.usage.activeCustomers >= Math.ceil(limit * 0.9);
        }).length,
      },
    },
  };
}

function tenantListParams(params: { q?: string; status?: string; tier?: string }) {
  return {
    ...(params.q?.trim() ? { q: params.q.trim() } : {}),
    ...(params.status && params.status !== "ALL" ? { status: params.status } : {}),
    ...(params.tier && params.tier !== "ALL" ? { tier: params.tier } : {}),
  };
}

function webhookFailureParams(params: { provider?: string; limit?: number; cursor?: string }) {
  return {
    limit: params.limit ?? 50,
    ...(params.cursor ? { cursor: params.cursor } : {}),
    ...(params.provider && params.provider !== "ALL" ? { provider: params.provider } : {}),
  };
}

export type WebhookFailuresResponse = { rows: WebhookFailure[]; meta: { total?: number; hasMore?: boolean; nextCursor?: string | null; limit?: number } };
export type PlatformErrorLogsResponse = { rows: ErrorLog[]; meta: { total?: number; limit?: number } };

export type PlatformLivenessHealth = { status: string; timestamp: string };
export type PlatformReadinessHealth = { ok: boolean; database: string; queue: string; workers: string };

type PlatformArgs = FetchArgs & { mockKey: string; mockParams?: Record<string, unknown> };
type PlatformBaseQueryExtra = { _authRetry?: boolean };

const liveBaseQuery = fetchBaseQuery({
  baseUrl: env.apiBaseUrl,
  responseHandler: readContractResponseBody,
  prepareHeaders: (headers) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem(TOKEN_KEYS.platform.access);
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }
    headers.set("Accept", "application/json");
    return headers;
  },
});

const baseQuery: BaseQueryFn<
  PlatformArgs,
  unknown,
  FetchBaseQueryError,
  PlatformBaseQueryExtra
> = async (args, api, extra) => {
  if (env.useMocks) {
    try { return { data: await platformMockRequest({ mockKey: args.mockKey, params: args.mockParams ?? (args.params as Record<string, unknown>), body: args.body as Record<string, unknown> }) }; }
    catch (error) { return { error: { status: "CUSTOM_ERROR", error: error instanceof Error ? error.message : "Mock request failed" } }; }
  }
  const headers = new Headers(args.headers as HeadersInit | undefined);
  const method = String(args.method ?? "GET").toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    headers.set("X-Idempotency-Key", newIdempotencyKey());
  }
  const preparedArgs = ensureMutationJsonBody({ ...args, headers });
  const requestUrl = String(args.url ?? "");
  const guard = authRefreshGuard(requestUrl, extra, [
    "/platform/auth/refresh",
    "/platform/auth/login",
  ]);
  const dispatch = api.dispatch as AppDispatch;

  let result = await liveBaseQuery(preparedArgs, api, extra);

  if (shouldAttemptAuthRefresh(result.error, guard, env.useMocks)) {
    const refreshed = await refreshAfterUnauthorized("platform", guard);
    if (refreshed) {
      result = await retryAuthorizedRequest(
        liveBaseQuery,
        preparedArgs,
        api,
        extra,
      );
    } else if (shouldForceAuthLogout("platform", true)) {
      handlePlatformUnauthorized(dispatch);
    }
  } else if (
    !env.useMocks &&
    isUnauthorizedFetchError(result.error) &&
    !guard.skipRefresh &&
    shouldForceAuthLogout("platform", false)
  ) {
    handlePlatformUnauthorized(dispatch);
  }

  if (result.error) {
    return {
      error: normalizeFetchBaseQueryError(result.error),
      meta: result.meta,
    };
  }
  if (result.data && typeof result.data === "object" && "success" in result.data) {
    const body = result.data as { success: boolean; data: unknown; meta?: Record<string, unknown> };
    const url = String(args.url ?? "");
    if (url === "/platform/tenants" && body.meta) {
      return {
        ...result,
        data: {
          rows: body.data as PlatformTenantRow[],
          meta: body.meta,
        } satisfies PlatformTenantListResponse,
      };
    }
    if (url === "/platform/webhook-failures" && body.meta) {
      return { ...result, data: { rows: body.data as WebhookFailure[], meta: body.meta } satisfies WebhookFailuresResponse };
    }
    if (url === "/platform/error-logs" && body.meta) {
      return { ...result, data: { rows: body.data as ErrorLog[], meta: body.meta } satisfies PlatformErrorLogsResponse };
    }
    if (url === "/platform/audit-logs") {
      const rows = (Array.isArray(body.data) ? body.data : []) as AuditLog[];
      const limit = Number((args.params as { limit?: number })?.limit) || 20;
      return {
        ...result,
        data: {
          items: rows,
          page: auditPageFromMeta(body.meta, limit),
        } satisfies PlatformAuditLogsResult,
      };
    }
    return { ...result, data: body.data };
  }
  return result;
};

export const platformApi = createApi({
  reducerPath: "platformApi", baseQuery, tagTypes: ["PlatformDashboard", "PlatformTenant", "PlatformTenantList", "PlatformPlan", "PlatformTemplate", "PlatformInvoice", "PlatformOps"],
  endpoints: (builder) => ({
    platformLogin: builder.mutation<any, { email: string; password: string }>({ query: (body) => ({ url: "/platform/auth/login", method: "POST", body, mockKey: "login" }) }),
    refreshPlatformToken: builder.mutation<any, { refreshToken: string }>({ query: (body) => ({ url: "/platform/auth/refresh", method: "POST", body, mockKey: "refresh" }) }),
    platformLogout: builder.mutation<any, { refreshToken?: string }>({ query: (body) => ({ url: "/platform/auth/logout", method: "POST", body, mockKey: "logout" }) }),
    getPlatformDashboard: builder.query<PlatformDashboardSummary, void>({ query: () => ({ url: "/platform/dashboard/summary", mockKey: "dashboardSummary" }), providesTags: ["PlatformDashboard"] }),
    getPlatformChart: builder.query<any, string>({ query: (chartKey) => ({ url: `/platform/dashboard/charts/${chartKey}`, mockKey: "dashboardChart", mockParams: { chartKey } }) }),
    getPlatformPlans: builder.query<PlatformPlan[], void>({
      query: () => ({ url: "/platform/subscription-plans", mockKey: "plans" }),
      transformResponse: (response: unknown) =>
        (Array.isArray(response) ? response : []).map((plan) => ({
          ...(plan as PlatformPlan),
          tenantCount: (plan as PlatformPlan).tenantCount ?? 0,
          version: (plan as PlatformPlan).version ?? 1,
          supportedBillingCycles: (plan as PlatformPlan).supportedBillingCycles ?? ["MONTHLY", "ANNUAL"],
          displayFeatures: (plan as PlatformPlan).displayFeatures ?? [],
          monthlyPrice: (plan as PlatformPlan).monthlyPrice ?? { amountPaise: 0, amountDisplay: "—" },
          yearlyPrice: (plan as PlatformPlan).yearlyPrice ?? { amountPaise: 0, amountDisplay: "—" },
        })),
      providesTags: ["PlatformPlan"],
    }),
    getPlatformPlan: builder.query<PlatformPlan, string>({ query: (planId) => ({ url: `/platform/subscription-plans/${planId}`, mockKey: "plan", mockParams: { planId } }), providesTags: ["PlatformPlan"] }),
    savePlatformPlan: builder.mutation<PlatformPlan, { planId?: string; body: Record<string, unknown> }>({ query: ({ planId, body }) => ({ url: planId ? `/platform/subscription-plans/${planId}` : "/platform/subscription-plans", method: planId ? "PATCH" : "POST", body, mockKey: "savePlan", mockParams: { planId } }), invalidatesTags: ["PlatformPlan"] }),
    deprecatePlatformPlan: builder.mutation<PlatformPlan, string>({ query: (planId) => ({ url: `/platform/subscription-plans/${planId}/deprecate`, method: "POST", mockKey: "deprecatePlan", mockParams: { planId } }), invalidatesTags: ["PlatformPlan"] }),
    getPlatformTenants: builder.query<PlatformTenantListResponse, { q?: string; status?: string; tier?: string; limit?: number }>({
      query: (params) => ({
        url: "/platform/tenants",
        params: { ...tenantListParams(params), ...(params.limit ? { limit: params.limit } : {}) },
        mockKey: "tenants",
        mockParams: params,
      }),
      transformResponse: (response: unknown) => normalizeTenantListPayload(response),
      providesTags: ["PlatformTenantList"],
    }),
    getPlatformTenant: builder.query<PlatformTenantDetail, string>({
      query: (tenantId) => ({ url: `/platform/tenants/${tenantId}`, mockKey: "tenant", mockParams: { tenantId } }),
      transformResponse: (response: unknown) => normalizeTenantDetail((response ?? {}) as Record<string, unknown>),
      providesTags: (_r, _e, id) => [{ type: "PlatformTenant", id }],
    }),
    createPlatformTenant: builder.mutation<any, Record<string, unknown>>({ query: (body) => ({ url: "/platform/tenants", method: "POST", body, mockKey: "createTenant" }), invalidatesTags: ["PlatformTenantList", "PlatformDashboard"] }),
    updatePlatformTenant: builder.mutation<PlatformTenantDetail, { tenantId: string; body: Record<string, unknown> }>({ query: ({ tenantId, body }) => ({ url: `/platform/tenants/${tenantId}`, method: "PATCH", body, mockKey: "updateTenant", mockParams: { tenantId } }), invalidatesTags: (_r, _e, a) => [{ type: "PlatformTenant", id: a.tenantId }, "PlatformTenantList"] }),
    suspendPlatformTenant: builder.mutation<any, { tenantId: string; reason?: string; notifyOwner?: boolean }>({ query: ({ tenantId, ...body }) => ({ url: `/platform/tenants/${tenantId}/suspend`, method: "POST", body, mockKey: "suspendTenant", mockParams: { tenantId } }), invalidatesTags: (_r, _e, a) => [{ type: "PlatformTenant", id: a.tenantId }, "PlatformTenantList", "PlatformDashboard"] }),
    reactivatePlatformTenant: builder.mutation<any, string>({ query: (tenantId) => ({ url: `/platform/tenants/${tenantId}/reactivate`, method: "POST", mockKey: "reactivateTenant", mockParams: { tenantId } }), invalidatesTags: (_r, _e, id) => [{ type: "PlatformTenant", id }, "PlatformTenantList", "PlatformDashboard"] }),
    goLivePlatformTenant: builder.mutation<any, string>({ query: (tenantId) => ({ url: `/platform/tenants/${tenantId}/go-live`, method: "POST", mockKey: "goLive", mockParams: { tenantId } }), invalidatesTags: (_r, _e, id) => [{ type: "PlatformTenant", id }, "PlatformTenantList"] }),
    resetOwnerCredentials: builder.mutation<any, string>({ query: (tenantId) => ({ url: `/platform/tenants/${tenantId}/owner-credentials`, method: "POST", body: {}, mockKey: "ownerCredentials", mockParams: { tenantId } }) }),
    getPlatformUsage: builder.query<Record<string, any>, string>({ query: (tenantId) => ({ url: `/platform/tenants/${tenantId}/usage`, mockKey: "usage", mockParams: { tenantId } }), providesTags: (_r, _e, id) => [{ type: "PlatformTenant", id }] }),
    getPlatformFlags: builder.query<any, string>({ query: (tenantId) => ({ url: `/platform/tenants/${tenantId}/flags`, mockKey: "flags", mockParams: { tenantId } }), providesTags: (_r, _e, id) => [{ type: "PlatformTenant", id }] }),
    savePlatformFlags: builder.mutation<any, { tenantId: string; body: Record<string, unknown> }>({ query: ({ tenantId, body }) => ({ url: `/platform/tenants/${tenantId}/flags`, method: "PUT", body, mockKey: "saveFlags", mockParams: { tenantId } }), invalidatesTags: (_r, _e, a) => [{ type: "PlatformTenant", id: a.tenantId }] }),
    saveWhatsappIntegration: builder.mutation<any, { tenantId: string; body: Record<string, unknown> }>({ query: ({ tenantId, body }) => ({ url: `/platform/tenants/${tenantId}/integrations/whatsapp`, method: "PUT", body, mockKey: "saveWhatsapp", mockParams: { tenantId } }), invalidatesTags: (_r, _e, a) => [{ type: "PlatformTenant", id: a.tenantId }] }),
    verifyWhatsappIntegration: builder.mutation<any, { tenantId: string; testMobile: string }>({ query: ({ tenantId, testMobile }) => ({ url: `/platform/tenants/${tenantId}/integrations/whatsapp/verify`, method: "POST", body: { testMobile }, mockKey: "verifyWhatsapp", mockParams: { tenantId } }), invalidatesTags: (_r, _e, a) => [{ type: "PlatformTenant", id: a.tenantId }] }),
    savePaymentIntegration: builder.mutation<any, { tenantId: string; body: Record<string, unknown> }>({ query: ({ tenantId, body }) => ({ url: `/platform/tenants/${tenantId}/integrations/payment-gateway`, method: "PUT", body, mockKey: "saveGateway", mockParams: { tenantId } }), invalidatesTags: (_r, _e, a) => [{ type: "PlatformTenant", id: a.tenantId }] }),
    verifyPaymentIntegration: builder.mutation<any, string>({ query: (tenantId) => ({ url: `/platform/tenants/${tenantId}/integrations/payment-gateway/verify`, method: "POST", mockKey: "verifyGateway", mockParams: { tenantId } }), invalidatesTags: (_r, _e, id) => [{ type: "PlatformTenant", id }] }),
    getTemplateDefinitions: builder.query<TemplateDefinition[], void>({
      query: () => ({ url: "/platform/template-definitions", mockKey: "templateDefinitions" }),
      transformResponse: (response: unknown) => {
        const rows = Array.isArray(response) ? response : [];
        return [...rows].sort((a, b) => {
          if (a.required !== b.required) return a.required ? -1 : 1;
          return a.messageType.localeCompare(b.messageType);
        }) as TemplateDefinition[];
      },
    }),
    getTenantTemplates: builder.query<TenantTemplate[], string>({ query: (tenantId) => ({ url: `/platform/tenants/${tenantId}/templates`, mockKey: "templates", mockParams: { tenantId } }), providesTags: (_r, _e, id) => [{ type: "PlatformTemplate", id }] }),
    saveTenantTemplate: builder.mutation<TenantTemplate, { tenantId: string; messageType: string; body: Record<string, unknown> }>({ query: ({ tenantId, messageType, body }) => ({ url: `/platform/tenants/${tenantId}/templates/${messageType}`, method: "PUT", body, mockKey: "saveTemplate", mockParams: { tenantId, messageType } }), invalidatesTags: (_r, _e, a) => [{ type: "PlatformTemplate", id: a.tenantId }, { type: "PlatformTenant", id: a.tenantId }] }),
    deleteTenantTemplate: builder.mutation<any, { tenantId: string; messageType: string }>({ query: ({ tenantId, messageType }) => ({ url: `/platform/tenants/${tenantId}/templates/${messageType}`, method: "DELETE", mockKey: "deleteTemplate", mockParams: { tenantId, messageType } }), invalidatesTags: (_r, _e, a) => [{ type: "PlatformTemplate", id: a.tenantId }, { type: "PlatformTenant", id: a.tenantId }] }),
    testTenantTemplate: builder.mutation<any, { tenantId: string; messageType: string; testMobile: string }>({ query: ({ tenantId, messageType, testMobile }) => ({ url: `/platform/tenants/${tenantId}/templates/${messageType}/test`, method: "POST", body: { testMobile }, mockKey: "testTemplate", mockParams: { tenantId, messageType } }) }),
    changeTenantPlan: builder.mutation<any, { tenantId: string; body: Record<string, unknown> }>({ query: ({ tenantId, body }) => ({ url: `/platform/tenants/${tenantId}/subscription/change-plan`, method: "POST", body, mockKey: "changePlan", mockParams: { tenantId } }), invalidatesTags: (_r, _e, a) => [{ type: "PlatformTenant", id: a.tenantId }] }),
    updateTenantLimits: builder.mutation<any, { tenantId: string; body: Record<string, unknown> }>({ query: ({ tenantId, body }) => ({ url: `/platform/tenants/${tenantId}/subscription/limits`, method: "PATCH", body, mockKey: "updateLimits", mockParams: { tenantId } }), invalidatesTags: (_r, _e, a) => [{ type: "PlatformTenant", id: a.tenantId }] }),
    extendTenantSubscription: builder.mutation<any, { tenantId: string; body: Record<string, unknown> }>({ query: ({ tenantId, body }) => ({ url: `/platform/tenants/${tenantId}/subscription/extend`, method: "POST", body, mockKey: "extendSubscription", mockParams: { tenantId } }), invalidatesTags: (_r, _e, a) => [{ type: "PlatformTenant", id: a.tenantId }] }),
    cancelTenantSubscription: builder.mutation<any, { tenantId: string; reason?: string }>({ query: ({ tenantId, reason }) => ({ url: `/platform/tenants/${tenantId}/subscription/cancel`, method: "POST", body: { reason }, mockKey: "cancelSubscription", mockParams: { tenantId } }), invalidatesTags: (_r, _e, a) => [{ type: "PlatformTenant", id: a.tenantId }] }),
    getTenantInvoices: builder.query<PlatformInvoice[], string>({ query: (tenantId) => ({ url: `/platform/tenants/${tenantId}/invoices`, mockKey: "invoices", mockParams: { tenantId } }), providesTags: (_r, _e, id) => [{ type: "PlatformInvoice", id }] }),
    createTenantInvoice: builder.mutation<PlatformInvoice, { tenantId: string; body: Record<string, unknown> }>({ query: ({ tenantId, body }) => ({ url: `/platform/tenants/${tenantId}/invoices`, method: "POST", body, mockKey: "createInvoice", mockParams: { tenantId } }), invalidatesTags: (_r, _e, a) => [{ type: "PlatformInvoice", id: a.tenantId }] }),
    markPlatformInvoicePaid: builder.mutation<PlatformInvoice, string>({ query: (invoiceId) => ({ url: `/platform/invoices/${invoiceId}/mark-paid`, method: "POST", body: {}, mockKey: "markInvoicePaid", mockParams: { invoiceId } }), invalidatesTags: ["PlatformInvoice"] }),
    getPlatformAuditLogs: builder.query<
      PlatformAuditLogsResult,
      {
        tenantId?: string;
        action?: string;
        entityType?: string;
        from?: string;
        to?: string;
        cursor?: string;
        limit?: number;
      }
    >({
      query: (params) => ({
        url: "/platform/audit-logs",
        params,
        mockKey: "auditLogs",
        mockParams: params,
      }),
      transformResponse: (response: unknown) => {
        if (
          response &&
          typeof response === "object" &&
          "items" in response &&
          "page" in response
        ) {
          return response as PlatformAuditLogsResult;
        }
        const rows = Array.isArray(response) ? response : [];
        return { items: rows as AuditLog[], page: emptyPageMeta(rows.length || 20) };
      },
      providesTags: ["PlatformOps"],
    }),
    getWebhookFailures: builder.query<WebhookFailuresResponse, { provider?: string; cursor?: string; limit?: number }>({
      query: (params) => ({
        url: "/platform/webhook-failures",
        params: webhookFailureParams(params),
        mockKey: "webhookFailures",
        mockParams: params,
      }),
      transformResponse: (response: WebhookFailuresResponse | WebhookFailure[]) => {
        if (response && typeof response === "object" && "rows" in response) return response;
        const rows = Array.isArray(response) ? response : [];
        return { rows, meta: { total: rows.length, hasMore: false, limit: rows.length, nextCursor: null } };
      },
      providesTags: ["PlatformOps"],
    }),
    getPlatformLivenessHealth: builder.query<PlatformLivenessHealth, void>({
      async queryFn(_arg, _api, _extra) {
        if (env.useMocks) {
          return { data: { status: "ok", timestamp: new Date().toISOString() } };
        }
        try {
          const res = await fetch(`${apiOrigin()}/health`, { headers: { Accept: "application/json" } });
          const json = (await res.json()) as { data?: PlatformLivenessHealth };
          if (!res.ok || !json.data) {
            return { error: { status: res.status, data: json } as FetchBaseQueryError };
          }
          return { data: json.data };
        } catch (error) {
          return { error: { status: "FETCH_ERROR", error: String(error) } as FetchBaseQueryError };
        }
      },
      providesTags: ["PlatformOps"],
    }),
    getPlatformReadinessHealth: builder.query<PlatformReadinessHealth, void>({
      async queryFn(_arg, _api, _extra) {
        if (env.useMocks) {
          return { data: { ok: true, database: "ready", queue: "ready", workers: "ready" } };
        }
        try {
          const res = await fetch(`${apiOrigin()}/health/ready`, { headers: { Accept: "application/json" } });
          const json = (await res.json()) as { success?: boolean; data?: { database?: string; queue?: string; workers?: string } };
          const database = json.data?.database ?? "unavailable";
          const queue = json.data?.queue ?? "unavailable";
          const workers = json.data?.workers ?? "unavailable";
          return { data: { ok: res.ok && Boolean(json.success), database, queue, workers } };
        } catch (error) {
          return { data: { ok: false, database: "unavailable", queue: "unavailable", workers: "unavailable" } };
        }
      },
      providesTags: ["PlatformOps"],
    }),
    retryWebhookFailure: builder.mutation<any, string>({ query: (id) => ({ url: `/platform/webhook-failures/${id}/retry`, method: "POST", mockKey: "retryWebhook", mockParams: { id } }), invalidatesTags: ["PlatformOps"] }),
    getPlatformErrorLogs: builder.query<PlatformErrorLogsResponse, { tenantId?: string; traceId?: string; limit?: number }>({
      query: (params) => ({
        url: "/platform/error-logs",
        params: {
          limit: params.limit ?? 500,
          ...(params.tenantId?.trim() ? { tenantId: params.tenantId.trim() } : {}),
          ...(params.traceId?.trim() ? { traceId: params.traceId.trim() } : {}),
        },
        mockKey: "errorLogs",
        mockParams: params,
      }),
      transformResponse: (response: PlatformErrorLogsResponse | ErrorLog[]) => {
        if (response && typeof response === "object" && "rows" in response) return response;
        const rows = Array.isArray(response) ? response : [];
        return { rows, meta: { total: rows.length, limit: rows.length } };
      },
      providesTags: ["PlatformOps"],
    }),
  }),
});

export const { usePlatformLoginMutation, usePlatformLogoutMutation, useGetPlatformDashboardQuery, useGetPlatformChartQuery, useGetPlatformPlansQuery, useGetPlatformPlanQuery, useSavePlatformPlanMutation, useDeprecatePlatformPlanMutation, useGetPlatformTenantsQuery, useGetPlatformTenantQuery, useCreatePlatformTenantMutation, useUpdatePlatformTenantMutation, useSuspendPlatformTenantMutation, useReactivatePlatformTenantMutation, useGoLivePlatformTenantMutation, useResetOwnerCredentialsMutation, useGetPlatformUsageQuery, useGetPlatformFlagsQuery, useSavePlatformFlagsMutation, useSaveWhatsappIntegrationMutation, useVerifyWhatsappIntegrationMutation, useSavePaymentIntegrationMutation, useVerifyPaymentIntegrationMutation, useGetTemplateDefinitionsQuery, useGetTenantTemplatesQuery, useSaveTenantTemplateMutation, useDeleteTenantTemplateMutation, useTestTenantTemplateMutation, useChangeTenantPlanMutation, useUpdateTenantLimitsMutation, useExtendTenantSubscriptionMutation, useCancelTenantSubscriptionMutation, useGetTenantInvoicesQuery, useCreateTenantInvoiceMutation, useMarkPlatformInvoicePaidMutation, useGetPlatformAuditLogsQuery, useGetWebhookFailuresQuery, useLazyGetWebhookFailuresQuery, useRetryWebhookFailureMutation, useGetPlatformErrorLogsQuery, useGetPlatformLivenessHealthQuery, useGetPlatformReadinessHealthQuery } = platformApi;
