import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  FetchBaseQueryMeta,
} from "@reduxjs/toolkit/query";
import { rtkDataResult, rtkErrorResult } from "@/src/lib/rtk-query-result";
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
  CustomerPassbook,
  CustomerProfile,
  CustomerSchemeDetail,
  CustomerSettlementPreview,
  PayableRange,
  PaymentListItem,
  SchemeCard,
  SchemePlan,
  TenantBranding,
} from "@/src/types/customer";
import {
  handleCustomerUnauthorized,
  isUnauthorizedFetchError,
} from "@/src/lib/auth-logout";
import {
  TOKEN_KEYS,
} from "@/src/lib/auth-token-storage";
import {
  authRefreshGuard,
  refreshAfterUnauthorized,
  retryAuthorizedRequest,
  shouldAttemptAuthRefresh,
  shouldForceAuthLogout,
} from "@/src/lib/auth-base-query-refresh";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { buildCustomerEnrolMockResponse } from "@/src/lib/customer-enrol-mock";
import { ensureMutationJsonBody } from "@/src/lib/rtk-mutation-body";
import type { AppDispatch } from "@/src/store";
import { adaptCustomerSchemePlan, adaptCustomerSchemePlanList } from "@/src/lib/customer-plan-adapter";
import {
  adaptCustomerPayment,
  adaptCustomerPaymentList,
  adaptCustomerSchemeDetail,
  adaptCustomerSettlementPreview,
} from "@/src/lib/customer-payment-adapter";
import {
  adaptCustomerGrievance,
  adaptCustomerGrievanceList,
} from "@/src/lib/customer-grievance-adapter";
import {
  adaptCustomerPaymentPoll,
  type CustomerPaymentPollResult,
} from "@/src/lib/customer-payment-poll";
import { readCustomerPaymentSession } from "@/src/lib/customer-payment-session";
import { normalizeCustomerTenantResolve } from "@/src/lib/customer-tenant-branding";

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
  return ensureMutationJsonBody({ ...args, headers });
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
      tenantCapabilities: {
        customerSelfEnrol: true,
        customerSelfRegistration: true,
        kycMandatory: false,
        multiScheme: true,
        customerLoginMode: "OTP_ONLY",
        customerAppWriteEnabled: true,
        customerAppPaymentsEnabled: true,
      },
      accessToken: "mock-customer-access",
      refreshToken: "mock-customer-refresh",
      expiresIn: 1800,
      tokenType: "Bearer",
    });
  }
  if (url === "/public/auth/login-password" && method === "POST") {
    return ok({
      isNewCustomer: false,
      profileComplete: true,
      customer: customerProfile,
      tenant: customerTenant,
      tenantCapabilities: {
        customerSelfEnrol: true,
        customerSelfRegistration: false,
        kycMandatory: false,
        multiScheme: true,
        customerLoginMode: "PASSWORD_ONLY",
        customerAppWriteEnabled: true,
        customerAppPaymentsEnabled: true,
      },
      accessToken: "mock-customer-access-password",
      refreshToken: "mock-customer-refresh-password",
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
  const appUploadComplete = url.match(/^\/app\/uploads\/([^/]+)\/complete$/);
  if (appUploadComplete && method === "POST") {
    return ok({
      uploadId: appUploadComplete[1],
      status: "UPLOADED",
      viewUrl: `/uploads/${appUploadComplete[1]}`,
    });
  }
  const appUploadGet = url.match(/^\/app\/uploads\/([^/]+)$/);
  if (appUploadGet && method === "GET") {
    return ok({
      uploadId: appUploadGet[1],
      status: "UPLOADED",
      fileName: "document.jpg",
      contentType: "image/jpeg",
      downloadUrl: "https://picsum.photos/seed/swarnagrow-upload/1200/800",
    });
  }
  const publicUploadGet = url.match(/^\/public\/uploads\/([^/]+)$/);
  if (publicUploadGet && method === "GET") {
    return ok({
      uploadId: publicUploadGet[1],
      status: "UPLOADED",
      fileName: "logo.png",
      contentType: "image/png",
      downloadUrl: "https://picsum.photos/seed/swarnagrow-logo/480/480",
    });
  }
  if (url === "/app/scheme-plans") return ok(schemePlans);
  if (url.startsWith("/app/scheme-plans/")) return ok(schemePlans.find((p) => p.id === url.split("/").pop()) ?? schemePlans[0]);
  if (url === "/app/schemes") {
    const group = typeof args !== "string" ? (args as FetchArgs).params?.group : undefined;
    if (group === "PAST") {
      return ok([
        {
          id: "sch_past_2",
          schemeNumber: "SG-230015",
          planName: "Golden Eleven",
          closureType: "REDEEMED",
          closedAt: "2026-05-18T00:00:00Z",
          finalValue: money(6184000),
          benefitReceived: money(684000),
          passbookAvailable: true,
        },
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
  if (url.includes("/settlement-preview")) {
    const schemeId = url.split("/")[3];
    const scheme =
      customerSchemes.find((s) => s.id === schemeId) ?? customerSchemes[0];
    const totalPaid = scheme?.passbookSummary?.totalPaid?.amountPaise ?? 2_400_000;
    const settlement = totalPaid + 120_000;
    return ok({
      eligible: scheme?.redemption?.eligible ?? false,
      blockers: scheme?.redemption?.eligible
        ? []
        : [
            {
              code: "SCHEME_NOT_MATURED",
              message:
                scheme?.redemption?.blocker ??
                "This scheme is not eligible for redemption yet.",
            },
          ],
      computation: {
        lines: [
          {
            key: "TOTAL_PAID",
            label: "Total paid",
            amount: money(totalPaid),
            sign: "+",
          },
          {
            key: "BENEFIT",
            label: "Plan benefit",
            amount: money(120_000),
            sign: "+",
          },
          {
            key: "PENALTY",
            label: "Penalty",
            amount: money(0),
            sign: "-",
          },
        ],
        finalValue: money(settlement),
        goldWeight: null,
      },
      allowedModes: (scheme?.redemption?.preferredModes ?? ["CASH"]).map((entry) => {
        const mode = typeof entry === "string" ? entry : entry.mode;
        const label =
          typeof entry === "string"
            ? entry.replaceAll("_", " ").toLowerCase()
            : entry.label;
        return { mode, label, available: true };
      }),
      settlementPaise: settlement,
      principalPaise: totalPaid,
      benefitPaise: 120_000,
      penaltyPaise: 0,
    });
  }
  if (url === "/app/schemes/enrol" && method === "POST") {
    const plan = schemePlans.find((p) => p.id === body?.planId) ?? schemePlans[0];
    const installmentAmountPaise =
      typeof body?.installmentAmountPaise === "number"
        ? body.installmentAmountPaise
        : undefined;
    const payNow = typeof body?.payNow === "boolean" ? body.payNow : undefined;
    return ok(buildCustomerEnrolMockResponse(plan, { installmentAmountPaise, payNow }));
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
  const publicPayStatus = url.match(/^\/public\/pay\/([^/]+)\/status$/);
  if (publicPayStatus && method === "GET") {
    const session = readCustomerPaymentSession();
    const elapsed = session ? Date.now() - session.startedAt : 5000;
    const paid = elapsed >= 2500;
    return ok({
      status: paid ? "PAID" : "PROCESSING",
      processing: !paid,
      paid,
      failed: false,
      retryAfterSeconds: paid ? null : 2,
      receipt: paid
        ? {
            paymentId: "pay_mock",
            receiptNumber: "RCP-MOCK-001",
            paidAt: new Date().toISOString(),
          }
        : null,
    });
  }
  const intentPoll = url.match(/^\/app\/payment-intents\/([^/]+)$/);
  if (intentPoll && method === "GET") {
    const session = readCustomerPaymentSession();
    const elapsed = session ? Date.now() - session.startedAt : 5000;
    const paid = elapsed >= 2500;
    return ok({
      id: intentPoll[1],
      status: paid ? "PAID" : "PROCESSING",
      processing: !paid,
      paid,
      failed: false,
      retryAfterSeconds: paid ? null : 2,
      receipt: paid
        ? {
            paymentId: "pay_mock",
            receiptNumber: "RCP-MOCK-001",
            paidAt: new Date().toISOString(),
          }
        : null,
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
  if (url === "/app/auth/logout" && method === "POST") {
    return ok({ loggedOut: true });
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
      const token = localStorage.getItem(TOKEN_KEYS.customer.access);
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }
    headers.set("Accept", "application/json");
    if (env.apiBaseUrl && !env.useMocks) {
      headers.set("X-Swarna-Client-Api-Base", env.apiBaseUrl);
    }
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
    if (envelope.success) {
      return rtkDataResult(envelope.data, result.meta);
    }
    return rtkErrorResult({
      status: "CUSTOM_ERROR",
      error: envelope.error?.message ?? "Request failed",
      data: envelope.error,
    });
  }
  if (result.error) {
    return rtkErrorResult(result.error, result.meta);
  }
  return rtkDataResult(result.data, result.meta);
}

const dynamicBaseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError,
  CustomerBaseQueryExtra,
  FetchBaseQueryMeta
> = async (args, api, extra) => {
  const requestArgs = env.useMocks ? args : withIdempotencyHeader(args);
  const url = routeOf(requestArgs);
  const guard = authRefreshGuard(url, extra, [
    "/app/auth/refresh",
    "/public/",
  ]);
  const dispatch = api.dispatch as AppDispatch;

  let result = env.useMocks
    ? await mockBaseQuery(requestArgs, api, extra)
    : await liveBaseQuery(requestArgs, api, extra);

  if (shouldAttemptAuthRefresh(result.error, guard, env.useMocks)) {
    const refreshed = await refreshAfterUnauthorized("customer", guard);
    if (refreshed) {
      result = await retryAuthorizedRequest(
        liveBaseQuery,
        requestArgs,
        api,
        extra,
      );
    } else if (shouldForceAuthLogout("customer", true)) {
      handleCustomerUnauthorized(dispatch);
    }
  } else if (
    !env.useMocks &&
    isUnauthorizedFetchError(result.error) &&
    !guard.skipRefresh &&
    shouldForceAuthLogout("customer", false)
  ) {
    handleCustomerUnauthorized(dispatch);
  }

  return unwrapCustomerEnvelope(result);
};

export const customerApi = createApi({
  reducerPath: "customerApi",
  baseQuery: dynamicBaseQuery,
  tagTypes: ["CustomerHome", "CustomerScheme", "CustomerPayment", "CustomerProfile", "CustomerNotification", "CustomerGrievance", "CustomerDevice", "ShopCart", "ShopAddresses"],
  endpoints: (builder) => ({
    resolveTenant: builder.query<
      { tenants: TenantBranding[]; resolvedBy?: string; tenantCode?: string | null },
      { tenantCode?: string; mobile?: string }
    >({
      query: (params) => ({ url: "/public/tenants/resolve", params }),
      transformResponse: (raw) =>
        normalizeCustomerTenantResolve(raw as Parameters<typeof normalizeCustomerTenantResolve>[0]),
    }),
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
        tenantCapabilities?: {
          kycMandatory?: boolean;
          customerSelfRegistration?: boolean;
          customerSelfEnrol?: boolean;
          multiScheme?: boolean;
          customerLoginMode?: "OTP_ONLY" | "PASSWORD_ONLY";
          customerAppWriteEnabled?: boolean;
          customerAppPaymentsEnabled?: boolean;
        };
      },
      Record<string, unknown>
    >({ query: (body) => ({ url: "/public/auth/otp/verify", method: "POST", body }) }),
    loginCustomerPassword: builder.mutation<
      {
        customer: CustomerProfile;
        tenant: typeof customerTenant;
        accessToken: string;
        refreshToken: string;
        profileComplete?: boolean;
        tenantCapabilities?: {
          kycMandatory?: boolean;
          customerSelfRegistration?: boolean;
          customerSelfEnrol?: boolean;
          multiScheme?: boolean;
          customerLoginMode?: "OTP_ONLY" | "PASSWORD_ONLY";
          customerAppWriteEnabled?: boolean;
          customerAppPaymentsEnabled?: boolean;
        };
      },
      { tenantCode: string; mobile: string; password: string; deviceId?: string }
    >({
      query: (body) => ({
        url: "/public/auth/login-password",
        method: "POST",
        body,
      }),
    }),
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
      { name: string; email?: string; address?: string }
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
    completeCustomerUpload: builder.mutation<
      { uploadId: string; status: string; viewUrl?: string },
      string
    >({
      query: (uploadId) => ({
        url: `/app/uploads/${uploadId}/complete`,
        method: "POST",
      }),
    }),
    getCustomerUploadDownload: builder.query<
      { uploadId: string; status: string; fileName?: string | null; contentType?: string | null; downloadUrl: string },
      string
    >({
      query: (uploadId) => `/app/uploads/${uploadId}`,
    }),
    getPublicCustomerUploadDownload: builder.query<
      { uploadId: string; status: string; fileName?: string | null; contentType?: string | null; downloadUrl: string },
      string
    >({
      query: (uploadId) => `/public/uploads/${uploadId}`,
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
    getCustomerPassbook: builder.query<CustomerPassbook, string>({
      query: (id) => `/app/schemes/${id}/passbook`,
      providesTags: (_r, _e, id) => [{ type: "CustomerScheme", id: `passbook-${id}` }],
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
    getCustomerSettlementPreview: builder.query<
      CustomerSettlementPreview,
      { schemeId: string; mode: string; type?: "MATURITY_REDEMPTION" | "PREMATURE_CLOSURE" }
    >({
      query: ({ schemeId, mode, type = "MATURITY_REDEMPTION" }) => ({
        url: `/app/schemes/${schemeId}/settlement-preview`,
        params: { mode, type },
      }),
      transformResponse: (raw: unknown) => adaptCustomerSettlementPreview(raw),
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
    pollCustomerPaymentIntent: builder.query<CustomerPaymentPollResult, string>({
      query: (intentId) => `/app/payment-intents/${encodeURIComponent(intentId)}`,
      transformResponse: (raw: unknown) => adaptCustomerPaymentPoll(raw),
    }),
    pollPublicPaymentLink: builder.query<CustomerPaymentPollResult, string>({
      query: (linkToken) => `/public/pay/${encodeURIComponent(linkToken)}/status`,
      transformResponse: (raw: unknown) => adaptCustomerPaymentPoll(raw),
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
      queryFn: async (_arg, _api, _extra, baseQuery) => {
        const rows: PaymentListItem[] = [];
        const seenCursors = new Set<string>();
        let cursor: string | undefined;
        for (let page = 0; page < 100; page += 1) {
          const result = await baseQuery({ url: "/app/payments", params: { limit: 100, ...(cursor ? { cursor } : {}) } });
          if (result.error) return { error: result.error };
          rows.push(...adaptCustomerPaymentList(result.data));
          const meta = result.meta as ApiEnvelope<unknown>["meta"] | undefined;
          const next = meta?.hasMore && meta.nextCursor ? meta.nextCursor : undefined;
          if (!next || seenCursors.has(next)) break;
          seenCursors.add(next);
          cursor = next;
        }
        return { data: rows };
      },
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
    getCustomerGrievances: builder.query<CustomerGrievance[], void>({
      query: () => "/app/grievances",
      transformResponse: (raw: unknown) => adaptCustomerGrievanceList(raw),
      providesTags: ["CustomerGrievance"],
    }),
    getCustomerGrievance: builder.query<CustomerGrievance, string>({
      query: (id) => `/app/grievances/${id}`,
      transformResponse: (raw: unknown) => adaptCustomerGrievance(raw),
      providesTags: (_r, _e, id) => [{ type: "CustomerGrievance", id }],
    }),
    createCustomerGrievance: builder.mutation<
      CustomerGrievance,
      {
        category: string;
        subject: string;
        description: string;
        relatedEntity?: { type: "ORDER" | "PAYMENT" | "SCHEME" | "REDEMPTION"; id: string };
      }
    >({
      query: (body) => ({ url: "/app/grievances", method: "POST", body }),
      transformResponse: (raw: unknown) => adaptCustomerGrievance(raw),
      invalidatesTags: ["CustomerGrievance"],
    }),
    replyCustomerGrievance: builder.mutation<
      Record<string, unknown>,
      { id: string; body: string; expectedVersion: number }
    >({
      query: ({ id, ...body }) => ({
        url: `/app/grievances/${id}/messages`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "CustomerGrievance", id: arg.id },
      ],
    }),
    getCustomerDevices: builder.query<Array<{ deviceId: string; platform: string; deviceModel: string; lastUsedAt: string; current: boolean }>, void>({ query: () => "/app/auth/devices", providesTags: ["CustomerDevice"] }),
    revokeCustomerDevice: builder.mutation<void, string>({ query: (id) => ({ url: `/app/auth/devices/${id}`, method: "DELETE" }), invalidatesTags: ["CustomerDevice"] }),
    customerLogout: builder.mutation<
      { loggedOut: boolean },
      { refreshToken?: string } | void
    >({
      query: (body) => ({
        url: "/app/auth/logout",
        method: "POST",
        body: body?.refreshToken ? { refreshToken: body.refreshToken } : {},
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "success" in raw) {
          return (raw as ApiEnvelope<{ loggedOut: boolean }>).data;
        }
        return raw as { loggedOut: boolean };
      },
    }),
    getCustomerGoldRate: builder.query<CustomerHome["goldRate"], void>({ query: () => "/app/gold-rate/current" }),
    getCustomerGoldHistory: builder.query<Array<CustomerHome["goldRate"]>, void>({ query: () => "/app/gold-rate/history" }),
    getCustomerBranches: builder.query<Array<CustomerProfile["branch"]>, void>({ query: () => "/app/branches" }),
    requestCustomerRedemption: builder.mutation<Record<string, unknown>, { schemeId: string; preferredMode: string; preferredDate?: string; remarks?: string; expectedVersion: number; modeDetails?: { billNumber?: string } }>({ query: ({ schemeId, ...body }) => ({ url: `/app/schemes/${schemeId}/redemption-request`, method: "POST", body }), invalidatesTags: ["CustomerScheme"] }),
    registerCustomerFcmToken: builder.mutation<
      { registered: boolean; deviceId: string },
      { fcmToken: string; deviceId: string; platform: "android" | "ios" }
    >({
      query: (body) => ({ url: "/app/devices/fcm-token", method: "POST", body }),
    }),
    getShopAvailability: builder.query<
      { available: boolean; ecommerce?: Record<string, unknown> },
      void
    >({
      query: () => ({ url: "/app/shop/availability", mockKey: "shopAvailability" }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: { available: boolean } }).data;
        }
        return raw as { available: boolean };
      },
    }),
    getShopCategories: builder.query<
      { items: Record<string, unknown>[] },
      void
    >({
      query: () => ({ url: "/app/shop/categories", mockKey: "shopCategories" }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          const data = (raw as { data: { items?: Record<string, unknown>[] } }).data;
          return { items: data?.items ?? [] };
        }
        return { items: (raw as { items?: Record<string, unknown>[] })?.items ?? [] };
      },
    }),
    getShopStorePolicies: builder.query<
      { published: boolean; policies: Record<string, unknown> | null },
      void
    >({
      query: () => ({ url: "/app/shop/store-policies", mockKey: "shopStorePolicies" }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: { published: boolean; policies: Record<string, unknown> | null } }).data;
        }
        return raw as { published: boolean; policies: Record<string, unknown> | null };
      },
    }),
    getShopProducts: builder.query<
      { items: Record<string, any>[]; meta?: Record<string, unknown> },
      { categoryId?: string; cursor?: string; limit?: number; q?: string; sort?: "newest" | "name"; featured?: boolean } | void
    >({
      query: (params) => ({
        url: "/app/shop/products",
        params: params ?? {},
        mockKey: "shopProducts",
        mockParams: params ?? {},
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          const data = raw as {
            data: { items?: Record<string, unknown>[]; meta?: Record<string, unknown> };
          };
          return { items: data.data?.items ?? [], meta: data.data?.meta };
        }
        const direct = raw as {
          items?: Record<string, unknown>[];
          meta?: Record<string, unknown>;
        };
        return { items: direct?.items ?? [], meta: direct?.meta };
      },
    }),
    getShopProduct: builder.query<Record<string, any>, string>({
      query: (slug) => ({
        url: `/app/shop/products/${encodeURIComponent(slug)}`,
        mockKey: "shopProduct",
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
    }),
    getShopCart: builder.query<Record<string, any>, void>({
      query: () => ({ url: "/app/shop/cart", mockKey: "shopCart" }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
      providesTags: ["ShopCart"],
    }),
    putShopCart: builder.mutation<
      Record<string, any>,
      { lines: { productId: string; quantity: number }[]; expectedVersion?: number }
    >({
      query: (body) => ({
        url: "/app/shop/cart",
        method: "PUT",
        body,
        mockKey: "putShopCart",
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
      invalidatesTags: ["ShopCart"],
    }),
    getShopFulfilmentOptions: builder.query<Record<string, any>, void>({
      query: () => ({ url: "/app/shop/fulfilment-options", mockKey: "shopFulfilment" }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
    }),
    getShopAddresses: builder.query<{ items: Record<string, unknown>[] }, void>({
      query: () => ({ url: "/app/shop/addresses", mockKey: "shopAddresses" }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: { items: Record<string, unknown>[] } }).data;
        }
        return raw as { items: Record<string, unknown>[] };
      },
      providesTags: ["ShopAddresses"],
    }),
    createShopAddress: builder.mutation<
      Record<string, unknown>,
      {
        line1: string;
        city: string;
        state: string;
        pincode: string;
        line2?: string;
        label?: string;
        recipientName?: string;
        mobile?: string;
        isDefault?: boolean;
        idempotencyKey: string;
      }
    >({
      query: ({ idempotencyKey, ...body }) => ({
        url: "/app/shop/addresses",
        method: "POST",
        body,
        headers: { "X-Idempotency-Key": idempotencyKey },
        mockKey: "createShopAddress",
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
      invalidatesTags: ["ShopAddresses"],
    }),
    createShopQuote: builder.mutation<
      Record<string, any>,
      {
        fulfilmentMode: string;
        pickupBranchId?: string;
        addressId?: string;
        pincode?: string;
        paymentMethod?: "ONLINE" | "COD";
        idempotencyKey: string;
      }
    >({
      query: ({ idempotencyKey, ...body }) => ({
        url: "/app/shop/quotes",
        method: "POST",
        body,
        headers: { "X-Idempotency-Key": idempotencyKey },
        mockKey: "createShopQuote",
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
    }),
    getShopQuote: builder.query<Record<string, any>, string>({
      query: (quoteId) => ({
        url: `/app/shop/quotes/${encodeURIComponent(quoteId)}`,
        mockKey: "shopQuote",
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
    }),
    cancelShopQuote: builder.mutation<Record<string, any>, { quoteId: string; idempotencyKey: string }>({
      query: ({ quoteId, idempotencyKey }) => ({
        url: `/app/shop/quotes/${encodeURIComponent(quoteId)}/cancel`,
        method: "POST",
        headers: { "X-Idempotency-Key": idempotencyKey },
        mockKey: "cancelShopQuote",
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
    }),
    createShopOrder: builder.mutation<
      Record<string, unknown>,
      { quoteId: string; idempotencyKey: string }
    >({
      query: ({ quoteId, idempotencyKey }) => ({
        url: "/app/shop/orders",
        method: "POST",
        body: { quoteId },
        headers: { "X-Idempotency-Key": idempotencyKey },
        mockKey: "createShopOrder",
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
    }),
    listShopOrders: builder.query<
      { items: Record<string, unknown>[]; page?: { nextCursor?: string | null } },
      { cursor?: string; limit?: number } | void
    >({
      query: (params) => ({
        url: "/app/shop/orders",
        params: params ?? {},
        mockKey: "shopOrders",
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          const envelope = raw as {
            data: Record<string, unknown>[] | { items?: Record<string, unknown>[] };
            meta?: { nextCursor?: string | null };
          };
          const data = envelope.data;
          const items = Array.isArray(data)
            ? data
            : Array.isArray((data as { items?: unknown[] })?.items)
              ? ((data as { items: Record<string, unknown>[] }).items ?? [])
              : [];
          return {
            items,
            page: { nextCursor: envelope.meta?.nextCursor ?? null },
          };
        }
        const legacy = raw as { items?: Record<string, unknown>[]; page?: { nextCursor?: string | null } };
        return {
          items: legacy.items ?? [],
          page: legacy.page ?? { nextCursor: null },
        };
      },
      serializeQueryArgs: ({ endpointName }) => endpointName,
      merge: (current, incoming, { arg }) => {
        if (!arg?.cursor) return incoming;
        return {
          items: [...(current?.items ?? []), ...(incoming.items ?? [])],
          page: incoming.page,
        };
      },
      forceRefetch: ({ currentArg, previousArg }) =>
        currentArg?.cursor !== previousArg?.cursor,
    }),
    getShopOrder: builder.query<Record<string, unknown>, string>({
      query: (orderId) => ({
        url: `/app/shop/orders/${encodeURIComponent(orderId)}`,
        mockKey: "shopOrder",
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
      providesTags: (_res, _err, orderId) => [{ type: "ShopCart", id: `order-${orderId}` }],
    }),
    createShopOrderPaymentIntent: builder.mutation<
      { paymentIntent: Record<string, unknown> },
      { orderId: string; idempotencyKey: string; redirectUrl: string }
    >({
      query: ({ orderId, idempotencyKey, redirectUrl }) => ({
        url: `/app/shop/orders/${encodeURIComponent(orderId)}/payment-intents`,
        method: "POST",
        body: { redirectUrl },
        headers: { "X-Idempotency-Key": idempotencyKey },
        mockKey: "createShopOrderPaymentIntent",
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: { paymentIntent: Record<string, unknown> } }).data;
        }
        return raw as { paymentIntent: Record<string, unknown> };
      },
    }),
    pollShopOrderPaymentIntent: builder.query<
      { paymentIntent: Record<string, unknown> },
      { orderId: string; paymentAttemptId: string }
    >({
      query: ({ orderId, paymentAttemptId }) => ({
        url: `/app/shop/orders/${encodeURIComponent(orderId)}/payment-intents/${encodeURIComponent(paymentAttemptId)}`,
        mockKey: "pollShopOrderPaymentIntent",
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: { paymentIntent: Record<string, unknown> } }).data;
        }
        return raw as { paymentIntent: Record<string, unknown> };
      },
    }),
    cancelShopOrder: builder.mutation<Record<string, unknown>, { orderId: string; reason?: string }>({
      query: ({ orderId, reason }) => ({
        url: `/app/shop/orders/${encodeURIComponent(orderId)}/cancel`,
        method: "POST",
        body: reason ? { reason } : {},
        mockKey: "cancelShopOrder",
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
      invalidatesTags: (_r, _e, { orderId }) => [
        "ShopCart",
        { type: "ShopCart", id: `order-${orderId}` },
      ],
    }),
    getShopOrderReturn: builder.query<{ request: Record<string, unknown> | null }, string>({
      query: (orderId) => ({
        url: `/app/shop/orders/${encodeURIComponent(orderId)}/return`,
        mockKey: "shopOrderReturn",
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: { request: Record<string, unknown> | null } }).data;
        }
        return raw as { request: Record<string, unknown> | null };
      },
      providesTags: (_r, _e, orderId) => [{ type: "ShopCart", id: `return-${orderId}` }],
    }),
    createShopReturnRequest: builder.mutation<
      { request: Record<string, unknown>; created: boolean },
      { orderId: string; reason: string; idempotencyKey: string; kind?: "RETURN" | "EXCHANGE"; evidenceNote?: string }
    >({
      query: ({ orderId, idempotencyKey, ...body }) => ({
        url: `/app/shop/orders/${encodeURIComponent(orderId)}/return-requests`,
        method: "POST",
        body,
        headers: { "X-Idempotency-Key": idempotencyKey },
        mockKey: "createShopReturnRequest",
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: { request: Record<string, unknown>; created: boolean } }).data;
        }
        return raw as { request: Record<string, unknown>; created: boolean };
      },
      invalidatesTags: (_r, _e, { orderId }) => [
        { type: "ShopCart", id: `return-${orderId}` },
        { type: "ShopCart", id: `order-${orderId}` },
      ],
    }),
    createShopCancellationRequest: builder.mutation<
      { request: Record<string, unknown>; created: boolean },
      { orderId: string; reason: string; idempotencyKey: string }
    >({
      query: ({ orderId, reason, idempotencyKey }) => ({
        url: `/app/shop/orders/${encodeURIComponent(orderId)}/cancellation-requests`,
        method: "POST",
        body: { reason },
        headers: { "X-Idempotency-Key": idempotencyKey },
        mockKey: "createShopCancellationRequest",
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: { request: Record<string, unknown>; created: boolean } }).data;
        }
        return raw as { request: Record<string, unknown>; created: boolean };
      },
      invalidatesTags: (_r, _e, { orderId }) => [
        "ShopCart",
        { type: "ShopCart", id: `order-${orderId}` },
      ],
    }),
    completeShopTestHarnessPayment: builder.mutation<
      Record<string, unknown>,
      { orderId: string; idempotencyKey: string; outcome?: "COMPLETED" | "FAILED"; paymentAttemptId?: string }
    >({
      query: ({ orderId, idempotencyKey, outcome, paymentAttemptId }) => ({
        url: `/app/shop/orders/${encodeURIComponent(orderId)}/test-harness/complete-payment`,
        method: "POST",
        body: {
          ...(outcome ? { outcome } : {}),
          ...(paymentAttemptId ? { paymentAttemptId } : {}),
        },
        headers: { "X-Idempotency-Key": idempotencyKey },
        mockKey: "completeShopTestHarnessPayment",
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
    }),
  }),
});

export const {
  useResolveTenantQuery, useRequestCustomerOtpMutation, useVerifyCustomerOtpMutation, useLoginCustomerPasswordMutation,
  useGetCustomerHomeQuery, useGetCustomerProfileQuery, useUpdateCustomerProfileMutation,
  useCompleteCustomerProfileMutation, usePresignCustomerUploadMutation, useCompleteCustomerUploadMutation, useGetCustomerUploadDownloadQuery, useLazyGetCustomerUploadDownloadQuery, useGetPublicCustomerUploadDownloadQuery, useSubmitCustomerKycMutation,
  useUpdateCustomerNomineeMutation, useRemoveCustomerNomineeMutation,
  useGetCustomerPlansQuery, useGetCustomerPlanQuery, useGetCustomerSchemesQuery, useGetCustomerPastSchemesQuery, useGetCustomerSchemeQuery, useGetCustomerPassbookQuery, useGetCustomerPayableRangeQuery, useLazyGetCustomerPayableRangeQuery, useGetCustomerSettlementPreviewQuery,
  useEnrolCustomerSchemeMutation, useInitiateCustomerPaymentMutation, useInitiatePublicPaymentLinkMutation,
  useLazyPollCustomerPaymentIntentQuery, useLazyPollPublicPaymentLinkQuery,
  useGetCustomerPaymentsQuery, useGetCustomerPaymentQuery,
  useGetCustomerNotificationsQuery, useMarkCustomerNotificationReadMutation, useMarkAllCustomerNotificationsReadMutation,
  useGetCustomerGrievancesQuery, useGetCustomerGrievanceQuery, useCreateCustomerGrievanceMutation,
  useReplyCustomerGrievanceMutation, useGetCustomerDevicesQuery, useRevokeCustomerDeviceMutation,
  useCustomerLogoutMutation,
  useGetShopCategoriesQuery,
  useGetCustomerGoldRateQuery, useGetCustomerGoldHistoryQuery, useGetCustomerBranchesQuery,
  useRequestCustomerRedemptionMutation,
  useRegisterCustomerFcmTokenMutation,
  useGetShopAvailabilityQuery,
  useGetShopStorePoliciesQuery,
  useGetShopProductsQuery,
  useLazyGetShopProductsQuery,
  useGetShopProductQuery,
  useGetShopCartQuery,
  usePutShopCartMutation,
  useGetShopFulfilmentOptionsQuery,
  useGetShopAddressesQuery,
  useCreateShopAddressMutation,
  useCreateShopQuoteMutation,
  useGetShopQuoteQuery,
  useCancelShopQuoteMutation,
  useCreateShopOrderMutation,
  useListShopOrdersQuery,
  useGetShopOrderQuery,
  useCreateShopOrderPaymentIntentMutation,
  useLazyPollShopOrderPaymentIntentQuery,
  useCompleteShopTestHarnessPaymentMutation,
  useCancelShopOrderMutation,
  useCreateShopCancellationRequestMutation,
  useGetShopOrderReturnQuery,
  useCreateShopReturnRequestMutation,
} = customerApi;
