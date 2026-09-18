import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { env } from "@/src/config/env";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { paginateSlice } from "@/src/lib/cursor-pagination";
import {
  agentCashSummary,
  agentCollectionSummary,
  agentCustomers,
  agentGoldRate,
  agentHandovers,
  agentPayments,
  agentReport,
  agentSchemes,
  agentTenantChoices,
  agentUser,
  updateMockCashSummary,
} from "@/src/mocks/agent-data";
import {
  authRefreshGuard,
  refreshAfterUnauthorized,
  retryAuthorizedRequest,
  shouldAttemptAuthRefresh,
  shouldForceAuthLogout,
} from "@/src/lib/auth-base-query-refresh";
import {
  normalizeFetchBaseQueryError,
  readContractResponseBody,
} from "@/src/lib/contract-response";
import {
  AGENT_ACCESS_KEY,
  AGENT_REFRESH_KEY,
  clearAgentSession,
  patchAgentTokens,
} from "@/src/store/slices/agent-session-slice";
import type {
  AgentCashSummary,
  AgentCollectionSummary,
  AgentCustomer,
  AgentGoldRate,
  AgentHandover,
  AgentManualPaymentMode,
  AgentLoginResponse,
  AgentPassbook,
  AgentPayableRange,
  AgentPayment,
  AgentReport,
  AgentScheme,
  AgentSchemeSummary,
  AgentUser,
} from "@/src/types/agent";

type Envelope<T> = { success: true; data: T; meta?: { nextCursor?: string | null; hasMore?: boolean; limit?: number; total?: number } };
type AgentError = { success: false; error: { code: string; message: string; details?: unknown; traceId?: string } };

const wait = () => new Promise((resolve) => setTimeout(resolve, Math.min(Math.max(env.mockDelayMs, 120), 700)));
const ok = <T,>(data: T, meta?: Envelope<T>["meta"]): { data: Envelope<T> } => ({
  data: { success: true, data, ...(meta ? { meta } : {}) },
});
const pathOf = (args: string | FetchArgs) => typeof args === "string" ? args : args.url;
const methodOf = (args: string | FetchArgs) => typeof args === "string" ? "GET" : String(args.method ?? "GET").toUpperCase();
const bodyOf = (args: string | FetchArgs) => typeof args === "string" ? {} : (args.body as Record<string, unknown> | undefined) ?? {};
const paramsOf = (args: string | FetchArgs) => typeof args === "string" ? {} : (args.params as Record<string, unknown> | undefined) ?? {};

function idOf(raw: Record<string, unknown>) { return String(raw.id ?? raw._id ?? ""); }

function peelAgentPayload(raw: unknown): Record<string, unknown> {
  let row = raw;
  if (row && typeof row === "object" && "success" in row) {
    const envelope = row as { success?: boolean; data?: unknown };
    if (envelope.success === true && envelope.data && typeof envelope.data === "object") {
      row = envelope.data;
    }
  }
  return row && typeof row === "object" ? (row as Record<string, unknown>) : {};
}

function mapAgentUser(raw: Record<string, unknown> | null | undefined): AgentUser {
  const row = raw && typeof raw === "object" ? raw : {};
  return {
    id: idOf(row),
    name: String(raw.name ?? ""),
    mobile: raw.mobile != null ? String(raw.mobile) : undefined,
    role: (raw.role ?? "COLLECTION_AGENT") as AgentUser["role"],
    tenantId: String(raw.tenantId ?? ""),
    branchId: String(raw.branchId ?? ""),
    branchName: raw.branchName != null ? String(raw.branchName) : undefined,
    tenantName: raw.tenantName != null ? String(raw.tenantName) : undefined,
    tenantCode: raw.tenantCode != null ? String(raw.tenantCode) : undefined,
    permissions: Array.isArray(raw.permissions) ? (raw.permissions as string[]) : [],
    mustSetPassword: Boolean(raw.mustSetPassword),
  };
}

function mapCustomerScheme(raw: Record<string, unknown>): AgentSchemeSummary {
  const snap = (raw.planSnapshot ?? {}) as Record<string, unknown>;
  const flex = raw.flexiblePhase as string | undefined;
  const phaseRaw = raw.phase as string | undefined;
  const paid = raw.totals as { paidPaise?: number; amountPaidPaise?: number; goldWeightMg?: number; totalPaid?: { amountPaise?: number } } | undefined;
  const totalPaidPaise =
    (raw.totalPaidPaise as number | undefined) ??
    paid?.amountPaidPaise ??
    paid?.totalPaid?.amountPaise ??
    paid?.paidPaise;
  return {
    id: idOf(raw),
    enrollmentNumber: String(raw.enrollmentNumber ?? ""),
    planName: String(snap.displayName ?? snap.name ?? raw.planName ?? "Savings scheme"),
    status: String(raw.status ?? "ACTIVE"),
    paymentPattern: String(raw.paymentPattern ?? "FIXED") as "FIXED" | "FLEXIBLE",
    valueBasis: String(raw.valueBasis ?? "CASH") as "CASH" | "GOLD_WEIGHT",
    phase:
      phaseRaw === "FREE" || flex === "FLEXIBLE"
        ? "FREE"
        : phaseRaw === "CAPPED" || flex === "CAPPED"
          ? "CAPPED"
          : undefined,
    installmentAmountPaise: raw.installmentAmountPaise as number | undefined,
    nextAmountPaise: (raw.nextAmountPaise ?? raw.installmentAmountPaise) as number | undefined,
    payableMaxPaise: raw.payableMaxPaise as number | undefined,
    payableLabel: raw.payableLabel != null ? String(raw.payableLabel) : undefined,
    payable: raw.payable != null ? Boolean(raw.payable) : undefined,
    progressLabel: raw.progressLabel != null ? String(raw.progressLabel) : undefined,
    maturityDate: raw.maturityDate as string | undefined,
    totalPaidPaise,
    goldBalanceMg: (raw.goldBalanceMg as number | undefined) ?? paid?.goldWeightMg,
  };
}

function normalizeCustomer(raw: Record<string, unknown>): AgentCustomer {
  const schemesRaw = (
    Array.isArray(raw.activeSchemes)
      ? raw.activeSchemes
      : Array.isArray(raw.schemes)
        ? raw.schemes
        : []
  ) as Record<string, unknown>[];
  const summary = raw.schemeSummary as { active?: number; total?: number } | undefined;
  const collectable = new Set(["ACTIVE", "LOCKED", "DEFAULTED"]);
  const schemes = schemesRaw
    .filter((row) => collectable.has(String(row.status ?? "ACTIVE")))
    .map((row) => mapCustomerScheme(row));
  return {
    ...(raw as unknown as AgentCustomer),
    id: idOf(raw),
    customerNumber: String(raw.customerNumber ?? ""),
    name: String(raw.name ?? ""),
    mobile: String(raw.mobile ?? ""),
    passbookNumber: String(raw.passbookNumber ?? ""),
    schemeSummary: summary
      ? { active: Number(summary.active ?? schemes.length), total: Number(summary.total ?? schemes.length) }
      : { active: schemes.length, total: schemes.length },
    schemes,
    version: Number(raw.version ?? 0),
  };
}
function normalizePayableRange(raw: Record<string, unknown>): AgentPayableRange {
  const min = Number(raw.minPayablePaise ?? 0);
  const max = Number(raw.maxPayablePaise ?? min);
  const phaseRaw = String(raw.phase ?? "");
  const phase =
    phaseRaw === "FLEXIBLE" ? "FREE" : phaseRaw === "CAPPED" ? "CAPPED" : (phaseRaw as AgentPayableRange["phase"]);
  return {
    ...(raw as unknown as AgentPayableRange),
    model: String(raw.model ?? "FIXED") as AgentPayableRange["model"],
    phase,
    minPayablePaise: min,
    maxPayablePaise: max,
    suggestedPaise: Number(raw.suggestedPaise ?? (min > 0 && max >= min ? min : 0)),
    expectedVersion: raw.expectedVersion != null ? Number(raw.expectedVersion) : undefined,
    positionVersion: raw.positionVersion != null ? Number(raw.positionVersion) : undefined,
    payable: Boolean(raw.payable ?? max > 0),
    targetCycle: raw.targetCycle != null ? String(raw.targetCycle) : undefined,
  };
}

function passbookRowToLedgerEntry(row: Record<string, unknown>, index: number) {
  const payment = (row.payment ?? null) as Record<string, unknown> | null;
  const amountPaid = (row.amountPaid ?? payment?.amountPaid) as { amountPaise?: number } | undefined;
  const goldAccrual = (row.goldAccrual ?? payment?.goldAccrual) as { weightMg?: number } | undefined;
  const paidAt = payment?.paidAt ?? row.paidAt ?? row.effectiveAt;
  const receiptNumber =
    payment?.receiptNumber != null
      ? String(payment.receiptNumber)
      : row.receiptNumber != null
        ? String(row.receiptNumber)
        : undefined;
  const paymentId = String(row.paymentId ?? payment?.id ?? payment?._id ?? "");
  const amountPaise = Number(row.amountPaise ?? amountPaid?.amountPaise ?? 0);
  const hasPayment = amountPaise > 0 && Boolean(payment || amountPaid?.amountPaise || receiptNumber || paymentId);
  const effectiveAtRaw = paidAt ?? (hasPayment ? row.createdAt : undefined);
  const effectiveAt =
    effectiveAtRaw != null && String(effectiveAtRaw)
      ? new Date(String(effectiveAtRaw)).toISOString()
      : "";

  return {
    id: paymentId || idOf(row) || `led_${index + 1}`,
    type: String(row.type ?? "INSTALLMENT_PAYMENT"),
    sequence: Number(row.sequence ?? row.entryNumber ?? row.installmentNumber ?? index + 1),
    amountPaise,
    weightMg:
      row.weightMg != null
        ? Number(row.weightMg)
        : goldAccrual?.weightMg != null
          ? Number(goldAccrual.weightMg)
          : undefined,
    cycle: row.cycle != null ? String(row.cycle) : undefined,
    effectiveAt,
    paymentId,
    receiptNumber,
    mode: payment?.mode != null ? String(payment.mode) : row.mode != null ? String(row.mode) : undefined,
    installmentNumber: row.installmentNumber != null ? Number(row.installmentNumber) : undefined,
    hasPayment,
  };
}

function normalizePassbook(raw: Record<string, unknown>): AgentPassbook {
  const schemeRaw = (raw.scheme ?? {}) as Record<string, unknown>;
  const rows = (Array.isArray(raw.ledger) ? raw.ledger : Array.isArray(raw.rows) ? raw.rows : []) as Record<
    string,
    unknown
  >[];
  const mapped = rows.map(passbookRowToLedgerEntry);
  const ledger = mapped
    .filter((entry) => entry.hasPayment)
    .sort((a, b) => (b.effectiveAt || "").localeCompare(a.effectiveAt || ""))
    .map(({ hasPayment: _drop, ...entry }) => entry);
  return {
    scheme: {
      id: idOf(schemeRaw),
      enrollmentNumber: String(schemeRaw.enrollmentNumber ?? schemeRaw.schemeNumber ?? ""),
      status: String(schemeRaw.status ?? "ACTIVE"),
    },
    ledger,
  };
}

function normalizeScheme(raw: Record<string, unknown>): AgentScheme {
  const snap = (raw.planSnapshot ?? {}) as Record<string, unknown>;
  const plan = (raw.plan ?? {}) as Record<string, unknown>;
  const flex = raw.flexiblePhase as string | undefined;
  return {
    ...(raw as unknown as AgentScheme),
    id: idOf(raw),
    customerId: String(raw.customerId ?? ""),
    enrollmentNumber: String(raw.enrollmentNumber ?? raw.schemeNumber ?? ""),
    planName: String(raw.planName ?? snap.displayName ?? snap.name ?? plan.name ?? "Savings scheme"),
    paymentPattern: String(raw.paymentPattern ?? raw.model ?? "FIXED") as AgentScheme["paymentPattern"],
    valueBasis: String(raw.valueBasis ?? snap.valueBasis ?? plan.valueBasis ?? "CASH") as AgentScheme["valueBasis"],
    phase: flex === "FLEXIBLE" ? "FREE" : flex === "CAPPED" ? "CAPPED" : undefined,
    startDate: String(raw.startDate ?? ""),
    positionVersion: Number(raw.positionVersion ?? 0),
    version: Number(raw.version ?? 0),
    totalPaidPaise: (raw.totals as { paidPaise?: number } | undefined)?.paidPaise ?? (raw.totalPaidPaise as number | undefined),
    goldBalanceMg: (raw.totals as { goldWeightMg?: number } | undefined)?.goldWeightMg ?? (raw.goldBalanceMg as number | undefined),
  };
}
function mapPerson(raw: unknown): { id?: string; name?: string } | undefined {
  if (!raw || typeof raw === "string") return raw ? { id: raw, name: undefined } : undefined;
  const row = raw as Record<string, unknown>;
  return { id: idOf(row), name: row.name != null ? String(row.name) : undefined };
}

function mapBranch(raw: unknown): AgentPayment["branch"] {
  if (!raw || typeof raw !== "object") return undefined;
  const row = raw as Record<string, unknown>;
  return {
    id: idOf(row),
    name: row.name != null ? String(row.name) : undefined,
    code: row.code != null ? String(row.code) : undefined,
  };
}

function normalizePayment(raw: Record<string, unknown>): AgentPayment {
  const customer = (raw.customer ?? { name: "Customer" }) as Record<string, unknown>;
  const scheme = (raw.scheme ?? { enrollmentNumber: "" }) as Record<string, unknown>;
  const goldRaw = raw.goldAccrual as Record<string, unknown> | null | undefined;
  const amountWrap = raw.amount as { amountPaise?: number } | undefined;
  const weightMg =
    raw.weightMg != null
      ? Number(raw.weightMg)
      : goldRaw?.weightMg != null
        ? Number(goldRaw.weightMg)
        : undefined;
  const ratePerGramPaise =
    raw.ratePerGramPaise != null
      ? Number(raw.ratePerGramPaise)
      : goldRaw?.ratePerGramPaise != null
        ? Number(goldRaw.ratePerGramPaise)
        : undefined;
  return {
    ...(raw as unknown as AgentPayment),
    id: idOf(raw),
    receiptNumber: String(raw.receiptNumber ?? ""),
    amountPaise: Number(raw.amountPaise ?? amountWrap?.amountPaise ?? 0),
    mode: String(raw.mode ?? "CASH"),
    status: String(raw.status ?? "SUCCESS"),
    source: String(raw.source ?? "STAFF_APP"),
    customer: {
      id: idOf(customer),
      name: String(customer.name ?? "Customer"),
      mobile: customer.mobile != null ? String(customer.mobile) : undefined,
      customerNumber: customer.customerNumber != null ? String(customer.customerNumber) : undefined,
    },
    scheme: {
      id: idOf(scheme),
      enrollmentNumber: String(scheme.enrollmentNumber ?? ""),
      planName: String(scheme.planName ?? scheme.enrollmentNumber ?? "Savings scheme"),
      paymentPattern: scheme.paymentPattern != null ? String(scheme.paymentPattern) : undefined,
      valueBasis: scheme.valueBasis != null ? String(scheme.valueBasis) : undefined,
      status: scheme.status != null ? String(scheme.status) : undefined,
    },
    weightMg,
    ratePerGramPaise,
    goldAccrual: goldRaw
      ? {
          weightMg: Number(goldRaw.weightMg ?? weightMg ?? 0),
          weightDisplay: goldRaw.weightDisplay != null ? String(goldRaw.weightDisplay) : undefined,
          ratePerGramPaise: Number(goldRaw.ratePerGramPaise ?? ratePerGramPaise ?? 0),
          ratePerGramDisplay: goldRaw.ratePerGramDisplay != null ? String(goldRaw.ratePerGramDisplay) : undefined,
          purchasedAt: goldRaw.purchasedAt != null ? String(goldRaw.purchasedAt) : null,
        }
      : weightMg || ratePerGramPaise
        ? {
            weightMg: weightMg ?? 0,
            ratePerGramPaise: ratePerGramPaise ?? 0,
          }
        : null,
    paidAt: String(raw.paidAt ?? new Date().toISOString()),
    targetCycle: raw.targetCycle != null ? String(raw.targetCycle) : undefined,
    remarks: raw.remarks != null ? String(raw.remarks) : undefined,
    reversedAt: raw.reversedAt != null ? String(raw.reversedAt) : null,
    reversalReason: raw.reversalReason != null ? String(raw.reversalReason) : undefined,
    branch: mapBranch(raw.branch),
    collectedBy: mapPerson(raw.collectedBy),
  };
}
function normalizeHandover(raw: Record<string, unknown>): AgentHandover {
  const timelineRaw = Array.isArray(raw.timeline) ? (raw.timeline as Record<string, unknown>[]) : [];
  return {
    ...(raw as unknown as AgentHandover),
    id: idOf(raw),
    amountPaise: Number(raw.amountPaise ?? 0),
    acceptedAmountPaise: raw.acceptedAmountPaise != null ? Number(raw.acceptedAmountPaise) : null,
    discrepancyPaise: raw.discrepancyPaise != null ? Number(raw.discrepancyPaise) : null,
    submittedAt: String(raw.submittedAt ?? raw.createdAt ?? new Date().toISOString()),
    settledAt: raw.settledAt != null ? String(raw.settledAt) : null,
    branch: mapBranch(raw.branch),
    settledBy: mapPerson(raw.settledBy) ?? null,
    timeline: timelineRaw.map((ev) => ({
      event: String(ev.event ?? ""),
      at: String(ev.at ?? ""),
      by: String(ev.by ?? ""),
      note: ev.note != null ? String(ev.note) : undefined,
    })),
  };
}

function asList<T>(raw: unknown, map: (row: Record<string, unknown>) => T): T[] {
  if (Array.isArray(raw)) return raw.map((row) => map(row as Record<string, unknown>));
  return [];
}

const mockBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args) => {
  await wait();
  const url = pathOf(args);
  const method = methodOf(args);
  const body = bodyOf(args);
  const params = paramsOf(args);

  if (url === "/auth/login" && method === "POST") {
    if (!body.tenantCode) {
      return { error: { status: 409, data: { success: false, error: { code: "TENANT_SELECTION_REQUIRED", message: "Select a jewellery to continue.", details: { tenants: agentTenantChoices } } } satisfies AgentError } };
    }
    const tenant = agentTenantChoices.find((item) => item.tenantCode === body.tenantCode) ?? agentTenantChoices[0];
    return ok({ user: { ...agentUser, tenantName: tenant.displayName, tenantCode: tenant.tenantCode }, accessToken: "mock-agent-access", refreshToken: "mock-agent-refresh", expiresIn: 1800, tokenType: "Bearer" } satisfies AgentLoginResponse);
  }
  if (url === "/auth/refresh" && method === "POST") return ok({ accessToken: "mock-agent-access-refreshed", refreshToken: "mock-agent-refresh-refreshed", expiresIn: 1800, tokenType: "Bearer" });
  if (url === "/auth/logout" && method === "POST") return ok({ loggedOut: true });
  if (url === "/auth/me") return ok(agentUser);
  if (url === "/auth/change-password" && method === "POST") return ok({ changed: true });
  if (url === "/auth/devices") return ok([{ deviceId: "collector-web-001", platform: "web", appVersion: "1.0.0", current: true, lastUsedAt: new Date().toISOString() }]);
  if (url === "/staff/profile") return ok(agentUser);
  if (url === "/staff/cash/summary") return ok(agentCashSummary);
  if (url === "/staff/collections/summary") return ok(agentCollectionSummary);
  if (url === "/staff/gold-rate/current") return ok(agentGoldRate);
  if (url === "/staff/customers") {
    const q = String(params.q ?? "").trim().toLowerCase();
    const rows = !q ? agentCustomers : agentCustomers.filter((item) => [item.name, item.mobile, item.customerNumber, item.passbookNumber].some((value) => value.toLowerCase().includes(q)));
    return ok(rows);
  }
  if (url === "/staff/customers/check-mobile") {
    const digits = String(params.mobile ?? "").replace(/\D/g, "").slice(-10);
    const customer = agentCustomers.find((item) => item.mobile.replace(/\D/g, "").slice(-10) === digits);
    return ok({ exists: Boolean(customer), customerId: customer?.id });
  }
  const customerMatch = url.match(/^\/staff\/customers\/([^/]+)$/);
  if (customerMatch) return ok(agentCustomers.find((item) => item.id === customerMatch[1]) ?? agentCustomers[0]);
  const schemeMatch = url.match(/^\/staff\/schemes\/([^/]+)$/);
  if (schemeMatch) return ok(agentSchemes.find((item) => item.id === schemeMatch[1]) ?? agentCustomers.flatMap((item) => item.schemes ?? []).find((item) => item.id === schemeMatch[1]) ?? agentSchemes[0]);
  const rangeMatch = url.match(/^\/staff\/schemes\/([^/]+)\/payable-range$/);
  if (rangeMatch) {
    const scheme = (agentSchemes.find((item) => item.id === rangeMatch[1]) ?? agentCustomers.flatMap((item) => item.schemes ?? []).find((item) => item.id === rangeMatch[1]) ?? agentSchemes[0]) as AgentScheme;
    if (scheme.paymentPattern === "FIXED") return ok({ model: "FIXED", installmentNumber: 3, minPayablePaise: scheme.installmentAmountPaise ?? scheme.nextAmountPaise ?? 250000, maxPayablePaise: scheme.installmentAmountPaise ?? scheme.nextAmountPaise ?? 250000, suggestedPaise: scheme.installmentAmountPaise ?? scheme.nextAmountPaise ?? 250000, expectedVersion: scheme.version, payable: true } satisfies AgentPayableRange);
    const free = scheme.phase === "FREE";
    return ok({ model: "FLEXIBLE", phase: free ? "FREE" : "CAPPED", contributionIsOptional: true, targetCycle: String(params.targetCycle ?? "2026-09"), minPayablePaise: free ? 50000 : 10000, maxPayablePaise: free ? 1000000 : 150000, suggestedPaise: free ? 100000 : 150000, paymentIncrementPaise: 100, unusedAllowanceCarriesForward: false, positionVersion: scheme.positionVersion, payable: true, nextCycleAction: "PAY_CURRENT_CYCLE" } satisfies AgentPayableRange);
  }
  const passbookMatch = url.match(/^\/staff\/schemes\/([^/]+)\/passbook$/);
  if (passbookMatch) {
    const scheme = agentSchemes.find((item) => item.id === passbookMatch[1]) ?? agentSchemes[0];
    return ok({ scheme: { id: scheme.id, enrollmentNumber: scheme.enrollmentNumber, status: scheme.status }, ledger: agentPayments.filter((item) => item.scheme.id === scheme.id).map((item, index) => ({ id: `led_${item.id}`, type: "INSTALLMENT_PAYMENT", sequence: index + 1, amountPaise: item.amountPaise, weightMg: item.weightMg ?? undefined, cycle: item.targetCycle, effectiveAt: item.paidAt, paymentId: item.id })) } satisfies AgentPassbook);
  }
  if (url === "/staff/payments" && method === "GET") {
    const { items, page } = paginateSlice(agentPayments, params);
    return ok(items, page);
  }
  const paymentDetailMatch = url.match(/^\/staff\/payments\/([^/]+)$/);
  if (paymentDetailMatch && method === "GET") {
    const payment = agentPayments.find((item) => item.id === paymentDetailMatch[1]) ?? agentPayments[0];
    return payment ? ok(payment) : { error: { status: 404, data: { success: false, error: { code: "NOT_FOUND", message: "Payment not found" } } } };
  }
  if (url === "/staff/cash/collections") return ok(agentPayments);
  if (url === "/staff/payments" && method === "POST") {
    const scheme = agentSchemes.find((item) => item.id === body.schemeId) ?? agentSchemes[0];
    const customer = agentCustomers.find((item) => item.id === scheme.customerId) ?? agentCustomers[0];
    const amountPaise = Number(body.amountPaise ?? 0);
    const weightMg = scheme.valueBasis === "GOLD_WEIGHT" ? Math.floor((amountPaise * 1000) / agentGoldRate.ratePerGramPaise) : undefined;
    const payment: AgentPayment = { id: `agt_pay_${Date.now()}`, receiptNumber: `RCP-2026-${String(Date.now()).slice(-7)}`, amountPaise, weightMg, ratePerGramPaise: weightMg ? agentGoldRate.ratePerGramPaise : undefined, mode: "CASH", status: "SUCCESS", source: "STAFF_APP", paidAt: new Date().toISOString(), targetCycle: body.targetCycle ? String(body.targetCycle) : undefined, customer: { id: customer.id, name: customer.name }, scheme: { id: scheme.id, enrollmentNumber: scheme.enrollmentNumber, planName: scheme.planName } };
    agentPayments.unshift(payment);
    updateMockCashSummary({ ...agentCashSummary, cashCollectedPaise: agentCashSummary.cashCollectedPaise + amountPaise, cashInHandPaise: agentCashSummary.cashInHandPaise + amountPaise, collectedPaise: agentCashSummary.collectedPaise + amountPaise });
    return ok(payment);
  }
  if (url === "/staff/cash/handovers" && method === "GET") return ok(agentHandovers);
  if (url === "/staff/cash/handovers" && method === "POST") {
    const amountPaise = Number(body.amountPaise ?? 0);
    if (amountPaise > agentCashSummary.cashInHandPaise) return { error: { status: 422, data: { success: false, error: { code: "CASH_HANDOVER_AMOUNT_EXCEEDS_BALANCE", message: "The handover exceeds your cash-in-hand balance.", details: { cashInHandPaise: agentCashSummary.cashInHandPaise } } } satisfies AgentError } };
    const handover: AgentHandover = { id: `agt_ho_${Date.now()}`, amountPaise, status: "PENDING", initiator: "STAFF", remarks: body.remarks ? String(body.remarks) : undefined, submittedAt: new Date().toISOString(), settledAt: null };
    agentHandovers.unshift(handover);
    updateMockCashSummary({ ...agentCashSummary, cashInHandPaise: agentCashSummary.cashInHandPaise - amountPaise, cashPendingAcceptancePaise: agentCashSummary.cashPendingAcceptancePaise + amountPaise });
    return ok(handover);
  }
  const handoverMatch = url.match(/^\/staff\/cash\/handovers\/([^/]+)$/);
  if (handoverMatch) return ok(agentHandovers.find((item) => item.id === handoverMatch[1]) ?? agentHandovers[0]);
  const cancelMatch = url.match(/^\/staff\/cash\/handovers\/([^/]+)\/cancel$/);
  if (cancelMatch && method === "POST") {
    const handover = agentHandovers.find((item) => item.id === cancelMatch[1]);
    if (handover?.status === "PENDING") {
      handover.status = "CANCELLED";
      handover.reason = "Cancelled by staff";
      updateMockCashSummary({ ...agentCashSummary, cashInHandPaise: agentCashSummary.cashInHandPaise + handover.amountPaise, cashPendingAcceptancePaise: Math.max(0, agentCashSummary.cashPendingAcceptancePaise - handover.amountPaise) });
    }
    return ok(handover ?? agentHandovers[0]);
  }
  if (url === "/staff/report") return ok(agentReport);
  return ok({});
};

const liveBaseQuery = fetchBaseQuery({
  baseUrl: env.apiBaseUrl,
  responseHandler: readContractResponseBody,
  prepareHeaders(headers) {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem(AGENT_ACCESS_KEY);
      if (token) headers.set("Authorization", `Bearer ${token}`);
    }
    headers.set("Accept", "application/json");
    return headers;
  },
});

function withMutationHeaders(args: string | FetchArgs) {
  if (typeof args === "string" || !["POST", "PUT", "PATCH", "DELETE"].includes(String(args.method ?? "GET").toUpperCase())) return args;
  const headers = new Headers(args.headers as HeadersInit | undefined);
  if (!headers.has("X-Idempotency-Key")) headers.set("X-Idempotency-Key", newIdempotencyKey());
  return { ...args, headers };
}

function unwrap(result: { data?: unknown; error?: FetchBaseQueryError; meta?: unknown }) {
  if (result.error) {
    return { error: normalizeFetchBaseQueryError(result.error) };
  }
  const raw = result.data as Envelope<unknown> | AgentError | undefined;
  if (raw && typeof raw === "object" && "success" in raw) {
    if (raw.success) return { data: raw.data, meta: raw.meta };
    return {
      error: normalizeFetchBaseQueryError({
        status: "CUSTOM_ERROR",
        error: raw.error.message,
        data: { success: false, error: raw.error },
      }),
    };
  }
  return { data: result.data, meta: result.meta };
}

export type AgentPaymentListPage = {
  items: AgentPayment[];
  nextCursor: string | null;
  hasMore: boolean;
};

const AGENT_HISTORY_PAGE_SIZE = 20;

function paymentListMeta(meta: unknown): Pick<AgentPaymentListPage, "nextCursor" | "hasMore"> {
  const row = meta as Envelope<unknown>["meta"] | undefined;
  return {
    nextCursor: row?.nextCursor ?? null,
    hasMore: Boolean(row?.hasMore),
  };
}

type AgentBaseQueryExtra = { _authRetry?: boolean };

const dynamicBaseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError,
  AgentBaseQueryExtra
> = async (args, api, extra) => {
  const request = env.useMocks ? args : withMutationHeaders(args);
  let result = env.useMocks
    ? await mockBaseQuery(request, api, extra)
    : await liveBaseQuery(request, api, extra);
  const url = pathOf(request);
  const guard = authRefreshGuard(url, extra, ["/auth/refresh", "/auth/login"]);

  if (shouldAttemptAuthRefresh(result.error, guard, env.useMocks)) {
    const refreshed = await refreshAfterUnauthorized("agent", guard);
    if (refreshed) {
      const accessToken = localStorage.getItem(AGENT_ACCESS_KEY);
      const refreshToken = localStorage.getItem(AGENT_REFRESH_KEY);
      if (accessToken) {
        api.dispatch(
          patchAgentTokens({
            accessToken,
            refreshToken: refreshToken ?? undefined,
          }),
        );
      }
      result = await retryAuthorizedRequest(liveBaseQuery, request, api, extra);
    } else if (shouldForceAuthLogout("agent", true)) {
      api.dispatch(clearAgentSession());
    }
  } else if (
    !env.useMocks &&
    result.error?.status === 401 &&
    typeof window !== "undefined" &&
    !guard.skipRefresh &&
    shouldForceAuthLogout("agent", false)
  ) {
    api.dispatch(clearAgentSession());
  }
  return unwrap(result);
};

export const agentApi = createApi({
  reducerPath: "agentApi",
  baseQuery: dynamicBaseQuery,
  tagTypes: ["AgentCash", "AgentPayments", "AgentHandovers", "AgentProfile", "AgentScheme", "AgentCustomer"],
  endpoints: (builder) => ({
    agentLogin: builder.mutation<AgentLoginResponse, { tenantCode?: string; mobile: string; password: string; deviceId: string; platform: string; appVersion: string }>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      transformResponse: (raw: unknown) => {
        const payload = peelAgentPayload(raw);
        const userRaw = payload.user;
        return {
          accessToken: String(payload.accessToken ?? ""),
          refreshToken: String(payload.refreshToken ?? ""),
          expiresIn: Number(payload.expiresIn ?? 0),
          tokenType: (payload.tokenType ?? "Bearer") as "Bearer",
          user: mapAgentUser(
            userRaw && typeof userRaw === "object"
              ? (userRaw as Record<string, unknown>)
              : undefined,
          ),
        };
      },
    }),
    agentLogout: builder.mutation<{ loggedOut: boolean }, { refreshToken: string }>({ query: (body) => ({ url: "/auth/logout", method: "POST", body }) }),
    getAgentMe: builder.query<AgentUserResult, void>({
      query: () => "/auth/me",
      transformResponse: (raw: Record<string, unknown>) => mapAgentUser(raw),
    }),
    getAgentProfile: builder.query<AgentUserResult, void>({
      query: () => "/staff/profile",
      transformResponse: (raw: Record<string, unknown>) => mapAgentUser(raw),
      providesTags: ["AgentProfile"],
    }),
    changeAgentPassword: builder.mutation<{ changed: boolean }, { currentPassword: string; newPassword: string }>({ query: (body) => ({ url: "/auth/change-password", method: "POST", body }) }),
    getAgentCashSummary: builder.query<AgentCashSummary, void>({ query: () => "/staff/cash/summary", providesTags: ["AgentCash"], refetchOnMountOrArgChange: 30 }),
    getAgentCollectionSummary: builder.query<AgentCollectionSummary, { from: string; to: string }>({ query: (params) => ({ url: "/staff/collections/summary", params }), providesTags: ["AgentPayments"], refetchOnMountOrArgChange: 30 }),
    getAgentGoldRate: builder.query<AgentGoldRate | null, void>({
      query: () => "/staff/gold-rate/current",
      transformResponse: (raw: (AgentGoldRate & { _id?: string }) | null) => {
        if (!raw?.ratePerGramPaise) return null;
        return { ...raw, id: raw.id ?? raw._id ?? "" };
      },
    }),
    searchAgentCustomers: builder.query<AgentCustomer[], { q: string; cursor?: string; limit?: number }>({
      query: (params) => ({ url: "/staff/customers", params }),
      transformResponse: (rows: unknown) => asList(rows, normalizeCustomer),
    }),
    getAgentCustomer: builder.query<AgentCustomer, string>({
      query: (id) => `/staff/customers/${id}`,
      transformResponse: (raw: Record<string, unknown>) => normalizeCustomer(raw),
      providesTags: (_r, _e, id) => [{ type: "AgentCustomer", id }],
    }),
    getAgentScheme: builder.query<AgentScheme, string>({ query: (id) => `/staff/schemes/${id}`, transformResponse: (raw: Record<string, unknown>) => normalizeScheme(raw), providesTags: (_r, _e, id) => [{ type: "AgentScheme", id }] }),
    getAgentPayableRange: builder.query<AgentPayableRange, { schemeId: string; targetCycle?: string }>({
      query: ({ schemeId, targetCycle }) => ({ url: `/staff/schemes/${schemeId}/payable-range`, params: targetCycle ? { targetCycle } : undefined }),
      transformResponse: (raw: Record<string, unknown>) => normalizePayableRange(raw),
      providesTags: (_r, _e, arg) => [{ type: "AgentScheme", id: arg.schemeId }],
    }),
    getAgentPassbook: builder.query<AgentPassbook, string>({
      query: (id) => `/staff/schemes/${id}/passbook`,
      transformResponse: (raw: Record<string, unknown>) => normalizePassbook(raw),
      providesTags: (_r, _e, id) => [{ type: "AgentScheme", id: `passbook-${id}` }],
    }),
    recordAgentPayment: builder.mutation<
      AgentPayment,
      {
        schemeId: string;
        amountPaise: number;
        mode: AgentManualPaymentMode;
        expectedVersion?: number;
        expectedPositionVersion?: number;
        targetCycle?: string;
        reference?: string;
        remarks?: string;
      }
    >({
      query: (body) => ({ url: "/staff/payments", method: "POST", body }),
      transformResponse: (raw: Record<string, unknown>) => normalizePayment(raw),
      invalidatesTags: (_r, _e, arg) => [
        "AgentCash",
        "AgentPayments",
        "AgentScheme",
        "AgentCustomer",
        { type: "AgentScheme", id: `passbook-${arg.schemeId}` },
      ],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data: payment } = await queryFulfilled;
          const touchList = (limit: number) =>
            dispatch(
              agentApi.util.updateQueryData("getAgentPayments", { limit }, (draft) => {
                if (!draft.some((row) => row.id === payment.id)) draft.unshift(payment);
              }),
            );
          touchList(4);
          dispatch(
            agentApi.util.updateQueryData(
              "getAgentPaymentsPage",
              { limit: AGENT_HISTORY_PAGE_SIZE },
              (draft) => {
                if (!draft.items.some((row) => row.id === payment.id)) draft.items.unshift(payment);
              },
            ),
          );
        } catch {
          /* ignore */
        }
      },
    }),
    getAgentPayments: builder.query<AgentPayment[], { from?: string; to?: string; cursor?: string; limit?: number }>({
      query: (params) => ({ url: "/staff/payments", params: { sort: "paidAt:desc", ...params } }),
      transformResponse: (rows: unknown) => asList(rows, normalizePayment),
      providesTags: ["AgentPayments"],
      refetchOnMountOrArgChange: 30,
    }),
    getAgentPayment: builder.query<AgentPayment, string>({
      query: (id) => `/staff/payments/${id}`,
      transformResponse: (raw: Record<string, unknown>) => normalizePayment(raw),
      providesTags: (_r, _e, id) => [{ type: "AgentPayments", id }],
    }),
    getAgentPaymentsPage: builder.query<
      AgentPaymentListPage,
      { from?: string; to?: string; cursor?: string; limit?: number }
    >({
      query: ({ cursor, limit = AGENT_HISTORY_PAGE_SIZE, from, to }) => ({
        url: "/staff/payments",
        params: {
          sort: "paidAt:desc",
          limit,
          ...(cursor ? { cursor } : {}),
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
        },
      }),
      serializeQueryArgs: ({ queryArgs }) => {
        const stable = { ...queryArgs };
        delete stable.cursor;
        return stable;
      },
      merge: (current, incoming, { arg }) => {
        if (!arg.cursor) return incoming;
        const seen = new Set(current.items.map((row) => row.id));
        const appended = incoming.items.filter((row) => !seen.has(row.id));
        return { ...incoming, items: [...current.items, ...appended] };
      },
      forceRefetch: ({ currentArg, previousArg }) => currentArg?.cursor !== previousArg?.cursor,
      transformResponse: (rows: unknown, meta) => ({
        items: asList(rows, normalizePayment),
        ...paymentListMeta(meta),
      }),
      providesTags: ["AgentPayments"],
      refetchOnMountOrArgChange: 30,
    }),
    getAgentHandovers: builder.query<AgentHandover[], { status?: string; from?: string; to?: string }>({
      query: (params) => ({ url: "/staff/cash/handovers", params }),
      transformResponse: (rows: unknown) => asList(rows, normalizeHandover),
      providesTags: ["AgentHandovers"],
    }),
    getAgentHandover: builder.query<AgentHandover, string>({ query: (id) => `/staff/cash/handovers/${id}`, transformResponse: (raw: Record<string, unknown>) => normalizeHandover(raw), providesTags: (_r, _e, id) => [{ type: "AgentHandovers", id }] }),
    createAgentHandover: builder.mutation<AgentHandover, { amountPaise: number; remarks?: string }>({ query: (body) => ({ url: "/staff/cash/handovers", method: "POST", body }), transformResponse: (raw: Record<string, unknown>) => normalizeHandover(raw), invalidatesTags: ["AgentCash", "AgentHandovers"] }),
    cancelAgentHandover: builder.mutation<AgentHandover, string>({ query: (id) => ({ url: `/staff/cash/handovers/${id}/cancel`, method: "POST" }), transformResponse: (raw: Record<string, unknown>) => normalizeHandover(raw), invalidatesTags: ["AgentCash", "AgentHandovers"] }),
    getAgentReport: builder.query<AgentReport, { from: string; to: string }>({
      queryFn: async (arg, api, extra, baseQuery) => {
        if (env.useMocks) return baseQuery({ url: "/staff/report", params: arg }) as Promise<{ data: AgentReport }>;
        const result = await baseQuery({ url: "/staff/payments", params: { ...arg, includeSummary: true, limit: 100 } });
        if (result.error) return { error: result.error };
        const raw = result.data as Record<string, unknown> | AgentPayment[];
        if (!Array.isArray(raw) && raw.days) return { data: raw as unknown as AgentReport };
        const rows = (Array.isArray(raw) ? raw : []) as AgentPayment[];
        const byDay = new Map<string, { amountPaise: number; count: number; goldWeightMg: number }>();
        rows.forEach((row) => { const date = row.paidAt.slice(0, 10); const item = byDay.get(date) ?? { amountPaise: 0, count: 0, goldWeightMg: 0 }; item.amountPaise += row.amountPaise; item.count += 1; item.goldWeightMg += row.weightMg ?? 0; byDay.set(date, item); });
        const amountPaise = rows.reduce((sum, row) => sum + row.amountPaise, 0);
        return { data: { amountPaise, count: rows.length, goldWeightMg: rows.reduce((sum, row) => sum + (row.weightMg ?? 0), 0), averageCollectionPaise: rows.length ? Math.round(amountPaise / rows.length) : 0, days: [...byDay.entries()].map(([date, item]) => ({ date, ...item })).sort((a, b) => a.date.localeCompare(b.date)) } };
      },
      providesTags: ["AgentPayments"],
    }),
  }),
});

type AgentUserResult = AgentUser;

export const {
  useAgentLoginMutation,
  useAgentLogoutMutation,
  useGetAgentMeQuery,
  useGetAgentProfileQuery,
  useChangeAgentPasswordMutation,
  useGetAgentCashSummaryQuery,
  useGetAgentCollectionSummaryQuery,
  useGetAgentGoldRateQuery,
  useSearchAgentCustomersQuery,
  useGetAgentCustomerQuery,
  useGetAgentSchemeQuery,
  useGetAgentPayableRangeQuery,
  useGetAgentPassbookQuery,
  useRecordAgentPaymentMutation,
  useGetAgentPaymentsQuery,
  useGetAgentPaymentQuery,
  useGetAgentPaymentsPageQuery,
  useGetAgentHandoversQuery,
  useGetAgentHandoverQuery,
  useCreateAgentHandoverMutation,
  useCancelAgentHandoverMutation,
  useGetAgentReportQuery,
} = agentApi;
