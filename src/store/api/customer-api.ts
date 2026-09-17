import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { env } from "@/src/config/env";
import {
  customerGrievances,
  customerHome,
  customerNotifications,
  customerPayments,
  customerProfile,
  customerSchemes,
  customerTenant,
  money,
  schemePlans,
} from "@/src/mocks/customer-data";
import type {
  CustomerGrievance,
  CustomerHome,
  CustomerNotification,
  CustomerPastScheme,
  CustomerProfile,
  CustomerSchemeDetail,
  PayableRange,
  PaymentListItem,
  SchemeCard,
  SchemePlan,
} from "@/src/types/customer";
import { handleCustomerUnauthorized } from "@/src/lib/auth-logout";
import { parseRefreshTokens } from "@/src/lib/auth-tokens-from-refresh";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import type { AppDispatch } from "@/src/store";
import { adaptCustomerSchemePlan, adaptCustomerSchemePlanList } from "@/src/lib/customer-plan-adapter";
import {
  adaptCustomerPayment,
  adaptCustomerPaymentList,
  adaptCustomerSchemeDetail,
} from "@/src/lib/customer-payment-adapter";

type ApiEnvelope<T> = { success: true; data: T; meta?: { nextCursor: string | null; hasMore: boolean; limit: number; total: number } };

const sleep = () => new Promise((resolve) => setTimeout(resolve, Math.min(Math.max(env.mockDelayMs, 100), 900)));

function ok<T>(data: T): { data: ApiEnvelope<T> } {
  return { data: { success: true, data } };
}

function routeOf(args: string | FetchArgs) {
  return typeof args === "string" ? args : args.url;
}

function withIdempotencyHeader(args: string | FetchArgs): string | FetchArgs {
  if (typeof args === "string") return args;
  const method = String(args.method ?? "GET").toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return args;
  const headers = new Headers(args.headers as HeadersInit | undefined);
  if (!headers.has("X-Idempotency-Key")) {
    headers.set("X-Idempotency-Key", newIdempotencyKey());
  }
  return { ...args, headers };
}

const mockBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args) => {
  await sleep();
  const url = routeOf(args);
  const method = typeof args === "string" ? "GET" : String(args.method ?? "GET").toUpperCase();
  const body = typeof args === "string" ? undefined : (args.body as Record<string, unknown> | undefined);

  if (url === "/public/tenants/resolve") return ok({ resolvedBy: "TENANT_CODE", tenantCode: "KAI", tenants: [customerTenant] });
  if (url === "/public/auth/otp/request") {
    return ok({
      otpId: "00000000-0000-4000-8000-000000000001",
      channel: "SMS",
      maskedMobile: "******2345",
      resendAvailableInSeconds: 30,
      attemptsAllowed: 5,
      isRegistered: true,
      expiresInSeconds: 300,
    });
  }
  if (url === "/public/auth/otp/verify") {
    const purpose = String(body?.purpose ?? "LOGIN");
    const isSignup = purpose === "SIGNUP";
    const incompleteProfile = {
      ...customerProfile,
      name: "Customer",
      profileComplete: false,
    };
    return ok({
      isNewCustomer: isSignup,
      profileComplete: !isSignup,
      customer: isSignup ? incompleteProfile : customerProfile,
      tenant: customerTenant,
      tenantCapabilities: { customerSelfEnrol: true, customerSelfRegistration: true, kycMandatory: false, multiScheme: true },
      accessToken: "mock-customer-access",
      refreshToken: "mock-customer-refresh",
      expiresIn: 1800,
      tokenType: "Bearer",
    });
  }
  if (url === "/app/home") return ok(customerHome);
  if (url === "/app/profile" && method === "GET") return ok(customerProfile);
  if (url === "/app/profile" && method === "PATCH") return ok({ ...customerProfile, ...body });
  if (url === "/app/profile/complete" && method === "POST") {
    return ok({
      ...customerProfile,
      name: String(body?.name ?? customerProfile.name),
      email: body?.email ?? customerProfile.email,
      dateOfBirth: body?.dateOfBirth ?? customerProfile.dateOfBirth,
      address: body?.address ?? customerProfile.address,
      profileComplete: true,
    });
  }
  if (url === "/app/profile/kyc" && method === "PUT") {
    return ok({
      ...customerProfile,
      kyc: {
        status: "SUBMITTED",
        statusLabel: "Under review",
        type: body?.type ?? "AADHAAR",
        numberMasked: body?.numberMasked ?? "XXXX XXXX 1234",
        canUpdate: false,
        verifiedAt: null,
      },
    });
  }
  if (url === "/app/uploads/presign" && method === "POST") {
    return ok({
      uploadId: `upl_${Date.now()}`,
      uploadUrl: "",
      method: "PUT",
      headers: {},
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
    });
  }
  if (url === "/app/scheme-plans") return ok(schemePlans);
  if (url.startsWith("/app/scheme-plans/")) return ok(schemePlans.find((p) => p.id === url.split("/").pop()) ?? schemePlans[0]);
  if (url === "/app/schemes") {
    const group = typeof args !== "string" ? (args as FetchArgs).params?.group : undefined;
    if (group === "PAST") {
      return ok([
        {
          id: "sch_past",
          schemeNumber: "ENR-22001",
          planName: "Akshaya 12 Month",
          closureType: "MATURITY",
          closedAt: "2026-06-01T00:00:00Z",
          finalValue: money(3600000),
          benefitReceived: money(300000),
          passbookAvailable: true,
        },
      ]);
    }
    return ok(customerSchemes);
  }
  const schemeMatch = url.match(/^\/app\/schemes\/([^/]+)$/);
  if (schemeMatch) return ok(customerSchemes.find((s) => s.id === schemeMatch[1]) ?? customerSchemes[0]);
  if (url.endsWith("/payable-range")) {
    const id = url.split("/")[3];
    return ok(customerSchemes.find((s) => s.id === id)?.payableRange ?? customerSchemes[0].payableRange);
  }
  if (url === "/app/schemes/enrol" && method === "POST") {
    const plan = schemePlans.find((p) => p.id === body?.planId) ?? schemePlans[0];
    const flexible = plan.model === "FLEXIBLE";
    return ok({ scheme: { id: "sch_new", schemeNumber: "ENR-24992" }, paymentType: flexible ? "FLEXIBLE_PAYMENT_INTENT" : "FIXED_PAYMENT_LINK", ...(flexible ? { paymentIntent: { id: "pi_new", paymentId: "pay_new", paymentUrl: "https://mercury.phonepe.com/transact/pg?token=mock", status: "PENDING" } } : { paymentLink: { id: "pl_new", token: "mock_pay_link", gatewayUrl: "/pay/mock_pay_link", amount: money(Number(body?.installmentAmountPaise ?? 250000)), expiresAt: new Date(Date.now() + 900000).toISOString() } }) });
  }
  if ((url.endsWith("/payment-intents") || url.endsWith("/pay")) && method === "POST") {
    const isIntent = url.endsWith("/payment-intents");
    return ok(isIntent
      ? { id: `pi_${Date.now()}`, paymentId: `pay_${Date.now()}`, status: "PENDING", paymentUrl: "https://mercury.phonepe.com/transact/pg?token=mock", statusPollUrl: "/app/payment-intents/pi_demo", expiresAt: new Date(Date.now() + 900000).toISOString(), positionVersion: Number(body?.expectedPositionVersion ?? 1) }
      : { id: `pl_${Date.now()}`, paymentId: `pay_${Date.now()}`, token: "mock_pay_link", gatewayUrl: "/pay/mock_pay_link", expiresAt: new Date(Date.now() + 900000).toISOString() });
  }
  const publicPayInit = url.match(/^\/public\/pay\/([^/]+)\/initiate$/);
  if (publicPayInit && method === "POST") {
    return ok({
      gatewayUrl: "https://mercury.phonepe.com/transact/pg?token=mock",
      paymentId: `pay_${Date.now()}`,
    });
  }
  if (url === "/app/payments") return ok(customerPayments);
  if (url === "/app/notifications") return ok({ items: customerNotifications, unreadCount: customerNotifications.filter((n) => !n.read).length });
  if (url.includes("/notifications/") && url.endsWith("/read")) return ok({ read: true });
  if (url === "/app/notifications/read-all") return ok({ unreadCount: 0 });
  if (url === "/app/grievances" && method === "GET") return ok(customerGrievances);
  if (url === "/app/grievances" && method === "POST") return ok({ ...customerGrievances[0], id: `grv_${Date.now()}`, ticketNumber: "SG-2609-061", subject: body?.subject, description: body?.description, status: "OPEN", statusLabel: "Open" });
  const grievanceMatch = url.match(/^\/app\/grievances\/([^/]+)$/);
  if (grievanceMatch) return ok(customerGrievances.find((g) => g.id === grievanceMatch[1]) ?? customerGrievances[0]);
  if (url.endsWith("/messages")) return ok({ id: `msg_${Date.now()}`, authorType: "CUSTOMER", body: body?.body, createdAt: new Date().toISOString() });
  if (url === "/app/auth/refresh" && method === "POST") {
    return ok({
      accessToken: "mock-customer-access-refreshed",
      refreshToken: "mock-customer-refresh-refreshed",
      expiresIn: 1800,
      tokenType: "Bearer",
    });
  }
  if (url === "/app/auth/devices") return ok([{ deviceId: "dev_iphone", platform: "iOS", deviceModel: "iPhone 16", lastUsedAt: "Now", current: true }, { deviceId: "dev_chrome", platform: "Web", deviceModel: "Chrome on macOS", lastUsedAt: "2 days ago", current: false }]);
  if (url === "/app/gold-rate/current") return ok(customerHome.goldRate);
  if (url === "/app/gold-rate/history") return ok([{ ...customerHome.goldRate, effectiveDate: "2026-09-16" }, { ...customerHome.goldRate, ratePerGramPaise: 721000, ratePerGramDisplay: "₹7,210 / g", effectiveDate: "2026-09-15", movement: -0.18 }, { ...customerHome.goldRate, ratePerGramPaise: 722500, ratePerGramDisplay: "₹7,225 / g", effectiveDate: "2026-09-14", movement: 0.31 }]);
  if (url === "/app/branches") return ok([customerProfile.branch, { id: "br_thrissur", code: "TSR", name: "Thrissur", address: "Round South, Thrissur", mobile: "+91 487 2211900" }]);
  if (url.includes("/redemption-request")) return ok({ id: "red_001", schemeId: url.split("/")[3], status: "REQUESTED", preferredMode: body?.preferredMode, preferredDate: body?.preferredDate, version: Number(body?.expectedVersion ?? 1) + 1 });
  return ok({});
};

const liveBaseQuery = fetchBaseQuery({
  baseUrl: env.apiBaseUrl,
  prepareHeaders(headers) {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("swarnagrow.customer.accessToken");
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }
    headers.set("Accept", "application/json");
    return headers;
  },
});

type CustomerBaseQueryExtra = { _authRetry?: boolean };

function unwrapCustomerEnvelope(result: {
  data?: unknown;
  error?: FetchBaseQueryError;
  meta?: unknown;
}) {
  if ("data" in result && result.data && typeof result.data === "object" && "success" in result.data) {
    const envelope = result.data as ApiEnvelope<unknown> & {
      success: boolean;
      error?: { code: string; message: string };
    };
    if (envelope.success) return { data: envelope.data, meta: result.meta };
    return {
      error: {
        status: "CUSTOM_ERROR" as const,
        error: envelope.error?.message ?? "Request failed",
        data: envelope.error,
      },
    };
  }
  return result;
}

function storeCustomerTokens(tokens: { accessToken: string; refreshToken?: string }) {
  if (typeof window === "undefined") return;
  localStorage.setItem("swarnagrow.customer.accessToken", tokens.accessToken);
  if (tokens.refreshToken) {
    localStorage.setItem("swarnagrow.customer.refreshToken", tokens.refreshToken);
  }
}

const dynamicBaseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError,
  CustomerBaseQueryExtra
> = async (args, api, extra) => {
  const requestArgs = env.useMocks ? args : withIdempotencyHeader(args);
  const url = routeOf(requestArgs);
  const isAuthRefresh = url.includes("/app/auth/refresh");
  const isPublicAuth = url.startsWith("/public/");
  const alreadyRetried = Boolean(extra?._authRetry);
  const dispatch = api.dispatch as AppDispatch;

  let result = env.useMocks
    ? await mockBaseQuery(requestArgs, api, extra)
    : await liveBaseQuery(requestArgs, api, extra);

  if (
    !env.useMocks &&
    result.error?.status === 401 &&
    typeof window !== "undefined" &&
    !isAuthRefresh &&
    !isPublicAuth &&
    !alreadyRetried
  ) {
    const refreshToken = localStorage.getItem("swarnagrow.customer.refreshToken");
    if (refreshToken) {
      const refreshResult = await liveBaseQuery(
        {
          url: "/app/auth/refresh",
          method: "POST",
          body: { refreshToken },
        },
        api,
        extra,
      );
      const tokens = parseRefreshTokens(refreshResult.data);
      if (tokens?.accessToken) {
        storeCustomerTokens(tokens);
        result = await liveBaseQuery(requestArgs, api, {
          ...extra,
          _authRetry: true,
        });
      } else {
        handleCustomerUnauthorized(dispatch);
      }
    } else {
      handleCustomerUnauthorized(dispatch);
    }
  } else if (
    !env.useMocks &&
    result.error?.status === 401 &&
    typeof window !== "undefined" &&
    !isAuthRefresh &&
    !isPublicAuth
  ) {
    handleCustomerUnauthorized(dispatch);
  }

  return unwrapCustomerEnvelope(result);
};

export const customerApi = createApi({
  reducerPath: "customerApi",
  baseQuery: dynamicBaseQuery,
  tagTypes: ["CustomerHome", "CustomerScheme", "CustomerPayment", "CustomerProfile", "CustomerNotification", "CustomerGrievance", "CustomerDevice"],
  endpoints: (builder) => ({
    resolveTenant: builder.query<{ tenants: Array<typeof customerTenant> }, { tenantCode?: string; mobile?: string }>({ query: (params) => ({ url: "/public/tenants/resolve", params }) }),
    requestCustomerOtp: builder.mutation<
      { otpId: string; maskedMobile: string; expiresInSeconds: number; isRegistered?: boolean },
      { tenantCode: string; mobile: string; deviceId: string; purpose: string }
    >({ query: (body) => ({ url: "/public/auth/otp/request", method: "POST", body }) }),
    verifyCustomerOtp: builder.mutation<
      {
        customer: CustomerProfile;
        tenant: typeof customerTenant;
        accessToken: string;
        refreshToken: string;
        isNewCustomer?: boolean;
        profileComplete?: boolean;
        tenantCapabilities?: { kycMandatory?: boolean; customerSelfRegistration?: boolean };
      },
      Record<string, unknown>
    >({ query: (body) => ({ url: "/public/auth/otp/verify", method: "POST", body }) }),
    getCustomerHome: builder.query<CustomerHome, void>({
      query: () => ({
        url: "/app/home",
        params: { includeTrends: "true", trendMonths: 6 },
      }),
      providesTags: ["CustomerHome"],
    }),
    getCustomerProfile: builder.query<CustomerProfile, void>({ query: () => "/app/profile", providesTags: ["CustomerProfile"] }),
    updateCustomerProfile: builder.mutation<CustomerProfile, Partial<CustomerProfile>>({ query: (body) => ({ url: "/app/profile", method: "PATCH", body }), invalidatesTags: ["CustomerProfile", "CustomerHome"] }),
    completeCustomerProfile: builder.mutation<
      CustomerProfile,
      { name: string; email?: string; dateOfBirth?: string; address?: string }
    >({
      query: (body) => ({ url: "/app/profile/complete", method: "POST", body }),
      invalidatesTags: ["CustomerProfile", "CustomerHome"],
    }),
    presignCustomerUpload: builder.mutation<
      { uploadId: string; uploadUrl: string; method: string; headers: Record<string, string>; expiresAt: string },
      { purpose: string; fileName: string; contentType: string; sizeBytes: number }
    >({
      query: (body) => ({ url: "/app/uploads/presign", method: "POST", body }),
    }),
    submitCustomerKyc: builder.mutation<
      CustomerProfile,
      { type: string; number?: string; numberMasked?: string; frontUploadId?: string; backUploadId?: string }
    >({
      query: (body) => ({ url: "/app/profile/kyc", method: "PUT", body }),
      invalidatesTags: ["CustomerProfile"],
    }),
    updateCustomerNominee: builder.mutation<
      CustomerProfile,
      {
        expectedVersion: number;
        name: string;
        relationship: string;
        mobile: string;
        notes?: string;
      }
    >({
      query: (body) => ({ url: "/app/profile/nominee", method: "PUT", body: { ...body, address: body.notes } }),
      invalidatesTags: ["CustomerProfile"],
    }),
    removeCustomerNominee: builder.mutation<CustomerProfile, { expectedVersion: number }>({
      query: (body) => ({ url: "/app/profile/nominee", method: "DELETE", body }),
      invalidatesTags: ["CustomerProfile"],
    }),
    getCustomerPlans: builder.query<SchemePlan[], void>({
      query: () => "/app/scheme-plans",
      transformResponse: (raw: unknown) => adaptCustomerSchemePlanList(raw),
    }),
    getCustomerPlan: builder.query<SchemePlan, string>({
      query: (id) => `/app/scheme-plans/${id}`,
      transformResponse: (raw: unknown) => adaptCustomerSchemePlan(raw),
    }),
    getCustomerSchemes: builder.query<SchemeCard[], void>({
      query: () => "/app/schemes",
      providesTags: ["CustomerScheme"],
    }),
    getCustomerPastSchemes: builder.query<CustomerPastScheme[], void>({
      query: () => ({ url: "/app/schemes", params: { group: "PAST" } }),
      providesTags: ["CustomerScheme"],
    }),
    getCustomerScheme: builder.query<CustomerSchemeDetail, string>({
      query: (id) => `/app/schemes/${id}`,
      transformResponse: (raw: unknown) => adaptCustomerSchemeDetail(raw),
      providesTags: (_r, _e, id) => [{ type: "CustomerScheme", id }],
    }),
    getCustomerPayableRange: builder.query<
      PayableRange,
      { schemeId: string; targetCycle?: string }
    >({
      query: ({ schemeId, targetCycle }) => ({
        url: `/app/schemes/${schemeId}/payable-range`,
        params: targetCycle ? { targetCycle } : undefined,
      }),
    }),
    enrolCustomerScheme: builder.mutation<Record<string, unknown>, { planId: string; installmentAmountPaise?: number; payNow: boolean; redirectUrl?: string }>({ query: (body) => ({ url: "/app/schemes/enrol", method: "POST", body }), invalidatesTags: ["CustomerScheme", "CustomerHome"] }),
    initiatePublicPaymentLink: builder.mutation<
      { gatewayUrl?: string; redirectUrl?: string; paymentId?: string },
      { linkToken: string; redirectUrl: string }
    >({
      query: ({ linkToken, redirectUrl }) => ({
        url: `/public/pay/${encodeURIComponent(linkToken)}/initiate`,
        method: "POST",
        body: { redirectUrl },
      }),
    }),
    initiateCustomerPayment: builder.mutation<
      Record<string, unknown>,
      {
        scheme: CustomerSchemeDetail;
        amountPaise: number;
        redirectUrl?: string;
        targetCycle?: string;
        positionVersion?: number;
      }
    >({
      query: ({ scheme, amountPaise, redirectUrl, targetCycle, positionVersion }) => {
        const redirect =
          redirectUrl ??
          (typeof window !== "undefined"
            ? `${window.location.origin}${window.location.pathname.replace(/\/schemes\/[^/]+$/, "")}/pay/status`
            : undefined);
        const shared = { amountPaise, ...(redirect ? { redirectUrl: redirect } : {}) };
        const cycle = targetCycle ?? scheme.payableRange?.targetCycle;
        const pos = positionVersion ?? scheme.payableRange?.positionVersion ?? scheme.positionVersion ?? 0;
        return scheme.displayMode === "FIXED"
          ? { url: `/app/schemes/${scheme.id}/pay`, method: "POST", body: shared }
          : {
              url: `/app/schemes/${scheme.id}/payment-intents`,
              method: "POST",
              body: {
                ...shared,
                ...(cycle ? { targetCycle: cycle } : {}),
                expectedPositionVersion: pos,
              },
            };
      },
    }),
    getCustomerPayments: builder.query<PaymentListItem[], void>({
      query: () => ({ url: "/app/payments", params: { limit: 100 } }),
      transformResponse: (raw: unknown) => adaptCustomerPaymentList(raw),
      providesTags: ["CustomerPayment"],
    }),
    getCustomerPayment: builder.query<PaymentListItem, string>({
      query: (id) => `/app/payments/${id}`,
      transformResponse: (raw: unknown) => adaptCustomerPayment(raw),
      providesTags: (_r, _e, id) => [{ type: "CustomerPayment", id }],
    }),
    getCustomerNotifications: builder.query<{ items: CustomerNotification[]; unreadCount: number }, void>({ query: () => "/app/notifications", providesTags: ["CustomerNotification"] }),
    markCustomerNotificationRead: builder.mutation<{ read: boolean }, string>({ query: (id) => ({ url: `/app/notifications/${id}/read`, method: "POST" }), invalidatesTags: ["CustomerNotification"] }),
    markAllCustomerNotificationsRead: builder.mutation<{ unreadCount: number }, void>({ query: () => ({ url: "/app/notifications/read-all", method: "POST" }), invalidatesTags: ["CustomerNotification"] }),
    getCustomerGrievances: builder.query<CustomerGrievance[], void>({ query: () => "/app/grievances", providesTags: ["CustomerGrievance"] }),
    getCustomerGrievance: builder.query<CustomerGrievance, string>({ query: (id) => `/app/grievances/${id}`, providesTags: (_r, _e, id) => [{ type: "CustomerGrievance", id }] }),
    createCustomerGrievance: builder.mutation<CustomerGrievance, { category: string; subject: string; description: string }>({ query: (body) => ({ url: "/app/grievances", method: "POST", body }), invalidatesTags: ["CustomerGrievance"] }),
    replyCustomerGrievance: builder.mutation<Record<string, unknown>, { id: string; body: string; expectedVersion: number }>({ query: ({ id, ...body }) => ({ url: `/app/grievances/${id}/messages`, method: "POST", body }), invalidatesTags: (_r, _e, arg) => [{ type: "CustomerGrievance", id: arg.id }] }),
    getCustomerDevices: builder.query<Array<{ deviceId: string; platform: string; deviceModel: string; lastUsedAt: string; current: boolean }>, void>({ query: () => "/app/auth/devices", providesTags: ["CustomerDevice"] }),
    revokeCustomerDevice: builder.mutation<void, string>({ query: (id) => ({ url: `/app/auth/devices/${id}`, method: "DELETE" }), invalidatesTags: ["CustomerDevice"] }),
    getCustomerGoldRate: builder.query<CustomerHome["goldRate"], void>({ query: () => "/app/gold-rate/current" }),
    getCustomerGoldHistory: builder.query<Array<CustomerHome["goldRate"]>, void>({ query: () => "/app/gold-rate/history" }),
    getCustomerBranches: builder.query<Array<CustomerProfile["branch"]>, void>({ query: () => "/app/branches" }),
    requestCustomerRedemption: builder.mutation<Record<string, unknown>, { schemeId: string; preferredMode: string; preferredDate?: string; remarks?: string; expectedVersion: number }>({ query: ({ schemeId, ...body }) => ({ url: `/app/schemes/${schemeId}/redemption-request`, method: "POST", body }), invalidatesTags: ["CustomerScheme"] }),
  }),
});

export const {
  useResolveTenantQuery, useRequestCustomerOtpMutation, useVerifyCustomerOtpMutation,
  useGetCustomerHomeQuery, useGetCustomerProfileQuery, useUpdateCustomerProfileMutation,
  useCompleteCustomerProfileMutation, usePresignCustomerUploadMutation, useSubmitCustomerKycMutation,
  useUpdateCustomerNomineeMutation, useRemoveCustomerNomineeMutation,
  useGetCustomerPlansQuery, useGetCustomerPlanQuery, useGetCustomerSchemesQuery, useGetCustomerPastSchemesQuery, useGetCustomerSchemeQuery, useGetCustomerPayableRangeQuery, useLazyGetCustomerPayableRangeQuery,
  useEnrolCustomerSchemeMutation, useInitiateCustomerPaymentMutation, useInitiatePublicPaymentLinkMutation,
  useGetCustomerPaymentsQuery, useGetCustomerPaymentQuery,
  useGetCustomerNotificationsQuery, useMarkCustomerNotificationReadMutation, useMarkAllCustomerNotificationsReadMutation,
  useGetCustomerGrievancesQuery, useGetCustomerGrievanceQuery, useCreateCustomerGrievanceMutation,
  useReplyCustomerGrievanceMutation, useGetCustomerDevicesQuery, useRevokeCustomerDeviceMutation,
  useGetCustomerGoldRateQuery, useGetCustomerGoldHistoryQuery, useGetCustomerBranchesQuery,
  useRequestCustomerRedemptionMutation,
} = customerApi;
