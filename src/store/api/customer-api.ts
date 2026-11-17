import type { CollectionFrequency } from "@/src/types/collection";
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
import { customerCommerceMock } from "@/src/mocks/customer-commerce-mocks";
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
import { customerIdentityConfirmed } from "@/src/store/slices/customer-session-slice";
import { adaptCustomerSchemePlan, adaptCustomerSchemePlanList, adaptCustomerCollectionPreview } from "@/src/lib/customer-plan-adapter";
import {
  adaptCustomerPayment,
  adaptCustomerPaymentList,
  adaptCustomerSchemeDetail,
  adaptCustomerSettlementPreview,
  normalizeCustomerSchemeList,
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
import { readCustomerDataEpoch, readCustomerSessionGeneration } from "@/src/lib/customer-identity";
import type { RootState } from "@/src/store";
import { normalizeCustomerTenantResolve } from "@/src/lib/customer-tenant-branding";
import { normalizeShopOrdersListResponse } from "@/src/lib/customer-shop-orders-list";
import {
  normalizeCustomerActivityPage,
  type CustomerActivityListPage,
} from "@/src/lib/customer-recent-activity";

type ApiEnvelope<T> = { success: true; data: T; meta?: { nextCursor: string | null; hasMore: boolean; limit: number; total: number } };

const sleep = () => new Promise((resolve) => setTimeout(resolve, Math.min(Math.max(env.mockDelayMs, 100), 900)));

function ok<T>(data: T): { data: ApiEnvelope<T> } {
  return { data: { success: true, data } };
}

function routeOf(args: string | FetchArgs) {
  return typeof args === "string" ? args : args.url;
}

function noStore(args: string | FetchArgs): FetchArgs {
  if (typeof args === "string") return { url: args, cache: "no-store" };
  return { ...args, cache: "no-store" };
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

/** In-memory mock state for digital-metals buy demo payments (RTK mocks only). */
const digitalMetalsMockCreditedBuyOrders = new Set<string>();

const mockBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args) => {
  await sleep();
  const url = routeOf(args);
  const method = typeof args === "string" ? "GET" : String(args.method ?? "GET").toUpperCase();
  const body = typeof args === "string" ? undefined : (args.body as Record<string, unknown> | undefined);
  const params = typeof args === "string" ? undefined : (args.params as Record<string, unknown> | undefined);

  const demo = customerCommerceMock({ url, method, body, params });
  // Clone: RTK freezes results, and the demo store mutates its own records.
  if (demo) return "error" in demo ? { error: demo.error as FetchBaseQueryError } : ok(structuredClone(demo.data));

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
  if (url === "/app/home/banners") return ok({ items: [] });
  if (url === "/app/shop/banners") return ok({ items: [] });
  if (url === "/app/profile" && method === "GET") return ok(customerProfile);
  if (url === "/app/profile" && (method === "PATCH" || method === "PUT")) {
    return ok({ ...customerProfile, ...body });
  }
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
  if (url.endsWith("/pay/sdk-order") && method === "POST") {
    const id = `pi_${Date.now()}`;
    return ok({
      checkoutKind: "SDK_ORDER",
      provider: "PHONEPE",
      id,
      intentId: id,
      paymentId: `pay_${Date.now()}`,
      status: "PENDING",
      token: `mock-token-${id}`,
      sdkToken: `mock-token-${id}`,
      merchantOrderId: id,
      statusPollUrl: `/app/payment-intents/${id}`,
      expiresAt: new Date(Date.now() + 900000).toISOString(),
      positionVersion: Number(body?.expectedPositionVersion ?? 1),
    });
  }
  if ((url.endsWith("/payment-intents") || url.endsWith("/pay")) && method === "POST") {
    const isIntent = url.endsWith("/payment-intents");
    return ok(isIntent
      ? {
          checkoutKind: "HOSTED_REDIRECT",
          provider: "PHONEPE",
          id: `pi_${Date.now()}`,
          paymentId: `pay_${Date.now()}`,
          status: "PENDING",
          paymentUrl: "https://mercury.phonepe.com/transact/pg?token=mock",
          statusPollUrl: "/app/payment-intents/pi_demo",
          expiresAt: new Date(Date.now() + 900000).toISOString(),
          positionVersion: Number(body?.expectedPositionVersion ?? 1),
        }
      : {
          id: `pl_${Date.now()}`,
          paymentId: `pay_${Date.now()}`,
          token: "mock_pay_link",
          gatewayUrl: "/pay/mock_pay_link",
          expiresAt: new Date(Date.now() + 900000).toISOString(),
        });
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
  if (url === "/app/digital-metals/capability") {
    return ok({
      enabled: true,
      planEntitled: true,
      tenantEnabled: true,
      paused: false,
      active: true,
      canViewHoldings: true,
      canViewHistory: true,
      canPlaceNewBuy: true,
      canPlaceNewSell: true,
      canPlaceRedemption: true,
      blockers: [],
      termsVersion: "mock-v1",
      implementationPhase: 9,
    });
  }
  if (url === "/app/digital-metals/portfolio") {
    return ok({
      items: [
        {
          id: "dmw_mock",
          metal: "GOLD",
          finenessPpm: 999000,
          heldUg: "1000000",
          reservedUg: "0",
          availableUg: "1000000",
          pendingBuyUg: "0",
          branchId: null,
        },
      ],
      pendingBuyUg: "0",
    });
  }
  if (url === "/app/digital-metals/passbook") {
    const now = new Date().toISOString();
    return ok({
      items: [
        {
          id: "dmj_mock",
          entryType: "CREDIT",
          quantityUgDelta: "1000000",
          reservedUgDelta: "0",
          sequence: 1,
          referenceType: "PURCHASE",
          referenceId: "dmbo_mock_demo",
          createdAt: now,
          purchaseSummary: {
            orderId: "dmbo_mock_demo",
            metal: "GOLD",
            finenessPpm: 999000,
            quantityUg: "1000000",
            totalPayablePaise: 606_000,
            buyRatePerGramPaise: 610_000,
            bookedAt: now,
            creditedAt: now,
            payment: {
              amountPaise: 606_000,
              provider: "PHONEPE",
              merchantOrderId: "dmpay_mock_demo",
              paidAt: now,
            },
          },
        },
      ],
      meta: { nextCursor: null, hasMore: false, limit: 25 },
    });
  }
  if (url === "/app/digital-metals/quotes/buy" && method === "POST") {
    return ok({
      quoteId: `dmq_mock_${Date.now()}`,
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
      metal: "GOLD",
      finenessPpm: 999000,
      metalQuantityUg: "1000000",
      totalPayablePaise: body?.budgetPaise ?? 600_000,
      termsVersion: "2026-10-01",
      termsContentHash: "a".repeat(64),
      rateSnapshot: { buyRatePerGramPaise: 610000, rateVersionId: "dmr_mock" },
    });
  }
  const dmBuyOrderMatch = url.match(/^\/app\/digital-metals\/buy-orders\/([^/]+)$/);
  if (dmBuyOrderMatch && method === "GET") {
    const id = dmBuyOrderMatch[1];
    const credited = digitalMetalsMockCreditedBuyOrders.has(id);
    return ok({
      id,
      status: credited ? "CREDITED" : "PAYMENT_PENDING",
      metal: "GOLD",
      finenessPpm: 999000,
      quantityUg: "1000000",
      totalPayablePaise: 606_000,
      paymentAttempts: credited ? [{ id: "dmpay_mock_done", status: "COMPLETED" }] : [],
      invoiceStatus: credited ? "READY" : "PENDING",
    });
  }
  if (url === "/app/digital-metals/buy-orders" && method === "POST") {
    return ok({
      id: `dmbo_mock_${Date.now()}`,
      status: "PAYMENT_PENDING",
      metal: "GOLD",
      finenessPpm: 999000,
      quantityUg: "1000000",
      totalPayablePaise: 606_000,
      paymentAttempts: [],
      invoiceStatus: "PENDING",
    });
  }
  if (url === "/app/digital-metals/quotes/sell" && method === "POST") {
    return ok({
      quoteId: `dmq_sell_mock_${Date.now()}`,
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
      metal: "GOLD",
      finenessPpm: 999000,
      quantityUg: body?.quantityUg ?? 1_000_000,
      settlementPaise: 580_000,
      termsVersion: "2026-10-01",
      termsContentHash: "b".repeat(64),
    });
  }
  if (url === "/app/digital-metals/bank-destinations" && method === "GET") {
    return ok({
      items: [
        {
          id: "dmbd_mock",
          accountHolderName: "Mock User",
          accountLast4: "9012",
          ifsc: "HDFC0001234",
          bankName: "HDFC",
          status: "ACTIVE",
          verifiedAt: new Date().toISOString(),
        },
      ],
    });
  }
  if (url === "/app/digital-metals/bank-destinations" && method === "POST") {
    return ok({
      id: `dmbd_mock_${Date.now()}`,
      accountHolderName: body?.accountHolderName ?? "User",
      accountLast4: "1234",
      ifsc: body?.ifsc ?? "HDFC0001234",
      status: "ACTIVE",
      verifiedAt: new Date().toISOString(),
    });
  }
  const dmBankPatch = url.match(/^\/app\/digital-metals\/bank-destinations\/([^/]+)$/);
  if (dmBankPatch && method === "PATCH") {
    return ok({
      id: dmBankPatch[1],
      accountHolderName: "Mock User",
      accountLast4: "9012",
      ifsc: "HDFC0001234",
      status: "PENDING_VERIFICATION",
    });
  }
  if (url === "/app/digital-metals/sell-orders" && method === "POST") {
    return ok({
      id: `dmso_mock_${Date.now()}`,
      status: "RESERVED",
      metal: "GOLD",
      finenessPpm: 999000,
      quantityUg: "1000000",
      settlementPaise: 580_000,
      quoteExpiresAt: new Date(Date.now() + 900_000).toISOString(),
    });
  }
  const dmSellOrderMatch = url.match(/^\/app\/digital-metals\/sell-orders\/([^/]+)$/);
  if (dmSellOrderMatch && method === "GET") {
    return ok({
      id: dmSellOrderMatch[1],
      status: "PAYABLE_OPEN",
      quantityUg: "1000000",
      settlementPaise: 580_000,
      executedAt: new Date().toISOString(),
      payable: { id: "dmpaybl_mock", amountPaise: 580_000, outstandingPaise: 580_000, status: "OPEN" },
    });
  }
  const dmSellConfirm = url.match(/^\/app\/digital-metals\/sell-orders\/([^/]+)\/confirm$/);
  if (dmSellConfirm && method === "POST") {
    return ok({
      id: dmSellConfirm[1],
      status: "PAYABLE_OPEN",
      executedAt: new Date().toISOString(),
      payable: { id: "dmpaybl_mock", amountPaise: 580_000, outstandingPaise: 580_000, status: "OPEN" },
    });
  }
  const dmSellPayout = url.match(/^\/app\/digital-metals\/sell-orders\/([^/]+)\/payout-status$/);
  if (dmSellPayout && method === "GET") {
    return ok({
      orderId: dmSellPayout[1],
      saleExecuted: true,
      bankPayoutSettled: false,
      payoutDestinationMasked: { accountLast4: "9012", ifsc: "HDFC0001234", accountHolderName: "Mock User" },
      payable: { id: "dmpaybl_mock", amountPaise: 580_000, outstandingPaise: 580_000, status: "OPEN" },
      payouts: [],
    });
  }
  if (url === "/app/digital-metals/redemption/catalogue" && method === "GET") {
    return ok({
      items: [
        {
          id: "dmrci_mock",
          sku: "GOLD-2G",
          label: "2g Gold Coin",
          metal: "GOLD",
          finenessPpm: 999000,
          unitQuantityUg: "2000000",
          mintingChargePaise: 50000,
          chargeTotalPaise: 50000,
          pickupEnabled: true,
          deliveryEnabled: false,
          active: true,
        },
      ],
    });
  }
  if (url === "/app/digital-metals/quotes/redemption" && method === "POST") {
    return ok({
      quoteId: `dmq_red_mock_${Date.now()}`,
      expiresAt: new Date(Date.now() + 900_000).toISOString(),
      catalogueItemId: body?.catalogueItemId ?? "dmrci_mock",
      metal: "GOLD",
      finenessPpm: 999000,
      quantityUg: "2000000",
      quantityReservedUg: "2000000",
      remainingAvailableUg: "3000000",
      chargeTotalPaise: 50000,
      chargeLines: [{ code: "MINTING", label: "Minting", amountPaise: 50000 }],
      termsVersion: "2026-10-01",
      termsContentHash: "c".repeat(64),
    });
  }
  if (url === "/app/digital-metals/redemption/orders" && method === "POST") {
    const quoteId = typeof (body as { quoteId?: string })?.quoteId === "string" ? (body as { quoteId: string }).quoteId : "";
    return ok({
      id: `dmro_mock_${Date.now()}`,
      status: quoteId.includes("zero") ? "CHARGE_PAID" : "CHARGE_PENDING",
      quantityUg: "2000000",
      chargeTotalPaise: quoteId.includes("zero") ? 0 : 50000,
      chargePaymentExpiresAt: new Date(Date.now() + 900_000).toISOString(),
    });
  }
  const dmRedOrderMatch = url.match(/^\/app\/digital-metals\/redemption\/orders\/([^/]+)$/);
  if (dmRedOrderMatch && method === "GET") {
    return ok({
      id: dmRedOrderMatch[1],
      status: "CHARGE_PENDING",
      quantityUg: "2000000",
      chargeTotalPaise: 50000,
      chargeLines: [{ code: "MINTING", amountPaise: 50000 }],
      chargePaymentExpiresAt: new Date(Date.now() + 900_000).toISOString(),
    });
  }
  const dmPayIntentMatch = url.match(/^\/app\/digital-metals\/buy-orders\/([^/]+)\/payment-intents$/);
  if (dmPayIntentMatch && method === "POST") {
    const attemptId = `dmpay_mock_${Date.now()}`;
    return ok({
      id: attemptId,
      orderId: dmPayIntentMatch[1],
      status: "INITIATED",
      amountPaise: 606_000,
      currency: "INR",
      token: `mock-token-${attemptId}`,
      redirectUrl: body?.redirectUrl ?? "https://example.com/return",
      paymentIntent: {
        id: attemptId,
        status: "INITIATED",
        token: `mock-token-${attemptId}`,
        redirectUrl: body?.redirectUrl ?? "https://example.com/return",
      },
    });
  }
  const dmPayPollMatch = url.match(
    /^\/app\/digital-metals\/buy-orders\/([^/]+)\/payment-intents\/([^/]+)$/,
  );
  if (dmPayPollMatch && method === "GET") {
    const [, mockOrderId, mockAttemptId] = dmPayPollMatch;
    digitalMetalsMockCreditedBuyOrders.add(mockOrderId);
    return ok({
      paymentIntent: { id: mockAttemptId, status: "COMPLETED", orderId: mockOrderId },
      order: {
        id: mockOrderId,
        status: "CREDITED",
        metal: "GOLD",
        finenessPpm: 999000,
        quantityUg: "1000000",
        totalPayablePaise: 606_000,
        paymentAttempts: [{ id: mockAttemptId, status: "COMPLETED" }],
      },
    });
  }
  if (url === "/app/gold-rate/current") return ok(customerHome.goldRate);
  if (url === "/app/gold-rate/history") return ok([{ ...customerHome.goldRate, effectiveDate: "2026-09-16" }, { ...customerHome.goldRate, ratePerGramPaise: 721000, ratePerGramDisplay: "₹7,210 / g", effectiveDate: "2026-09-15", movement: -0.18 }, { ...customerHome.goldRate, ratePerGramPaise: 722500, ratePerGramDisplay: "₹7,225 / g", effectiveDate: "2026-09-14", movement: 0.31 }]);
  if (url === "/app/branches") return ok([customerProfile.branch, { id: "br_thrissur", code: "TSR", name: "Thrissur", address: "Round South, Thrissur", mobile: "+91 487 2211900" }]);
  if (url.includes("/redemption-request")) return ok({ id: "red_001", schemeId: url.split("/")[3], status: "REQUESTED", preferredMode: body?.preferredMode, preferredDate: body?.preferredDate, version: Number(body?.expectedVersion ?? 1) + 1 });
  const handoverOtpMatch = url.match(/^\/app\/redemptions\/([^/]+)\/handover-otp$/);
  if (handoverOtpMatch && method === "GET") {
    return ok({
      redemptionId: handoverOtpMatch[1],
      schemeId: "sch_capped",
      handoverOtp: "482910",
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      handoverOtpActive: true,
    });
  }
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
    // Browser customer portal: hosted PhonePe redirect (explicit; avoids ambiguity if X-Platform is ever set).
    headers.set("X-Checkout-Channel", "hosted");
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
      if (Array.isArray(envelope.data) && envelope.meta && typeof envelope.meta === "object") {
        return rtkDataResult({ items: envelope.data, meta: envelope.meta }, result.meta);
      }
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
  const requestArgs = env.useMocks ? args : withIdempotencyHeader(noStore(args));
  const url = routeOf(requestArgs);
  const guard = authRefreshGuard(url, extra, [
    "/app/auth/refresh",
    "/public/",
  ]);
  const dispatch = api.dispatch as AppDispatch;
  const epochAtStart = readCustomerDataEpoch(api.getState() as RootState);
  const sessionGenAtStart = readCustomerSessionGeneration(api.getState() as RootState);

  let result = env.useMocks
    ? await mockBaseQuery(requestArgs, api, extra)
    : await liveBaseQuery(requestArgs, api, extra);

  const stateAfter = api.getState() as RootState;
  const epochAfter = readCustomerDataEpoch(stateAfter);
  const sessionGenAfter = readCustomerSessionGeneration(stateAfter);
  if (!env.useMocks && epochAfter !== epochAtStart) {
    return rtkErrorResult({
      status: "CUSTOM_ERROR",
      error: "Stale customer identity response discarded",
      data: { code: "CUSTOMER_IDENTITY_STALE" },
    });
  }
  if (sessionGenAfter !== sessionGenAtStart) {
    return rtkErrorResult({
      status: "CUSTOM_ERROR",
      error: "Stale customer session generation; response discarded",
      data: { code: "CUSTOMER_SESSION_STALE" },
    });
  }

  if (shouldAttemptAuthRefresh(result.error, guard, env.useMocks)) {
    const refreshed = await refreshAfterUnauthorized("customer", guard);
    if (refreshed) {
      const epochBeforeRetry = readCustomerDataEpoch(api.getState() as RootState);
      const sessionGenBeforeRetry = readCustomerSessionGeneration(api.getState() as RootState);
      result = await retryAuthorizedRequest(
        liveBaseQuery,
        requestArgs,
        api,
        extra,
      );
      const stateAfterRetry = api.getState() as RootState;
      const epochAfterRetry = readCustomerDataEpoch(stateAfterRetry);
      const sessionGenAfterRetry = readCustomerSessionGeneration(stateAfterRetry);
      if (epochAfterRetry !== epochBeforeRetry) {
        return rtkErrorResult({
          status: "CUSTOM_ERROR",
          error: "Stale customer identity response discarded",
          data: { code: "CUSTOMER_IDENTITY_STALE" },
        });
      }
      if (sessionGenAfterRetry !== sessionGenBeforeRetry) {
        return rtkErrorResult({
          status: "CUSTOM_ERROR",
          error: "Stale customer session generation; response discarded",
          data: { code: "CUSTOMER_SESSION_STALE" },
        });
      }
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

type ShopOrderReturnStatus = {
  request: Record<string, unknown> | null;
  returnableItems?: { productId: string; quantity: number }[];
  returnEligibility?: { allowed: boolean; code?: string };
};

export const customerApi = createApi({
  reducerPath: "customerApi",
  baseQuery: dynamicBaseQuery,
  tagTypes: ["CustomerHome", "CustomerScheme", "CustomerPayableRange", "CustomerPayment", "CustomerProfile", "CustomerNotification", "CustomerGrievance", "CustomerDevice", "ShopCart", "ShopAddresses", "DigitalMetalsBuy", "DigitalMetalsSell", "DigitalMetalsRedemption", "DigitalMetalsDeliveryAddresses", "DigitalMetalsPortfolio", "DigitalMetalsPassbook"],
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
      {
        otpId: string;
        maskedMobile: string;
        expiresInSeconds: number;
        resendAvailableInSeconds?: number;
        attemptsAllowed?: number;
        otpLength?: number;
        authCountryCode?: string;
        isRegistered?: boolean;
      },
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
    listCustomerActivity: builder.query<
      CustomerActivityListPage,
      { limit?: number; cursor?: string }
    >({
      query: (params = {}) => ({
        url: "/app/activity",
        params: { limit: 20, ...params },
      }),
      transformResponse: (raw: unknown) => normalizeCustomerActivityPage(raw),
      merge: (current, incoming, { arg }) => {
        if (!arg?.cursor) return incoming;
        return {
          items: [...(current?.items ?? []), ...(incoming.items ?? [])],
          page: incoming.page,
        };
      },
      forceRefetch: ({ currentArg, previousArg }) => currentArg?.cursor !== previousArg?.cursor,
    }),
    getCustomerProfile: builder.query<CustomerProfile, void>({
      query: () => "/app/profile",
      providesTags: ["CustomerProfile"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
        const genAtStart = readCustomerSessionGeneration(getState() as RootState);
        try {
          const { data: profile } = await queryFulfilled;
          const genAfter = readCustomerSessionGeneration(getState() as RootState);
          if (genAfter !== genAtStart) return;
          if (!profile?.tenantId || !profile?.id) return;
          dispatch(
            customerIdentityConfirmed({
              tenantId: profile.tenantId,
              customerId: profile.id,
              tenantCode: profile.tenant?.tenantCode,
              forSessionGeneration: genAtStart,
            }),
          );
        } catch {
          /* error path handled elsewhere */
        }
      },
    }),
    updateCustomerProfile: builder.mutation<
      CustomerProfile,
      Partial<Pick<CustomerProfile, "name" | "email" | "address">>
    >({
      query: (body) => ({
        url: "/app/profile",
        method: "PATCH",
        body: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.email !== undefined ? { email: body.email } : {}),
          ...(body.address !== undefined ? { address: body.address } : {}),
        },
      }),
      invalidatesTags: ["CustomerProfile", "CustomerHome"],
    }),
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
      transformResponse: (raw: unknown) => normalizeCustomerSchemeList<SchemeCard>(raw),
      providesTags: ["CustomerScheme"],
    }),
    getCustomerPastSchemes: builder.query<CustomerPastScheme[], void>({
      query: () => ({ url: "/app/schemes", params: { group: "PAST" } }),
      transformResponse: (raw: unknown) => normalizeCustomerSchemeList<CustomerPastScheme>(raw),
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
      providesTags: (_result, _error, { schemeId }) => [
        { type: "CustomerPayableRange", id: schemeId },
      ],
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
    validateCustomerEnrolment: builder.mutation<ReturnType<typeof adaptCustomerCollectionPreview>, {
      planId: string; installmentAmountPaise?: number; payNow: boolean; collectionFrequency?: CollectionFrequency;
    }>({
      query: (body) => ({ url: "/app/schemes/enrol/validate", method: "POST", body }),
      transformResponse: adaptCustomerCollectionPreview,
    }),
    enrolCustomerScheme: builder.mutation<Record<string, unknown>, {
      planId: string; installmentAmountPaise?: number; payNow: boolean; redirectUrl?: string;
      collectionFrequency?: CollectionFrequency; expectedFirstCollectionPaise?: number; expectedMaturityDate?: string;
    }>({ query: (body) => ({ url: "/app/schemes/enrol", method: "POST", body }), invalidatesTags: ["CustomerScheme", "CustomerHome"] }),
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
    pollCustomerPaymentLink: builder.query<CustomerPaymentPollResult, string>({
      query: (linkId) => `/app/payments/${encodeURIComponent(linkId)}/status`,
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
      invalidatesTags: (_result, _error, { scheme }) => [
        { type: "CustomerPayableRange", id: scheme.id },
        { type: "CustomerScheme", id: scheme.id },
      ],
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
    revealCustomerRedemptionHandoverOtp: builder.query<
      {
        redemptionId: string;
        schemeId?: string;
        handoverOtp: string;
        expiresAt?: string | null;
        handoverOtpActive?: boolean;
      },
      string
    >({
      query: (redemptionId) => ({
        url: `/app/redemptions/${encodeURIComponent(redemptionId)}/handover-otp`,
        mockKey: "revealCustomerRedemptionHandoverOtp",
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: {
            redemptionId: string;
            schemeId?: string;
            handoverOtp: string;
            expiresAt?: string | null;
            handoverOtpActive?: boolean;
          } }).data;
        }
        return raw as {
          redemptionId: string;
          schemeId?: string;
          handoverOtp: string;
          expiresAt?: string | null;
          handoverOtpActive?: boolean;
        };
      },
    }),
    registerCustomerFcmToken: builder.mutation<
      { registered: boolean; deviceId: string },
      { fcmToken: string; deviceId: string; platform: "android" | "ios" }
    >({
      query: (body) => ({ url: "/app/devices/fcm-token", method: "POST", body }),
    }),
    getHomeBanners: builder.query<
      {
        items: Record<string, unknown>[];
        meta?: { nextVisibilityChangeAt?: string | null; serverTime?: string | null };
      },
      void
    >({
      query: () => ({ url: "/app/home/banners", mockKey: "homeBanners" }),
      transformResponse: (raw) => {
        const payload = (raw as { data?: { items?: Record<string, unknown>[]; meta?: Record<string, unknown> } })?.data ?? raw;
        const items = (payload as { items?: Record<string, unknown>[] })?.items ?? [];
        const meta = (payload as { meta?: { nextVisibilityChangeAt?: string | null; serverTime?: string | null } }).meta;
        return { items, meta };
      },
    }),
    getShopBanners: builder.query<
      {
        items: Record<string, unknown>[];
        meta?: { nextVisibilityChangeAt?: string | null; serverTime?: string | null };
      },
      void
    >({
      query: () => ({ url: "/app/shop/banners", mockKey: "shopBanners" }),
      transformResponse: (raw) => {
        const payload = (raw as { data?: { items?: Record<string, unknown>[]; meta?: Record<string, unknown> } })?.data ?? raw;
        const items = (payload as { items?: Record<string, unknown>[] })?.items ?? [];
        const meta = (payload as { meta?: { nextVisibilityChangeAt?: string | null; serverTime?: string | null } }).meta;
        return { items, meta };
      },
    }),
    getShopAvailability: builder.query<
      { available: boolean; hasOrderHistory?: boolean; ecommerce?: Record<string, unknown> },
      void
    >({
      query: () => ({ url: "/app/shop/availability", mockKey: "shopAvailability" }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: { available: boolean; hasOrderHistory?: boolean } }).data;
        }
        return raw as { available: boolean; hasOrderHistory?: boolean };
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
    updateShopAddress: builder.mutation<
      Record<string, unknown>,
      {
        addressId: string;
        line1?: string;
        city?: string;
        state?: string;
        pincode?: string;
        line2?: string;
        label?: string;
        recipientName?: string;
        mobile?: string;
        isDefault?: boolean;
        expectedVersion?: number;
      }
    >({
      query: ({ addressId, ...body }) => ({
        url: `/app/shop/addresses/${addressId}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
      invalidatesTags: ["ShopAddresses", "DigitalMetalsDeliveryAddresses"],
    }),
    deleteShopAddress: builder.mutation<{ id: string; deleted: boolean }, { addressId: string }>({
      query: ({ addressId }) => ({
        url: `/app/shop/addresses/${addressId}`,
        method: "DELETE",
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: { id: string; deleted: boolean } }).data;
        }
        return raw as { id: string; deleted: boolean };
      },
      invalidatesTags: ["ShopAddresses", "DigitalMetalsDeliveryAddresses"],
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
    getShopSchemePurchasePreview: builder.query<
      { applied: number; appliedPaise: number; makingChargeWaivedPaise: number; topUpPaise: number; remaining: number },
      { quoteId: string; schemeId: string; basis: "CASH_VALUE" | "GOLD_WEIGHT" }
    >({
      query: ({ quoteId, schemeId, basis }) => ({
        url: `/app/shop/quotes/${encodeURIComponent(quoteId)}/scheme-preview`,
        params: { schemeId, basis },
      }),
      transformResponse: (raw: { data: { applied: number; appliedPaise: number; makingChargeWaivedPaise: number; topUpPaise: number; remaining: number } }) => raw.data,
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
      { quoteId: string; idempotencyKey: string; schemePurchase?: {
        schemeId: string; basis: "CASH_VALUE" | "GOLD_WEIGHT";
        applied: number; topUpPaise: number; makingChargeWaivedPaise: number;
      } }
    >({
      query: ({ quoteId, idempotencyKey, schemePurchase }) => ({
        url: "/app/shop/orders",
        method: "POST",
        body: { quoteId, ...(schemePurchase ? { schemePurchase } : {}) },
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
      transformResponse: (raw: unknown) => normalizeShopOrdersListResponse(raw),
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
    getShopOrderReturn: builder.query<ShopOrderReturnStatus, string>({
      query: (orderId) => ({
        url: `/app/shop/orders/${encodeURIComponent(orderId)}/return`,
        mockKey: "shopOrderReturn",
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: ShopOrderReturnStatus }).data;
        }
        return raw as ShopOrderReturnStatus;
      },
      providesTags: (_r, _e, orderId) => [{ type: "ShopCart", id: `return-${orderId}` }],
    }),
    createShopReturnRequest: builder.mutation<
      { request: Record<string, unknown>; created: boolean },
      { orderId: string; reason: string; idempotencyKey: string; kind?: "RETURN" | "EXCHANGE"; evidenceNote?: string; items?: { productId: string; quantity: number }[] }
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
    getCustomerDigitalMetalsCapability: builder.query<
      import("@/src/lib/digital-metals-entitlement").DigitalMetalsServerAccessState,
      void
    >({
      query: () => "/app/digital-metals/capability",
    }),
    getCustomerDigitalMetalsPortfolio: builder.query<
      {
        items: {
          id: string;
          metal: string;
          finenessPpm: number;
          heldUg: string;
          reservedUg: string;
          availableUg: string;
          pendingBuyUg: string;
          branchId: string | null;
          valuationStatus?: "OK" | "STALE_RATE" | "RATE_UNAVAILABLE";
          estimatedSaleValue?: {
            amountPaise: number;
            currency: string;
            ratePerGramPaise: number;
            feeAssumption: string;
          } | null;
        }[];
        pendingBuyUg: string;
      },
      void
    >({
      query: () => "/app/digital-metals/portfolio",
      providesTags: ["DigitalMetalsPortfolio"],
    }),
    getCustomerDigitalMetalsPassbook: builder.query<
      {
        items: Record<string, unknown>[];
        meta: { nextCursor: string | null; hasMore: boolean; limit: number };
      },
      { cursor?: string; limit?: number } | void
    >({
      query: (params) => ({
        url: "/app/digital-metals/passbook",
        params: params ?? {},
      }),
      providesTags: ["DigitalMetalsPassbook"],
    }),
    getCustomerDigitalMetalsStatement: builder.query<
      Record<string, unknown>,
      { fromBusinessDate: string; toBusinessDate: string }
    >({
      query: (params) => ({
        url: "/app/digital-metals/statements/metal",
        params,
      }),
    }),
    getCustomerDigitalMetalsDocument: builder.query<
      { id: string; status: string; docType: string; subjectKey?: string; documentNumber?: string | null; lastError?: string | null },
      string
    >({
      query: (artifactId) => ({
        url: `/app/digital-metals/documents/${encodeURIComponent(artifactId)}`,
        mockKey: "customerDigitalMetalsDocument",
      }),
      transformResponse: (raw) => {
        const data = (raw as { data?: Record<string, unknown> })?.data ?? raw;
        return (data as {
          id: string;
          status: string;
          docType: string;
          subjectKey?: string;
          documentNumber?: string | null;
          lastError?: string | null;
        }) ?? { id: "", status: "PENDING", docType: "METAL_STATEMENT" };
      },
    }),
    findCustomerDigitalMetalsDocumentBySubject: builder.query<
      { artifact: { id: string; status: string; documentNumber?: string | null; lastError?: string | null } | null },
      Record<string, string>
    >({
      query: (params) => ({
        url: "/app/digital-metals/documents/by-subject",
        params,
      }),
    }),
    requestCustomerDigitalMetalsDocument: builder.mutation<
      Record<string, unknown>,
      { idempotencyKey: string; body: Record<string, unknown> }
    >({
      query: ({ idempotencyKey, body }) => ({
        url: "/app/digital-metals/documents/request",
        method: "POST",
        body,
        headers: { "X-Idempotency-Key": idempotencyKey },
      }),
    }),
    retryCustomerDigitalMetalsDocument: builder.mutation<
      Record<string, unknown>,
      { artifactId: string; idempotencyKey: string }
    >({
      query: ({ artifactId, idempotencyKey }) => ({
        url: `/app/digital-metals/documents/${encodeURIComponent(artifactId)}/retry`,
        method: "POST",
        headers: { "X-Idempotency-Key": idempotencyKey },
      }),
    }),
    getCustomerDigitalMetalsDocumentDownloadUrl: builder.mutation<
      { downloadUrl: string },
      string
    >({
      query: (artifactId) => ({
        url: `/app/digital-metals/documents/${encodeURIComponent(artifactId)}/download-url`,
      }),
    }),
    createDigitalMetalsBuyQuote: builder.mutation<
      Record<string, unknown>,
      {
        metal: string;
        finenessPpm: number;
        inputMode: "BUDGET_INR" | "QUANTITY_UG";
        budgetPaise?: number;
        quantityUg?: number;
        idempotencyKey: string;
      }
    >({
      query: ({ idempotencyKey, ...body }) => ({
        url: "/app/digital-metals/quotes/buy",
        method: "POST",
        body,
        headers: { "X-Idempotency-Key": idempotencyKey },
        mockKey: "createDigitalMetalsBuyQuote",
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
    }),
    createDigitalMetalsBuyOrder: builder.mutation<
      Record<string, unknown>,
      {
        quoteId: string;
        termsVersionAccepted: string;
        termsContentHashAccepted: string;
        idempotencyKey: string;
      }
    >({
      query: ({ idempotencyKey, ...body }) => ({
        url: "/app/digital-metals/buy-orders",
        method: "POST",
        body,
        headers: { "X-Idempotency-Key": idempotencyKey },
        mockKey: "createDigitalMetalsBuyOrder",
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
      invalidatesTags: ["DigitalMetalsBuy"],
    }),
    getCustomerDigitalMetalsBuyOrder: builder.query<Record<string, unknown>, string>({
      query: (orderId) => `/app/digital-metals/buy-orders/${encodeURIComponent(orderId)}`,
      providesTags: (_r, _e, id) => [{ type: "DigitalMetalsBuy", id }],
    }),
    getCustomerDigitalMetalsBuyOrders: builder.query<
      { items: Record<string, unknown>[]; meta?: { nextCursor: string | null; hasMore: boolean; limit: number } },
      { status?: string; limit?: number; cursor?: string } | void
    >({
      query: (params) => ({
        url: "/app/digital-metals/buy-orders",
        params: params ?? {},
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: { items: Record<string, unknown>[]; meta?: Record<string, unknown> } }).data;
        }
        return (raw as { items: Record<string, unknown>[] }) ?? { items: [] };
      },
      providesTags: ["DigitalMetalsBuy"],
    }),
    getCustomerDigitalMetalsSellOrders: builder.query<
      { items: Record<string, unknown>[]; meta?: { nextCursor: string | null; hasMore: boolean; limit: number } },
      { status?: string; limit?: number; cursor?: string } | void
    >({
      query: (params) => ({
        url: "/app/digital-metals/sell-orders",
        params: params ?? {},
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: { items: Record<string, unknown>[]; meta?: Record<string, unknown> } }).data;
        }
        return (raw as { items: Record<string, unknown>[] }) ?? { items: [] };
      },
      providesTags: ["DigitalMetalsSell"],
    }),
    getCustomerDigitalMetalsRedemptionOrders: builder.query<
      { items: Record<string, unknown>[]; meta?: { nextCursor: string | null; hasMore: boolean; limit: number } },
      { status?: string; limit?: number; cursor?: string } | void
    >({
      query: (params) => ({
        url: "/app/digital-metals/redemption/orders",
        params: params ?? {},
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: { items: Record<string, unknown>[]; meta?: Record<string, unknown> } }).data;
        }
        return (raw as { items: Record<string, unknown>[] }) ?? { items: [] };
      },
      providesTags: ["DigitalMetalsRedemption"],
    }),
    getCustomerDigitalMetalsOpenOrdersSummary: builder.query<
      { openBuyCount: number; openSellCount: number; openRedemptionCount: number; totalOpen: number },
      void
    >({
      query: () => "/app/digital-metals/orders/open-summary",
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, number> }).data as {
            openBuyCount: number;
            openSellCount: number;
            openRedemptionCount: number;
            totalOpen: number;
          };
        }
        return raw as { openBuyCount: number; openSellCount: number; openRedemptionCount: number; totalOpen: number };
      },
      providesTags: ["DigitalMetalsBuy", "DigitalMetalsSell", "DigitalMetalsRedemption"],
    }),
    createDigitalMetalsBuyPaymentIntent: builder.mutation<
      Record<string, unknown>,
      { orderId: string; redirectUrl: string; idempotencyKey: string }
    >({
      query: ({ orderId, redirectUrl, idempotencyKey }) => ({
        url: `/app/digital-metals/buy-orders/${encodeURIComponent(orderId)}/payment-intents`,
        method: "POST",
        body: { redirectUrl },
        headers: { "X-Idempotency-Key": idempotencyKey },
        mockKey: "createDigitalMetalsBuyPaymentIntent",
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          const data = (raw as { data: Record<string, unknown> }).data;
          const nested = data.paymentIntent as Record<string, unknown> | undefined;
          return nested ? { ...data, ...nested } : data;
        }
        return raw as Record<string, unknown>;
      },
      invalidatesTags: (_r, _e, { orderId }) => [
        { type: "DigitalMetalsBuy", id: orderId },
        "DigitalMetalsPortfolio",
        "DigitalMetalsPassbook",
      ],
    }),
    pollDigitalMetalsBuyPaymentIntent: builder.query<
      { paymentIntent: Record<string, unknown>; order?: Record<string, unknown> },
      { orderId: string; paymentAttemptId: string }
    >({
      query: ({ orderId, paymentAttemptId }) =>
        `/app/digital-metals/buy-orders/${encodeURIComponent(orderId)}/payment-intents/${encodeURIComponent(paymentAttemptId)}`,
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: { paymentIntent: Record<string, unknown>; order?: Record<string, unknown> } }).data;
        }
        return raw as { paymentIntent: Record<string, unknown>; order?: Record<string, unknown> };
      },
    }),
    createCustomerDigitalMetalsSellQuote: builder.mutation<
      Record<string, unknown>,
      { metal: string; finenessPpm: number; quantityUg: number; idempotencyKey: string }
    >({
      query: ({ idempotencyKey, ...body }) => ({
        url: "/app/digital-metals/quotes/sell",
        method: "POST",
        body,
        headers: { "X-Idempotency-Key": idempotencyKey },
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
    }),
    createCustomerDigitalMetalsSellOrder: builder.mutation<
      Record<string, unknown>,
      {
        quoteId: string;
        termsVersionAccepted: string;
        termsContentHashAccepted: string;
        idempotencyKey: string;
      }
    >({
      query: ({ idempotencyKey, ...body }) => ({
        url: "/app/digital-metals/sell-orders",
        method: "POST",
        body,
        headers: { "X-Idempotency-Key": idempotencyKey },
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
      invalidatesTags: ["DigitalMetalsSell"],
    }),
    confirmCustomerDigitalMetalsSellOrder: builder.mutation<
      Record<string, unknown>,
      { orderId: string; bankDestinationId: string; idempotencyKey: string }
    >({
      query: ({ orderId, idempotencyKey, ...body }) => ({
        url: `/app/digital-metals/sell-orders/${encodeURIComponent(orderId)}/confirm`,
        method: "POST",
        body,
        headers: { "X-Idempotency-Key": idempotencyKey },
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
      invalidatesTags: (_r, _e, { orderId }) => [{ type: "DigitalMetalsSell", id: orderId }],
    }),
    cancelCustomerDigitalMetalsSellOrder: builder.mutation<
      Record<string, unknown>,
      { orderId: string; idempotencyKey: string }
    >({
      query: ({ orderId, idempotencyKey }) => ({
        url: `/app/digital-metals/sell-orders/${encodeURIComponent(orderId)}/cancel`,
        method: "POST",
        headers: { "X-Idempotency-Key": idempotencyKey },
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
      invalidatesTags: (_r, _e, { orderId }) => [{ type: "DigitalMetalsSell", id: orderId }],
    }),
    getCustomerDigitalMetalsSellOrder: builder.query<Record<string, unknown>, string>({
      query: (orderId) => `/app/digital-metals/sell-orders/${encodeURIComponent(orderId)}`,
      providesTags: (_r, _e, id) => [{ type: "DigitalMetalsSell", id }],
    }),
    getCustomerDigitalMetalsSellOrderPayoutStatus: builder.query<Record<string, unknown>, string>({
      query: (orderId) =>
        `/app/digital-metals/sell-orders/${encodeURIComponent(orderId)}/payout-status`,
      providesTags: (_r, _e, id) => [{ type: "DigitalMetalsSell", id: `payout-${id}` }],
    }),
    getCustomerDigitalMetalsBankDestinations: builder.query<
      {
        items: {
          id: string;
          accountHolderName: string;
          accountLast4: string;
          ifsc: string;
          bankName: string;
          status: string;
          verifiedAt: string | null;
        }[];
      },
      void
    >({
      query: () => "/app/digital-metals/bank-destinations",
      providesTags: ["DigitalMetalsSell"],
    }),
    createCustomerDigitalMetalsBankDestination: builder.mutation<
      Record<string, unknown>,
      {
        accountHolderName: string;
        accountNumber: string;
        ifsc: string;
        bankName?: string;
        idempotencyKey: string;
      }
    >({
      query: ({ idempotencyKey, ...body }) => ({
        url: "/app/digital-metals/bank-destinations",
        method: "POST",
        body,
        headers: { "X-Idempotency-Key": idempotencyKey },
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
      invalidatesTags: ["DigitalMetalsSell"],
    }),
    patchCustomerDigitalMetalsBankDestination: builder.mutation<
      Record<string, unknown>,
      { destinationId: string; confirmAccountNumber?: string; accountHolderName?: string; ifsc?: string }
    >({
      query: ({ destinationId, ...body }) => ({
        url: `/app/digital-metals/bank-destinations/${encodeURIComponent(destinationId)}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
      invalidatesTags: ["DigitalMetalsSell"],
    }),
    completeDigitalMetalsTestHarnessPayment: builder.mutation<
      Record<string, unknown>,
      {
        orderId: string;
        idempotencyKey: string;
        outcome?: "COMPLETED" | "FAILED";
        paymentAttemptId?: string;
      }
    >({
      query: ({ orderId, idempotencyKey, outcome, paymentAttemptId }) => ({
        url: `/app/digital-metals/buy-orders/${encodeURIComponent(orderId)}/test-harness/complete-payment`,
        method: "POST",
        body: {
          ...(outcome ? { outcome } : {}),
          ...(paymentAttemptId ? { paymentAttemptId } : {}),
        },
        headers: { "X-Idempotency-Key": idempotencyKey },
        mockKey: "completeDigitalMetalsTestHarnessPayment",
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
      invalidatesTags: (_r, _e, { orderId }) => [{ type: "DigitalMetalsBuy", id: orderId }],
    }),
    getCustomerDigitalMetalsDeliveryAddresses: builder.query<{ items: Record<string, unknown>[] }, void>({
      query: () => "/app/digital-metals/delivery-addresses",
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: { items: Record<string, unknown>[] } }).data;
        }
        return (raw as { items: Record<string, unknown>[] }) ?? { items: [] };
      },
      providesTags: ["DigitalMetalsDeliveryAddresses"],
    }),
    createCustomerDigitalMetalsDeliveryAddress: builder.mutation<
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
        url: "/app/digital-metals/delivery-addresses",
        method: "POST",
        body,
        headers: { "X-Idempotency-Key": idempotencyKey },
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
      invalidatesTags: ["DigitalMetalsDeliveryAddresses", "ShopAddresses"],
    }),
    updateCustomerDigitalMetalsDeliveryAddress: builder.mutation<
      Record<string, unknown>,
      {
        addressId: string;
        line1?: string;
        city?: string;
        state?: string;
        pincode?: string;
        line2?: string;
        label?: string;
        recipientName?: string;
        mobile?: string;
        isDefault?: boolean;
        expectedVersion?: number;
      }
    >({
      query: ({ addressId, ...body }) => ({
        url: `/app/digital-metals/delivery-addresses/${addressId}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
      invalidatesTags: ["DigitalMetalsDeliveryAddresses", "ShopAddresses"],
    }),
    deleteCustomerDigitalMetalsDeliveryAddress: builder.mutation<
      { id: string; deleted: boolean },
      { addressId: string }
    >({
      query: ({ addressId }) => ({
        url: `/app/digital-metals/delivery-addresses/${addressId}`,
        method: "DELETE",
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: { id: string; deleted: boolean } }).data;
        }
        return raw as { id: string; deleted: boolean };
      },
      invalidatesTags: ["DigitalMetalsDeliveryAddresses", "ShopAddresses"],
    }),
    getCustomerDigitalMetalsRedemptionCatalogue: builder.query<{ items: Record<string, unknown>[] }, void>({
      query: () => "/app/digital-metals/redemption/catalogue",
      providesTags: ["DigitalMetalsRedemption"],
    }),
    createCustomerDigitalMetalsRedemptionQuote: builder.mutation<
      Record<string, unknown>,
      {
        catalogueItemId: string;
        metal: string;
        finenessPpm: number;
        unitCount: number;
        fulfilmentMode: "PICKUP" | "DELIVERY";
        pickupBranchId?: string;
        deliveryAddressId?: string;
        idempotencyKey: string;
      }
    >({
      query: ({ idempotencyKey, ...body }) => ({
        url: "/app/digital-metals/quotes/redemption",
        method: "POST",
        body,
        headers: { "X-Idempotency-Key": idempotencyKey },
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
    }),
    createCustomerDigitalMetalsRedemptionOrder: builder.mutation<
      Record<string, unknown>,
      {
        quoteId: string;
        termsVersionAccepted: string;
        termsContentHashAccepted: string;
        idempotencyKey: string;
      }
    >({
      query: ({ idempotencyKey, ...body }) => ({
        url: "/app/digital-metals/redemption/orders",
        method: "POST",
        body,
        headers: { "X-Idempotency-Key": idempotencyKey },
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
      invalidatesTags: ["DigitalMetalsRedemption", "DigitalMetalsBuy"],
    }),
    getCustomerDigitalMetalsRedemptionOrder: builder.query<Record<string, unknown>, string>({
      query: (orderId) => `/app/digital-metals/redemption/orders/${encodeURIComponent(orderId)}`,
      providesTags: (_r, _e, id) => [{ type: "DigitalMetalsRedemption", id }],
    }),
    getCustomerDigitalMetalsRedemptionFulfilment: builder.query<Record<string, unknown>, string>({
      query: (orderId) =>
        `/app/digital-metals/redemption/orders/${encodeURIComponent(orderId)}/fulfilment`,
      providesTags: (_r, _e, id) => [{ type: "DigitalMetalsRedemption", id: `${id}-fulfilment` }],
    }),
    getCustomerDigitalMetalsRedemptionPickupInstructions: builder.query<Record<string, unknown>, string>({
      query: (orderId) =>
        `/app/digital-metals/redemption/orders/${encodeURIComponent(orderId)}/pickup-instructions`,
      providesTags: (_r, _e, id) => [{ type: "DigitalMetalsRedemption", id: `${id}-pickup` }],
    }),
    createCustomerDigitalMetalsRedemptionPaymentIntent: builder.mutation<
      Record<string, unknown>,
      { orderId: string; redirectUrl?: string; idempotencyKey: string }
    >({
      query: ({ orderId, idempotencyKey, ...body }) => ({
        url: `/app/digital-metals/redemption/orders/${encodeURIComponent(orderId)}/payment-intents`,
        method: "POST",
        body,
        headers: { "X-Idempotency-Key": idempotencyKey },
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
      invalidatesTags: (_r, _e, { orderId }) => [{ type: "DigitalMetalsRedemption", id: orderId }],
    }),
    pollDigitalMetalsRedemptionPaymentIntent: builder.query<
      { paymentIntent: Record<string, unknown>; order?: Record<string, unknown> },
      { orderId: string; paymentAttemptId: string }
    >({
      query: ({ orderId, paymentAttemptId }) =>
        `/app/digital-metals/redemption/orders/${encodeURIComponent(orderId)}/payment-intents/${encodeURIComponent(paymentAttemptId)}`,
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: { paymentIntent: Record<string, unknown>; order?: Record<string, unknown> } }).data;
        }
        return raw as { paymentIntent: Record<string, unknown>; order?: Record<string, unknown> };
      },
    }),
    completeCustomerDigitalMetalsRedemptionTestHarnessPayment: builder.mutation<
      Record<string, unknown>,
      { orderId: string; idempotencyKey: string; outcome?: "COMPLETED" | "FAILED" }
    >({
      query: ({ orderId, idempotencyKey, outcome }) => ({
        url: `/app/digital-metals/redemption/orders/${encodeURIComponent(orderId)}/test-harness/complete-payment`,
        method: "POST",
        body: outcome ? { outcome } : {},
        headers: { "X-Idempotency-Key": idempotencyKey },
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
      invalidatesTags: (_r, _e, { orderId }) => [{ type: "DigitalMetalsRedemption", id: orderId }],
    }),
    cancelCustomerDigitalMetalsRedemptionOrder: builder.mutation<
      Record<string, unknown>,
      { orderId: string; idempotencyKey: string }
    >({
      query: ({ orderId, idempotencyKey }) => ({
        url: `/app/digital-metals/redemption/orders/${encodeURIComponent(orderId)}/cancel`,
        method: "POST",
        headers: { "X-Idempotency-Key": idempotencyKey },
      }),
      transformResponse: (raw: unknown) => {
        if (raw && typeof raw === "object" && "data" in raw) {
          return (raw as { data: Record<string, unknown> }).data;
        }
        return raw as Record<string, unknown>;
      },
      invalidatesTags: ["DigitalMetalsRedemption", "DigitalMetalsBuy"],
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
  useValidateCustomerEnrolmentMutation, useEnrolCustomerSchemeMutation, useInitiateCustomerPaymentMutation, useInitiatePublicPaymentLinkMutation,
  useLazyPollCustomerPaymentIntentQuery, useLazyPollCustomerPaymentLinkQuery, useLazyPollPublicPaymentLinkQuery,
  useGetCustomerPaymentsQuery, useGetCustomerPaymentQuery, useListCustomerActivityQuery,
  useGetCustomerNotificationsQuery, useMarkCustomerNotificationReadMutation, useMarkAllCustomerNotificationsReadMutation,
  useGetCustomerGrievancesQuery, useGetCustomerGrievanceQuery, useCreateCustomerGrievanceMutation,
  useReplyCustomerGrievanceMutation, useGetCustomerDevicesQuery, useRevokeCustomerDeviceMutation,
  useCustomerLogoutMutation,
  useGetCustomerDigitalMetalsCapabilityQuery,
  useGetCustomerDigitalMetalsPortfolioQuery,
  useGetCustomerDigitalMetalsPassbookQuery,
  useGetCustomerDigitalMetalsStatementQuery,
  useGetCustomerDigitalMetalsDocumentQuery,
  useFindCustomerDigitalMetalsDocumentBySubjectQuery,
  useRequestCustomerDigitalMetalsDocumentMutation,
  useRetryCustomerDigitalMetalsDocumentMutation,
  useGetCustomerDigitalMetalsDocumentDownloadUrlMutation,
  useCreateDigitalMetalsBuyQuoteMutation,
  useCreateDigitalMetalsBuyOrderMutation,
  useGetCustomerDigitalMetalsBuyOrderQuery,
  useGetCustomerDigitalMetalsBuyOrdersQuery,
  useGetCustomerDigitalMetalsSellOrdersQuery,
  useGetCustomerDigitalMetalsRedemptionOrdersQuery,
  useGetCustomerDigitalMetalsOpenOrdersSummaryQuery,
  useCreateDigitalMetalsBuyPaymentIntentMutation,
  useLazyPollDigitalMetalsBuyPaymentIntentQuery,
  useCompleteDigitalMetalsTestHarnessPaymentMutation,
  useCreateCustomerDigitalMetalsSellQuoteMutation,
  useCreateCustomerDigitalMetalsSellOrderMutation,
  useConfirmCustomerDigitalMetalsSellOrderMutation,
  useCancelCustomerDigitalMetalsSellOrderMutation,
  useGetCustomerDigitalMetalsSellOrderQuery,
  useGetCustomerDigitalMetalsSellOrderPayoutStatusQuery,
  useGetCustomerDigitalMetalsBankDestinationsQuery,
  useCreateCustomerDigitalMetalsBankDestinationMutation,
  usePatchCustomerDigitalMetalsBankDestinationMutation,
  useGetCustomerDigitalMetalsRedemptionCatalogueQuery,
  useGetCustomerDigitalMetalsDeliveryAddressesQuery,
  useCreateCustomerDigitalMetalsDeliveryAddressMutation,
  useUpdateCustomerDigitalMetalsDeliveryAddressMutation,
  useDeleteCustomerDigitalMetalsDeliveryAddressMutation,
  useCreateCustomerDigitalMetalsRedemptionQuoteMutation,
  useCreateCustomerDigitalMetalsRedemptionOrderMutation,
  useGetCustomerDigitalMetalsRedemptionOrderQuery,
  useGetCustomerDigitalMetalsRedemptionFulfilmentQuery,
  useGetCustomerDigitalMetalsRedemptionPickupInstructionsQuery,
  useCreateCustomerDigitalMetalsRedemptionPaymentIntentMutation,
  useLazyPollDigitalMetalsRedemptionPaymentIntentQuery,
  useCompleteCustomerDigitalMetalsRedemptionTestHarnessPaymentMutation,
  useCancelCustomerDigitalMetalsRedemptionOrderMutation,
  useGetShopCategoriesQuery,
  useGetCustomerGoldRateQuery, useGetCustomerGoldHistoryQuery, useGetCustomerBranchesQuery,
  useRequestCustomerRedemptionMutation,
  useLazyRevealCustomerRedemptionHandoverOtpQuery,
  useRevealCustomerRedemptionHandoverOtpQuery,
  useRegisterCustomerFcmTokenMutation,
  useGetHomeBannersQuery,
  useGetShopBannersQuery,
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
  useUpdateShopAddressMutation,
  useDeleteShopAddressMutation,
  useCreateShopQuoteMutation,
  useGetShopQuoteQuery,
  useLazyGetShopSchemePurchasePreviewQuery,
  useCancelShopQuoteMutation,
  useCreateShopOrderMutation,
  useListShopOrdersQuery,
  useGetShopOrderQuery,
  useLazyGetShopOrderQuery,
  useCreateShopOrderPaymentIntentMutation,
  useLazyPollShopOrderPaymentIntentQuery,
  useCompleteShopTestHarnessPaymentMutation,
  useCancelShopOrderMutation,
  useCreateShopCancellationRequestMutation,
  useGetShopOrderReturnQuery,
  useCreateShopReturnRequestMutation,
} = customerApi;
