import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { env } from "@/src/config/env";
import {
  handleTenantUnauthorized,
  isUnauthorizedFetchError,
} from "@/src/lib/auth-logout";
import { storeAuthTokens } from "@/src/lib/auth-session";
import {
  authRefreshGuard,
  refreshAfterUnauthorized,
  retryAuthorizedRequest,
  shouldAttemptAuthRefresh,
  shouldForceAuthLogout,
} from "@/src/lib/auth-base-query-refresh";
import type { AppDispatch } from "@/src/store";
import {
  fetchAuthorizedBlob,
  fetchAuthorizedMaybeBlob,
} from "@/src/lib/download-api";
import { readContractResponseBody } from "@/src/lib/contract-response";
import { normalizeFetchBaseQueryError } from "@/src/lib/api-error";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { ensureMutationJsonBody } from "@/src/lib/rtk-mutation-body";
import { businessTodayYmd } from "@/src/lib/list-date-range";
import { mockRequest } from "@/src/mocks/mock-server";
import type {
  CashHandover,
  CashHandoverDetail,
  Customer,
  CustomerNomineeDetail,
  Enrollment,
  GoldRate,
  Grievance,
  MessageLog,
  PayableQuote,
  Payment,
  PortalAlert,
  RedemptionRecord,
  SchemePlan,
  SettlementPreview,
  SettlementPreviewType,
  GlobalSearchResult,
} from "@/src/types/domain";
import {
  adaptCustomer,
  adaptCustomerList,
  contractPayload,
  contractMeta,
  adaptDashboard,
  adaptDashboardChart,
  adaptEnrollment,
  adaptEnrollmentList,
  adaptEnrollments,
  adaptGlobalSearch,
  adaptGoldHistory,
  adaptListBundle,
  adaptCashOverview,
  adaptCashStaffBalances,
  adaptCashHandovers,
  adaptCashHandoverDetail,
  adaptCashReport,
  adaptAdminReport,
  adaptPayableRange,
  adaptPaymentList,
  adaptPayments,
  adaptSchemeLedgerList,
  type SchemeLedgerRow,
  adaptDueList,
  adaptMessages,
  adaptRedemptions,
  adaptEnrolValidation,
  adaptPlans,
  adaptPlanDetail,
  adaptPlanMutationResponse,
  adaptPlanStats,
  adaptStaffList,
  adaptStaffDetail,
  adaptPaginatedList,
  adaptBranchDetail,
  adaptBranchList,
  adaptSettingsBranding,
  adaptSettingsOperations,
  adaptSettingsProfile,
  adaptSubscription,
  adaptSubscriptionInvoices,
  adaptGrievanceList,
  adaptGrievanceDetail,
  adaptCustomerResourceList,
  adaptPortalAlerts,
  adaptCustomerAnalytics,
  adaptEnrollmentAnalytics,
  adaptAuditEvents,
  adaptRedemptionDetail,
  adaptRedemptionRecord,
  adaptSettlementPreview,
  fromPaise,
  type RedemptionDetailView,
} from "./contract-adapters";

export type ListQueryParams = {
  cursor?: string;
  limit?: number;
  branchId?: string;
};

export type DateRangeQueryParams = {
  from?: string;
  to?: string;
  period?: string;
  preset?: string;
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Map dashboard period presets to backend from/to (IST calendar days). */
function periodToDateRange(period?: string): { from?: string; to?: string } {
  const now = new Date();
  const to = isoDate(now);
  if (!period || period === "THIS_MONTH") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: isoDate(from), to };
  }
  if (period === "LAST_MONTH") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: isoDate(from), to: isoDate(end) };
  }
  if (period === "THIS_WEEK") {
    const day = now.getDay() || 7;
    const from = new Date(now);
    from.setDate(now.getDate() - day + 1);
    return { from: isoDate(from), to };
  }
  if (period === "TODAY") {
    return { from: to, to };
  }
  return {};
}

type ApiArgs = FetchArgs & { mockKey: string };

type ApiRootState = {
  ui?: { branchId?: string };
  session?: { session?: { user?: { role?: string } } };
};

function injectActingBranch(args: ApiArgs, getState: () => unknown): ApiArgs {
  const url = String(args.url ?? "");
  const params = {
    ...((args.params as Record<string, unknown> | undefined) ?? {}),
  };

  // Reports declare branch scope explicitly; never inherit the global showroom picker.
  if (url.includes("/admin/reports/")) {
    if (params.branchId == null || String(params.branchId).trim() === "") {
      params.branchId = "ALL";
    }
    return { ...args, params };
  }

  const state = getState() as ApiRootState;
  const branch = state.ui?.branchId;
  if (!branch || branch === "ALL") return args;
  const method = (args.method ?? "GET").toUpperCase();
  if (method !== "GET") return args;

  if (params.branchId != null && String(params.branchId).trim() !== "") {
    return args;
  }
  params.branchId = branch;

  const headers = new Headers(args.headers as HeadersInit | undefined);
  if (state.session?.session?.user?.role === "TENANT_OWNER") {
    headers.set("X-Acting-Branch-Id", branch);
  }

  return { ...args, params, headers };
}

function mapReportKeyToExportType(reportKey: string): string {
  const map: Record<string, string> = {
    COLLECTION: "COLLECTION",
    OUTSTANDING: "OUTSTANDING",
    DEFAULTER: "DEFAULTER",
    GOLD_ACCRUAL: "GOLD_ACCRUAL",
    STAFF_PERFORMANCE: "STAFF_PERFORMANCE",
    SCHEME_REGISTER: "SCHEME",
    CUSTOMER_LEDGER: "CUSTOMER",
    CUSTOMER_PERFORMANCE: "CUSTOMER",
    MATURITY_REDEMPTION: "MATURITY",
    ENROLMENT: "SCHEME",
    DUE: "DUE",
    OVERDUE: "OVERDUE",
    MATURITY: "MATURITY",
    CUSTOMER: "CUSTOMER",
    SCHEME: "SCHEME",
    AUDIT: "AUDIT",
  };
  return map[reportKey] ?? "COLLECTION";
}

export type NormalizedExportJob = {
  exportId: string;
  status: string;
  downloadUrl?: string;
  statusUrl?: string;
};

function resolveExportDownloadUrl(
  exportId: string,
  rawUrl: unknown,
): string | undefined {
  if (typeof rawUrl === "string" && rawUrl.trim() && rawUrl !== "#") {
    if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
      return rawUrl;
    }
    const base = env.apiBaseUrl.replace(/\/$/, "");
    if (rawUrl.startsWith("/api/v1")) {
      const origin = base.replace(/\/api\/v1$/, "");
      return `${origin}${rawUrl}`;
    }
    if (rawUrl.startsWith("/")) return `${base}${rawUrl}`;
    return rawUrl;
  }
  if (!exportId) return undefined;
  return `${env.apiBaseUrl.replace(/\/$/, "")}/admin/exports/${exportId}/file`;
}

export function normalizeExportJob(raw: unknown): NormalizedExportJob {
  const data = contractPayload(raw) as Record<string, unknown> | null;
  if (!data || typeof data !== "object") {
    return { exportId: "", status: "UNKNOWN" };
  }
  const exportId = String(data.exportId ?? data._id ?? data.id ?? "");
  const status = String(data.status ?? "QUEUED");
  const downloadUrl =
    status === "READY"
      ? resolveExportDownloadUrl(exportId, data.downloadUrl ?? data.url)
      : undefined;
  const statusUrl =
    typeof data.statusUrl === "string" ? data.statusUrl : undefined;
  return { exportId, status, downloadUrl, statusUrl };
}

function withIdempotencyHeader(args: ApiArgs): ApiArgs {
  const method = (args.method ?? "GET").toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return args;
  const headers = new Headers(args.headers as HeadersInit | undefined);
  if (!headers.has("X-Idempotency-Key")) {
    headers.set("X-Idempotency-Key", newIdempotencyKey());
  }
  return ensureMutationJsonBody({ ...args, headers });
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: env.apiBaseUrl,
  responseHandler: readContractResponseBody,
  prepareHeaders: (headers, { getState }) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("swarnagrow.accessToken");
      if (token) headers.set("Authorization", `Bearer ${token}`);
      const storedBranch = localStorage.getItem("swarnagrow.actingBranch");
      const state = getState() as ApiRootState;
      const branch = state.ui?.branchId ?? storedBranch;
      if (
        branch &&
        branch !== "ALL" &&
        state.session?.session?.user?.role === "TENANT_OWNER"
      ) {
        headers.set("X-Acting-Branch-Id", branch);
      }
    }
    headers.set("Accept", "application/json");
    return headers;
  },
});

type AppBaseQueryExtra = { _authRetry?: boolean };

function unwrapContractEnvelope(result: {
  data?: unknown;
  error?: FetchBaseQueryError;
  meta?: unknown;
}):
  | { data: unknown; error?: undefined; meta?: unknown }
  | { error: FetchBaseQueryError; data?: undefined; meta?: unknown } {
  if (
    result.data &&
    typeof result.data === "object" &&
    "success" in result.data
  ) {
    const envelope = result.data as {
      success: boolean;
      data?: unknown;
      meta?: unknown;
      error?: {
        code: string;
        message: string;
        details?: unknown;
        fields?: unknown;
      };
    };
    if (envelope.success)
      return {
        data: { __contract: true, payload: envelope.data, meta: envelope.meta },
      };
    const details = envelope.error?.details ?? envelope.error?.fields;
    return {
      error: {
        status: "CUSTOM_ERROR",
        error: envelope.error?.message ?? "Request failed",
        data: envelope.error
          ? {
              code: envelope.error.code,
              message: envelope.error.message,
              details,
              fields: details,
            }
          : envelope.error,
      },
    };
  }
  if (result.error) {
    return {
      error: normalizeFetchBaseQueryError(result.error),
      meta: result.meta,
    };
  }
  return { data: result.data, meta: result.meta };
}

const appBaseQuery = (async (args, api, extraOptions) => {
  if (env.useMocks) {
    try {
      return {
        data: await mockRequest({
          mockKey: args.mockKey,
          params: args.params as Record<string, unknown>,
          body: args.body as Record<string, unknown>,
        }),
      };
    } catch (error) {
      return { error: error as FetchBaseQueryError };
    }
  }
  const requestArgs = withIdempotencyHeader(
    injectActingBranch(args, api.getState),
  );
  let result = await rawBaseQuery(requestArgs, api, extraOptions);

  const requestUrl = typeof requestArgs.url === "string" ? requestArgs.url : "";
  const guard = authRefreshGuard(requestUrl, extraOptions, [
    "/auth/refresh",
    "/auth/login",
    "/auth/otp",
  ]);
  const dispatch = api.dispatch as AppDispatch;

  if (shouldAttemptAuthRefresh(result.error, guard, env.useMocks)) {
    const refreshed = await refreshAfterUnauthorized("tenant", guard);
    if (refreshed) {
      result = await retryAuthorizedRequest(
        rawBaseQuery,
        requestArgs,
        api,
        extraOptions,
      );
    } else if (shouldForceAuthLogout("tenant", true)) {
      handleTenantUnauthorized(dispatch);
    }
  } else if (
    !env.useMocks &&
    isUnauthorizedFetchError(result.error) &&
    !guard.skipRefresh &&
    shouldForceAuthLogout("tenant", false)
  ) {
    handleTenantUnauthorized(dispatch);
  }

  if (result.error) {
    return {
      error: normalizeFetchBaseQueryError(result.error),
      meta: result.meta,
    };
  }
  return unwrapContractEnvelope(result);
}) as BaseQueryFn<ApiArgs, unknown, FetchBaseQueryError, AppBaseQueryExtra>;

/** Stale-while-revalidate tiers (seconds) — jewellery counter ops. */
const STALE_TIER_A = 30;
const STALE_TIER_B = 60;
const STALE_TIER_C = 120;
const STALE_TIER_D = 300;

export const adminApi = createApi({
  reducerPath: "adminApi",
  baseQuery: appBaseQuery,
  /** Tier B default — lists & detail. Tier A/C/D endpoints override below. */
  refetchOnMountOrArgChange: STALE_TIER_B,
  tagTypes: [
    "Dashboard",
    "Alert",
    "Customer",
    "Enrollment",
    "Payment",
    "Cash",
    "GoldRate",
    "Message",
    "Plan",
    "Access",
    "Grievance",
    "Settings",
    "Export",
    "Report",
  ],
  endpoints: (builder) => ({
    login: builder.mutation<
      {
        user: Record<string, unknown>;
        accessToken: string;
        refreshToken: string;
        expiresIn: string;
        tokenType: string;
      },
      {
        tenantCode?: string;
        mobile: string;
        password: string;
        deviceId: string;
        platform?: "web" | "android" | "ios";
        appVersion?: string;
      }
    >({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        body: {
          tenantCode: body.tenantCode,
          mobile: body.mobile,
          password: body.password,
          deviceId: body.deviceId,
          platform: body.platform ?? "web",
          appVersion: body.appVersion,
        },
        mockKey: "login",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as {
          user: Record<string, unknown>;
          accessToken: string;
          refreshToken: string;
          expiresIn: string;
          tokenType: string;
        },
    }),
    logout: builder.mutation<
      { loggedOut: boolean },
      { refreshToken?: string } | void
    >({
      query: (body) => ({
        url: "/auth/logout",
        method: "POST",
        body: { refreshToken: body?.refreshToken },
        mockKey: "logout",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as { loggedOut: boolean },
    }),
    getMe: builder.query<Record<string, unknown>, void>({
      query: () => ({
        url: "/auth/me",
        mockKey: "getMe",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as Record<string, unknown>,
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    refreshToken: builder.mutation<
      {
        accessToken: string;
        refreshToken: string;
        expiresIn: string;
        tokenType: string;
      },
      { refreshToken: string }
    >({
      query: (body) => ({
        url: "/auth/refresh",
        method: "POST",
        body,
        mockKey: "refreshToken",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as {
          accessToken: string;
          refreshToken: string;
          expiresIn: string;
          tokenType: string;
        },
    }),
    forgotPassword: builder.mutation<
      {
        accepted?: boolean;
        expiresIn?: number;
        sent?: boolean;
        expiresInSeconds?: number;
      },
      { tenantCode: string; mobile: string; deviceId?: string }
    >({
      query: (body) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body: {
          ...body,
          deviceId: body.deviceId ?? "web-admin",
        },
        mockKey: "forgotPassword",
      }),
      transformResponse: (raw) => {
        const data = contractPayload(raw) as {
          accepted?: boolean;
          expiresIn?: number;
          sent?: boolean;
          expiresInSeconds?: number;
        };
        return {
          sent: data.sent ?? data.accepted ?? true,
          expiresInSeconds: data.expiresInSeconds ?? data.expiresIn ?? 300,
          ...data,
        };
      },
    }),
    verifyPasswordResetOtp: builder.mutation<
      { resetToken: string },
      {
        tenantCode: string;
        mobile: string;
        otp: string;
        deviceId: string;
      }
    >({
      query: (body) => ({
        url: "/public/auth/otp/verify",
        method: "POST",
        body: { ...body, purpose: "PASSWORD_RESET" },
        mockKey: "verifyPasswordResetOtp",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as { resetToken: string },
    }),
    resetPasswordWithToken: builder.mutation<
      { passwordSet: boolean },
      { resetToken: string; password: string }
    >({
      query: (body) => ({
        url: "/public/auth/set-password",
        method: "POST",
        body,
        mockKey: "resetPasswordWithToken",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as { passwordSet: boolean },
    }),
    changePassword: builder.mutation<
      { passwordChanged: boolean; sessionsRevoked: boolean },
      { currentPassword: string; newPassword: string }
    >({
      query: (body) => ({
        url: "/auth/change-password",
        method: "POST",
        body,
        mockKey: "changePassword",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as {
          passwordChanged: boolean;
          sessionsRevoked: boolean;
        },
    }),
    logoutAll: builder.mutation<{ loggedOut: boolean }, void>({
      query: () => ({
        url: "/auth/logout-all",
        method: "POST",
        mockKey: "logoutAll",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as { loggedOut: boolean },
    }),
    getDevices: builder.query<
      {
        deviceId: string;
        platform: string;
        lastUsedAt: string;
        expiresAt: string;
      }[],
      void
    >({
      query: () => ({
        url: "/auth/devices",
        mockKey: "getDevices",
      }),
      transformResponse: (raw) => {
        const payload = contractPayload(raw);
        return Array.isArray(payload) ? payload : [];
      },
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    revokeDevice: builder.mutation<{ revoked: boolean }, string>({
      query: (deviceId) => ({
        url: `/auth/devices/${deviceId}`,
        method: "DELETE",
        params: { deviceId },
        mockKey: "revokeDevice",
      }),
      transformResponse: (raw) => contractPayload(raw) as { revoked: boolean },
    }),
    setPassword: builder.mutation<
      { passwordSet: boolean },
      { resetToken?: string; password: string }
    >({
      query: (body) => ({
        url: "/auth/set-password",
        method: "POST",
        body,
        mockKey: "setPassword",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as { passwordSet: boolean },
    }),
    getDashboard: builder.query<
      ReturnType<typeof adaptDashboard>,
      { period?: string; branchId?: string; from?: string; to?: string } | void
    >({
      async queryFn(arg, _api, _extra, baseQuery) {
        const period = arg?.period ?? "THIS_MONTH";
        const branchId = arg?.branchId;
        const range =
          arg?.from && arg?.to
            ? { from: arg.from, to: arg.to }
            : periodToDateRange(period);
        const defaultChartKeys = [
          "collection-trend",
          "collection-by-mode",
          "scheme-status-distribution",
        ];
        if (env.useMocks) {
          const bundle = (await mockRequest({
            mockKey: "dashboard",
            params: { period, branchId },
          })) as {
            summary: unknown;
            trend: unknown;
            mode: unknown;
            attention?: unknown[];
          };
          const summaryPayload = contractPayload<any>(bundle.summary);
          const chartKeys: string[] = summaryPayload?.defaultCharts?.length
            ? summaryPayload.defaultCharts
            : defaultChartKeys;
          const charts: Record<string, any> = {};
          for (const chartKey of chartKeys) {
            charts[chartKey] = adaptDashboardChart(
              chartKey,
              await mockRequest({
                mockKey: "dashboardChart",
                params: { chartKey },
              }),
            );
          }
          return {
            data: adaptDashboard(bundle.summary, bundle.trend, bundle.mode, {
              attention: bundle.attention as any[],
              charts,
              defaultCharts: chartKeys,
            }),
          };
        }
        const summary = await baseQuery({
          url: "/admin/dashboard/summary",
          params: { period, branchId, ...range },
          mockKey: "dashboard",
        });
        if (summary.error) return { error: summary.error };
        const summaryPayload = contractPayload<any>(summary.data);
        const chartKeys: string[] = summaryPayload?.defaultCharts?.length
          ? summaryPayload.defaultCharts
          : defaultChartKeys;
        const chartResponses = await Promise.all(
          chartKeys.map((chartKey) =>
            baseQuery({
              url: `/admin/dashboard/charts/${chartKey}`,
              params: {
                period,
                branchId,
                granularity: "DAY",
                ...range,
              },
              mockKey: "dashboardChart",
            }),
          ),
        );
        const charts: Record<string, any> = {};
        chartKeys.forEach((key, i) => {
          const response = chartResponses[i];
          if (response.error || response.data == null) {
            charts[key] = adaptDashboardChart(key, []);
            return;
          }
          charts[key] = adaptDashboardChart(key, response.data);
        });
        return {
          data: adaptDashboard(
            summary.data,
            charts["collection-trend"],
            charts["collection-by-mode"],
            {
              charts,
              defaultCharts: chartKeys,
            },
          ),
        };
      },
      providesTags: ["Dashboard"],
      refetchOnMountOrArgChange: STALE_TIER_A,
      refetchOnFocus: true,
    }),
    getAlerts: builder.query<
      PortalAlert[],
      { branchId?: string; status?: string } | void
    >({
      query: (params) => ({
        url: "/admin/alerts",
        params: params ?? {},
        mockKey: "alerts",
      }),
      transformResponse: (raw) => adaptPortalAlerts(raw),
      providesTags: ["Alert"],
    }),
    dismissAlert: builder.mutation<void, string>({
      query: (alertId) => ({
        url: `/admin/alerts/${alertId}/dismiss`,
        method: "POST",
        mockKey: "dismissAlert",
        body: {},
      }),
      invalidatesTags: ["Alert", "Dashboard"],
    }),
    getCustomers: builder.query<
      ReturnType<typeof adaptCustomerList>,
      ListQueryParams & { q?: string; branchId?: string; kycStatus?: string }
    >({
      query: (params) => ({
        url: "/admin/customers",
        params,
        mockKey: "customers",
      }),
      transformResponse: adaptCustomerList,
      providesTags: ["Customer"],
    }),
    getCustomer: builder.query<Customer, string>({
      query: (id) => ({
        url: `/admin/customers/${id}`,
        params: { id },
        mockKey: "customer",
      }),
      transformResponse: adaptCustomer,
      providesTags: (_r, _e, id) => [{ type: "Customer", id }],
    }),
    getCustomerSchemes: builder.query<
      ReturnType<typeof adaptEnrollments>,
      { customerId: string } & ListQueryParams
    >({
      query: ({ customerId, ...params }) => ({
        url: `/admin/customers/${customerId}/schemes`,
        params: { id: customerId, ...params },
        mockKey: "customerSchemes",
      }),
      transformResponse: adaptEnrollments,
      providesTags: ["Enrollment"],
    }),
    getCustomerPayments: builder.query<
      ReturnType<typeof adaptCustomerResourceList<Payment>>,
      { customerId: string } & ListQueryParams
    >({
      query: ({ customerId, ...params }) => ({
        url: `/admin/customers/${customerId}/payments`,
        params: { id: customerId, ...params },
        mockKey: "customerPayments",
      }),
      transformResponse: (raw: any) =>
        adaptCustomerResourceList(raw, (value) =>
          adaptPaymentList(value?.items ?? value),
        ),
      providesTags: ["Payment"],
    }),
    getCustomerMessages: builder.query<
      ReturnType<typeof adaptCustomerResourceList<MessageLog>>,
      { customerId: string } & ListQueryParams
    >({
      query: ({ customerId, ...params }) => ({
        url: `/admin/customers/${customerId}/messages`,
        params: { id: customerId, ...params },
        mockKey: "customerMessages",
      }),
      transformResponse: (raw: any) =>
        adaptCustomerResourceList(raw, (value) => {
          const list = value?.items ?? value;
          return Array.isArray(list) ? (list as MessageLog[]) : [];
        }),
      providesTags: ["Message"],
    }),
    createCustomer: builder.mutation<Customer, Partial<Customer>>({
      query: (body) => ({
        url: "/admin/customers",
        method: "POST",
        body: {
          name: body.name,
          mobile: body.phone ?? (body as { mobile?: string }).mobile,
          email: body.email || undefined,
          branchId: body.branchId || undefined,
          address: typeof body.address === "string" ? body.address : undefined,
        },
        mockKey: "createCustomer",
      }),
      transformResponse: adaptCustomer,
      invalidatesTags: ["Customer", "Dashboard"],
    }),
    updateCustomer: builder.mutation<
      Customer,
      { id: string; patch: Partial<Customer> }
    >({
      query: ({ id, patch }) => {
        const body: Record<string, unknown> = {};
        if (patch.name != null) body.name = patch.name;
        const mobile = (patch as { mobile?: string }).mobile ?? patch.phone;
        if (mobile != null) body.mobile = mobile;
        if (patch.email != null) body.email = patch.email || undefined;
        if (patch.branchId) body.branchId = patch.branchId;
        if (typeof patch.address === "string") body.address = patch.address;
        if (patch.status != null) body.status = patch.status;
        if (patch.version != null) body.expectedVersion = patch.version;
        return {
          url: `/admin/customers/${id}`,
          method: "PATCH",
          params: { id },
          body,
          mockKey: "updateCustomer",
        };
      },
      transformResponse: adaptCustomer,
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Customer", id },
        "Customer",
        "Dashboard",
      ],
    }),
    setCustomerPassword: builder.mutation<
      { customerId: string; passwordSet: boolean; mustSetPassword?: boolean },
      { id: string; password: string; mustChangeOnNextLogin?: boolean }
    >({
      query: ({ id, password, mustChangeOnNextLogin }) => ({
        url: `/admin/customers/${id}/set-password`,
        method: "POST",
        params: { id },
        body: { password, mustChangeOnNextLogin: mustChangeOnNextLogin === true },
        mockKey: "setCustomerPassword",
      }),
      transformResponse: (raw) => contractPayload(raw) as any,
      invalidatesTags: (_r, _e, { id }) => [{ type: "Customer", id }, "Customer"],
    }),
    verifyCustomerKyc: builder.mutation<
      Customer,
      { id: string; decision: "VERIFIED" | "REJECTED"; remarks?: string }
    >({
      query: ({ id, decision, remarks }) => ({
        url: `/admin/customers/${id}/kyc/verify`,
        method: "POST",
        params: { id },
        body: {
          status: decision,
          rejectionReason: remarks,
        },
        mockKey: "verifyCustomerKyc",
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Customer", id },
        "Customer",
        "Dashboard",
      ],
    }),
    submitCustomerKyc: builder.mutation<
      Customer,
      {
        id: string;
        type: "AADHAAR" | "PAN";
        number?: string;
        frontUploadId?: string;
        backUploadId?: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/admin/customers/${id}/kyc`,
        method: "PUT",
        params: { id },
        body,
        mockKey: "submitCustomerKyc",
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Customer", id },
        "Customer",
      ],
    }),
    updateCustomerNominee: builder.mutation<
      Customer,
      {
        id: string;
        expectedVersion: number;
        name: string;
        relationship: CustomerNomineeDetail["relationship"];
        mobile: string;
        notes?: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/admin/customers/${id}/nominee`,
        method: "PUT",
        params: { id },
        body,
        mockKey: "updateCustomerNominee",
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Customer", id },
        "Customer",
      ],
    }),
    removeCustomerNominee: builder.mutation<
      Customer,
      { id: string; expectedVersion: number }
    >({
      query: ({ id, expectedVersion }) => ({
        url: `/admin/customers/${id}/nominee`,
        method: "DELETE",
        params: { id, expectedVersion },
        body: { expectedVersion },
        mockKey: "removeCustomerNominee",
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Customer", id },
        "Customer",
      ],
    }),
    blockCustomer: builder.mutation<
      Customer,
      {
        id: string;
        reason: string;
        blockAppAccess?: boolean;
        stopReminders?: boolean;
      }
    >({
      query: ({ id, reason }) => ({
        url: `/admin/customers/${id}/block`,
        method: "POST",
        params: { id },
        body: { reason },
        mockKey: "blockCustomer",
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Customer", id },
        "Customer",
        "Dashboard",
      ],
    }),
    unblockCustomer: builder.mutation<Customer, { id: string }>({
      query: ({ id }) => ({
        url: `/admin/customers/${id}/unblock`,
        method: "POST",
        params: { id },
        body: {},
        mockKey: "unblockCustomer",
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Customer", id },
        "Customer",
        "Dashboard",
      ],
    }),
    addCustomerNote: builder.mutation<
      { saved: boolean },
      { id: string; note: string }
    >({
      query: ({ id, note }) => ({
        url: `/admin/customers/${id}/notes`,
        method: "POST",
        params: { id },
        body: { note },
        mockKey: "addCustomerNote",
      }),
      transformResponse: (raw) => contractPayload(raw) as { saved: boolean },
      invalidatesTags: (_r, _e, { id }) => [{ type: "Customer", id }],
    }),
    updateWhatsappOpt: builder.mutation<
      { customerId: string; optedIn: boolean; version: number },
      { id: string; optedIn: boolean }
    >({
      query: ({ id, optedIn }) => ({
        url: `/admin/customers/${id}/whatsapp-opt`,
        method: "PATCH",
        params: { id },
        body: { optedIn },
        mockKey: "updateWhatsappOpt",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as {
          customerId: string;
          optedIn: boolean;
          version: number;
        },
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Customer", id },
        "Customer",
      ],
    }),
    getCustomerNominee: builder.query<
      CustomerNomineeDetail | Record<string, unknown>,
      string
    >({
      query: (id) => ({
        url: `/admin/customers/${id}/nominee`,
        params: { id },
        mockKey: "getCustomerNominee",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as CustomerNomineeDetail | Record<string, unknown>,
      providesTags: (_r, _e, id) => [{ type: "Customer", id }],
    }),
    getCustomerStatement: builder.query<{ blobUrl: string }, string>({
      async queryFn(id) {
        if (env.useMocks) {
          const blob = (await mockRequest({
            mockKey: "getCustomerStatement",
            params: { id },
          })) as Blob;
          return { data: { blobUrl: URL.createObjectURL(blob) } };
        }
        try {
          const blob = await fetchAuthorizedBlob(
            `/admin/customers/${id}/statement`,
          );
          return { data: { blobUrl: URL.createObjectURL(blob) } };
        } catch (error) {
          return { error: error as FetchBaseQueryError };
        }
      },
    }),
    shareCustomerStatementWhatsapp: builder.mutation<
      { queued: boolean; customerId: string },
      string
    >({
      query: (id) => ({
        url: `/admin/customers/${id}/statement/share-whatsapp`,
        method: "POST",
        params: { id },
        mockKey: "shareCustomerStatementWhatsapp",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as { queued: boolean; customerId: string },
    }),
    getEnrollments: builder.query<
      ReturnType<typeof adaptEnrollments>,
      ListQueryParams & {
        q?: string;
        status?: string;
        group?: string;
        branchId?: string;
      }
    >({
      query: (params) => ({
        url: "/admin/schemes",
        params,
        mockKey: "enrollments",
      }),
      transformResponse: adaptEnrollments,
      providesTags: ["Enrollment"],
    }),
    getEnrollmentAnalytics: builder.query<
      ReturnType<typeof adaptEnrollmentAnalytics>,
      | {
          branchId?: string;
          period?: string;
          from?: string;
          to?: string;
          groupBy?: string;
        }
      | void
    >({
      query: (params) => ({
        url: "/admin/schemes/analytics",
        params: params ?? { period: "THIS_MONTH" },
        mockKey: "enrollmentAnalytics",
      }),
      transformResponse: adaptEnrollmentAnalytics,
    }),
    getEnrollment: builder.query<Enrollment, string>({
      query: (id) => ({
        url: `/admin/schemes/${id}`,
        params: { id },
        mockKey: "enrollment",
      }),
      transformResponse: adaptEnrollment,
      providesTags: (_r, _e, id) => [{ type: "Enrollment", id }],
    }),
    getSchemeLedger: builder.query<SchemeLedgerRow[], string>({
      query: (schemeId) => ({
        url: `/admin/schemes/${schemeId}/ledger`,
        params: { schemeId, limit: 200 },
        mockKey: "getSchemeLedger",
      }),
      transformResponse: adaptSchemeLedgerList,
      providesTags: (_r, _e, schemeId) => [
        { type: "Enrollment", id: schemeId },
      ],
    }),
    getSchemePassbook: builder.query<Record<string, unknown>, string>({
      query: (schemeId) => ({
        url: `/admin/schemes/${schemeId}/passbook`,
        params: { schemeId },
        mockKey: "getSchemePassbook",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as Record<string, unknown>,
      providesTags: (_r, _e, schemeId) => [
        { type: "Enrollment", id: schemeId },
      ],
    }),
    getMaturityProjection: builder.query<Record<string, unknown>, string>({
      query: (schemeId) => ({
        url: `/admin/schemes/${schemeId}/maturity-projection`,
        params: { schemeId },
        mockKey: "getMaturityProjection",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as Record<string, unknown>,
    }),
    getSchemePaymentIntents: builder.query<
      ReturnType<typeof adaptListBundle>,
      string
    >({
      query: (schemeId) => ({
        url: `/admin/schemes/${schemeId}/payment-intents`,
        params: { schemeId },
        mockKey: "getSchemePaymentIntents",
      }),
      transformResponse: adaptListBundle,
      providesTags: ["Payment"],
    }),
    recomputeScheme: builder.mutation<unknown, string>({
      query: (schemeId) => ({
        url: `/admin/schemes/${schemeId}/recompute`,
        method: "POST",
        params: { schemeId },
        mockKey: "recomputeScheme",
      }),
      invalidatesTags: (_r, _e, schemeId) => [
        { type: "Enrollment", id: schemeId },
        "Enrollment",
        "Report",
      ],
    }),
    applyFlexibleLock: builder.mutation<unknown, string>({
      query: (schemeId) => ({
        url: `/admin/flexible-locks/${schemeId}/apply`,
        method: "POST",
        params: { schemeId },
        mockKey: "applyFlexibleLock",
      }),
      invalidatesTags: (_r, _e, schemeId) => [
        { type: "Enrollment", id: schemeId },
        "Enrollment",
        "Report",
      ],
    }),
    getPayableRange: builder.query<
      PayableQuote,
      { schemeId: string; targetCycle?: string }
    >({
      query: ({ schemeId, targetCycle }) => ({
        url: `/admin/schemes/${schemeId}/payable-range`,
        params: { id: schemeId, targetCycle },
        mockKey: "payableRange",
      }),
      transformResponse: adaptPayableRange,
      providesTags: (_r, _e, arg) => [{ type: "Enrollment", id: arg.schemeId }],
    }),
    getSettlementPreview: builder.query<
      SettlementPreview,
      { schemeId: string; type: SettlementPreviewType; mode?: string }
    >({
      query: ({ schemeId, type, mode }) => ({
        url: `/admin/schemes/${schemeId}/settlement-preview`,
        params: { id: schemeId, type, ...(mode ? { mode } : {}) },
        mockKey: "settlementPreview",
      }),
      transformResponse: (raw, _meta, arg) =>
        adaptSettlementPreview(raw, arg.type),
      providesTags: (_r, _e, arg) => [{ type: "Enrollment", id: arg.schemeId }],
    }),
    redeemEnrollment: builder.mutation<
      RedemptionRecord,
      {
        schemeId: string;
        mode: string;
        expectedVersion: number;
        expectedFinalValue: number;
        remarks?: string;
        billNumber?: string;
      }
    >({
      query: ({
        schemeId,
        mode,
        expectedVersion,
        expectedFinalValue,
        remarks,
        billNumber,
      }) => ({
        url: `/admin/schemes/${schemeId}/redeem`,
        method: "POST",
        params: { id: schemeId },
        body: {
          mode,
          expectedVersion,
          modeDetails: {
            expectedFinalValuePaise: Math.round(expectedFinalValue * 100),
            remarks,
            ...(billNumber ? { billNumber } : {}),
          },
        },
        mockKey: "redeemEnrollment",
      }),
      transformResponse: adaptRedemptionRecord,
      invalidatesTags: (_r, _e, { schemeId }) => [
        { type: "Enrollment", id: schemeId },
        "Enrollment",
        "Dashboard",
        "Report",
      ],
    }),
    closePrematureEnrollment: builder.mutation<
      RedemptionRecord,
      {
        schemeId: string;
        mode: string;
        expectedVersion: number;
        reason: string;
        remarks?: string;
        acknowledgePenalty: boolean;
        acknowledgeBenefitForfeit: boolean;
        expectedFinalValue: number;
        billNumber?: string;
      }
    >({
      query: ({
        schemeId,
        mode,
        expectedVersion,
        reason,
        remarks,
        acknowledgePenalty,
        acknowledgeBenefitForfeit,
        expectedFinalValue,
        billNumber,
      }) => ({
        url: `/admin/schemes/${schemeId}/close-premature`,
        method: "POST",
        params: { id: schemeId },
        body: {
          mode,
          expectedVersion,
          modeDetails: {
            reason,
            remarks,
            acknowledgePenalty,
            acknowledgeBenefitForfeit,
            expectedFinalValuePaise: Math.round(expectedFinalValue * 100),
            ...(billNumber ? { billNumber } : {}),
          },
        },
        mockKey: "closePrematureEnrollment",
      }),
      transformResponse: adaptRedemptionRecord,
      invalidatesTags: (_r, _e, { schemeId }) => [
        { type: "Enrollment", id: schemeId },
        "Enrollment",
        "Dashboard",
        "Report",
      ],
    }),
    validateEnrolment: builder.mutation<
      import("@/src/components/common/enrol-validation-panel").EnrolValidationPreview,
      Record<string, unknown>
    >({
      query: (body) => {
        const wire: Record<string, unknown> = { ...body };
        if (wire.amount != null) {
          wire.installmentAmountPaise = Math.round(Number(wire.amount) * 100);
        }
        return {
          url: "/admin/schemes/enrol/validate",
          method: "POST",
          body: wire,
          mockKey: "validateEnrolment",
        };
      },
      transformResponse: adaptEnrolValidation,
    }),
    checkCustomerMobile: builder.query<
      {
        available: boolean;
        existingCustomerId?: string;
        customerName?: string;
      },
      string
    >({
      query: (mobile) => ({
        url: "/admin/customers/check-mobile",
        params: { mobile },
        mockKey: "checkMobile",
      }),
      transformResponse: (raw) => {
        const payload = contractPayload<any>(raw) ?? {};
        return {
          ...payload,
          available: payload.available ?? !payload.exists,
        };
      },
    }),
    createEnrollment: builder.mutation<
      Enrollment,
      {
        customerId: string;
        planId: string;
        amount: number;
        firstInstallmentMode: "COLLECT_NOW" | "START_NEXT_CYCLE";
        firstInstallmentAction?:
          | "RECORD_MANUAL_PAYMENT"
          | "CREATE_PAYMENT_LINK";
        payment?: {
          amountPaise: number;
          mode: "CASH" | "CARD" | "UPI" | "BANK_TRANSFER";
          reference?: string;
          remarks?: string;
        };
      }
    >({
      query: (body) => ({
        url: "/admin/schemes/enrol",
        method: "POST",
        body: {
          customerId: body.customerId,
          planId: body.planId,
          installmentAmountPaise: Math.round(body.amount * 100),
          firstInstallmentMode: body.firstInstallmentMode,
          firstInstallmentAction: body.firstInstallmentAction,
          ...(body.payment ? { payment: body.payment } : {}),
        },
        mockKey: "createEnrollment",
      }),
      transformResponse: adaptEnrollment,
      invalidatesTags: ["Enrollment", "Customer", "Dashboard", "Report"],
    }),
    recordPayment: builder.mutation<
      Payment,
      {
        schemeId: string;
        amount: number;
        mode: Payment["mode"];
        idempotencyKey: string;
        paidAt?: string;
        reference?: string;
        remarks?: string;
        targetCycle?: string | null;
        expectedPositionVersion?: number | null;
      }
    >({
      query: (body) => ({
        url: "/admin/payments",
        method: "POST",
        body: {
          schemeId: body.schemeId,
          amountPaise: Math.round(body.amount * 100),
          mode: body.mode,
          ...(body.reference ? { reference: body.reference } : {}),
          ...(body.remarks ? { remarks: body.remarks } : {}),
          ...(body.targetCycle ? { targetCycle: body.targetCycle } : {}),
          ...(body.expectedPositionVersion != null
            ? { expectedPositionVersion: body.expectedPositionVersion }
            : {}),
        },
        headers: { "X-Idempotency-Key": body.idempotencyKey },
        mockKey: "recordPayment",
      }),
      transformResponse: (raw) => {
        const item = contractPayload<any>(raw) ?? raw;
        return adaptPaymentList(Array.isArray(item) ? item : [item])[0];
      },
      invalidatesTags: ["Payment", "Enrollment", "Customer", "Dashboard", "Report"],
    }),
    getDues: builder.query<
      ReturnType<typeof adaptDueList>,
      ListQueryParams &
        DateRangeQueryParams & { kind?: string; q?: string; preset?: string }
    >({
      query: (params) => ({ url: "/admin/dues", params, mockKey: "dues" }),
      transformResponse: adaptDueList,
      providesTags: ["Enrollment"],
      refetchOnMountOrArgChange: STALE_TIER_A,
    }),
    getPayments: builder.query<
      ReturnType<typeof adaptPayments>,
      | (ListQueryParams & {
          from?: string;
          to?: string;
          status?: string;
          isLateSuccess?: boolean;
          q?: string;
          schemeId?: string;
          customerId?: string;
        })
      | void
    >({
      query: (params) => {
        const p = params ?? {};
        return {
          url: "/admin/payments",
          params: {
            includeSummary: true,
            includeCharts: true,
            from: p.from,
            to: p.to,
            status: p.status,
            isLateSuccess: p.isLateSuccess,
            q: p.q,
            schemeId: p.schemeId,
            customerId: p.customerId,
            cursor: p.cursor,
            limit: p.limit,
          },
          mockKey: "payments",
        };
      },
      transformResponse: adaptPayments,
      providesTags: ["Payment"],
    }),
    getPayment: builder.query<Record<string, unknown>, string>({
      query: (paymentId) => ({
        url: `/admin/payments/${paymentId}`,
        params: { paymentId },
        mockKey: "getPayment",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as Record<string, unknown>,
      providesTags: (_r, _e, paymentId) => [{ type: "Payment", id: paymentId }],
    }),
    getPendingPayments: builder.query<
      ReturnType<typeof adaptListBundle>,
      ListQueryParams | void
    >({
      query: (params) => ({
        url: "/admin/payments/pending",
        params: params ?? {},
        mockKey: "getPendingPayments",
      }),
      transformResponse: adaptListBundle,
      providesTags: ["Payment"],
      refetchOnMountOrArgChange: STALE_TIER_A,
    }),
    getLateSuccessPayments: builder.query<
      ReturnType<typeof adaptListBundle>,
      ListQueryParams | void
    >({
      query: (params) => ({
        url: "/admin/payments/late-success",
        params: params ?? {},
        mockKey: "getLateSuccessPayments",
      }),
      transformResponse: adaptListBundle,
      providesTags: ["Payment"],
      refetchOnMountOrArgChange: STALE_TIER_A,
    }),
    reversePayment: builder.mutation<
      unknown,
      { paymentId: string; reason?: string }
    >({
      query: ({ paymentId, ...body }) => ({
        url: `/admin/payments/${paymentId}/reverse`,
        method: "POST",
        params: { paymentId },
        body,
        mockKey: "reversePayment",
      }),
      invalidatesTags: ["Payment", "Enrollment", "Cash", "Dashboard", "Report"],
    }),
    pollPaymentStatus: builder.mutation<
      {
        paymentId: string;
        paymentStatus: string;
        providerState: string | null;
        reconciledAt: string;
        outcome: string;
        requiresReview: boolean;
        reviewReason: string | null;
      },
      string
    >({
      query: (paymentId) => ({
        url: `/admin/payments/${paymentId}/poll-status`,
        method: "POST",
        params: { paymentId },
        mockKey: "pollPaymentStatus",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as {
          paymentId: string;
          paymentStatus: string;
          providerState: string | null;
          reconciledAt: string;
          outcome: string;
          requiresReview: boolean;
          reviewReason: string | null;
        },
      invalidatesTags: ["Payment"],
    }),
    initiatePaymentRefund: builder.mutation<
      Record<string, any>,
      { paymentId: string; amountPaise: number; reason: string; idempotencyKey: string }
    >({
      query: ({ paymentId, idempotencyKey, ...body }) => ({
        url: `/admin/payments/${paymentId}/refunds`,
        method: "POST",
        body,
        headers: { "X-Idempotency-Key": idempotencyKey },
        mockKey: "initiatePaymentRefund",
      }),
      transformResponse: (raw) => contractPayload(raw) as Record<string, any>,
      invalidatesTags: ["Payment", "Enrollment", "Dashboard", "Report"],
    }),
    getPostSettlementRefundCases: builder.query<
      { data: Record<string, unknown>[]; meta: { total: number; pendingCount: number } },
      { status?: string } | void
    >({
      query: (params) => ({
        url: "/admin/post-settlement-refund-cases",
        params: params ?? {},
      }),
      transformResponse: (raw) => {
        const value = contractPayload<any>(raw);
        const data = Array.isArray(value) ? value : value?.data ?? [];
        const meta = (raw as { meta?: { total?: number; pendingCount?: number } })?.meta ?? {};
        return {
          data,
          meta: {
            total: meta.total ?? data.length,
            pendingCount: meta.pendingCount ?? 0,
          },
        };
      },
      providesTags: ["Payment"],
    }),
    resolvePostSettlementRefundCase: builder.mutation<
      Record<string, unknown>,
      { caseId: string; disposition: string; reason: string; expectedVersion: number }
    >({
      query: ({ caseId, ...body }) => ({
        url: `/admin/post-settlement-refund-cases/${caseId}/resolve`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Payment"],
    }),
    listPaymentRefunds: builder.query<Record<string, any>[], string>({
      query: (paymentId) => ({
        url: `/admin/payments/${paymentId}/refunds`,
        mockKey: "listPaymentRefunds",
      }),
      transformResponse: (raw) => {
        const value = contractPayload<any>(raw) ?? [];
        return Array.isArray(value) ? value : value.items ?? value.data ?? [];
      },
      providesTags: ["Payment"],
    }),
    reconcilePaymentRefund: builder.mutation<
      Record<string, any>,
      { paymentId: string; refundId: string; idempotencyKey: string }
    >({
      query: ({ paymentId, refundId, idempotencyKey }) => ({
        url: `/admin/payments/${paymentId}/refunds/${refundId}/reconcile`,
        method: "POST",
        body: {},
        headers: { "X-Idempotency-Key": idempotencyKey },
        mockKey: "reconcilePaymentRefund",
      }),
      transformResponse: (raw) => contractPayload(raw) as Record<string, any>,
      invalidatesTags: ["Payment"],
    }),
    releasePaymentRefundReservation: builder.mutation<
      Record<string, any>,
      {
        paymentId: string;
        refundId: string;
        reason: string;
        evidence?: string;
        providerConfirmedNotAccepted?: boolean;
        idempotencyKey: string;
      }
    >({
      query: ({ paymentId, refundId, idempotencyKey, ...body }) => ({
        url: `/admin/payments/${paymentId}/refunds/${refundId}/release`,
        method: "POST",
        body,
        headers: { "X-Idempotency-Key": idempotencyKey },
        mockKey: "releasePaymentRefundReservation",
      }),
      transformResponse: (raw) => contractPayload(raw) as Record<string, any>,
      invalidatesTags: ["Payment"],
    }),
    reconcilePayment: builder.mutation<unknown, string>({
      query: (paymentId) => ({
        url: `/admin/payments/${paymentId}/reconcile`,
        method: "POST",
        params: { paymentId },
        mockKey: "reconcilePayment",
      }),
      invalidatesTags: ["Payment", "Enrollment", "Dashboard", "Report"],
    }),
    sharePaymentWhatsapp: builder.mutation<{ queued: boolean }, string>({
      query: (paymentId) => ({
        url: `/admin/payments/${paymentId}/share-whatsapp`,
        method: "POST",
        params: { paymentId },
        mockKey: "sharePaymentWhatsapp",
      }),
      transformResponse: (raw) => contractPayload(raw) as { queued: boolean },
    }),
    getPaymentReceipt: builder.query<
      | { kind: "blob"; blobUrl: string; contentType: string }
      | { kind: "json"; payload: unknown },
      string
    >({
      async queryFn(paymentId) {
        if (env.useMocks) {
          const data = await mockRequest({
            mockKey: "getPaymentReceipt",
            params: { paymentId },
          });
          if (data instanceof Blob) {
            return {
              data: {
                kind: "blob",
                blobUrl: URL.createObjectURL(data),
                contentType: data.type || "application/pdf",
              },
            };
          }
          return {
            data: {
              kind: "json",
              payload: contractPayload(data),
            },
          };
        }
        try {
          const result = await fetchAuthorizedMaybeBlob(
            `/admin/payments/${paymentId}/receipt`,
          );
          if (result.kind === "blob") {
            return {
              data: {
                kind: "blob",
                blobUrl: URL.createObjectURL(result.blob),
                contentType: result.contentType,
              },
            };
          }
          return { data: { kind: "json", payload: result.payload } };
        } catch (error) {
          return { error: error as FetchBaseQueryError };
        }
      },
    }),
    getPaymentPassbookImage: builder.query<{ blobUrl: string }, string>({
      async queryFn(paymentId) {
        if (env.useMocks) {
          const blob = (await mockRequest({
            mockKey: "getPaymentPassbookImage",
            params: { paymentId },
          })) as Blob;
          return { data: { blobUrl: URL.createObjectURL(blob) } };
        }
        try {
          const blob = await fetchAuthorizedBlob(
            `/admin/payments/${paymentId}/passbook-image`,
          );
          return { data: { blobUrl: URL.createObjectURL(blob) } };
        } catch (error) {
          return { error: error as FetchBaseQueryError };
        }
      },
    }),
    regeneratePassbookImage: builder.mutation<
      { blobUrl?: string; payload?: unknown },
      string
    >({
      async queryFn(paymentId) {
        if (env.useMocks) {
          const data = await mockRequest({
            mockKey: "regeneratePassbookImage",
            params: { paymentId },
          });
          if (data instanceof Blob) {
            return { data: { blobUrl: URL.createObjectURL(data) } };
          }
          return { data: { payload: contractPayload(data) } };
        }
        try {
          const token =
            typeof window !== "undefined"
              ? localStorage.getItem("swarnagrow.accessToken")
              : null;
          const response = await fetch(
            `${env.apiBaseUrl.replace(/\/$/, "")}/admin/payments/${paymentId}/passbook-image/regenerate`,
            {
              method: "POST",
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                Accept: "application/pdf,image/*,application/json,*/*",
                "X-Idempotency-Key": newIdempotencyKey(),
              },
            },
          );
          if (!response.ok) {
            return {
              error: {
                status: response.status,
                data: await response.text().catch(() => null),
              } as FetchBaseQueryError,
            };
          }
          const contentType = response.headers.get("content-type") ?? "";
          if (
            contentType.includes("application/pdf") ||
            contentType.includes("image/") ||
            contentType.includes("octet-stream")
          ) {
            const blob = await response.blob();
            return { data: { blobUrl: URL.createObjectURL(blob) } };
          }
          const envelope = (await response.json()) as {
            success?: boolean;
            data?: unknown;
          };
          return {
            data: {
              payload: envelope?.success ? envelope.data : envelope,
            },
          };
        } catch (error) {
          return { error: error as FetchBaseQueryError };
        }
      },
      invalidatesTags: ["Payment"],
    }),
    getPaymentLinks: builder.query<
      ReturnType<typeof adaptListBundle>,
      ListQueryParams | void
    >({
      query: (params) => ({
        url: "/admin/payment-links",
        params: params ?? {},
        mockKey: "getPaymentLinks",
      }),
      transformResponse: adaptListBundle,
      providesTags: ["Payment"],
    }),
    cancelPaymentLink: builder.mutation<unknown, string>({
      query: (linkId) => ({
        url: `/admin/payment-links/${linkId}/cancel`,
        method: "POST",
        params: { linkId },
        mockKey: "cancelPaymentLink",
      }),
      invalidatesTags: ["Payment"],
    }),
    resendPaymentLink: builder.mutation<unknown, string>({
      query: (linkId) => ({
        url: `/admin/payment-links/${linkId}/resend`,
        method: "POST",
        params: { linkId },
        mockKey: "resendPaymentLink",
      }),
      invalidatesTags: ["Payment"],
    }),
    getCashOverview: builder.query<
      ReturnType<typeof adaptCashOverview>,
      { branchId?: string } | void
    >({
      query: (params) => ({
        url: "/admin/cash/overview",
        params: params ?? {},
        mockKey: "cashOverview",
      }),
      transformResponse: adaptCashOverview,
      providesTags: ["Cash"],
      refetchOnMountOrArgChange: STALE_TIER_A,
    }),
    getCashStaffBalances: builder.query<
      ReturnType<typeof adaptCashStaffBalances>,
      ListQueryParams | void
    >({
      query: (params) => ({
        url: "/admin/cash/staff-balances",
        params: params ?? {},
        mockKey: "cashStaffBalances",
      }),
      transformResponse: adaptCashStaffBalances,
      providesTags: ["Cash"],
      refetchOnMountOrArgChange: STALE_TIER_A,
    }),
    getCashHandovers: builder.query<
      ReturnType<typeof adaptCashHandovers>,
      ListQueryParams & DateRangeQueryParams
    >({
      query: (params) => ({
        url: "/admin/cash/handovers",
        params,
        mockKey: "cashHandovers",
      }),
      transformResponse: adaptCashHandovers,
      providesTags: ["Cash"],
      refetchOnMountOrArgChange: STALE_TIER_A,
    }),
    getCashReport: builder.query<
      ReturnType<typeof adaptCashReport>,
      ListQueryParams &
        DateRangeQueryParams & { groupBy?: "STAFF" | "DAY" | "BRANCH" }
    >({
      query: (params) => ({
        url: "/admin/cash/report",
        params,
        mockKey: "cashReport",
      }),
      transformResponse: adaptCashReport,
      providesTags: ["Cash"],
      refetchOnMountOrArgChange: STALE_TIER_A,
    }),
    acceptHandover: builder.mutation<
      CashHandover,
      {
        id: string;
        acceptedAmountPaise?: number;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/admin/cash/handovers/${id}/accept`,
        method: "POST",
        params: { id },
        body,
        mockKey: "acceptHandover",
      }),
      invalidatesTags: ["Cash", "Dashboard", "Report"],
    }),
    rejectHandover: builder.mutation<
      CashHandover,
      { id: string; reason: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/admin/cash/handovers/${id}/reject`,
        method: "POST",
        params: { id },
        body,
        mockKey: "rejectHandover",
      }),
      invalidatesTags: ["Cash", "Dashboard", "Report"],
    }),
    resolveHandoverDiscrepancy: builder.mutation<
      CashHandover,
      {
        id: string;
        acceptedAmountPaise: number;
        reason?: string;
      }
    >({
      query: ({ id, acceptedAmountPaise, reason }) => ({
        url: `/admin/cash/handovers/${id}/resolve-discrepancy`,
        method: "POST",
        params: { id },
        body: {
          accepted: true,
          acceptedAmountPaise,
          ...(reason ? { reason } : {}),
        },
        mockKey: "resolveHandoverDiscrepancy",
      }),
      invalidatesTags: ["Cash", "Dashboard", "Report"],
    }),
    /** @deprecated use acceptHandover / rejectHandover */
    updateHandover: builder.mutation<
      CashHandover,
      { id: string; status: CashHandover["status"] }
    >({
      query: ({ id, status }) => ({
        url:
          status === "REJECTED"
            ? `/admin/cash/handovers/${id}/reject`
            : `/admin/cash/handovers/${id}/accept`,
        method: "POST",
        params: { id },
        body: { status },
        mockKey: status === "REJECTED" ? "rejectHandover" : "acceptHandover",
      }),
      invalidatesTags: ["Cash", "Dashboard", "Report"],
    }),
    createAdminHandover: builder.mutation<
      CashHandover,
      {
        staffId: string;
        amountPaise: number;
        receiptCount: number;
        autoAccept: boolean;
        acceptanceRemarks?: string;
        idempotencyKey: string;
      }
    >({
      async queryFn(body, _api, _extra, baseQuery) {
        if (env.useMocks) {
          try {
            const data = (await mockRequest({
              mockKey: "createAdminHandover",
              body: body as unknown as Record<string, unknown>,
            })) as CashHandover;
            return { data };
          } catch (error) {
            return { error: error as FetchBaseQueryError };
          }
        }
        const created = await baseQuery({
          url: "/admin/cash/handovers",
          method: "POST",
          body: {
            staffId: body.staffId,
            amountPaise: body.amountPaise,
            remarks: body.acceptanceRemarks,
          },
          headers: { "X-Idempotency-Key": body.idempotencyKey },
          mockKey: "createAdminHandover",
        });
        if (created.error) return { error: created.error };
        const payload = contractPayload<any>(created.data) ?? created.data;
        const handoverId = String(payload?._id ?? payload?.id ?? "");
        if (body.autoAccept && handoverId) {
          const accepted = await baseQuery({
            url: `/admin/cash/handovers/${handoverId}/accept`,
            method: "POST",
            body: {
              acceptedAmountPaise: body.amountPaise,
              reason: body.acceptanceRemarks,
            },
            headers: {
              "X-Idempotency-Key": `${body.idempotencyKey}:accept`,
            },
            mockKey: "acceptHandover",
          });
          if (accepted.error) return { error: accepted.error };
          const settled = contractPayload<any>(accepted.data) ?? accepted.data;
          return {
            data: {
              ...adaptCashHandovers({ data: [settled] }).items[0],
              ...settled,
              handoverNo:
                settled.handoverNumber ??
                settled.handoverNo ??
                String(settled._id ?? handoverId),
            } as CashHandover,
          };
        }
        return {
          data: {
            ...adaptCashHandovers({ data: [payload] }).items[0],
            ...payload,
            handoverNo:
              payload.handoverNumber ??
              payload.handoverNo ??
              String(payload._id ?? handoverId),
          } as CashHandover,
        };
      },
      invalidatesTags: ["Cash", "Dashboard", "Report"],
    }),
    createCashAdjustment: builder.mutation<
      Record<string, unknown>,
      {
        staffId: string;
        direction: "CREDIT" | "DEBIT";
        amountPaise: number;
        reason: string;
      }
    >({
      query: (body) => ({
        url: "/admin/cash/adjustments",
        method: "POST",
        body,
        mockKey: "createCashAdjustment",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as Record<string, unknown>,
      invalidatesTags: ["Cash", "Dashboard", "Report"],
    }),
    getHandover: builder.query<CashHandoverDetail, string>({
      query: (id) => ({
        url: `/admin/cash/handovers/${id}`,
        params: { id },
        mockKey: "handover",
      }),
      transformResponse: adaptCashHandoverDetail,
      providesTags: (_r, _e, id) => [{ type: "Cash", id: `handover-${id}` }],
    }),
    getMaturities: builder.query<
      ReturnType<typeof adaptListBundle>,
      (ListQueryParams & DateRangeQueryParams & { branchId?: string }) | void
    >({
      query: (params) => ({
        url: "/admin/maturities",
        params: params ?? {},
        mockKey: "maturities",
      }),
      transformResponse: adaptListBundle,
      providesTags: ["Enrollment"],
    }),
    getGlobalSearch: builder.query<
      GlobalSearchResult,
      { q: string; branchId?: string; limit?: number }
    >({
      query: ({ q, branchId, limit }) => ({
        url: "/admin/search",
        params: { q, branchId, limit },
        mockKey: "globalSearch",
      }),
      transformResponse: adaptGlobalSearch,
    }),
    getGoldRateCurrent: builder.query<
      { isSetForToday: boolean; ratePerGram?: number; effectiveAt?: string },
      { branchId?: string } | void
    >({
      query: (params) => ({
        url: "/admin/gold-rate/current",
        params: params ?? {},
        mockKey: "goldRateCurrent",
      }),
      transformResponse: (raw) => {
        const payload = contractPayload<any>(raw) ?? {};
        const rate =
          payload.ratePerGramPaise != null
            ? Number(payload.ratePerGramPaise) / 100
            : payload.ratePerGram != null
              ? Number(payload.ratePerGram)
              : undefined;
        const istToday = businessTodayYmd();
        const effectiveDate = String(
          payload.effectiveDate ?? payload.effectiveAt ?? "",
        ).slice(0, 10);
        return {
          isSetForToday:
            typeof payload.isSetForToday === "boolean"
              ? payload.isSetForToday
              : Boolean(rate) && effectiveDate === istToday,
          ratePerGram: rate,
          effectiveAt: payload.effectiveAt ?? payload.effectiveDate,
        };
      },
      providesTags: ["GoldRate"],
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    getGoldRates: builder.query<
      ReturnType<typeof adaptGoldHistory>,
      ListQueryParams | void
    >({
      query: (params) => ({
        url: "/admin/gold-rate/history",
        params: params ?? {},
        mockKey: "goldRates",
      }),
      transformResponse: adaptGoldHistory,
      providesTags: ["GoldRate"],
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    addGoldRate: builder.mutation<
      GoldRate,
      { ratePerGram: number; branch: string; idempotencyKey: string }
    >({
      query: (body) => ({
        url: "/admin/gold-rate",
        method: "POST",
        body: {
          ratePerGramPaise: Math.round(body.ratePerGram * 100),
          effectiveDate: businessTodayYmd(),
          branchId:
            !body.branch ||
            body.branch === "ALL" ||
            body.branch === "All branches"
              ? null
              : body.branch,
        },
        headers: { "X-Idempotency-Key": body.idempotencyKey },
        mockKey: "addGoldRate",
      }),
      invalidatesTags: ["GoldRate", "Dashboard"],
    }),
    getMessages: builder.query<
      ReturnType<typeof adaptMessages>,
      (ListQueryParams & DateRangeQueryParams & { broadcastId?: string; channel?: string }) | void
    >({
      query: (params) => ({
        url: "/admin/messaging/messages",
        params: params ?? {},
        mockKey: "messages",
      }),
      transformResponse: adaptMessages,
      providesTags: ["Message"],
    }),
    resendMessage: builder.mutation<MessageLog, string>({
      query: (id) => ({
        url: `/admin/messaging/messages/${id}/resend`,
        method: "POST",
        params: { id },
        mockKey: "resendMessage",
      }),
      invalidatesTags: ["Message"],
    }),
    getReports: builder.query<
      ReturnType<typeof adaptAdminReport>,
      ListQueryParams &
        DateRangeQueryParams & {
          reportKey: string;
          branchId?: string;
          planId?: string;
          staffId?: string;
          customerId?: string;
          groupBy?: string;
        }
    >({
      query: ({ reportKey, ...params }) => ({
        url: `/admin/reports/${reportKey}`,
        params: { reportKey, ...params },
        mockKey: "reports",
      }),
      transformResponse: adaptAdminReport,
      providesTags: ["Report"],
      refetchOnMountOrArgChange: STALE_TIER_C,
    }),
    getPlans: builder.query<
      ReturnType<typeof adaptPlans>,
      | (ListQueryParams & {
          status?: string;
          valueBasis?: string;
          paymentPattern?: string;
          branchId?: string;
          enrolableOnly?: boolean;
          q?: string;
        })
      | void
    >({
      query: (params) => ({
        url: "/admin/scheme-plans",
        params: params ?? {},
        mockKey: "plans",
      }),
      transformResponse: adaptPlans,
      providesTags: ["Plan"],
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    createPlan: builder.mutation<
      SchemePlan,
      Partial<SchemePlan> | Record<string, unknown>
    >({
      query: (body) => ({
        url: "/admin/scheme-plans",
        method: "POST",
        body,
        mockKey: "createPlan",
      }),
      invalidatesTags: ["Plan"],
    }),
    getPlan: builder.query<Record<string, unknown>, string>({
      query: (planId) => ({
        url: `/admin/scheme-plans/${planId}`,
        params: { planId },
        mockKey: "planDetail",
      }),
      transformResponse: adaptPlanDetail,
      providesTags: (_r, _e, planId) => [{ type: "Plan", id: planId }],
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    getPlanStats: builder.query<Record<string, unknown>, string>({
      query: (planId) => ({
        url: `/admin/scheme-plans/${planId}/stats`,
        params: { planId },
        mockKey: "planStats",
      }),
      transformResponse: adaptPlanStats,
      providesTags: (_r, _e, planId) => [{ type: "Plan", id: planId }],
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    patchPlan: builder.mutation<
      SchemePlan,
      { planId: string; body: Record<string, unknown> }
    >({
      query: ({ planId, body }) => ({
        url: `/admin/scheme-plans/${planId}`,
        method: "PATCH",
        params: { planId },
        body,
        mockKey: "patchPlan",
      }),
      invalidatesTags: (_r, _e, { planId }) => [
        "Plan",
        { type: "Plan", id: planId },
      ],
    }),
    activatePlan: builder.mutation<SchemePlan, string>({
      query: (planId) => ({
        url: `/admin/scheme-plans/${planId}/activate`,
        method: "POST",
        params: { planId },
        mockKey: "activatePlan",
      }),
      invalidatesTags: ["Plan"],
    }),
    deactivatePlan: builder.mutation<SchemePlan, string>({
      query: (planId) => ({
        url: `/admin/scheme-plans/${planId}/deactivate`,
        method: "POST",
        params: { planId },
        mockKey: "deactivatePlan",
      }),
      invalidatesTags: ["Plan"],
    }),
    duplicatePlan: builder.mutation<SchemePlan, string>({
      query: (planId) => ({
        url: `/admin/scheme-plans/${planId}/duplicate`,
        method: "POST",
        params: { planId },
        mockKey: "duplicatePlan",
      }),
      transformResponse: adaptPlanMutationResponse,
      invalidatesTags: ["Plan"],
    }),
    getSettingsBranding: builder.query<
      {
        logoUrl?: string;
        primaryColor?: string;
        secondaryColor?: string;
        appDisplayName?: string;
        previewUrls?: {
          appIcon?: string;
          receiptHeader?: string;
          passbookImage?: string;
        };
        audit?: { version?: number };
      },
      void
    >({
      query: () => ({
        url: "/admin/settings/branding",
        mockKey: "settingsBranding",
      }),
      transformResponse: adaptSettingsBranding,
      providesTags: ["Settings"],
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    getSettingsProfile: builder.query<Record<string, any>, void>({
      query: () => ({
        url: "/admin/settings/profile",
        mockKey: "settingsProfile",
      }),
      transformResponse: adaptSettingsProfile,
      providesTags: ["Settings"],
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    getSettingsOperations: builder.query<Record<string, any>, void>({
      query: () => ({
        url: "/admin/settings/operations",
        mockKey: "settingsOperations",
      }),
      transformResponse: adaptSettingsOperations,
      providesTags: ["Settings"],
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    getSubscription: builder.query<Record<string, any>, void>({
      query: () => ({
        url: "/admin/subscription",
        mockKey: "subscription",
      }),
      transformResponse: adaptSubscription,
      providesTags: ["Settings"],
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    getAvailablePlans: builder.query<Record<string, any>[], void>({
      query: () => ({
        url: "/admin/subscription/available-plans",
        mockKey: "availablePlans",
      }),
      transformResponse: (raw) => {
        const payload = contractPayload(raw);
        return Array.isArray(payload) ? payload : [];
      },
      providesTags: ["Settings"],
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    getSubscriptionInvoices: builder.query<Record<string, any>[], void>({
      query: () => ({
        url: "/admin/subscription/invoices",
        mockKey: "subscriptionInvoices",
      }),
      transformResponse: adaptSubscriptionInvoices,
      providesTags: ["Settings"],
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    downloadSubscriptionInvoice: builder.query<
      { blobUrl: string; filename: string },
      { invoiceId: string; filename?: string }
    >({
      async queryFn({ invoiceId, filename }) {
        const safeName =
          filename?.replace(/[^\w.-]+/g, "_") ?? `invoice-${invoiceId}.pdf`;
        if (env.useMocks) {
          const blob = (await mockRequest({
            mockKey: "downloadSubscriptionInvoice",
            params: { invoiceId },
          })) as Blob;
          return {
            data: { blobUrl: URL.createObjectURL(blob), filename: safeName },
          };
        }
        try {
          const blob = await fetchAuthorizedBlob(
            `/admin/subscription/invoices/${encodeURIComponent(invoiceId)}/pdf`,
          );
          return {
            data: { blobUrl: URL.createObjectURL(blob), filename: safeName },
          };
        } catch (error) {
          return { error: error as FetchBaseQueryError };
        }
      },
    }),
    requestSubscriptionUpgrade: builder.mutation<
      Record<string, unknown>,
      { targetTier: string; billingCycle?: string; note?: string }
    >({
      query: ({ targetTier, billingCycle, note }) => ({
        url: "/admin/subscription/upgrade-request",
        method: "POST",
        body: {
          targetTier,
          planTier: targetTier,
          billingCycle: billingCycle ?? "MONTHLY",
          note: note || undefined,
        },
        mockKey: "upgradeRequest",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as Record<string, unknown>,
      invalidatesTags: ["Settings"],
    }),
    getAccessSummary: builder.query<
      {
        activeStaff: number;
        staffLimit: number;
        staffUsed: number;
        branches: number;
        branchLimit: number;
        admins: number;
        sessions: number;
        suspended: number;
        planName?: string;
      },
      void
    >({
      query: () => ({ url: "/admin/access/summary", mockKey: "accessSummary" }),
      transformResponse: (raw) =>
        contractPayload(raw) as {
          activeStaff: number;
          staffLimit: number;
          staffUsed: number;
          branches: number;
          branchLimit: number;
          admins: number;
          sessions: number;
          suspended: number;
          planName?: string;
        },
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    getAccess: builder.query<{ summary: Record<string, number> }, void>({
      query: () => ({ url: "/admin/staff", mockKey: "access" }),
      transformResponse: (raw) => {
        const payload = contractPayload(raw) as any;
        if (payload?.summary && typeof payload.summary === "object") {
          return { summary: payload.summary as Record<string, number> };
        }
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.items)
            ? payload.items
            : [];
        const activeStaff = list.filter(
          (row: any) => (row.status ?? "ACTIVE") === "ACTIVE",
        ).length;
        return {
          summary: {
            activeStaff,
            staffLimit: Math.max(10, list.length),
            branches: 0,
            branchLimit: 5,
            admins: list.filter((row: any) =>
              ["TENANT_ADMIN", "TENANT_OWNER"].includes(String(row.role)),
            ).length,
            sessions: list.reduce(
              (sum: number, row: any) =>
                sum + Number(row.activeSessions ?? row.sessions ?? 0),
              0,
            ),
            suspended: list.filter((row: any) =>
              ["SUSPENDED", "INACTIVE"].includes(String(row.status)),
            ).length,
          },
        };
      },
      providesTags: ["Access"],
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    getStaff: builder.query<
      ReturnType<typeof adaptStaffList>,
      ListQueryParams & { q?: string; branchId?: string; status?: string }
    >({
      query: (params) => ({
        url: "/admin/staff",
        params,
        mockKey: "staff",
      }),
      transformResponse: adaptStaffList,
      providesTags: ["Access"],
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    getBranches: builder.query<
      ReturnType<typeof adaptBranchList>,
      ListQueryParams | void
    >({
      query: (params) => ({
        url: "/admin/branches",
        params: params ?? {},
        mockKey: "branches",
      }),
      transformResponse: adaptBranchList,
      providesTags: ["Access"],
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    createStaff: builder.mutation<
      unknown,
      {
        name: string;
        mobile: string;
        password: string;
        role:
          | "BRANCH_STAFF"
          | "BRANCH_MANAGER"
          | "COLLECTION_AGENT"
          | "TENANT_ADMIN";
        branchId: string;
        scope?: "BRANCH" | "TENANT";
        mustChangePassword?: boolean;
      }
    >({
      query: ({
        name,
        mobile,
        password,
        role,
        branchId,
        scope,
        mustChangePassword,
      }) => ({
        url: "/admin/staff",
        method: "POST",
        body: {
          name,
          mobile,
          role,
          branchId,
          temporaryPassword: password,
          ...(scope ? { scope } : {}),
          ...(mustChangePassword != null
            ? { mustSetPassword: mustChangePassword }
            : {}),
        },
        mockKey: "createStaff",
      }),
      transformResponse: (raw) => contractPayload(raw) as any,
      invalidatesTags: ["Access"],
    }),
    createBranch: builder.mutation<
      unknown,
      {
        name: string;
        code: string;
        address?: { line1?: string; city?: string; pincode?: string };
        contactNumber?: string;
      }
    >({
      query: (body) => ({
        url: "/admin/branches",
        method: "POST",
        body: {
          name: body.name,
          code: body.code,
          mobile: body.contactNumber,
          address: [
            body.address?.line1,
            body.address?.city,
            body.address?.pincode,
          ]
            .filter(Boolean)
            .join(", "),
        },
        mockKey: "createBranch",
      }),
      transformResponse: (raw) => contractPayload(raw) as any,
      invalidatesTags: ["Access"],
    }),
    getStaffDetail: builder.query<Record<string, unknown>, string>({
      query: (staffId) => ({
        url: `/admin/staff/${staffId}`,
        params: { staffId },
        mockKey: "staffDetail",
      }),
      transformResponse: adaptStaffDetail,
      providesTags: (_r, _e, staffId) => [
        { type: "Access", id: `staff-${staffId}` },
      ],
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    getStaffPerformanceSummary: builder.query<
      {
        range?: { from?: string; to?: string };
        trendGroupBy?: "DAY" | "WEEK" | "MONTH" | "YEAR" | string;
        collectionTotal?: { amountDisplay?: string; amountPaise?: number };
        averageTicket?: { amountDisplay?: string; amountPaise?: number };
        enrolments?: number;
        customersServed?: number;
        paymentsCount?: number;
        collectionTrend?: Array<{
          date?: string;
          label?: string;
          count?: number;
          amount?: { amountDisplay?: string; amountPaise?: number };
        }>;
        cash?: Record<string, unknown>;
      },
      { staffId: string; from?: string; to?: string }
    >({
      query: ({ staffId, from, to }) => ({
        url: `/admin/staff/${staffId}/performance/summary`,
        params: { staffId, from, to },
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as Record<string, unknown>,
      providesTags: ["Report"],
      refetchOnMountOrArgChange: STALE_TIER_C,
    }),
    getStaffPerformanceSection: builder.query<
      ReturnType<typeof adaptPaginatedList>,
      {
        staffId: string;
        section: "collections" | "enrolments" | "handovers";
        from?: string;
        to?: string;
        cursor?: string;
        limit?: number;
      }
    >({
      query: ({ staffId, section, from, to, cursor, limit }) => ({
        url: `/admin/staff/${staffId}/performance/${section}`,
        params: { from, to, cursor, limit },
      }),
      transformResponse: adaptPaginatedList,
      providesTags: ["Report"],
      refetchOnMountOrArgChange: STALE_TIER_C,
    }),
    patchStaff: builder.mutation<
      Record<string, unknown>,
      { staffId: string; body: Record<string, unknown> }
    >({
      query: ({ staffId, body }) => ({
        url: `/admin/staff/${staffId}`,
        method: "PATCH",
        params: { staffId },
        body,
        mockKey: "patchStaff",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as Record<string, unknown>,
      invalidatesTags: (_r, _e, { staffId }) => [
        "Access",
        { type: "Access", id: `staff-${staffId}` },
      ],
    }),
    activateStaff: builder.mutation<Record<string, unknown>, string>({
      query: (staffId) => ({
        url: `/admin/staff/${staffId}/activate`,
        method: "POST",
        params: { staffId },
        mockKey: "activateStaff",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as Record<string, unknown>,
      invalidatesTags: (_r, _e, staffId) => [
        "Access",
        { type: "Access", id: `staff-${staffId}` },
      ],
    }),
    deactivateStaff: builder.mutation<
      Record<string, unknown>,
      { staffId: string; reason?: string }
    >({
      query: ({ staffId, reason }) => ({
        url: `/admin/staff/${staffId}/deactivate`,
        method: "POST",
        params: { staffId },
        body: reason ? { reason } : {},
        mockKey: "deactivateStaff",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as Record<string, unknown>,
      invalidatesTags: (_r, _e, { staffId }) => [
        "Access",
        { type: "Access", id: `staff-${staffId}` },
      ],
    }),
    resetStaffPassword: builder.mutation<
      Record<string, unknown>,
      { staffId: string; mode?: string; temporaryPassword?: string }
    >({
      query: ({ staffId, ...body }) => ({
        url: `/admin/staff/${staffId}/reset-password`,
        method: "POST",
        params: { staffId },
        body,
        mockKey: "resetStaffPassword",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as Record<string, unknown>,
    }),
    transferStaffBranch: builder.mutation<
      Record<string, unknown>,
      { staffId: string; branchId: string }
    >({
      query: ({ staffId, branchId }) => ({
        url: `/admin/staff/${staffId}/transfer-branch`,
        method: "POST",
        params: { staffId },
        body: { branchId },
        mockKey: "transferStaffBranch",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as Record<string, unknown>,
      invalidatesTags: (_r, _e, { staffId }) => [
        "Access",
        { type: "Access", id: `staff-${staffId}` },
      ],
    }),
    getBranchDetail: builder.query<Record<string, unknown>, string>({
      query: (branchId) => ({
        url: `/admin/branches/${branchId}`,
        params: { branchId },
        mockKey: "branchDetail",
      }),
      transformResponse: adaptBranchDetail,
      providesTags: (_r, _e, branchId) => [
        { type: "Access", id: `branch-${branchId}` },
      ],
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    getBranchPerformanceSummary: builder.query<
      {
        range?: { from?: string; to?: string };
        trendGroupBy?: "DAY" | "WEEK" | "MONTH" | "YEAR" | string;
        collectionTotal?: { amountDisplay?: string; amountPaise?: number };
        averageTicket?: { amountDisplay?: string; amountPaise?: number };
        enrolments?: number;
        customersServed?: number;
        paymentsCount?: number;
        collectionTrend?: Array<{
          date?: string;
          label?: string;
          count?: number;
          amount?: { amountDisplay?: string; amountPaise?: number };
        }>;
        cash?: Record<string, unknown>;
      },
      { branchId: string; from?: string; to?: string }
    >({
      query: ({ branchId, from, to }) => ({
        url: `/admin/branches/${branchId}/performance/summary`,
        params: { from, to },
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as Record<string, unknown>,
      providesTags: ["Report"],
      refetchOnMountOrArgChange: STALE_TIER_C,
    }),
    getBranchPerformanceSection: builder.query<
      ReturnType<typeof adaptPaginatedList>,
      {
        branchId: string;
        section: "collections" | "enrolments" | "handovers";
        from?: string;
        to?: string;
        cursor?: string;
        limit?: number;
      }
    >({
      query: ({ branchId, section, from, to, cursor, limit }) => ({
        url: `/admin/branches/${branchId}/performance/${section}`,
        params: { from, to, cursor, limit },
      }),
      transformResponse: adaptPaginatedList,
      providesTags: ["Report"],
      refetchOnMountOrArgChange: STALE_TIER_C,
    }),
    patchBranch: builder.mutation<
      Record<string, unknown>,
      { branchId: string; body: Record<string, unknown> }
    >({
      query: ({ branchId, body }) => ({
        url: `/admin/branches/${branchId}`,
        method: "PATCH",
        params: { branchId },
        body,
        mockKey: "patchBranch",
      }),
      transformResponse: adaptBranchDetail,
      invalidatesTags: (_r, _e, { branchId }) => [
        "Access",
        { type: "Access", id: `branch-${branchId}` },
      ],
    }),
    activateBranch: builder.mutation<Record<string, unknown>, string>({
      query: (branchId) => ({
        url: `/admin/branches/${branchId}/activate`,
        method: "POST",
        params: { branchId },
        mockKey: "activateBranch",
      }),
      transformResponse: adaptBranchDetail,
      invalidatesTags: (_r, _e, branchId) => [
        "Access",
        { type: "Access", id: `branch-${branchId}` },
      ],
    }),
    deactivateBranch: builder.mutation<Record<string, unknown>, string>({
      query: (branchId) => ({
        url: `/admin/branches/${branchId}/deactivate`,
        method: "POST",
        params: { branchId },
        mockKey: "deactivateBranch",
      }),
      transformResponse: adaptBranchDetail,
      invalidatesTags: (_r, _e, branchId) => [
        "Access",
        { type: "Access", id: `branch-${branchId}` },
      ],
    }),
    getGrievances: builder.query<
      ReturnType<typeof adaptGrievanceList>,
      ListQueryParams & {
        q?: string;
        status?: string;
        priority?: string;
        overdueOnly?: boolean;
        includeSummary?: boolean;
      }
    >({
      query: (params) => ({
        url: "/admin/grievances",
        params: { includeSummary: true, ...params },
        mockKey: "grievances",
      }),
      transformResponse: adaptGrievanceList,
      providesTags: ["Grievance"],
    }),
    getGrievance: builder.query<
      ReturnType<typeof adaptGrievanceDetail>,
      string
    >({
      query: (id) => ({
        url: `/admin/grievances/${id}`,
        params: { id },
        mockKey: "grievanceDetail",
      }),
      transformResponse: adaptGrievanceDetail,
      providesTags: (_r, _e, id) => [{ type: "Grievance", id }],
    }),
    assignGrievance: builder.mutation<
      unknown,
      { id: string; assigneeId: string | null; expectedVersion: number }
    >({
      query: ({ id, ...body }) => ({
        url: `/admin/grievances/${id}/assign`,
        method: "POST",
        params: { id },
        body,
        mockKey: "grievanceAssign",
      }),
      invalidatesTags: ["Grievance"],
    }),
    postGrievanceMessage: builder.mutation<
      ReturnType<typeof adaptGrievanceDetail>,
      {
        id: string;
        messageType: "PUBLIC_REPLY" | "INTERNAL_NOTE";
        body: string;
        setStatus?: Grievance["status"];
        expectedVersion: number;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/admin/grievances/${id}/messages`,
        method: "POST",
        params: { id },
        body,
        mockKey: "grievanceMessage",
      }),
      transformResponse: adaptGrievanceDetail,
      invalidatesTags: ["Grievance"],
    }),
    updateGrievanceStatus: builder.mutation<
      unknown,
      {
        id: string;
        status: Grievance["status"];
        resolutionCode?: string;
        resolutionSummary?: string;
        expectedVersion: number;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/admin/grievances/${id}/status`,
        method: "POST",
        params: { id },
        body,
        mockKey: "grievanceStatus",
      }),
      invalidatesTags: ["Grievance"],
    }),
    updateGrievancePriority: builder.mutation<
      unknown,
      {
        id: string;
        priority: Grievance["priority"];
        reason?: string;
        expectedVersion: number;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/admin/grievances/${id}/priority`,
        method: "POST",
        params: { id },
        body,
        mockKey: "grievancePriority",
      }),
      invalidatesTags: ["Grievance"],
    }),
    /** @deprecated use updateGrievanceStatus / assignGrievance */
    updateGrievance: builder.mutation<
      Grievance,
      { id: string; patch: Partial<Grievance> }
    >({
      query: ({ id, patch }) => ({
        url: `/admin/grievances/${id}/status`,
        method: "POST",
        params: { id },
        body: { ...patch, expectedVersion: patch.version ?? 1 },
        mockKey: "updateGrievance",
      }),
      invalidatesTags: ["Grievance"],
    }),
    getRemindersConfig: builder.query<any, void>({
      query: () => ({
        url: "/admin/reminders/config",
        mockKey: "remindersConfig",
      }),
      transformResponse: (raw) => contractPayload(raw) as any,
      providesTags: ["Message"],
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    updateRemindersConfig: builder.mutation<any, Record<string, unknown>>({
      query: (body) => ({
        url: "/admin/reminders/config",
        method: "PUT",
        body,
        mockKey: "updateRemindersConfig",
      }),
      transformResponse: (raw) => contractPayload(raw) as any,
      invalidatesTags: ["Message"],
    }),
    previewPushBroadcastAudience: builder.mutation<
      { eligibleDevices: number; subscriptionCap: number | null },
      { audience: string; branchId?: string; customerIds?: string[] }
    >({
      query: (body) => ({
        url: "/admin/push/broadcasts/audience-preview",
        method: "POST",
        body,
        mockKey: "pushBroadcastAudiencePreview",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as { eligibleDevices: number; subscriptionCap: number | null },
    }),
    presignPushUpload: builder.mutation<
      {
        uploadId: string;
        uploadUrl: string;
        method: string;
        headers: Record<string, string>;
      },
      { fileName: string; contentType: string; sizeBytes: number }
    >({
      query: (body) => ({
        url: "/admin/push/uploads/presign",
        method: "POST",
        body: { ...body, purpose: "PUSH_BROADCAST_IMAGE" },
        mockKey: "presignPushUpload",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as {
          uploadId: string;
          uploadUrl: string;
          method: string;
          headers: Record<string, string>;
        },
    }),
    completePushUpload: builder.mutation<
      { uploadId: string; status: string; viewUrl?: string },
      string
    >({
      query: (uploadId) => ({
        url: `/admin/push/uploads/${uploadId}/complete`,
        method: "POST",
        mockKey: "completePushUpload",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as { uploadId: string; status: string; viewUrl?: string },
    }),
    createPushBroadcast: builder.mutation<
      Record<string, unknown>,
      {
        title: string;
        body: string;
        deepLink?: string;
        imageUploadId?: string;
        audience: string;
        branchId?: string;
        customerIds?: string[];
      }
    >({
      query: (body) => ({
        url: "/admin/push/broadcasts",
        method: "POST",
        body,
        mockKey: "createPushBroadcast",
      }),
      transformResponse: (raw) => contractPayload(raw) as Record<string, unknown>,
      invalidatesTags: ["Message"],
    }),
    getPushBroadcasts: builder.query<any, ListQueryParams | void>({
      query: (params) => ({
        url: "/admin/push/broadcasts",
        params: params ?? {},
        mockKey: "pushBroadcasts",
      }),
      transformResponse: (raw) => ({
        items: (contractPayload(raw) as any[]) ?? [],
        page: contractPage(raw),
        meta: contractMeta(raw),
      }),
      providesTags: ["Message"],
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    getMessagingTemplates: builder.query<any, void>({
      query: () => ({
        url: "/admin/messaging/templates",
        mockKey: "messagingTemplates",
      }),
      transformResponse: (raw) => ({
        items: (contractPayload(raw) as any[]) ?? [],
        meta: contractMeta(raw),
      }),
      providesTags: ["Message"],
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    getMessagingTemplatePreview: builder.query<any, string>({
      query: (messageType) => ({
        url: `/admin/messaging/templates/${messageType}/preview`,
        params: { messageType },
        mockKey: "messagingTemplatePreview",
      }),
      transformResponse: (raw) => contractPayload(raw) as any,
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    getMessagingSummary: builder.query<
      any,
      { from?: string; to?: string; branchId?: string } | void
    >({
      query: (params) => ({
        url: "/admin/messaging/summary",
        params: params ?? {},
        mockKey: "messagingSummary",
      }),
      transformResponse: (raw) => {
        const data = contractPayload<any>(raw);
        if (data && !Array.isArray(data) && data.quotaUsedPercent != null) {
          return data;
        }
        const rows = Array.isArray(data)
          ? data
          : Array.isArray(data?.byStatus)
            ? data.byStatus
            : [];
        const counts = Object.fromEntries(
          rows.map((row: any) => [
            String(row._id ?? row.status ?? "").toUpperCase(),
            Number(row.count ?? 0),
          ]),
        );
        const sent = Number(counts.SENT ?? counts.DELIVERED ?? 0);
        const failed = Number(counts.FAILED ?? 0);
        const queued = Number(counts.QUEUED ?? counts.PENDING ?? 0);
        const total = sent + failed + queued;
        const quotaLimit = Number(data?.quotaLimit ?? 1000);
        const quotaUsed = Number(data?.quotaUsed ?? total);
        return {
          sent,
          failed,
          queued,
          total,
          quotaUsed,
          quotaLimit,
          quotaUsedPercent:
            quotaLimit > 0 ? Math.round((quotaUsed / quotaLimit) * 100) : 0,
          byStatus: counts,
        };
      },
      providesTags: ["Message"],
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    patchSettingsProfile: builder.mutation<any, Record<string, unknown>>({
      query: (body) => ({
        url: "/admin/settings/profile",
        method: "PATCH",
        body,
        mockKey: "patchSettingsProfile",
      }),
      transformResponse: adaptSettingsProfile,
      invalidatesTags: ["Settings"],
    }),
    patchSettingsBranding: builder.mutation<any, Record<string, unknown>>({
      query: (body) => {
        const wire: Record<string, unknown> = { ...body };
        if (wire.secondaryColor != null) {
          wire.accentColor = wire.secondaryColor;
          delete wire.secondaryColor;
        }
        if (wire.appDisplayName != null) {
          wire.displayName = wire.appDisplayName;
          delete wire.appDisplayName;
        }
        return {
          url: "/admin/settings/branding",
          method: "PATCH",
          body: wire,
          mockKey: "patchSettingsBranding",
        };
      },
      transformResponse: adaptSettingsBranding,
      invalidatesTags: ["Settings"],
    }),
    patchSettingsOperations: builder.mutation<any, Record<string, unknown>>({
      query: (body) => ({
        url: "/admin/settings/operations",
        method: "PATCH",
        body,
        mockKey: "patchSettingsOperations",
      }),
      transformResponse: adaptSettingsOperations,
      invalidatesTags: ["Settings"],
    }),
    previewPlanSchedule: builder.mutation<
      import("@/src/features/schemes/plan-preview-types").PlanSchedulePreviewData,
      Record<string, unknown>
    >({
      query: (body) => ({
        url: "/admin/scheme-plans/preview-schedule",
        method: "POST",
        body,
        mockKey: "planPreviewSchedule",
      }),
      transformResponse: (raw) => contractPayload(raw) as any,
    }),
    createPaymentLink: builder.mutation<
      { id: string; url: string; status: string; expiresAt: string },
      {
        schemeId: string;
        amountPaise?: number;
        amount?: number;
        targetCycle?: string | null;
        expectedPositionVersion?: number | null;
        idempotencyKey: string;
      }
    >({
      query: ({
        schemeId,
        amountPaise,
        amount,
        targetCycle,
        expectedPositionVersion,
        idempotencyKey,
      }) => ({
        url: "/admin/payment-links",
        method: "POST",
        body: {
          schemeId,
          amountPaise: Math.round(
            amountPaise ?? (amount != null ? Number(amount) * 100 : NaN),
          ),
          ...(targetCycle != null ? { targetCycle } : {}),
          ...(expectedPositionVersion != null
            ? { expectedPositionVersion }
            : {}),
        },
        headers: { "X-Idempotency-Key": idempotencyKey },
        mockKey: "createPaymentLink",
      }),
      transformResponse: (raw) => contractPayload(raw) as any,
      invalidatesTags: ["Payment", "Enrollment", "Report"],
    }),
    getOverdues: builder.query<
      ReturnType<typeof adaptDueList>,
      ListQueryParams & DateRangeQueryParams & { q?: string }
    >({
      query: (params) => ({
        url: "/admin/overdues",
        params,
        mockKey: "overdues",
      }),
      transformResponse: adaptDueList,
      providesTags: ["Enrollment"],
      refetchOnMountOrArgChange: STALE_TIER_A,
    }),
    bulkSendOverdueReminders: builder.mutation<
      {
        jobId: string;
        queued: number;
        skipped?: {
          installmentId?: string;
          schemeId?: string;
          reason: string;
        }[];
      },
      { installmentIds: string[] }
    >({
      query: ({ installmentIds }) => ({
        url: "/admin/overdues/bulk-send-reminders",
        method: "POST",
        body: { schemeIds: installmentIds },
        mockKey: "bulkSendOverdueReminders",
      }),
      transformResponse: (raw) => {
        const data = contractPayload<any>(raw) ?? {};
        return {
          jobId: String(data.jobId ?? data.id ?? "accepted"),
          queued: Number(data.queued ?? data.accepted ?? 0),
          skipped: data.skipped,
        };
      },
    }),
    bulkSendDueLinks: builder.mutation<
      {
        jobId: string;
        queued: number;
        skipped?: {
          installmentId?: string;
          schemeId?: string;
          reason: string;
        }[];
      },
      { installmentIds: string[] }
    >({
      query: ({ installmentIds }) => ({
        url: "/admin/dues/bulk-send-links",
        method: "POST",
        body: { schemeIds: installmentIds },
        mockKey: "bulkSendDueLinks",
      }),
      transformResponse: (raw) => {
        const data = contractPayload<any>(raw) ?? {};
        return {
          jobId: String(data.jobId ?? data.id ?? "accepted"),
          queued: Number(data.queued ?? data.accepted ?? 0),
          skipped: data.skipped,
        };
      },
    }),
    createReportExport: builder.mutation<
      {
        exportId: string;
        status: string;
        downloadUrl?: string;
        statusUrl?: string;
      },
      { reportKey: string; format: string; params?: Record<string, unknown> }
    >({
      query: ({ reportKey, format, params }) => ({
        url: "/admin/exports",
        method: "POST",
        body: {
          type: mapReportKeyToExportType(reportKey),
          format,
          filters: params ?? {},
        },
        mockKey: "createExport",
      }),
      transformResponse: (raw) => normalizeExportJob(raw),
      invalidatesTags: [{ type: "Export", id: "LIST" }],
    }),
    getExportStatus: builder.query<NormalizedExportJob, string>({
      query: (exportId) => ({
        url: `/admin/exports/${exportId}`,
        params: { exportId },
        mockKey: "exportStatus",
      }),
      transformResponse: (raw) => normalizeExportJob(raw),
    }),
    getCustomerAnalytics: builder.query<
      ReturnType<typeof adaptCustomerAnalytics>,
      | {
          branchId?: string;
          period?: string;
          from?: string;
          to?: string;
          groupBy?: string;
        }
      | void
    >({
      query: (params) => ({
        url: "/admin/customers/analytics",
        params: params ?? { period: "THIS_MONTH" },
        mockKey: "customerAnalytics",
      }),
      transformResponse: adaptCustomerAnalytics,
    }),
    getRedemptions: builder.query<
      ReturnType<typeof adaptRedemptions>,
      | (ListQueryParams &
          DateRangeQueryParams & {
            status?: string;
            q?: string;
            open?: string;
            branchId?: string;
          })
      | void
    >({
      query: (params) => ({
        url: "/admin/redemptions",
        params: params ?? {},
        mockKey: "redemptions",
      }),
      transformResponse: adaptRedemptions,
      providesTags: ["Enrollment"],
    }),
    approveRedemption: builder.mutation<
      unknown,
      { id: string; expectedVersion?: number }
    >({
      query: ({ id, ...body }) => ({
        url: `/admin/redemptions/${id}/approve`,
        method: "POST",
        params: { id },
        body,
        mockKey: "approveRedemption",
      }),
      invalidatesTags: ["Enrollment", "Dashboard", "Report"],
    }),
    completeRedemption: builder.mutation<
      unknown,
      { id: string; remarks?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/admin/redemptions/${id}/complete`,
        method: "POST",
        params: { id },
        body,
        mockKey: "completeRedemption",
      }),
      invalidatesTags: ["Enrollment", "Dashboard", "Report"],
    }),
    getRedemption: builder.query<RedemptionDetailView, string>({
      query: (id) => ({
        url: `/admin/redemptions/${id}`,
        params: { id },
        mockKey: "getRedemption",
      }),
      transformResponse: adaptRedemptionDetail,
      providesTags: ["Enrollment"],
    }),
    rejectRedemption: builder.mutation<
      unknown,
      { id: string; reason?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/admin/redemptions/${id}/reject`,
        method: "POST",
        params: { id },
        body,
        mockKey: "rejectRedemption",
      }),
      invalidatesTags: ["Enrollment", "Dashboard", "Report"],
    }),
    getRedemptionReceipt: builder.query<Record<string, unknown>, string>({
      query: (id) => ({
        url: `/admin/redemptions/${id}/receipt`,
        params: { id },
        mockKey: "getRedemptionReceipt",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as Record<string, unknown>,
    }),
    getStaffCashDetail: builder.query<
      {
        receiptCount: number;
        collections: {
          receiptNo: string;
          customer: string;
          amount: number;
          paidAt?: string;
        }[];
        cashInHand?: { amountPaise: number };
        availableForHandover?: { amountPaise: number };
        cashPendingAcceptance?: { amountPaise: number };
      },
      string
    >({
      query: (staffId) => ({
        url: `/admin/cash/staff-balances/${staffId}`,
        params: { staffId },
        mockKey: "staffCashDetail",
      }),
      transformResponse: (raw) => {
        const data = contractPayload<any>(raw) ?? {};
        const collections = (data.collections ?? []).map((row: any) => ({
          receiptNo: String(row.receiptNumber ?? row.receiptNo ?? "—"),
          customer: String(
            row.customer?.name ?? row.customerName ?? row.customerId ?? "—",
          ),
          amount: fromPaise(row.amountPaise ?? row.amount),
          paidAt: row.paidAt,
        }));
        return {
          ...data,
          receiptCount: data.receiptCount ?? collections.length,
          collections,
        };
      },
    }),
    getEntityAudit: builder.query<
      ReturnType<typeof adaptAuditEvents>,
      {
        entityType: string;
        entityId: string;
        cursor?: string;
        limit?: number;
      }
    >({
      query: ({ entityType, entityId, ...params }) => ({
        url: `/admin/${
          entityType === "scheme"
            ? "schemes"
            : entityType === "customer"
              ? "customers"
              : entityType === "payment"
                ? "payments"
                : entityType === "grievance"
                  ? "grievances"
                  : entityType === "redemption"
                    ? "redemptions"
                    : "cash/handovers"
        }/${entityId}/audit-events`,
        params: { entityId, ...params },
        mockKey: "entityAudit",
      }),
      transformResponse: adaptAuditEvents,
    }),
    getAudit: builder.query<
      ReturnType<typeof adaptAuditEvents>,
      | (ListQueryParams &
          DateRangeQueryParams & {
            q?: string;
            type?: string;
            entityType?: string;
            action?: string;
            branchId?: string;
          })
      | void
    >({
      query: (params) => ({
        url: "/admin/audit-events",
        params: params ?? {},
        mockKey: "audit",
      }),
      transformResponse: adaptAuditEvents,
    }),
    getSettings: builder.query<any, void>({
      query: () => ({
        url: "/admin/settings/profile",
        mockKey: "settingsProfile",
      }),
      transformResponse: (raw) => contractPayload(raw) as any,
      providesTags: ["Settings"],
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    getMessagingMessage: builder.query<Record<string, unknown>, string>({
      query: (messageId) => ({
        url: `/admin/messaging/messages/${messageId}`,
        params: { messageId },
        mockKey: "getMessagingMessage",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as Record<string, unknown>,
      providesTags: ["Message"],
    }),
    bulkResendMessages: builder.mutation<
      { queued: number },
      { messageIds: string[] }
    >({
      query: (body) => ({
        url: "/admin/messaging/messages/bulk-resend",
        method: "POST",
        body,
        mockKey: "bulkResendMessages",
      }),
      transformResponse: (raw) => contractPayload(raw) as { queued: number },
      invalidatesTags: ["Message"],
    }),
    getMessagingOptOuts: builder.query<
      ReturnType<typeof adaptListBundle>,
      ListQueryParams | void
    >({
      query: (params) => ({
        url: "/admin/messaging/opt-outs",
        params: params ?? {},
        mockKey: "getMessagingOptOuts",
      }),
      transformResponse: adaptListBundle,
      providesTags: ["Message"],
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    getMessagingQuota: builder.query<
      { used: number; limit: number | null },
      void
    >({
      query: () => ({
        url: "/admin/messaging/quota",
        mockKey: "getMessagingQuota",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as { used: number; limit: number | null },
      providesTags: ["Message"],
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    getMessagingDeadLetter: builder.query<
      ReturnType<typeof adaptListBundle>,
      ListQueryParams | void
    >({
      query: (params) => ({
        url: "/admin/messaging/dead-letter",
        params: params ?? {},
        mockKey: "getMessagingDeadLetter",
      }),
      transformResponse: adaptListBundle,
      providesTags: ["Message"],
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    requeueDeadLetter: builder.mutation<
      { id: string; queued: boolean },
      string
    >({
      query: (id) => ({
        url: `/admin/messaging/dead-letter/${id}/requeue`,
        method: "POST",
        params: { id },
        mockKey: "requeueDeadLetter",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as { id: string; queued: boolean },
      invalidatesTags: ["Message"],
    }),
    getMessagingInbound: builder.query<
      ReturnType<typeof adaptListBundle>,
      ListQueryParams | void
    >({
      query: (params) => ({
        url: "/admin/messaging/inbound",
        params: params ?? {},
        mockKey: "getMessagingInbound",
      }),
      transformResponse: adaptListBundle,
      providesTags: ["Message"],
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    getMessagingInboundDetail: builder.query<Record<string, any>, string>({
      query: (id) => ({
        url: `/admin/messaging/inbound/${id}`,
        mockKey: "getMessagingInboundDetail",
      }),
      transformResponse: (raw) => contractPayload(raw) as Record<string, any>,
      providesTags: ["Message"],
    }),
    markMessagingInboundRead: builder.mutation<Record<string, any>, string>({
      query: (id) => ({
        url: `/admin/messaging/inbound/${id}/read`,
        method: "POST",
        body: {},
        mockKey: "markMessagingInboundRead",
      }),
      transformResponse: (raw) => contractPayload(raw) as Record<string, any>,
      invalidatesTags: ["Message"],
    }),
    getGatewaySettlementRuns: builder.query<
      Record<string, any>[],
      { limit?: number; cursor?: string } | void
    >({
      query: (params) => ({
        url: "/admin/gateway/settlement-runs",
        params: params ?? {},
        mockKey: "getGatewaySettlementRuns",
      }),
      transformResponse: (raw) => {
        const value = contractPayload<any>(raw) ?? [];
        return Array.isArray(value) ? value : value.data ?? value.items ?? [];
      },
      providesTags: ["Payment"],
    }),
    getGatewaySettlementMismatches: builder.query<
      Record<string, any>[],
      { status?: string; limit?: number; cursor?: string } | void
    >({
      query: (params) => ({
        url: "/admin/gateway/settlement-mismatches",
        params: params ?? {},
        mockKey: "getGatewaySettlementMismatches",
      }),
      transformResponse: (raw) => {
        const value = contractPayload<any>(raw) ?? [];
        return Array.isArray(value) ? value : value.data ?? value.items ?? [];
      },
      providesTags: ["Payment"],
    }),
    uploadGatewaySettlement: builder.mutation<
      Record<string, any>,
      {
        businessDate: string;
        contentType: "CSV" | "JSON";
        sourceFileName?: string;
        items: Array<{
          providerTransactionId?: string;
          providerRefundId?: string;
          expectedAmountPaise?: number;
          settledAmountPaise: number;
          matchedPaymentId?: string;
          matchedRefundId?: string;
        }>;
        idempotencyKey: string;
      }
    >({
      query: ({ idempotencyKey, ...body }) => ({
        url: "/admin/gateway/settlement-runs/upload",
        method: "POST",
        body,
        headers: { "X-Idempotency-Key": idempotencyKey },
        mockKey: "uploadGatewaySettlement",
      }),
      transformResponse: (raw) => contractPayload(raw) as Record<string, any>,
      invalidatesTags: ["Payment", "Dashboard", "Report"],
    }),
    resolveGatewaySettlementMismatch: builder.mutation<
      Record<string, any>,
      {
        mismatchId: string;
        category: string;
        reason: string;
        expectedVersion?: number;
        idempotencyKey: string;
      }
    >({
      query: ({ mismatchId, idempotencyKey, ...body }) => ({
        url: `/admin/gateway/settlement-mismatches/${mismatchId}/resolve`,
        method: "POST",
        body,
        headers: { "X-Idempotency-Key": idempotencyKey },
        mockKey: "resolveGatewaySettlementMismatch",
      }),
      transformResponse: (raw) => contractPayload(raw) as Record<string, any>,
      invalidatesTags: ["Payment"],
    }),
    reopenGatewaySettlementMismatch: builder.mutation<
      Record<string, any>,
      { mismatchId: string; reason: string; idempotencyKey: string }
    >({
      query: ({ mismatchId, idempotencyKey, ...body }) => ({
        url: `/admin/gateway/settlement-mismatches/${mismatchId}/reopen`,
        method: "POST",
        body,
        headers: { "X-Idempotency-Key": idempotencyKey },
        mockKey: "reopenGatewaySettlementMismatch",
      }),
      transformResponse: (raw) => contractPayload(raw) as Record<string, any>,
      invalidatesTags: ["Payment"],
    }),
    getDashboardActivity: builder.query<
      ReturnType<typeof adaptListBundle>,
      ListQueryParams | void
    >({
      query: (params) => ({
        url: "/admin/dashboard/activity",
        params: params ?? {},
        mockKey: "getDashboardActivity",
      }),
      transformResponse: adaptListBundle,
      providesTags: ["Dashboard"],
      refetchOnMountOrArgChange: STALE_TIER_A,
    }),
    getCollectionsSummary: builder.query<
      Record<string, unknown>,
      { from?: string; to?: string; branchId?: string } | void
    >({
      query: (params) => ({
        url: "/admin/collections/summary",
        params: params ?? {},
        mockKey: "getCollectionsSummary",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as Record<string, unknown>,
      providesTags: ["Dashboard"],
      refetchOnMountOrArgChange: STALE_TIER_A,
      refetchOnFocus: true,
    }),
    getSubscriptionUsage: builder.query<Record<string, unknown>, void>({
      query: () => ({
        url: "/admin/subscription/usage",
        mockKey: "subscriptionUsage",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as Record<string, unknown>,
      providesTags: ["Settings"],
      refetchOnMountOrArgChange: STALE_TIER_D,
    }),
    getDefaulters: builder.query<
      ReturnType<typeof adaptListBundle>,
      (ListQueryParams & { q?: string; branchId?: string }) | void
    >({
      query: (params) => ({
        url: "/admin/defaulters",
        params: params ?? {},
        mockKey: "getDefaulters",
      }),
      transformResponse: adaptListBundle,
      providesTags: ["Enrollment"],
      refetchOnMountOrArgChange: STALE_TIER_A,
    }),
    getFlexibleLocks: builder.query<
      ReturnType<typeof adaptListBundle>,
      (ListQueryParams & { branchId?: string }) | void
    >({
      query: (params) => ({
        url: "/admin/flexible-locks",
        params: params ?? {},
        mockKey: "getFlexibleLocks",
      }),
      transformResponse: adaptListBundle,
      providesTags: ["Enrollment"],
    }),
    getDuesCount: builder.query<Record<string, unknown>, void>({
      query: () => ({
        url: "/admin/dues/count",
        mockKey: "getDuesCount",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as Record<string, unknown>,
      providesTags: ["Enrollment"],
      refetchOnMountOrArgChange: STALE_TIER_A,
    }),
    getNavBadges: builder.query<
      {
        dues: number;
        cashHandovers: number;
        openRedemptions: number;
        failedMessages: number;
      },
      { branchId?: string } | void
    >({
      query: (params) => ({
        url: "/admin/nav-badges",
        params: params ?? {},
        mockKey: "getNavBadges",
      }),
      transformResponse: (raw) => {
        const data = contractPayload(raw) as Record<string, unknown>;
        return {
          dues: Number(data.dues ?? data.count ?? 0),
          cashHandovers: Number(data.cashHandovers ?? 0),
          openRedemptions: Number(data.openRedemptions ?? 0),
          failedMessages: Number(data.failedMessages ?? 0),
        };
      },
      providesTags: ["Dashboard", "Enrollment", "Cash", "Message"],
      refetchOnMountOrArgChange: STALE_TIER_A,
    }),
    getMaturitiesCalendar: builder.query<
      { month?: string; days: { date: string; count: number }[]; items: any[] },
      { month?: string; branchId?: string } | void
    >({
      query: (params) => ({
        url: "/admin/maturities/calendar",
        params: params ?? {},
        mockKey: "getMaturitiesCalendar",
      }),
      transformResponse: (raw) => {
        const payload = contractPayload<any>(raw) ?? {};
        const bundle = adaptListBundle({
          items: payload.items ?? [],
          summary: {},
          page: { total: payload.items?.length ?? 0 },
        });
        return {
          month: payload.month,
          days: Array.isArray(payload.days) ? payload.days : [],
          items: bundle.items,
        };
      },
      providesTags: ["Enrollment"],
    }),
    listExports: builder.query<
      ReturnType<typeof adaptListBundle>,
      ListQueryParams | void
    >({
      query: (params) => ({
        url: "/admin/exports",
        params: params ?? {},
        mockKey: "listExports",
      }),
      transformResponse: adaptListBundle,
      providesTags: [{ type: "Export", id: "LIST" }],
    }),
    presignUpload: builder.mutation<
      {
        uploadId: string;
        uploadUrl: string;
        method: string;
        headers: Record<string, string>;
        expiresAt: string;
      },
      {
        purpose: string;
        fileName: string;
        contentType: string;
        sizeBytes: number;
      }
    >({
      query: (body) => ({
        url: "/admin/uploads/presign",
        method: "POST",
        body,
        mockKey: "presignUpload",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as {
          uploadId: string;
          uploadUrl: string;
          method: string;
          headers: Record<string, string>;
          expiresAt: string;
        },
    }),
    completeUpload: builder.mutation<
      { uploadId: string; status: string; viewUrl?: string },
      string
    >({
      query: (uploadId) => ({
        url: `/admin/uploads/${uploadId}/complete`,
        method: "POST",
        params: { uploadId },
        mockKey: "completeUpload",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as {
          uploadId: string;
          status: string;
          viewUrl?: string;
        },
    }),
    getUploadDownload: builder.query<
      { uploadId: string; status: string; fileName?: string | null; contentType?: string | null; downloadUrl: string },
      string
    >({
      query: (uploadId) => ({
        url: `/admin/uploads/${uploadId}`,
        params: { uploadId },
        mockKey: "getUploadDownload",
      }),
      transformResponse: (raw) =>
        contractPayload(raw) as {
          uploadId: string;
          status: string;
          fileName?: string | null;
          contentType?: string | null;
          downloadUrl: string;
        },
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useRefreshTokenMutation,
  useForgotPasswordMutation,
  useVerifyPasswordResetOtpMutation,
  useResetPasswordWithTokenMutation,
  useChangePasswordMutation,
  useLogoutAllMutation,
  useGetDevicesQuery,
  useRevokeDeviceMutation,
  useSetPasswordMutation,
  useGetDashboardQuery,
  useGetAlertsQuery,
  useDismissAlertMutation,
  useGetCustomersQuery,
  useGetCustomerQuery,
  useGetCustomerSchemesQuery,
  useGetCustomerPaymentsQuery,
  useGetCustomerMessagesQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useSetCustomerPasswordMutation,
  useVerifyCustomerKycMutation,
  useSubmitCustomerKycMutation,
  useUpdateCustomerNomineeMutation,
  useRemoveCustomerNomineeMutation,
  useBlockCustomerMutation,
  useUnblockCustomerMutation,
  useAddCustomerNoteMutation,
  useUpdateWhatsappOptMutation,
  useGetCustomerNomineeQuery,
  useGetCustomerStatementQuery,
  useLazyGetCustomerStatementQuery,
  useShareCustomerStatementWhatsappMutation,
  useGetEnrollmentsQuery,
  useGetEnrollmentAnalyticsQuery,
  useGetEnrollmentQuery,
  useGetSchemeLedgerQuery,
  useGetSchemePassbookQuery,
  useLazyGetSchemePassbookQuery,
  useGetMaturityProjectionQuery,
  useGetSchemePaymentIntentsQuery,
  useRecomputeSchemeMutation,
  useApplyFlexibleLockMutation,
  useGetPayableRangeQuery,
  useGetSettlementPreviewQuery,
  useRedeemEnrollmentMutation,
  useClosePrematureEnrollmentMutation,
  useValidateEnrolmentMutation,
  useLazyCheckCustomerMobileQuery,
  useCreateEnrollmentMutation,
  useRecordPaymentMutation,
  useGetDuesQuery,
  useGetPaymentsQuery,
  useGetPaymentQuery,
  useGetPendingPaymentsQuery,
  useGetLateSuccessPaymentsQuery,
  useReversePaymentMutation,
  usePollPaymentStatusMutation,
  useReconcilePaymentMutation,
  useSharePaymentWhatsappMutation,
  useGetPaymentReceiptQuery,
  useLazyGetPaymentReceiptQuery,
  useGetPaymentPassbookImageQuery,
  useLazyGetPaymentPassbookImageQuery,
  useRegeneratePassbookImageMutation,
  useGetPaymentLinksQuery,
  useCancelPaymentLinkMutation,
  useResendPaymentLinkMutation,
  useGetCashOverviewQuery,
  useGetCashStaffBalancesQuery,
  useGetCashHandoversQuery,
  useGetCashReportQuery,
  useGetHandoverQuery,
  useUpdateHandoverMutation,
  useCreateAdminHandoverMutation,
  useCreateCashAdjustmentMutation,
  useGetMaturitiesQuery,
  useGetGlobalSearchQuery,
  useGetGoldRateCurrentQuery,
  useGetGoldRatesQuery,
  useAddGoldRateMutation,
  useGetMessagesQuery,
  useResendMessageMutation,
  useGetReportsQuery,
  useGetPlansQuery,
  useGetPlanQuery,
  useGetPlanStatsQuery,
  useCreatePlanMutation,
  usePatchPlanMutation,
  useActivatePlanMutation,
  useDeactivatePlanMutation,
  useDuplicatePlanMutation,
  useGetSettingsBrandingQuery,
  useGetSettingsProfileQuery,
  useGetSettingsOperationsQuery,
  useGetSubscriptionQuery,
  useGetAvailablePlansQuery,
  useGetSubscriptionInvoicesQuery,
  useLazyDownloadSubscriptionInvoiceQuery,
  useRequestSubscriptionUpgradeMutation,
  useGetAccessQuery,
  useGetAccessSummaryQuery,
  useGetStaffQuery,
  useGetBranchesQuery,
  useCreateStaffMutation,
  useCreateBranchMutation,
  useGetStaffDetailQuery,
  useGetStaffPerformanceSummaryQuery,
  useGetStaffPerformanceSectionQuery,
  usePatchStaffMutation,
  useActivateStaffMutation,
  useDeactivateStaffMutation,
  useResetStaffPasswordMutation,
  useTransferStaffBranchMutation,
  useGetBranchDetailQuery,
  useGetBranchPerformanceSummaryQuery,
  useGetBranchPerformanceSectionQuery,
  usePatchBranchMutation,
  useActivateBranchMutation,
  useDeactivateBranchMutation,
  useGetGrievancesQuery,
  useGetGrievanceQuery,
  useAssignGrievanceMutation,
  usePostGrievanceMessageMutation,
  useUpdateGrievanceStatusMutation,
  useUpdateGrievancePriorityMutation,
  useUpdateGrievanceMutation,
  useGetRemindersConfigQuery,
  useUpdateRemindersConfigMutation,
  usePreviewPushBroadcastAudienceMutation,
  usePresignPushUploadMutation,
  useCompletePushUploadMutation,
  useCreatePushBroadcastMutation,
  useGetPushBroadcastsQuery,
  useGetMessagingTemplatesQuery,
  useGetMessagingTemplatePreviewQuery,
  useGetMessagingSummaryQuery,
  usePatchSettingsProfileMutation,
  usePatchSettingsBrandingMutation,
  usePatchSettingsOperationsMutation,
  usePreviewPlanScheduleMutation,
  useCreatePaymentLinkMutation,
  useGetOverduesQuery,
  useBulkSendOverdueRemindersMutation,
  useBulkSendDueLinksMutation,
  useCreateReportExportMutation,
  useGetExportStatusQuery,
  useLazyGetExportStatusQuery,
  useGetCustomerAnalyticsQuery,
  useGetRedemptionsQuery,
  useApproveRedemptionMutation,
  useCompleteRedemptionMutation,
  useGetRedemptionQuery,
  useRejectRedemptionMutation,
  useGetRedemptionReceiptQuery,
  useGetStaffCashDetailQuery,
  useGetEntityAuditQuery,
  useAcceptHandoverMutation,
  useRejectHandoverMutation,
  useResolveHandoverDiscrepancyMutation,
  useGetAuditQuery,
  useLazyGetAuditQuery,
  useGetNavBadgesQuery,
  useLazyGetRedemptionReceiptQuery,
  useGetSettingsQuery,
  useGetMessagingMessageQuery,
  useBulkResendMessagesMutation,
  useGetMessagingOptOutsQuery,
  useGetMessagingQuotaQuery,
  useGetMessagingDeadLetterQuery,
  useRequeueDeadLetterMutation,
  useGetMessagingInboundQuery,
  useGetMessagingInboundDetailQuery,
  useMarkMessagingInboundReadMutation,
  useInitiatePaymentRefundMutation,
  useGetPostSettlementRefundCasesQuery,
  useResolvePostSettlementRefundCaseMutation,
  useListPaymentRefundsQuery,
  useReconcilePaymentRefundMutation,
  useReleasePaymentRefundReservationMutation,
  useGetGatewaySettlementRunsQuery,
  useGetGatewaySettlementMismatchesQuery,
  useUploadGatewaySettlementMutation,
  useResolveGatewaySettlementMismatchMutation,
  useReopenGatewaySettlementMismatchMutation,
  useGetDashboardActivityQuery,
  useGetCollectionsSummaryQuery,
  useGetSubscriptionUsageQuery,
  useGetDefaultersQuery,
  useGetFlexibleLocksQuery,
  useGetDuesCountQuery,
  useGetMaturitiesCalendarQuery,
  useListExportsQuery,
  usePresignUploadMutation,
  useCompleteUploadMutation,
  useGetUploadDownloadQuery,
} = adminApi;
