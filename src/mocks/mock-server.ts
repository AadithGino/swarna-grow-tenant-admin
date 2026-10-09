import { env } from "@/src/config/env";
import { mockDb } from "./mock-db";
import {
  amountWithinPayableQuote,
  cappedCyclePayableBounds,
  CAPPED_CYCLE_INCREMENT,
  CAPPED_CYCLE_NORMAL_MIN,
} from "@/src/lib/payment-limits";
import { paginateSlice } from "@/src/lib/cursor-pagination";
import { mockAdminReport } from "./admin-report-mocks";
import {
  appendGrievanceMessage,
  buildGrievanceDetail,
  setGrievanceAssignee,
  setGrievanceStatus,
} from "./grievance-mocks";
import { matchesDemoDateRange } from "@/src/lib/demo-dates";
import { fuzzyMatchAny } from "@/src/lib/fuzzy-search";
import { synthesizePlanDetail, synthesizePlanStats } from "./plan-detail-mock";
import { buildPlanSchedulePreview } from "./plan-preview-mock";
import {
  synthesizeBranchDetail,
  synthesizeStaffDetail,
} from "./access-detail-mock";
import {
  buildBrandingPreview,
  mockAvailablePlans,
  mockSettingsBranding,
  mockSettingsOperations,
  mockSettingsProfile,
  mockSubscription,
  mockSubscriptionInvoices,
} from "./settings-mock";
import type {
  CashHandover,
  CashHandoverDetail,
  Customer,
  CustomerNomineeDetail,
  Enrollment,
  GoldRate,
  PayableQuote,
  Payment,
  SchemePlan,
  SettlementPreview,
} from "@/src/types/domain";

export interface MockRequest {
  mockKey: string;
  params?: Record<string, unknown>;
  body?: Record<string, unknown>;
}
const wait = () =>
  new Promise((resolve) => setTimeout(resolve, env.mockDelayMs));

const includes = (value: unknown, query: string) =>
  fuzzyMatchAny([value], query);

function syncKycSummary(customer: Customer) {
  const status = customer.kycDetail?.status;
  customer.kyc =
    status === "VERIFIED"
      ? "VERIFIED"
      : status === "REJECTED"
        ? "REJECTED"
        : "PENDING";
}

function nomineeDisplay(n: Customer["nomineeDetail"]) {
  if (!n) return undefined;
  return [n.name, n.relationshipLabel, n.mobile].filter(Boolean).join(" · ");
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  SPOUSE: "Spouse",
  PARENT: "Parent",
  CHILD: "Child",
  SIBLING: "Sibling",
  RELATIVE: "Relative",
  FRIEND: "Friend",
  OTHER: "Other",
};

const PAYMENT_MODE_BREAKDOWN: { mode: Payment["mode"]; label: string }[] = [
  { mode: "CASH", label: "Cash" },
  { mode: "CARD", label: "Card / POS" },
  { mode: "UPI", label: "UPI" },
  { mode: "BANK_TRANSFER", label: "Bank transfer" },
  { mode: "CHEQUE", label: "Cheque" },
  { mode: "ONLINE_GATEWAY", label: "Online payment" },
];

function paymentDayIso(payment: Payment): string {
  const match = payment.date.match(/^(\d{2}) Sep 2026/);
  return match ? `2026-09-${match[1]}` : "2026-09-14";
}

function paymentPaidAtIso(payment: Payment): string {
  const day = paymentDayIso(payment);
  const timeMatch = payment.date.match(/,\s*(\d{1,2}):(\d{2})/);
  const hour = timeMatch?.[1]?.padStart(2, "0") ?? "10";
  const minute = timeMatch?.[2] ?? "00";
  return `${day}T${hour}:${minute}:00+05:30`;
}

function amountPaise(amount: number) {
  return Math.round(amount * 100);
}

function toContractPayment(payment: Payment) {
  const paise = amountPaise(payment.amount);
  const source =
    payment.source === "ADMIN"
      ? "PORTAL"
      : payment.source === "STAFF"
        ? "STAFF_APP"
        : "CUSTOMER_APP";
  return {
    id: payment.id,
    receiptNumber: payment.receiptNo,
    paidAt: paymentPaidAtIso(payment),
    amount: {
      amountPaise: paise,
      amountDisplay: `₹${payment.amount.toLocaleString("en-IN")}`,
    },
    mode: payment.mode,
    status: payment.status,
    isLateSuccess: payment.isLateSuccess ?? false,
    customer: {
      id: payment.customerId,
      name: payment.customer,
      mobile: "9847XXXX33",
      passbookNumber: "MGR/2026/00412",
    },
    scheme: { schemeNumber: payment.enrollmentNo },
    collectedBy: { name: payment.staff },
    branch: { name: payment.branch },
    source,
  };
}

function buildPaymentsSummary(items: Payment[], statusFilter?: string) {
  const successful = items.filter((p) => p.status === "SUCCESS");
  const pending = items.filter((p) => p.status === "PENDING");
  const failed = items.filter((p) => p.status === "FAILED");
  const reversed = items.filter((p) => p.status === "REVERSED");
  const sum = (rows: Payment[]) =>
    rows.reduce((total, row) => total + row.amount, 0);
  const successfulAmount = sum(successful);
  const modeAmountStatus = statusFilter || "SUCCESS";
  const byMode = PAYMENT_MODE_BREAKDOWN.map(({ mode, label }) => {
    const rows = items.filter(
      (p) => p.mode === mode && p.status === modeAmountStatus,
    );
    const amount = sum(rows);
    return {
      mode,
      label,
      count: rows.length,
      amount: {
        amountPaise: amountPaise(amount),
        amountDisplay: `₹${amount.toLocaleString("en-IN")}`,
      },
    };
  });
  const byStatus = ["SUCCESS", "PENDING", "FAILED", "REVERSED"].map(
    (status) => {
      const rows = items.filter((p) => p.status === status);
      const amount = sum(rows);
      return {
        status,
        count: rows.length,
        amount: {
          amountPaise: amountPaise(amount),
          amountDisplay: `₹${amount.toLocaleString("en-IN")}`,
        },
      };
    },
  );
  const modeChartSeries = byMode
    .filter((row) => row.count > 0)
    .map((row) => ({
      x: row.label,
      y: row.amount.amountPaise,
      yDisplay: row.amount.amountDisplay,
      modeKey: row.mode,
    }));
  return {
    count: items.length,
    successfulCount: successful.length,
    pendingCount: pending.length,
    failedCount: failed.length,
    reversedCount: reversed.length,
    totalAmount: {
      amountPaise: amountPaise(sum(items)),
      amountDisplay: `₹${sum(items).toLocaleString("en-IN")}`,
    },
    successfulAmount: {
      amountPaise: amountPaise(successfulAmount),
      amountDisplay: `₹${successfulAmount.toLocaleString("en-IN")}`,
    },
    reversedAmount: {
      amountPaise: amountPaise(sum(reversed)),
      amountDisplay: `₹${sum(reversed).toLocaleString("en-IN")}`,
    },
    averageSuccessfulPayment:
      successful.length > 0
        ? {
            amountPaise: amountPaise(successfulAmount / successful.length),
            amountDisplay: `₹${Math.round(successfulAmount / successful.length).toLocaleString("en-IN")}`,
          }
        : { amountPaise: 0, amountDisplay: "₹0" },
    byMode,
    byStatus,
    charts: {
      modeDistribution: {
        chartType: "donut",
        title: "Filtered payments by mode",
        series: [
          { key: "PAYMENT_MODE", name: "Amount", data: modeChartSeries },
        ],
      },
    },
  };
}

function filterPaymentsList(params: Record<string, unknown>) {
  const from = String(params.from ?? "2026-09-01");
  const to = String(params.to ?? "2026-09-14");
  const status = params.status ? String(params.status) : "";
  const late =
    params.isLateSuccess === true ||
    params.isLateSuccess === "true" ||
    params.tab === "late";
  let items = mockDb.payments.filter((payment) => {
    const day = paymentDayIso(payment);
    return day >= from && day <= to;
  });
  if (status) items = items.filter((p) => p.status === status);
  if (late) items = items.filter((p) => p.isLateSuccess);
  const needle = String(params.q ?? "")
    .trim()
    .toLowerCase();
  if (needle) {
    items = items.filter(
      (p) =>
        includes(p.receiptNo, needle) ||
        includes(p.customer, needle) ||
        includes(p.enrollmentNo, needle),
    );
  }
  return items;
}

function buildHandoverDetail(row: CashHandover): CashHandoverDetail {
  const cashPayments = mockDb.payments
    .filter((p) => p.mode === "CASH" && p.status === "SUCCESS")
    .slice(0, row.payments);
  const paymentLines = cashPayments.map((p) => ({
    id: p.id,
    receiptNo: p.receiptNo,
    customer: p.customer,
    amount: p.amount,
    paidAt: p.date,
  }));
  const staffName = row.staff;
  const timeline: CashHandoverDetail["timeline"] = [
    {
      at: row.submittedAt,
      event: "SUBMITTED",
      by: row.initiatedBy === "ADMIN" ? "Arun Raj (branch)" : staffName,
      note: row.remarks,
    },
  ];
  if (row.status === "ACCEPTED" || row.status === "DISCREPANCY") {
    timeline.push({
      at: row.submittedAt.includes("Yesterday")
        ? "Yesterday, 18:15"
        : "Today, 16:55",
      event:
        row.status === "DISCREPANCY" ? "ACCEPTED_WITH_DISCREPANCY" : "ACCEPTED",
      by: row.acceptedBy ?? "Arun Raj",
      note:
        row.status === "DISCREPANCY"
          ? `Declared ${row.declared} vs system ${row.amount}`
          : row.remarks,
    });
  }
  if (row.status === "DISCREPANCY") {
    timeline.push({
      at: "Today, 10:00",
      event: "DISCREPANCY_OPEN",
      by: "System",
      note: "Awaiting resolution",
    });
  }
  return {
    ...row,
    systemAmount: row.amount,
    declaredReceiptCount: row.payments,
    coversFrom: "12 Sep 2026, 19:40",
    coversUntil: row.submittedAt,
    paymentLines:
      paymentLines.length > 0
        ? paymentLines
        : [
            {
              id: "pay_demo",
              receiptNo: "RCP-26-1208",
              customer: "Demo customer",
              amount: row.amount / Math.max(row.payments, 1),
              paidAt: "14 Sep 2026, 10:10",
            },
          ],
    denominations: [
      { denomination: 500, count: Math.max(1, Math.floor(row.declared / 500)) },
      { denomination: 200, count: 5 },
      { denomination: 100, count: 10 },
    ],
    timeline,
  };
}

export async function mockRequest<T>({
  mockKey,
  params = {},
  body = {},
}: MockRequest): Promise<T> {
  await wait();
  const q = String(params.q ?? "").trim();
  switch (mockKey) {
    case "dashboard":
      return {
        summary: {
          scope: {
            level: "TENANT",
            branch: null,
            branchCount: 3,
            label: "All showrooms",
          },
          period: {
            label: "This month",
            from: "2026-09-01",
            to: "2026-09-14",
          },
          defaultCharts: [
            "collection-trend",
            "collection-by-mode",
            "scheme-status-distribution",
          ],
          widgets: [
            {
              key: "COLLECTION",
              label: "Collection",
              valueType: "currency",
              value: {
                amountPaise: 24850000,
                amountDisplay: "₹2,48,500",
              },
              secondary: { label: "184 payments", value: 184 },
              change: { percent: 12.4, direction: "up", isGood: true },
              actionPath: "/payments",
            },
            {
              key: "DUE_TODAY",
              label: "Due today",
              valueType: "currency",
              value: {
                amountPaise: 11200000,
                amountDisplay: "₹1,12,000",
              },
              secondary: { label: "47 installments", value: 47 },
              actionPath: "/dues?preset=TODAY",
            },
            {
              key: "OVERDUE",
              label: "Overdue",
              valueType: "currency",
              value: { amountPaise: 8650000, amountDisplay: "₹86,500" },
              severity: "WARNING",
              actionPath: "/overdues",
            },
            {
              key: "MATURING_THIS_MONTH",
              label: "Maturing this month",
              valueType: "count",
              value: 24,
              actionPath: "/maturities?preset=THIS_MONTH",
            },
            {
              key: "ACTIVE_CUSTOMERS",
              label: "Active customers",
              valueType: "count",
              value: 846,
              actionPath: "/customers",
            },
          ],
          redemptions: {
            count: 6,
            settlementPaise: 8420000,
            cashSettlementPaise: 6100000,
            benefitPaise: 420000,
            penaltyPaise: 85000,
            weightMg: 12500,
            goldWeightMg: 12500,
            goldHandoverValuePaise: 9062500,
            maturityRedemptions: { count: 4, penaltyPaise: 0 },
            prematureClosures: { count: 2, penaltyPaise: 85000 },
          },
          goldRate: {
            isSetForToday: false,
            ratePerGram: { ratePerGramPaise: 725000 },
            warning:
              "Gold-weight scheme payments are blocked until you set today's rate.",
          },
          alerts: [
            {
              severity: "MEDIUM",
              key: "PENDING_CASH_HANDOVERS",
              title: "3 cash handovers awaiting acceptance",
              message: "₹42,500 pending across 2 staff.",
              actionLabel: "Review",
              actionPath: "/cash-handovers?status=PENDING",
              count: 3,
            },
            {
              severity: "MEDIUM",
              key: "WHATSAPP_QUOTA_NEAR_LIMIT",
              title: "WhatsApp quota 86% used",
              message: "4,310 of 5,000 messages used. Resets 1 Oct.",
              actionLabel: "View usage",
              actionPath: "/settings/subscription",
            },
          ],
        },
        trend: {
          series: [
            {
              key: "CASH",
              data: [
                { x: "08 Sep", y: 14200000 },
                { x: "09 Sep", y: 18100000 },
                { x: "10 Sep", y: 21100000 },
                { x: "11 Sep", y: 16800000 },
                { x: "12 Sep", y: 23600000 },
                { x: "13 Sep", y: 20200000 },
                { x: "14 Sep", y: 24850000 },
              ],
            },
            {
              key: "UPI",
              data: [
                { x: "08 Sep", y: 6800000 },
                { x: "09 Sep", y: 8200000 },
                { x: "10 Sep", y: 10300000 },
                { x: "11 Sep", y: 8900000 },
                { x: "12 Sep", y: 11800000 },
                { x: "13 Sep", y: 11100000 },
                { x: "14 Sep", y: 10440000 },
              ],
            },
          ],
        },
        mode: {
          series: [
            {
              key: "mode",
              data: [
                { x: "Cash", y: 14410000 },
                { x: "PhonePe", y: 7460000 },
                { x: "UPI", y: 2980000 },
              ],
            },
          ],
        },
        attention: [
          {
            priority: "High",
            item: "Failed payment (PhonePe)",
            customer: "Meena S · Thrissur",
            amount: 12500,
            age: "1 day",
            status: "Failed",
            action: "Retry",
          },
          {
            priority: "High",
            item: "Overdue installment",
            customer: "Rakesh Nair · Kochi",
            amount: 18750,
            age: "15 days",
            status: "Overdue",
            action: "Collect now",
          },
          {
            priority: "Medium",
            item: "Suspense collection",
            customer: "Walk-in · Head Office",
            amount: 7800,
            age: "2 days",
            status: "Unverified",
            action: "Verify",
          },
        ],
      } as T;
    case "dashboardChart": {
      const chartKey = String(params.chartKey ?? "collection-trend");
      const charts: Record<string, unknown> = {
        "collection-trend": {
          chartType: "line",
          title: "Collection trend",
          yAxis: { type: "currency", label: "Amount" },
          series: [
            {
              key: "CASH",
              name: "Cash",
              data: [
                { x: "2026-09-08", y: 8200000, yDisplay: "₹82,000" },
                { x: "2026-09-09", y: 9100000, yDisplay: "₹91,000" },
                { x: "2026-09-10", y: 12100000, yDisplay: "₹1,21,000" },
                { x: "2026-09-11", y: 8800000, yDisplay: "₹88,000" },
                { x: "2026-09-12", y: 13600000, yDisplay: "₹1,36,000" },
                { x: "2026-09-13", y: 10200000, yDisplay: "₹1,02,000" },
                { x: "2026-09-14", y: 14410000, yDisplay: "₹1,44,100" },
              ],
            },
            {
              key: "DIGITAL",
              name: "Digital",
              data: [
                { x: "2026-09-08", y: 6000000, yDisplay: "₹60,000" },
                { x: "2026-09-09", y: 9000000, yDisplay: "₹90,000" },
                { x: "2026-09-10", y: 9000000, yDisplay: "₹90,000" },
                { x: "2026-09-11", y: 8000000, yDisplay: "₹80,000" },
                { x: "2026-09-12", y: 10000000, yDisplay: "₹1,00,000" },
                { x: "2026-09-13", y: 10000000, yDisplay: "₹1,00,000" },
                { x: "2026-09-14", y: 10440000, yDisplay: "₹1,04,400" },
              ],
            },
          ],
        },
        "collection-by-mode": {
          chartType: "donut",
          title: "By payment mode",
          yAxis: { type: "currency", label: "Amount" },
          series: [
            {
              key: "mode",
              name: "Amount",
              data: [
                { x: "Cash", y: 14410000, modeKey: "CASH" },
                { x: "UPI", y: 7460000, modeKey: "UPI" },
                { x: "Card / POS", y: 2980000, modeKey: "CARD" },
              ],
            },
          ],
        },
        "scheme-status-distribution": {
          chartType: "donut",
          title: "Scheme status",
          yAxis: { type: "count", label: "Schemes" },
          series: [
            {
              key: "status",
              name: "Schemes",
              data: [
                { x: "Active", y: 431 },
                { x: "Matured", y: 42 },
                { x: "Redeemed", y: 28 },
              ],
            },
          ],
        },
      };
      return (charts[chartKey] ?? charts["collection-trend"]) as T;
    }
    case "alerts":
      return [
        {
          id: "alt_01",
          severity: "HIGH",
          key: "GOLD_RATE_NOT_SET",
          title: "Today's gold rate is not set",
          message: "Gold-weight scheme payments are blocked.",
          actionLabel: "Set rate",
          actionPath: "/settings/gold-rate",
          dismissible: false,
          createdAt: "2026-09-14T09:00:00+05:30",
        },
        {
          id: "alt_02",
          severity: "MEDIUM",
          key: "WHATSAPP_QUOTA_NEAR_LIMIT",
          title: "WhatsApp quota 86% used",
          message: "4,310 of 5,000 messages used. Resets 1 Oct.",
          actionLabel: "View usage",
          actionPath: "/settings/subscription",
          dismissible: true,
        },
        {
          id: "alt_03",
          severity: "MEDIUM",
          key: "PENDING_CASH_HANDOVERS",
          title: "3 cash handovers awaiting acceptance",
          message: "₹42,500 pending across 2 staff.",
          actionLabel: "Review",
          actionPath: "/cash-handovers?status=PENDING",
          count: 3,
          dismissible: false,
        },
        {
          id: "alt_04",
          severity: "LOW",
          key: "LATE_SUCCESS_PAYMENTS",
          title: "2 late-success payments recorded",
          message: "Payments confirmed after the link expired.",
          actionLabel: "Review",
          actionPath: "/payments?filter=lateSuccess",
          count: 2,
          dismissible: true,
        },
      ] as T;
    case "dismissAlert":
      return { ok: true } as T;
    case "customers": {
      const rows = mockDb.customers.filter(
        (item) =>
          !q ||
          [item.name, item.phone, item.customerNo, item.branch].some((v) =>
            includes(v, q),
          ),
      );
      const { items, page } = paginateSlice(rows, params);
      return { items, total: rows.length, ...page } as T;
    }
    case "customer":
      return (mockDb.customers.find((item) => item.id === params.id) ??
        mockDb.customers[0]) as T;
    case "customerSchemes": {
      const rows = mockDb.enrollments.filter(
        (item) => item.customerId === params.id,
      );
      const { items, page } = paginateSlice(rows, params);
      return { items, total: rows.length, ...page } as T;
    }
    case "customerPayments": {
      let rows = mockDb.payments.filter(
        (item) => item.customerId === params.id,
      );
      rows = [
        ...rows,
        ...Array.from({ length: 12 }, (_, i) => ({
          ...rows[i % Math.max(rows.length, 1)],
          id: `pay_demo_${i}`,
          receiptNo: `RCP-DEMO-${i + 1}`,
        })),
      ];
      const { items, page } = paginateSlice(rows, params);
      return { items, total: rows.length, ...page } as T;
    }
    case "customerMessages": {
      const customer = mockDb.customers.find((item) => item.id === params.id);
      let rows = mockDb.messages.filter(
        (item) => !customer || item.customer === customer.name,
      );
      rows = [
        ...rows,
        ...Array.from({ length: 12 }, (_, i) => ({
          ...rows[i % Math.max(rows.length, 1)],
          id: `msg_demo_${i}`,
        })),
      ];
      const { items, page } = paginateSlice(rows, params);
      return { items, total: rows.length, ...page } as T;
    }
    case "createCustomer": {
      const index = mockDb.customers.length;
      const phone = String(body.mobile ?? body.phone ?? "");
      const customer: Customer = {
        id: `cus_${index + 1}`,
        customerNo: `CUS-${10482 + index}`,
        name: String(body.name),
        initials: String(body.name)
          .split(/\s+/)
          .map((x) => x[0])
          .slice(0, 2)
          .join(""),
        phone,
        email: String(body.email ?? ""),
        branch: String(body.branch ?? "Kochi Main"),
        branchId: String(body.branchId ?? "brn_01"),
        activeSchemes: 0,
        nextDue: "—",
        nextDueAmount: 0,
        overdueAmount: 0,
        lastPayment: "—",
        lastPaymentAmount: 0,
        kyc: "PENDING",
        status: "ACTIVE",
        joined: "14 Sep 2026",
        address: String(body.address ?? ""),
        version: 1,
        kycDetail: {
          type: "AADHAAR",
          status: "NOT_SUBMITTED",
          documents: [],
        },
      };
      mockDb.customers.unshift(customer);
      return customer as T;
    }
    case "updateCustomer": {
      const id = String(params.id ?? "");
      const customer = mockDb.customers.find((item) => item.id === id);
      if (!customer) {
        throw {
          status: "CUSTOM_ERROR",
          data: { code: "NOT_FOUND", message: "Customer not found" },
        };
      }
      if (body.name != null) {
        customer.name = String(body.name);
        customer.initials = String(body.name)
          .split(/\s+/)
          .map((x) => x[0])
          .slice(0, 2)
          .join("");
      }
      if (body.mobile != null || body.phone != null) {
        customer.phone = String(body.mobile ?? body.phone);
      }
      if (body.email != null) customer.email = String(body.email);
      if (body.branch != null) customer.branch = String(body.branch);
      if (body.branchId != null) customer.branchId = String(body.branchId);
      if (body.address != null) customer.address = String(body.address);
      if (body.status === "INACTIVE") {
        if (customer.activeSchemes > 0) {
          throw {
            status: "CUSTOM_ERROR",
            data: {
              code: "CUSTOMER_HAS_ACTIVE_SCHEMES",
              message:
                "This customer still has active schemes. Close or transfer them before deactivating.",
            },
          };
        }
        customer.status = "INACTIVE";
        customer.version += 1;
      }
      if (body.status === "ACTIVE") {
        customer.status = "ACTIVE";
        customer.version += 1;
      }
      return customer as T;
    }
    case "verifyCustomerKyc": {
      const id = String(params.id ?? "");
      const customer = mockDb.customers.find((item) => item.id === id);
      if (!customer?.kycDetail) {
        throw {
          status: "CUSTOM_ERROR",
          data: {
            code: "KYC_NOT_SUBMITTED",
            message: "No KYC documents to review",
          },
        };
      }
      const decision = String(body.status ?? body.decision ?? "");
      const remarks = String(body.rejectionReason ?? body.remarks ?? "");
      if (decision === "REJECTED" && !remarks.trim()) {
        throw {
          status: "CUSTOM_ERROR",
          data: {
            code: "REMARKS_REQUIRED",
            message: "Rejection remarks are required",
          },
        };
      }
      if (decision === "VERIFIED") {
        customer.kycDetail.status = "VERIFIED";
        customer.kycDetail.verifiedAt = "14 Sep 2026";
        customer.kycDetail.verifiedBy = "Priya S";
        customer.kycDetail.rejectionRemarks = undefined;
      } else if (decision === "REJECTED") {
        customer.kycDetail.status = "REJECTED";
        customer.kycDetail.rejectionRemarks = remarks;
        customer.kycDetail.verifiedAt = undefined;
        customer.kycDetail.verifiedBy = undefined;
      }
      syncKycSummary(customer);
      customer.version += 1;
      return customer as T;
    }
    case "submitCustomerKyc": {
      const id = String(params.id ?? "");
      const customer = mockDb.customers.find((item) => item.id === id);
      if (!customer) {
        throw {
          status: "CUSTOM_ERROR",
          data: { code: "NOT_FOUND", message: "Customer not found" },
        };
      }
      if (customer.kycDetail?.status === "VERIFIED") {
        throw {
          status: "CUSTOM_ERROR",
          data: {
            code: "KYC_LOCKED",
            message: "Verified KYC cannot be replaced from the portal.",
          },
        };
      }
      const kycType =
        String(body.type ?? "AADHAAR") === "PAN" ? "PAN" : "AADHAAR";
      customer.kycDetail = {
        type: kycType,
        status: "SUBMITTED",
        submittedAt: "14 Sep 2026",
        number: body.number ? String(body.number) : undefined,
        documents:
          kycType === "PAN"
            ? [{ side: "SINGLE", label: "PAN card" }]
            : [
                { side: "FRONT", label: "Aadhaar — front" },
                { side: "BACK", label: "Aadhaar — back" },
              ],
      };
      syncKycSummary(customer);
      customer.version += 1;
      return customer as T;
    }
    case "updateCustomerNominee": {
      const id = String(params.id ?? "");
      const customer = mockDb.customers.find((item) => item.id === id);
      if (!customer) {
        throw {
          status: "CUSTOM_ERROR",
          data: { code: "NOT_FOUND", message: "Customer not found" },
        };
      }
      const expected = Number(body.expectedVersion);
      if (expected !== customer.version) {
        throw {
          status: "CUSTOM_ERROR",
          data: {
            code: "VERSION_CONFLICT",
            message: "Customer record changed. Refresh and try again.",
          },
        };
      }
      const relationship = String(body.relationship ?? "OTHER");
      customer.nomineeDetail = {
        name: String(body.name),
        relationship: relationship as CustomerNomineeDetail["relationship"],
        relationshipLabel: RELATIONSHIP_LABELS[relationship] ?? "Other",
        mobile: String(body.mobile),
        notes: body.notes ? String(body.notes) : undefined,
        updatedAt: "14 Sep 2026",
        updatedBy: "Priya S",
      };
      customer.nominee = nomineeDisplay(customer.nomineeDetail);
      customer.version += 1;
      return customer as T;
    }
    case "removeCustomerNominee": {
      const id = String(params.id ?? "");
      const customer = mockDb.customers.find((item) => item.id === id);
      if (!customer?.nomineeDetail) {
        throw {
          status: "CUSTOM_ERROR",
          data: { code: "NOMINEE_NOT_FOUND", message: "No nominee to remove" },
        };
      }
      const expected = Number(body.expectedVersion ?? params.expectedVersion);
      if (expected !== customer.version) {
        throw {
          status: "CUSTOM_ERROR",
          data: {
            code: "VERSION_CONFLICT",
            message: "Customer record changed. Refresh and try again.",
          },
        };
      }
      customer.nomineeDetail = undefined;
      customer.nominee = undefined;
      customer.version += 1;
      return customer as T;
    }
    case "blockCustomer": {
      const id = String(params.id ?? "");
      const customer = mockDb.customers.find((item) => item.id === id);
      if (!customer) {
        throw {
          status: "CUSTOM_ERROR",
          data: { code: "NOT_FOUND", message: "Customer not found" },
        };
      }
      customer.status = "BLOCKED";
      customer.version += 1;
      return customer as T;
    }
    case "unblockCustomer": {
      const id = String(params.id ?? "");
      const customer = mockDb.customers.find((item) => item.id === id);
      if (!customer) {
        throw {
          status: "CUSTOM_ERROR",
          data: { code: "NOT_FOUND", message: "Customer not found" },
        };
      }
      customer.status = "ACTIVE";
      customer.version += 1;
      return customer as T;
    }
    case "enrollments": {
      const status = String(params.status ?? "ALL");
      const rows = mockDb.enrollments.filter(
        (item) =>
          (!q ||
            includes(item.customer, q) ||
            includes(item.enrollmentNo, q)) &&
          (status === "ALL" || item.status === status),
      );
      const count = (value: string) =>
        mockDb.enrollments.filter((item) => item.status === value).length;
      const { items, page } = paginateSlice(rows, params);
      return {
        items,
        total: rows.length,
        ...page,
        summary: {
          active: count("ACTIVE") + count("LOCKED"),
          pending: count("PENDING_ACTIVATION"),
          termEnded: count("TERM_ENDED"),
          matured: count("MATURED"),
          redemptionPending: count("REDEMPTION_PENDING"),
        },
      } as T;
    }
    case "enrollment": {
      const requested = String(params.id ?? "");
      const resolvedId =
        requested === "sch_06" ? "sch_demo_flex_capped" : requested;
      return (mockDb.enrollments.find((item) => item.id === resolvedId) ??
        mockDb.enrollments.find((item) => item.id === requested) ??
        mockDb.enrollments[0]) as T;
    }
    case "payableRange": {
      const enrollment =
        mockDb.enrollments.find((item) => item.id === params.id) ??
        mockDb.enrollments[0];
      return payableQuote(enrollment, String(params.targetCycle ?? "")) as T;
    }
    case "settlementPreview": {
      const enrollment = findEnrollment(String(params.id ?? ""));
      const type = String(
        params.type ?? "MATURITY_REDEMPTION",
      ) as SettlementPreview["type"];
      return buildSettlementPreview(enrollment, type) as T;
    }
    case "redeemEnrollment": {
      const enrollment = findEnrollment(String(params.id ?? ""));
      const modeDetails = (body.modeDetails as Record<string, unknown>) ?? {};
      enrollment.status = "REDEMPTION_PENDING";
      enrollment.canRecordPayment = false;
      enrollment.canRedeem = false;
      enrollment.helperText =
        "Redemption is pending approval. No further collections are allowed.";
      return {
        id: `rdm_${Date.now()}`,
        redemptionNumber: `SG/RDM/2026/${String(100 + mockDb.enrollments.length).padStart(5, "0")}`,
        type: "MATURITY_REDEMPTION",
        status: "PENDING_APPROVAL",
        mode: String(body.mode ?? "CASH"),
        finalValue:
          Number(
            modeDetails.expectedFinalValuePaise ??
              body.expectedFinalValuePaise ??
              0,
          ) / 100 || enrollment.paid + enrollment.installment,
        schemeStatus: enrollment.status,
      } as T;
    }
    case "closePrematureEnrollment": {
      const modeDetails = (body.modeDetails as Record<string, unknown>) ?? {};
      const acknowledgePenalty =
        modeDetails.acknowledgePenalty ?? body.acknowledgePenalty;
      const acknowledgeBenefitForfeit =
        modeDetails.acknowledgeBenefitForfeit ?? body.acknowledgeBenefitForfeit;
      if (!acknowledgePenalty || !acknowledgeBenefitForfeit) {
        throw {
          status: "CUSTOM_ERROR",
          data: {
            code: "ACKNOWLEDGEMENT_REQUIRED",
            message: "Confirm penalty and benefit forfeit before closing.",
          },
        };
      }
      const enrollment = findEnrollment(String(params.id ?? ""));
      enrollment.status = "CLOSED_PREMATURE";
      enrollment.canRecordPayment = false;
      enrollment.canRedeem = false;
      enrollment.helperText = "Scheme closed prematurely. Ledger is read-only.";
      return {
        id: `rdm_${Date.now()}`,
        redemptionNumber: `SG/CLS/2026/${String(200 + mockDb.enrollments.length).padStart(5, "0")}`,
        type: "PREMATURE_CLOSURE",
        status: "PENDING_APPROVAL",
        mode: String(body.mode ?? "CASH"),
        finalValue:
          Number(
            modeDetails.expectedFinalValuePaise ??
              body.expectedFinalValuePaise ??
              0,
          ) / 100 ||
          Math.max(0, enrollment.paid - Math.round(enrollment.paid * 0.02)),
        schemeStatus: enrollment.status,
      } as T;
    }
    case "createEnrollment": {
      const customer =
        mockDb.customers.find((item) => item.id === body.customerId) ??
        mockDb.customers[0];
      const plan =
        mockDb.plans.find((item) => item.id === body.planId) ?? mockDb.plans[0];
      const installment =
        body.installmentAmountPaise != null
          ? Number(body.installmentAmountPaise) / 100
          : Number(body.amount ?? plan.amount);
      const row = {
        id: `sch_${Date.now()}`,
        enrollmentNo: `ENR-${24120 + mockDb.enrollments.length}`,
        customerId: customer.id,
        customer: customer.name,
        plan: plan.name,
        branch: customer.branch,
        progress: body.firstInstallmentMode === "COLLECT_NOW" ? 1 : 0,
        tenure: plan.tenure,
        paid: body.firstInstallmentMode === "COLLECT_NOW" ? installment : 0,
        installment,
        nextDue: "14 Oct 2026",
        maturity: "14 Sep 2027",
        status:
          body.firstInstallmentMode === "COLLECT_NOW"
            ? "ACTIVE"
            : "PENDING_ACTIVATION",
        valueBasis: plan.valueBasis,
      } as const;
      mockDb.enrollments.unshift(row as any);
      customer.activeSchemes += 1;
      return row as T;
    }
    case "recordPayment": {
      const enrollment =
        mockDb.enrollments.find((item) => item.id === body.schemeId) ??
        mockDb.enrollments[0];
      const quote = payableQuote(enrollment, String(body.targetCycle ?? ""));
      const amountRupees =
        typeof body.amountPaise === "number"
          ? Number(body.amountPaise) / 100
          : Number(body.amount ?? quote.suggested ?? enrollment.installment);
      if (!quote.eligible) {
        throw {
          status: "CUSTOM_ERROR",
          error: quote.helperText,
          data: { code: "SCHEME_NOT_ACTIVE", message: quote.helperText },
        };
      }
      if (!amountWithinPayableQuote(amountRupees, quote)) {
        throw {
          status: "CUSTOM_ERROR",
          error: quote.helperText,
          data: {
            code:
              amountRupees > quote.max
                ? "AMOUNT_ABOVE_MAXIMUM"
                : amountRupees % (quote.multipleOf ?? 1) !== 0 &&
                    amountRupees !== quote.max
                  ? "AMOUNT_NOT_MULTIPLE"
                  : "AMOUNT_BELOW_MINIMUM",
            message: quote.helperText,
          },
        };
      }
      const payment: Payment = {
        id: `pay_${Date.now()}`,
        receiptNo: `RCP-26-${1230 + mockDb.payments.length}`,
        date: "14 Sep 2026, 18:10",
        customer: enrollment.customer,
        customerId: enrollment.customerId,
        enrollmentNo: enrollment.enrollmentNo,
        amount: amountRupees,
        mode: (body.mode as Payment["mode"]) ?? "CASH",
        staff: "Arun Raj",
        branch: enrollment.branch,
        status: "SUCCESS",
        source: "ADMIN",
      };
      mockDb.payments.unshift(payment);
      enrollment.paid += payment.amount;
      if (enrollment.displayMode === "FLEXIBLE_LOCK_WINDOW") {
        enrollment.confirmedThisCycle =
          (enrollment.confirmedThisCycle ?? 0) + amountRupees;
        enrollment.remainingThisCycle = Math.max(
          (enrollment.remainingThisCycle ?? 0) - amountRupees,
          0,
        );
        enrollment.positionVersion = (enrollment.positionVersion ?? 7) + 1;
        enrollment.installment = enrollment.remainingThisCycle;
        enrollment.payableSuggested = enrollment.remainingThisCycle || null;
        enrollment.cyclePayments = [
          ...(enrollment.cyclePayments ?? []),
          {
            receiptNo: payment.receiptNo,
            paidAt: payment.date,
            mode: payment.mode,
            amount: payment.amount,
          },
        ];
        enrollment.helperText = enrollment.remainingThisCycle
          ? `₹${enrollment.remainingThisCycle} remains in this month's ₹${enrollment.currentCycleCap} allowance.`
          : "This month's allowance is fully paid.";
        enrollment.canRecordPayment = (enrollment.remainingThisCycle ?? 0) > 0;
      } else if (enrollment.displayMode !== "FLEXIBLE_FREE_WINDOW") {
        enrollment.progress += 1;
      }
      return payment as T;
    }
    case "dues": {
      const kind = String(params.kind ?? "ALL");
      const from = params.from ? String(params.from) : undefined;
      const to = params.to ? String(params.to) : undefined;
      let rows = mockDb.dues.filter(
        (item) =>
          kind === "ALL" ||
          (kind === "DUE" ? item.status === "DUE" : item.status === kind),
      );
      if (from || to) {
        rows = rows.filter((item) =>
          matchesDemoDateRange(item.dueDate, from, to),
        );
      }
      const { items, page } = paginateSlice(rows, params);
      return {
        items,
        summary: {
          due: 112000,
          overdue: 86500,
          grace: 47000,
          defaulted: 32000,
          customers: rows.length,
        },
        total: rows.length,
        ...page,
      } as T;
    }
    case "payments": {
      const status = params.status ? String(params.status) : undefined;
      const filtered = filterPaymentsList(params);
      const { items: pageItems, page } = paginateSlice(filtered, params);
      const contractItems = pageItems.map(toContractPayment);
      return {
        __contract: true,
        payload: contractItems,
        meta: {
          ...page,
          summary: buildPaymentsSummary(filtered, status),
        },
      } as T;
    }
    case "cashOverview": {
      const staffTotal = mockDb.staff.reduce(
        (sum, item) => sum + item.today,
        0,
      );
      const pending = mockDb.handovers.filter((h) => h.status === "PENDING");
      const pendingAmount = pending.reduce((sum, h) => sum + h.amount, 0);
      return {
        __contract: true,
        payload: {
          scope: { branch: { id: "brn_01", name: "Kochi Main", code: "KCH" } },
          totals: {
            totalCashInHand: {
              amountPaise: amountPaise(staffTotal),
              amountDisplay: `₹${staffTotal.toLocaleString("en-IN")}`,
            },
            pendingAcceptance: {
              amountPaise: amountPaise(pendingAmount),
              amountDisplay: `₹${pendingAmount.toLocaleString("en-IN")}`,
            },
            acceptedToday: {
              amountPaise: amountPaise(24000),
              amountDisplay: "₹24,000",
            },
            staffHoldingCash: mockDb.staff.filter((s) => s.today > 0).length,
            pendingHandoverCount: pending.length,
            discrepancyOpenCount: mockDb.handovers.filter(
              (h) => h.status === "DISCREPANCY",
            ).length,
            discrepancyTotal: {
              amountPaise: 50000,
              amountDisplay: "₹500",
            },
          },
          alerts: [
            {
              severity: "MEDIUM",
              message: `${pending.length} handovers awaiting acceptance (${pendingAmount.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })})`,
              actionPath: "/cash-handovers?status=PENDING",
            },
          ],
          chart: {
            chartType: "horizontalBar",
            title: "Cash in hand by staff",
            yAxis: { type: "currency", label: "Amount" },
            series: [
              {
                key: "CASH_IN_HAND",
                name: "Cash in hand",
                data: mockDb.staff
                  .filter((s) => s.today > 0)
                  .slice(0, 6)
                  .map((s) => ({
                    x: s.name,
                    y: amountPaise(s.today),
                    yDisplay: `₹${s.today.toLocaleString("en-IN")}`,
                  })),
              },
            ],
          },
        },
      } as T;
    }
    case "cashStaffBalances": {
      const staffAll = mockDb.staff.map((item) => ({
        status: item.status,
        staff: {
          id: item.id,
          name: item.name,
          role: item.role,
        },
        branch: { name: item.branch },
        cashInHand: {
          amountPaise: amountPaise(item.today),
          amountDisplay: `₹${item.today.toLocaleString("en-IN")}`,
        },
        cashCollectedToday: {
          amountPaise: amountPaise(item.today),
          amountDisplay: `₹${item.today.toLocaleString("en-IN")}`,
        },
        receiptCount: Math.max(1, Math.round(item.today / 4000)),
        daysHolding: item.lastSeen === "Yesterday" ? 1 : 0,
        lastHandoverAt:
          item.lastSeen === "Yesterday"
            ? "2026-09-13T18:00:00+05:30"
            : undefined,
        riskFlag:
          item.status === "SUSPENDED"
            ? "HOLDING_TOO_LONG"
            : item.today > 30000
              ? "HIGH_BALANCE"
              : null,
      }));
      const { items: pageItems, page } = paginateSlice(staffAll, params);
      const totalCash = mockDb.staff.reduce((sum, s) => sum + s.today, 0);
      return {
        __contract: true,
        payload: pageItems,
        meta: {
          ...page,
          summary: {
            staffCount: staffAll.length,
            totalCashInHand: {
              amountPaise: amountPaise(totalCash),
              amountDisplay: `₹${totalCash.toLocaleString("en-IN")}`,
            },
          },
        },
      } as T;
    }
    case "cashHandovers": {
      const from = params.from ? String(params.from) : undefined;
      const to = params.to ? String(params.to) : undefined;
      const expanded: CashHandover[] = [...mockDb.handovers];
      for (let i = 0; i < 15; i++) {
        const seed = mockDb.handovers[i % mockDb.handovers.length];
        expanded.push({
          ...seed,
          id: `hnd_demo_${i}`,
          handoverNo: `HND-2609${String(10 - (i % 5)).padStart(2, "0")}-${String(i + 4).padStart(2, "0")}`,
        });
      }
      let handoversAll = expanded;
      if (from || to) {
        handoversAll = handoversAll.filter((item) =>
          matchesDemoDateRange(item.submittedAt, from, to),
        );
      }
      const contractRows = handoversAll.map((item) => ({
        id: item.id,
        handoverNumber: item.handoverNo,
        staff: { id: `usr_${item.id}`, name: item.staff },
        branch: { name: item.branch },
        initiatedBy: item.initiatedBy ?? "STAFF",
        amount: {
          amountPaise: amountPaise(item.amount),
          amountDisplay: `₹${item.amount.toLocaleString("en-IN")}`,
        },
        acceptedAmount: {
          amountPaise: amountPaise(item.declared),
          amountDisplay: `₹${item.declared.toLocaleString("en-IN")}`,
        },
        receiptCount: item.payments,
        status: item.status,
        submittedAt: item.submittedAt.includes("Today")
          ? "2026-09-14T17:20:00+05:30"
          : item.submittedAt.includes("Yesterday")
            ? "2026-09-13T18:05:00+05:30"
            : "2026-09-12T16:00:00+05:30",
        hasDiscrepancy: item.status === "DISCREPANCY",
      }));
      const { items: pageItems, page } = paginateSlice(contractRows, params);
      const pending = handoversAll.filter((h) => h.status === "PENDING").length;
      return {
        __contract: true,
        payload: pageItems,
        meta: {
          ...page,
          summary: {
            count: contractRows.length,
            pending,
            accepted: handoversAll.filter((h) => h.status === "ACCEPTED")
              .length,
            discrepancy: handoversAll.filter((h) => h.status === "DISCREPANCY")
              .length,
          },
        },
      } as T;
    }
    case "cashReport": {
      const groups = [
        ...mockDb.staff.map((item, index) => ({
          key: item.id,
          label: item.name,
          cashCollected: {
            amountPaise: amountPaise(item.today + 12000 + index * 800),
            amountDisplay: `₹${(item.today + 12000 + index * 800).toLocaleString("en-IN")}`,
          },
          handedOver: {
            amountPaise: amountPaise(item.today + 8000),
            amountDisplay: `₹${(item.today + 8000).toLocaleString("en-IN")}`,
          },
          inHand: {
            amountPaise: amountPaise(item.today),
            amountDisplay: `₹${item.today.toLocaleString("en-IN")}`,
          },
          handoverCount: 3 + (index % 4),
          discrepancies: index === 1 ? 1 : 0,
          averageHoldingDays: 1.2 + index * 0.2,
        })),
        ...mockDb.branches.map((branch, index) => ({
          key: branch.id,
          label: branch.name,
          cashCollected: {
            amountPaise: amountPaise(48000 + index * 12000),
            amountDisplay: `₹${(48000 + index * 12000).toLocaleString("en-IN")}`,
          },
          handedOver: {
            amountPaise: amountPaise(42000 + index * 10000),
            amountDisplay: `₹${(42000 + index * 10000).toLocaleString("en-IN")}`,
          },
          inHand: {
            amountPaise: amountPaise(6000 + index * 1500),
            amountDisplay: `₹${(6000 + index * 1500).toLocaleString("en-IN")}`,
          },
          handoverCount: 5 + index,
          discrepancies: 0,
          averageHoldingDays: 1.1,
        })),
        ...Array.from({ length: 12 }, (_, index) => {
          const collected = 22000 + index * 3400;
          const handed = 18000 + index * 2900;
          const inHandAmt = collected - handed;
          return {
            key: `grp_demo_${index}`,
            label: `Field collector ${index + 1}`,
            cashCollected: {
              amountPaise: amountPaise(collected),
              amountDisplay: `₹${collected.toLocaleString("en-IN")}`,
            },
            handedOver: {
              amountPaise: amountPaise(handed),
              amountDisplay: `₹${handed.toLocaleString("en-IN")}`,
            },
            inHand: {
              amountPaise: amountPaise(inHandAmt),
              amountDisplay: `₹${inHandAmt.toLocaleString("en-IN")}`,
            },
            handoverCount: 2 + (index % 5),
            discrepancies: index % 7 === 0 ? 1 : 0,
            averageHoldingDays: 1 + index * 0.15,
          };
        }),
      ];
      const { items: pageGroups, page } = paginateSlice(groups, params);
      const collected = groups.reduce(
        (sum, g) => sum + g.cashCollected.amountPaise,
        0,
      );
      const handed = groups.reduce(
        (sum, g) => sum + g.handedOver.amountPaise,
        0,
      );
      const inHand = mockDb.staff.reduce((sum, s) => sum + s.today, 0);
      return {
        __contract: true,
        payload: {
          period: {
            from: params.from ?? "2026-09-01",
            to: params.to ?? "2026-09-14",
          },
          totals: {
            cashCollected: {
              amountPaise: collected,
              amountDisplay: `₹${(collected / 100).toLocaleString("en-IN")}`,
            },
            handedOver: {
              amountPaise: handed,
              amountDisplay: `₹${(handed / 100).toLocaleString("en-IN")}`,
            },
            currentlyInHand: {
              amountPaise: amountPaise(inHand),
              amountDisplay: `₹${inHand.toLocaleString("en-IN")}`,
            },
            discrepancyTotal: {
              amountPaise: 50000,
              amountDisplay: "₹500",
            },
            handoverCount: 42,
            averageHoldingDays: 1.4,
          },
          groups: pageGroups,
        },
        meta: page,
      } as T;
    }
    case "acceptHandover":
    case "updateHandover": {
      const row = mockDb.handovers.find((item) => item.id === params.id);
      if (row) {
        row.status = "ACCEPTED";
        row.acceptedBy = "Arun Raj";
      }
      return row as T;
    }
    case "rejectHandover": {
      const row = mockDb.handovers.find((item) => item.id === params.id);
      if (row) row.status = "REJECTED";
      return row as T;
    }
    case "resolveHandoverDiscrepancy": {
      const row = mockDb.handovers.find((item) => item.id === params.id);
      if (row) {
        row.status = "ACCEPTED";
        row.amount =
          Number(body.acceptedAmountPaise ?? amountPaise(row.amount)) / 100;
        row.acceptedBy = "Arun Raj";
      }
      return row as T;
    }
    case "createAdminHandover": {
      const staffId = String(body.staffId ?? "");
      const staffMember = mockDb.staff.find((item) => item.id === staffId);
      const amountPaise = Number(body.amountPaise ?? 0);
      const amount = amountPaise / 100;
      const autoAccept = body.autoAccept === true || body.autoAccept === "true";
      if (staffMember && amount > staffMember.today) {
        throw {
          status: "CUSTOM_ERROR",
          data: {
            code: "CASH_HANDOVER_AMOUNT_EXCEEDS_BALANCE",
            message: "Amount exceeds available cash in hand.",
          },
        };
      }
      const index = mockDb.handovers.length + 1;
      const row: CashHandover = {
        id: `hnd_${Date.now()}`,
        handoverNo: `HND-260914-${String(index).padStart(2, "0")}`,
        staff: staffMember?.name ?? "Staff",
        branch: staffMember?.branch ?? "—",
        amount,
        declared: amount,
        payments: Number(body.receiptCount ?? 1),
        submittedAt: "Today, just now",
        status: autoAccept ? "ACCEPTED" : "PENDING",
        initiatedBy: "ADMIN",
        acceptedBy: autoAccept ? "Arun Raj" : undefined,
        remarks:
          String(body.remarks ?? body.acceptanceRemarks ?? "") || undefined,
      };
      mockDb.handovers.unshift(row);
      if (staffMember) {
        staffMember.today = Math.max(0, staffMember.today - amount);
      }
      return row as T;
    }
    case "handover": {
      const id = String(params.id ?? "");
      const row = mockDb.handovers.find((item) => item.id === id);
      if (!row) {
        throw {
          status: "CUSTOM_ERROR",
          data: { code: "NOT_FOUND", message: "Handover not found" },
        };
      }
      return buildHandoverDetail(row) as T;
    }
    case "maturities": {
      const from = params.from ? String(params.from) : undefined;
      const to = params.to ? String(params.to) : undefined;
      let rows = mockDb.enrollments.filter((item) =>
        ["MATURED", "TERM_ENDED", "REDEMPTION_PENDING", "ACTIVE"].includes(
          item.status,
        ),
      );
      if (from || to) {
        rows = rows.filter((item) =>
          matchesDemoDateRange(item.maturity, from, to),
        );
      }
      const { items, page } = paginateSlice(rows, params);
      return {
        items,
        total: rows.length,
        ...page,
        summary: {
          upcoming: 24,
          maturedToday: 3,
          incomplete: 5,
          notRedeemed: 11,
          liability: 842000,
          gold: 126.48,
        },
      } as T;
    }
    case "goldRates": {
      const { items, page } = paginateSlice(mockDb.goldRates, params);
      return {
        current: mockDb.goldRates[0],
        history: items,
        total: mockDb.goldRates.length,
        ...page,
      } as T;
    }
    case "addGoldRate": {
      const ratePerGram =
        body.ratePerGramPaise != null
          ? Number(body.ratePerGramPaise) / 100
          : Number(body.ratePerGram);
      const row: GoldRate = {
        id: `rate_${Date.now()}`,
        effectiveAt: "14 Sep 2026, 18:15",
        ratePerGram,
        enteredBy: "Arun Raj",
        branch:
          body.branchId == null || body.branchId === ""
            ? "All branches"
            : String(body.branch ?? body.branchId),
      };
      mockDb.goldRates.unshift(row);
      return row as T;
    }
    case "messages": {
      const from = params.from ? String(params.from) : undefined;
      const to = params.to ? String(params.to) : undefined;
      let rows = [...mockDb.messages];
      if (from || to) {
        rows = rows.filter((item) => matchesDemoDateRange(item.date, from, to));
      }
      const { items, page } = paginateSlice(rows, params);
      return {
        items,
        total: rows.length,
        ...page,
        summary: {
          sent: 1842,
          delivered: 1764,
          read: 1398,
          failed: 17,
          quotaUsed: 62,
        },
      } as T;
    }
    case "resendMessage": {
      const row = mockDb.messages.find((item) => item.id === params.id);
      if (row) {
        row.status = "QUEUED";
        row.failure = undefined;
      }
      return row as T;
    }
    case "reports": {
      const reportKey = String(params.reportKey ?? "OUTSTANDING");
      return mockAdminReport(reportKey, params) as T;
    }
    case "plans": {
      const status = params.status ? String(params.status) : undefined;
      const valueBasis = params.valueBasis
        ? String(params.valueBasis)
        : undefined;
      const paymentPattern = params.paymentPattern
        ? String(params.paymentPattern)
        : undefined;
      const branchId = params.branchId ? String(params.branchId) : undefined;
      const enrolableOnly =
        params.enrolableOnly === true || params.enrolableOnly === "true";
      let rows = [...mockDb.plans];
      if (status && status !== "ALL") {
        rows = rows.filter((item) => item.status === status);
      }
      if (valueBasis) {
        rows = rows.filter((item) => item.valueBasis === valueBasis);
      }
      if (paymentPattern) {
        const norm = paymentPattern === "FIXED" ? "FIXED_DATE" : paymentPattern;
        rows = rows.filter(
          (item) =>
            item.paymentPattern === norm ||
            item.paymentPattern === paymentPattern,
        );
      }
      if (enrolableOnly) {
        rows = rows.filter((item) => item.status === "ACTIVE");
      }
      if (branchId) {
        rows = rows.filter(() => true);
      }
      const { items, page } = paginateSlice(rows, params);
      return {
        items,
        total: rows.length,
        ...page,
        summary: {
          active: mockDb.plans.filter((x) => x.status === "ACTIVE").length,
          draft: mockDb.plans.filter((x) => x.status === "DRAFT").length,
          enrollments: 746,
          monthlyValue: 3849000,
        },
      } as T;
    }
    case "createPlan": {
      const rules = body.amountRules as Record<string, unknown> | undefined;
      const patternRaw = String(body.paymentPattern ?? "FIXED");
      const paymentPattern =
        patternRaw === "FLEXIBLE" ? "FLEXIBLE_AVERAGE" : "FIXED_DATE";
      const fixedPaise = Number(rules?.fixedAmountPaise ?? 0);
      const minPaise = Number(rules?.minInstallmentPaise ?? fixedPaise);
      const amountRupees =
        fixedPaise > 0
          ? fixedPaise / 100
          : minPaise > 0
            ? minPaise / 100
            : Number(body.amount ?? 3000);
      const row = {
        id: `pln_${Date.now()}`,
        code: String(body.code),
        name: String(body.name),
        valueBasis: body.valueBasis ?? "CASH",
        paymentPattern,
        amountMode: String(rules?.amountMode ?? "CUSTOMER_CHOSEN"),
        tenure: Number(body.durationMonths ?? body.tenure ?? 12),
        amount: amountRupees,
        activeEnrollments: 0,
        status: "DRAFT",
        editLocked: false,
      } as SchemePlan;
      mockDb.plans.push(row);
      return {
        __contract: true,
        payload: {
          ...row,
          id: row.id,
          status: "DRAFT",
          version: 1,
          auditEventId: "aud_pln",
        },
      } as T;
    }
    case "planDetail": {
      const planId = String(params.planId ?? "");
      const row = mockDb.plans.find((p) => p.id === planId);
      if (!row) throw { status: 404, data: { code: "NOT_FOUND" } };
      return {
        __contract: true,
        payload: synthesizePlanDetail(row),
      } as T;
    }
    case "planStats": {
      const planId = String(params.planId ?? "");
      const row = mockDb.plans.find((p) => p.id === planId);
      if (!row) throw { status: 404, data: { code: "NOT_FOUND" } };
      return {
        __contract: true,
        payload: synthesizePlanStats(row),
      } as T;
    }
    case "patchPlan": {
      const planId = String(params.planId ?? "");
      const idx = mockDb.plans.findIndex((p) => p.id === planId);
      if (idx < 0) throw { status: 404, data: { code: "NOT_FOUND" } };
      const existing = mockDb.plans[idx];
      const financialKeys = [
        "amountRules",
        "scheduleRules",
        "paymentRules",
        "flexibleRules",
        "valueBasis",
        "paymentPattern",
        "durationMonths",
        "installmentCount",
        "redemptionRules",
        "benefit",
        "goldRules",
      ];
      const touchesFinancial = financialKeys.some((k) => k in body);
      if (existing.editLocked && touchesFinancial) {
        const benefit = body.benefit as Record<string, unknown> | undefined;
        const onlyDisplayLabel =
          benefit &&
          Object.keys(benefit).length === 1 &&
          "displayLabel" in benefit;
        if (!onlyDisplayLabel) {
          throw {
            status: 422,
            data: {
              code: "VALIDATION_FAILED",
              message:
                "This plan has active schemes. Financial rules cannot be changed. Duplicate it to create a new version instead.",
              details: { suggestion: "DUPLICATE_AND_EDIT" },
            },
          };
        }
      }
      if (body.name) existing.name = String(body.name);
      if (body.displayName) existing.name = String(body.displayName);
      mockDb.plans[idx] = { ...existing };
      return {
        __contract: true,
        payload: {
          ...synthesizePlanDetail(existing),
          auditEventId: "aud_pln_patch",
        },
      } as T;
    }
    case "activatePlan": {
      const planId = String(params.planId ?? "");
      const plan = mockDb.plans.find((p) => p.id === planId);
      if (!plan) throw { status: 404, data: { code: "NOT_FOUND" } };
      plan.status = "ACTIVE";
      return plan as T;
    }
    case "deactivatePlan": {
      const planId = String(params.planId ?? "");
      const plan = mockDb.plans.find((p) => p.id === planId);
      if (!plan) throw { status: 404, data: { code: "NOT_FOUND" } };
      plan.status = "ARCHIVED";
      return plan as T;
    }
    case "duplicatePlan": {
      const planId = String(params.planId ?? "");
      const source = mockDb.plans.find((p) => p.id === planId);
      if (!source) throw { status: 404, data: { code: "NOT_FOUND" } };
      const row = {
        ...source,
        id: `pln_${Date.now()}`,
        code: `${source.code}-V2`,
        name: `${source.name} (copy)`,
        status: "DRAFT" as const,
        activeEnrollments: 0,
        editLocked: false,
      };
      mockDb.plans.push(row);
      return row as T;
    }
    case "access":
      return {
        summary: {
          activeStaff: 7,
          staffLimit: 10,
          branches: 4,
          branchLimit: 5,
          admins: 2,
          sessions: 9,
          suspended: 1,
        },
      } as T;
    case "accessSummary":
      return {
        activeStaff: 7,
        staffUsed: 7,
        staffLimit: 10,
        branches: 2,
        branchLimit: 2,
        admins: 2,
        sessions: 9,
        suspended: 1,
        planName: "Growth",
      } as T;
    case "staff": {
      let rows = mockDb.staff.filter(
        (item) =>
          !q || [item.name, item.branch, item.role].some((v) => includes(v, q)),
      );
      const branchId = params.branchId ? String(params.branchId) : undefined;
      if (branchId) {
        const br = mockDb.branches.find((b) => b.id === branchId);
        if (br)
          rows = rows.filter(
            (s) => s.branch === br.name || s.branch === "All branches",
          );
      }
      const status = params.status ? String(params.status) : undefined;
      if (status && status !== "ALL") {
        rows = rows.filter(
          (s) =>
            s.status === status ||
            (status === "INACTIVE" && s.status === "SUSPENDED"),
        );
      }
      const { items, page } = paginateSlice(rows, params);
      return { items, total: rows.length, ...page } as T;
    }
    case "staffDetail": {
      const staffId = String(params.staffId ?? "");
      const row = mockDb.staff.find((s) => s.id === staffId);
      if (!row) throw { status: 404, data: { code: "NOT_FOUND" } };
      return {
        __contract: true,
        payload: synthesizeStaffDetail(row),
      } as T;
    }
    case "patchStaff": {
      const staffId = String(params.staffId ?? "");
      const idx = mockDb.staff.findIndex((s) => s.id === staffId);
      if (idx < 0) throw { status: 404, data: { code: "NOT_FOUND" } };
      if (body.name) mockDb.staff[idx].name = String(body.name);
      return {
        __contract: true,
        payload: {
          ...synthesizeStaffDetail(mockDb.staff[idx]),
          auditEventId: "aud_stf_patch",
        },
      } as T;
    }
    case "activateStaff":
    case "deactivateStaff": {
      const staffId = String(params.staffId ?? "");
      const idx = mockDb.staff.findIndex((s) => s.id === staffId);
      if (idx < 0) throw { status: 404, data: { code: "NOT_FOUND" } };
      if (mockKey === "deactivateStaff" && mockDb.staff[idx].today > 0) {
        throw {
          status: 422,
          data: {
            code: "VALIDATION_FAILED",
            message: `This staff member is holding ₹${mockDb.staff[idx].today.toLocaleString("en-IN")} in cash. Settle the handover before deactivating.`,
            details: {
              cashInHandPaise: mockDb.staff[idx].today * 100,
              pendingHandovers: 1,
            },
          },
        };
      }
      mockDb.staff[idx].status =
        mockKey === "activateStaff" ? "ACTIVE" : "SUSPENDED";
      return {
        __contract: true,
        payload: {
          ...synthesizeStaffDetail(mockDb.staff[idx]),
          auditEventId: "aud_stf_status",
        },
      } as T;
    }
    case "resetStaffPassword":
      return {
        __contract: true,
        payload: {
          mode: body.mode ?? "SET_TEMPORARY",
          temporaryPassword: body.temporaryPassword ?? "Temp#9182",
          auditEventId: "aud_stf_pwd",
        },
      } as T;
    case "transferStaffBranch": {
      const staffId = String(params.staffId ?? "");
      const idx = mockDb.staff.findIndex((s) => s.id === staffId);
      if (idx < 0) throw { status: 404, data: { code: "NOT_FOUND" } };
      const branchId = String(body.branchId ?? "");
      const br = mockDb.branches.find((b) => b.id === branchId);
      if (br) mockDb.staff[idx].branch = br.name;
      return {
        __contract: true,
        payload: {
          ...synthesizeStaffDetail(mockDb.staff[idx]),
          auditEventId: "aud_stf_xfer",
        },
      } as T;
    }
    case "branches": {
      const { items, page } = paginateSlice([...mockDb.branches], params);
      return { items, total: mockDb.branches.length, ...page } as T;
    }
    case "branchDetail": {
      const branchId = String(params.branchId ?? "");
      const row = mockDb.branches.find((b) => b.id === branchId);
      if (!row) throw { status: 404, data: { code: "NOT_FOUND" } };
      return {
        __contract: true,
        payload: synthesizeBranchDetail(row),
      } as T;
    }
    case "patchBranch": {
      const branchId = String(params.branchId ?? "");
      const idx = mockDb.branches.findIndex((b) => b.id === branchId);
      if (idx < 0) throw { status: 404, data: { code: "NOT_FOUND" } };
      const addr = body.address as Record<string, unknown> | undefined;
      if (body.name) mockDb.branches[idx].name = String(body.name);
      if (addr?.line1 != null) mockDb.branches[idx].line1 = String(addr.line1);
      if (addr?.city != null) mockDb.branches[idx].city = String(addr.city);
      if (addr?.pincode != null) {
        mockDb.branches[idx].pincode = String(addr.pincode);
      }
      if (body.contactNumber != null) {
        mockDb.branches[idx].contactNumber = String(body.contactNumber);
      }
      return {
        __contract: true,
        payload: {
          ...synthesizeBranchDetail(mockDb.branches[idx]),
          auditEventId: "aud_brn_patch",
        },
      } as T;
    }
    case "activateBranch":
    case "deactivateBranch": {
      const branchId = String(params.branchId ?? "");
      const idx = mockDb.branches.findIndex((b) => b.id === branchId);
      if (idx < 0) throw { status: 404, data: { code: "NOT_FOUND" } };
      if (mockKey === "deactivateBranch") {
        const detail = synthesizeBranchDetail(mockDb.branches[idx]);
        const schemes = detail.stats.activeSchemes ?? 0;
        if (schemes > 0) {
          throw {
            status: 422,
            data: {
              code: "VALIDATION_FAILED",
              message: `This branch has ${schemes} active schemes. Close or transfer them before deactivating.`,
              details: {
                activeSchemes: schemes,
                activeStaff: mockDb.branches[idx].staff,
                pendingCashHandovers: 2,
              },
            },
          };
        }
      }
      mockDb.branches[idx].status =
        mockKey === "activateBranch" ? "ACTIVE" : "INACTIVE";
      return {
        __contract: true,
        payload: {
          ...synthesizeBranchDetail(mockDb.branches[idx]),
          auditEventId: "aud_brn_status",
        },
      } as T;
    }
    case "createBranch": {
      const code = String(body.code ?? "")
        .toUpperCase()
        .slice(0, 6);
      const addressStr =
        typeof body.address === "string"
          ? body.address
          : String(
              (body.address as { city?: string } | undefined)?.city ?? "Kochi",
            );
      const city =
        typeof body.address === "string"
          ? addressStr.split(",")[1]?.trim() || addressStr || "Kochi"
          : String(
              (body.address as { city?: string } | undefined)?.city ?? "Kochi",
            );
      const row = {
        id: `brn_${Date.now()}`,
        name: String(body.name),
        code,
        city,
        staff: 0,
        customers: 0,
        status: "ACTIVE" as const,
      };
      mockDb.branches.push(row);
      return {
        __contract: true,
        payload: { ...row, auditEventId: "aud_brn" },
      } as T;
    }
    case "createStaff": {
      const branchId = String(body.branchId ?? "");
      const branch =
        mockDb.branches.find((b) => b.id === branchId) ?? mockDb.branches[0];
      const role = String(body.role ?? "BRANCH_STAFF");
      const roleLabels: Record<string, string> = {
        BRANCH_STAFF: "Staff",
        COLLECTION_AGENT: "Collection agent",
        BRANCH_MANAGER: "Branch manager",
        TENANT_ADMIN: "Tenant admin",
      };
      const row = {
        id: `usr_${Date.now()}`,
        name: String(body.name),
        initials: String(body.name)
          .split(/\s+/)
          .map((p) => p[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        role: roleLabels[role] ?? role,
        branch: branch.name,
        today: 0,
        sessions: 0,
        lastSeen: "Never",
        status: "ACTIVE" as const,
      };
      mockDb.staff.push(row);
      return {
        __contract: true,
        payload: {
          id: row.id,
          name: row.name,
          mobile: String(body.mobile),
          role,
          scope: role === "TENANT_ADMIN" ? (body.scope ?? "TENANT") : "BRANCH",
          branch: { id: branch.id, name: branch.name, code: branch.code },
          status: "ACTIVE",
          mustChangePassword: body.mustChangePassword !== false,
          auditEventId: "aud_stf",
        },
      } as T;
    }
    case "grievances": {
      const statusFilter = params.status ? String(params.status) : undefined;
      const priorityFilter = params.priority
        ? String(params.priority)
        : undefined;
      const overdueOnly =
        params.overdueOnly === true || params.overdueOnly === "true";
      let filtered = mockDb.grievances.filter(
        (item) =>
          !q ||
          [item.ticketNo, item.customer, item.subject].some((v) =>
            includes(v, q),
          ),
      );
      if (statusFilter) {
        filtered = filtered.filter((item) => item.status === statusFilter);
      }
      if (priorityFilter) {
        filtered = filtered.filter((item) => item.priority === priorityFilter);
      }
      const expanded = [
        ...filtered,
        ...Array.from({ length: 14 }, (_, i) => ({
          ...mockDb.grievances[i % mockDb.grievances.length],
          id: `grv_demo_${i}`,
          ticketNo: `TKT-2609-${String(i + 20).padStart(3, "0")}`,
        })),
      ];
      const rows = overdueOnly
        ? expanded.filter((item) => item.sla.includes("Overdue"))
        : expanded;
      const { items, page } = paginateSlice(rows, params);
      return {
        items,
        total: rows.length,
        ...page,
        summary: { open: 7, urgent: 1, overdue: 2, resolvedToday: 5 },
      } as T;
    }
    case "grievanceDetail": {
      const id = String(params.id ?? "");
      return {
        __contract: true,
        payload: buildGrievanceDetail(id),
      } as T;
    }
    case "grievanceAssign": {
      const id = String(params.id ?? "");
      setGrievanceAssignee(id, "Arun Raj");
      return {
        __contract: true,
        payload: {
          id,
          status: "IN_PROGRESS",
          version: buildGrievanceDetail(id).version,
          auditEventId: "aud_grv_assign",
        },
      } as T;
    }
    case "grievanceMessage": {
      const id = String(params.id ?? "");
      const messageType = String(body.messageType ?? "PUBLIC_REPLY");
      appendGrievanceMessage(id, {
        id: `gmsg_${Date.now()}`,
        messageType: messageType as any,
        body: String(body.body ?? ""),
        authorName: "Arun Raj",
        authorType: "USER",
        createdAt: new Date().toISOString(),
      });
      if (body.setStatus) setGrievanceStatus(id, body.setStatus as any);
      return {
        __contract: true,
        payload: buildGrievanceDetail(id),
      } as T;
    }
    case "grievanceStatus":
    case "updateGrievance": {
      const id = String(params.id ?? "");
      const status = String(body.status ?? "RESOLVED") as any;
      setGrievanceStatus(id, status);
      return {
        __contract: true,
        payload: {
          id,
          status,
          version: buildGrievanceDetail(id).version,
          auditEventId: "aud_grv_status",
        },
      } as T;
    }
    case "grievancePriority": {
      const id = String(params.id ?? "");
      return {
        __contract: true,
        payload: {
          id,
          priority: body.priority,
          version: buildGrievanceDetail(id).version + 1,
        },
      } as T;
    }
    case "remindersConfig":
      return {
        __contract: true,
        payload: {
          enabled: true,
          offsets: [
            {
              key: "D_MINUS_5",
              label: "5 days before due",
              days: -5,
              enabled: true,
              messageType: "PAYMENT_DUE",
            },
            {
              key: "D_MINUS_3",
              label: "3 days before due",
              days: -3,
              enabled: false,
              messageType: "PAYMENT_DUE",
            },
            {
              key: "D_MINUS_1",
              label: "1 day before due",
              days: -1,
              enabled: true,
              messageType: "PAYMENT_DUE",
            },
            {
              key: "D_DAY",
              label: "On the due date",
              days: 0,
              enabled: true,
              messageType: "PAYMENT_DUE",
            },
            {
              key: "D_PLUS_1",
              label: "1 day after due",
              days: 1,
              enabled: true,
              messageType: "PAYMENT_OVERDUE",
            },
            {
              key: "D_PLUS_7",
              label: "7 days after due",
              days: 7,
              enabled: true,
              messageType: "PAYMENT_OVERDUE",
            },
          ],
          maxRemindersPerInstallment: 5,
          sendWindow: {
            startTime: "09:00",
            endTime: "20:00",
            timezone: "Asia/Kolkata",
          },
          attachPaymentLink: true,
          paymentLinkValidityHours: 72,
          push: {
            enabled: true,
            dueReminders: true,
            overdueReminders: true,
            flexibleNudge: true,
            paymentSuccess: true,
            schemeJoined: true,
            flexiLockApplied: true,
            schemeMatured: true,
            maturityReminders: true,
            schemeClosed: true,
          },
          transactional: {
            schemeJoined: true,
            paymentSuccess: true,
            paymentSuccessAttachPassbook: true,
            flexiLockApplied: true,
            schemeMatured: true,
            schemeClosed: true,
          },
        },
      } as T;
    case "updateRemindersConfig":
      return {
        __contract: true,
        payload: { ...body, auditEventId: "aud_rem_cfg" },
      } as T;
    case "pushBroadcastAudiencePreview":
      return {
        __contract: true,
        payload: { eligibleDevices: 1284, subscriptionCap: null },
      } as T;
    case "presignPushUpload":
      return {
        __contract: true,
        payload: {
          uploadId: "upl_push_mock",
          uploadUrl: "",
          method: "PUT",
          headers: {},
          expiresAt: new Date(Date.now() + 900_000).toISOString(),
        },
      } as T;
    case "completePushUpload":
      return {
        __contract: true,
        payload: { uploadId: params.uploadId ?? "upl_push_mock", status: "UPLOADED", viewUrl: "/uploads/upl_push_mock" },
      } as T;
    case "createPushBroadcast":
      return {
        __contract: true,
        payload: {
          id: "pbc_mock_01",
          title: body?.title ?? "Mock push",
          body: body?.body ?? "",
          status: "QUEUED",
          stats: { audienceCount: 1284, messagesQueued: 0, delivered: 0, failed: 0, pending: 0 },
          createdAt: new Date().toISOString(),
        },
      } as T;
    case "pushBroadcasts":
      return {
        __contract: true,
        payload: [
          {
            id: "pbc_mock_01",
            title: "Festival preview",
            body: "Visit our showroom for exclusive offers.",
            status: "COMPLETED",
            stats: { audienceCount: 420, messagesQueued: 420, delivered: 401, failed: 3, pending: 16 },
            createdAt: "2026-09-10T10:00:00+05:30",
          },
        ],
        meta: { page: { nextCursor: null, hasMore: false } },
      } as T;
    case "messagingTemplates":
      return {
        __contract: true,
        payload: [
          {
            messageType: "PAYMENT_DUE",
            label: "Payment due reminder",
            configured: true,
            templateName: "kairali_payment_due_v1",
            approvalStatus: "APPROVED",
            sentLast30Days: 842,
            deliveryRatePercent: 97.2,
          },
          {
            messageType: "PAYMENT_OVERDUE",
            label: "Overdue reminder",
            configured: true,
            templateName: "kairali_overdue_v1",
            approvalStatus: "APPROVED",
            sentLast30Days: 210,
            deliveryRatePercent: 94.3,
          },
          {
            messageType: "PAYMENT_SUCCESS",
            label: "Payment receipt",
            configured: true,
            templateName: "kairali_receipt_v1",
            approvalStatus: "APPROVED",
            sentLast30Days: 1204,
            deliveryRatePercent: 98.1,
          },
          {
            messageType: "SCHEME_CLOSED",
            label: "Scheme closure",
            configured: false,
            templateName: null,
            warning: "Not configured — contact support.",
          },
        ],
        meta: { configured: 7, required: 8, missing: ["SCHEME_CLOSED"] },
      } as T;
    case "messagingTemplatePreview": {
      const messageType = String(params.messageType ?? "PAYMENT_DUE");
      return {
        __contract: true,
        payload: {
          messageType,
          renderedBody:
            "Hi Anjali Menon, your installment 5 of ₹5,000 for Dhanam 11 is due on 20 Sep 2026. Pay securely using the button below. — Kairali Jewellers",
          buttonLabel: "Pay Now",
          buttonUrl: "https://pay.example/pl_sample",
        },
      } as T;
    }
    case "messagingSummary":
      return {
        __contract: true,
        payload: {
          periodLabel: "September 2026",
          sent: 3100,
          delivered: 2970,
          read: 2356,
          failed: 84,
          quotaUsedPercent: 62,
          quotaLimit: 5000,
          quotaRemaining: 1900,
          resetsOn: "2026-10-01",
          charts: {
            volumeTrend: {
              chartType: "line",
              title: "Message volume",
              yAxis: { type: "count" },
              series: [
                {
                  key: "V",
                  name: "Sent",
                  data: [
                    { x: "W1", y: 80000 },
                    { x: "W2", y: 90000 },
                  ],
                },
              ],
            },
            deliveryRate: {
              chartType: "bar",
              title: "Delivery rate by type",
              yAxis: { type: "percent" },
              series: [
                {
                  key: "D",
                  name: "Rate",
                  data: [
                    { x: "Due", y: 9700 },
                    { x: "Overdue", y: 9400 },
                  ],
                },
              ],
            },
          },
        },
      } as T;
    case "settingsProfile":
      return {
        __contract: true,
        payload: { ...mockSettingsProfile },
      } as T;
    case "settingsOperations":
      return {
        __contract: true,
        payload: { ...mockSettingsOperations },
      } as T;
    case "settingsBranding":
      return {
        __contract: true,
        payload: { ...mockSettingsBranding },
      } as T;
    case "patchSettingsProfile": {
      Object.assign(mockSettingsProfile, {
        businessName: body.businessName ?? mockSettingsProfile.businessName,
        displayName: body.displayName ?? mockSettingsProfile.displayName,
        ownerName: body.ownerName ?? mockSettingsProfile.ownerName,
        ownerMobile: body.ownerMobile ?? mockSettingsProfile.ownerMobile,
        ownerEmail: body.ownerEmail ?? mockSettingsProfile.ownerEmail,
        supportNumber: body.supportNumber ?? mockSettingsProfile.supportNumber,
        gstin: body.gstin ?? mockSettingsProfile.gstin,
        address: {
          ...mockSettingsProfile.address,
          ...((body.address as object) ?? {}),
        },
        audit: {
          updatedAt: "2026-09-14T19:00:00+05:30",
          version: mockSettingsProfile.audit.version + 1,
        },
      });
      return {
        __contract: true,
        payload: {
          ...mockSettingsProfile,
          auditEventId: "aud_settings_profile",
        },
      } as T;
    }
    case "patchSettingsBranding":
    case "patchSettings": {
      const primary = String(
        body.primaryColor ?? mockSettingsBranding.primaryColor,
      );
      const secondary = String(
        body.accentColor ??
          body.secondaryColor ??
          mockSettingsBranding.secondaryColor,
      );
      const appDisplayName = String(
        body.displayName ??
          body.appDisplayName ??
          mockSettingsBranding.appDisplayName,
      );
      const next = buildBrandingPreview(primary, secondary, appDisplayName);
      Object.assign(mockSettingsBranding, next);
      return { __contract: true, payload: next } as T;
    }
    case "patchSettingsOperations": {
      if (
        body.ecommerceEnabled === true &&
        mockSubscription.features?.ecommerce !== true
      ) {
        throw {
          status: 403,
          data: {
            code: "FEATURE_NOT_ENTITLED",
            message:
              "Your subscription plan does not include ecommerce. Upgrade your plan to enable the online store.",
          },
        };
      }
      const ecommerceEnabled =
        body.ecommerceEnabled ?? mockSettingsOperations.ecommerceEnabled;
      const planEntitled = mockSubscription.features?.ecommerce === true;
      Object.assign(mockSettingsOperations, {
        ...body,
        ecommerceEnabled: ecommerceEnabled === true,
        ecommerce: {
          planEntitled,
          enabled: ecommerceEnabled === true,
          active: planEntitled && ecommerceEnabled === true,
        },
        audit: {
          version: mockSettingsOperations.audit.version + 1,
        },
      });
      return {
        __contract: true,
        payload: {
          ...mockSettingsOperations,
          auditEventId: "aud_settings_ops",
        },
      } as T;
    }
    case "subscription":
      return { __contract: true, payload: { ...mockSubscription } } as T;
    case "subscriptionUsage":
      return {
        __contract: true,
        payload: { ...mockSubscription.usage },
      } as T;
    case "availablePlans":
      return {
        __contract: true,
        payload: mockAvailablePlans,
        meta: { nextCursor: null, hasMore: false },
      } as T;
    case "upgradeRequest":
      return {
        __contract: true,
        payload: {
          id: `upr_${Date.now()}`,
          targetTier: body.planTier ?? body.targetTier,
          planTier: body.planTier ?? body.targetTier,
          billingCycle: body.billingCycle ?? "MONTHLY",
          note: body.note ?? null,
          status: "PENDING_PLATFORM",
          auditEventId: "aud_upgrade_req",
        },
      } as T;
    case "subscriptionInvoices": {
      const { items, page } = paginateSlice(mockSubscriptionInvoices, params);
      return {
        __contract: true,
        payload: items,
        meta: {
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
        },
      } as T;
    }
    case "downloadSubscriptionInvoice": {
      const id = String(params.invoiceId ?? "");
      const row = mockSubscriptionInvoices.find((inv) => inv.id === id);
      const label = row?.number ?? id;
      return new Blob([`Mock subscription invoice PDF — ${label}`], {
        type: "application/pdf",
      }) as T;
    }
    case "planPreviewSchedule": {
      const planId = body.planId ? String(body.planId) : undefined;
      const row = planId
        ? mockDb.plans.find((p) => p.id === planId)
        : undefined;
      return {
        __contract: true,
        payload: buildPlanSchedulePreview(body, row),
      } as T;
    }
    case "createPaymentLink":
      return {
        __contract: true,
        payload: {
          id: `plnk_${Date.now()}`,
          url: "https://pay.example/link/demo",
          status: "SENT",
          expiresAt: "2026-09-17T09:00:00+05:30",
          amountPaise: Number(
            body.amountPaise ?? amountPaise(Number(body.amount ?? 0)),
          ),
          auditEventId: "aud_plnk",
          positionVersion: body.expectedPositionVersion ?? 1,
        },
      } as T;
    case "overdues": {
      const from = params.from ? String(params.from) : undefined;
      const to = params.to ? String(params.to) : undefined;
      let rows = mockDb.dues.filter((item) =>
        ["OVERDUE", "DEFAULTED"].includes(item.status),
      );
      if (from || to) {
        rows = rows.filter((item) =>
          matchesDemoDateRange(item.dueDate, from, to),
        );
      }
      const { items, page } = paginateSlice(rows, params);
      return {
        items,
        summary: {
          overdue: 86500,
          accounts: rows.length,
          avgDays: 12,
          chart: {
            chartType: "bar",
            title: "Overdue by ageing",
            yAxis: { type: "currency", label: "Amount" },
            series: [
              {
                key: "OVERDUE",
                name: "Overdue",
                data: [
                  { x: "1–7 days", y: 9000000, yDisplay: "₹90,000" },
                  { x: "8–15 days", y: 12600000, yDisplay: "₹1,26,000" },
                  { x: "16–30 days", y: 9800000, yDisplay: "₹98,000" },
                  { x: "30+ days", y: 9800000, yDisplay: "₹98,000" },
                ],
              },
            ],
          },
        },
        total: rows.length,
        ...page,
      } as T;
    }
    case "bulkSendOverdueReminders": {
      const ids =
        (body.schemeIds as string[] | undefined) ??
        (body.installmentIds as string[] | undefined) ??
        [];
      const skipped =
        ids.length > 1
          ? [
              {
                installmentId: ids[ids.length - 1],
                schemeId: ids[ids.length - 1],
                reason: "WHATSAPP_OPTED_OUT",
              },
            ]
          : [];
      return {
        __contract: true,
        payload: {
          jobId: `job_${Date.now()}`,
          queued: Math.max(0, ids.length - skipped.length),
          skipped,
          auditEventId: "aud_bulk_rem",
        },
      } as T;
    }
    case "bulkSendDueLinks": {
      const ids =
        (body.schemeIds as string[] | undefined) ??
        (body.installmentIds as string[] | undefined) ??
        [];
      const skipped =
        ids.length > 2
          ? [
              {
                installmentId: ids[1],
                schemeId: ids[1],
                reason: "ALREADY_SENT",
              },
            ]
          : [];
      return {
        __contract: true,
        payload: {
          jobId: `job_${Date.now()}`,
          queued: Math.max(0, ids.length - skipped.length),
          skipped,
        },
      } as T;
    }
    case "createExport":
      return {
        __contract: true,
        payload: {
          exportId: `exp_${Date.now()}`,
          status: "PROCESSING",
          format: body.format ?? "CSV",
          statusUrl: `/admin/exports/exp_demo`,
        },
      } as T;
    case "exportStatus":
      return {
        __contract: true,
        payload: {
          exportId: String(params.exportId ?? "exp_demo"),
          status: "READY",
          downloadUrl: "#",
        },
      } as T;
    case "validateEnrolment": {
      const mode = String(body.firstInstallmentMode ?? "COLLECT_NOW");
      const amount =
        body.installmentAmountPaise != null
          ? Number(body.installmentAmountPaise) / 100
          : Number(body.amount ?? 3000);
      return {
        __contract: true,
        payload: {
          blockers: [],
          warnings: [],
          preview: {
            installmentAmount: amount,
            installmentCount: 12,
            firstDueDate:
              mode === "COLLECT_NOW" ? "14 Sep 2026" : "05 Oct 2026",
            maturityDate: "05 Sep 2027",
            schedulePreview: [
              {
                sequence: 1,
                dueDate: mode === "COLLECT_NOW" ? "14 Sep 2026" : "05 Oct 2026",
                amountDisplay: `₹${amount.toLocaleString("en-IN")}`,
              },
            ],
          },
        },
      } as T;
    }
    case "login":
      return {
        __contract: true,
        payload: {
          user: {
            id: "usr_admin",
            name: "Arun Raj",
            role: "TENANT_OWNER",
            tenantId: "tnt_demo",
            branchId: "brn_01",
            permissions: [],
            mustSetPassword: false,
            mobile: body.mobile,
          },
          accessToken: "mock-access-token",
          refreshToken: "mock-refresh-token",
          expiresIn: "30m",
          tokenType: "Bearer",
        },
      } as T;
    case "logout":
      return {
        __contract: true,
        payload: { loggedOut: true },
      } as T;
    case "getMe":
      return {
        __contract: true,
        payload: {
          id: "usr_admin",
          name: "Arun Raj",
          role: "TENANT_OWNER",
          tenantId: "tnt_demo",
          branchId: "brn_01",
          permissions: [],
          mustSetPassword: false,
        },
      } as T;
    case "checkMobile": {
      const mobile = String(params.mobile ?? "");
      const dup = mockDb.customers.find((c) =>
        c.phone.includes(mobile.slice(-4)),
      );
      return {
        __contract: true,
        payload: dup
          ? {
              available: false,
              existingCustomerId: dup.id,
              customerName: dup.name,
            }
          : { available: true },
      } as T;
    }
    case "customerAnalytics": {
      const from = String(params.from ?? "2026-09-01");
      const to = String(params.to ?? "2026-09-07");
      const trendDays = [
        { x: "2026-09-01", xDisplay: "1 Sep", y: 2, yDisplay: "2" },
        { x: "2026-09-02", xDisplay: "2 Sep", y: 1, yDisplay: "1" },
        { x: "2026-09-03", xDisplay: "3 Sep", y: 0, yDisplay: "0" },
        { x: "2026-09-04", xDisplay: "4 Sep", y: 3, yDisplay: "3" },
        { x: "2026-09-05", xDisplay: "5 Sep", y: 1, yDisplay: "1" },
        { x: "2026-09-06", xDisplay: "6 Sep", y: 2, yDisplay: "2" },
        { x: "2026-09-07", xDisplay: "7 Sep", y: 1, yDisplay: "1" },
      ].filter((point) => point.x >= from && point.x <= to);
      return {
        __contract: true,
        payload: {
          scope: { level: "TENANT", label: "All showrooms" },
          period: {
            from,
            to,
            label: `${from} – ${to}`,
            comparedTo: { from: "2026-08-25", to: "2026-08-31", label: "25–31 Aug 2026" },
            groupBy: "DAY",
          },
          summary: [
            { key: "TOTAL_CUSTOMERS", label: "Total customers", value: 846, valueType: "count", note: "Current snapshot" },
            { key: "ACTIVE_CUSTOMERS", label: "Active customers", value: 812, valueType: "count", note: "Current snapshot" },
            { key: "NEW_CUSTOMERS", label: "New customers", value: 10, valueType: "count", change: { percent: 11.1, direction: "up", isGood: true } },
            { key: "CUSTOMERS_WITH_ACTIVE_SCHEME", label: "With active scheme", value: 655, valueType: "count", note: "Current snapshot" },
            { key: "KYC_PENDING", label: "KYC pending", value: 82, valueType: "count", note: "Current snapshot" },
            { key: "WHATSAPP_OPTED_IN", label: "WhatsApp opted in", value: 780, valueType: "count", note: "Current snapshot" },
          ],
          charts: {
            registrationTrend: {
              chartType: "line",
              title: "New customers",
              subtitle: "Customers registered during the selected period",
              yAxis: { type: "count", label: "Customers" },
              series: [{ key: "NEW_CUSTOMERS", name: "New customers", data: trendDays }],
            },
            customerStatusDistribution: {
              chartType: "donut",
              title: "Customer status",
              yAxis: { type: "count", label: "Customers" },
              series: [{
                key: "STATUS",
                name: "Customers",
                data: [
                  { x: "Active", y: 812, yDisplay: "812" },
                  { x: "Inactive", y: 28, yDisplay: "28" },
                  { x: "Blocked", y: 6, yDisplay: "6" },
                ],
              }],
            },
            kycDistribution: {
              chartType: "donut",
              title: "KYC status",
              yAxis: { type: "count", label: "Customers" },
              series: [{
                key: "KYC",
                name: "Customers",
                data: [
                  { x: "Verified", y: 720, yDisplay: "720" },
                  { x: "Submitted", y: 20, yDisplay: "20" },
                  { x: "Not submitted", y: 62, yDisplay: "62" },
                  { x: "Rejected", y: 44, yDisplay: "44" },
                ],
              }],
            },
          },
        },
      } as T;
    }
    case "enrollmentAnalytics": {
      const from = String(params.from ?? "2026-09-01");
      const to = String(params.to ?? "2026-09-07");
      const trendDays = [
        { x: "2026-09-01", xDisplay: "1 Sep", y: 1, yDisplay: "1" },
        { x: "2026-09-02", xDisplay: "2 Sep", y: 3, yDisplay: "3" },
        { x: "2026-09-03", xDisplay: "3 Sep", y: 0, yDisplay: "0" },
        { x: "2026-09-04", xDisplay: "4 Sep", y: 2, yDisplay: "2" },
        { x: "2026-09-05", xDisplay: "5 Sep", y: 1, yDisplay: "1" },
        { x: "2026-09-06", xDisplay: "6 Sep", y: 2, yDisplay: "2" },
        { x: "2026-09-07", xDisplay: "7 Sep", y: 0, yDisplay: "0" },
      ].filter((point) => point.x >= from && point.x <= to);
      return {
        __contract: true,
        payload: {
          scope: { level: "TENANT", label: "All showrooms" },
          period: {
            from,
            to,
            label: `${from} – ${to}`,
            comparedTo: { from: "2026-08-25", to: "2026-08-31", label: "25–31 Aug 2026" },
            groupBy: "DAY",
          },
          summary: [
            { key: "TOTAL_ENROLLMENTS", label: "Total enrollments", value: 412, valueType: "count", note: "Current snapshot" },
            { key: "ACTIVE_ENROLLMENTS", label: "Active enrollments", value: 318, valueType: "count", note: "Current snapshot" },
            { key: "NEW_ENROLLMENTS", label: "New enrollments", value: 9, valueType: "count", change: { percent: 12.5, direction: "up", isGood: true } },
            { key: "DEFAULTED", label: "Defaulted", value: 14, valueType: "count", note: "Current snapshot" },
            { key: "MATURED", label: "Matured", value: 52, valueType: "count", note: "Current snapshot" },
            { key: "TOTAL_COMMITTED", label: "Total committed", value: { amountPaise: 248500000, amountDisplay: "₹24,85,000" }, valueType: "currency", note: "Current snapshot" },
          ],
          charts: {
            enrollmentTrend: {
              chartType: "line",
              title: "New enrollments",
              subtitle: "Enrollments created during the selected period",
              yAxis: { type: "count", label: "Enrollments" },
              series: [{ key: "NEW_ENROLLMENTS", name: "New enrollments", data: trendDays }],
            },
            schemeStatusDistribution: {
              chartType: "donut",
              title: "Enrollment status",
              yAxis: { type: "count", label: "Enrollments" },
              series: [{
                key: "STATUS",
                name: "Enrollments",
                data: [
                  { x: "Active", y: 280, yDisplay: "280" },
                  { x: "Locked / capped", y: 38, yDisplay: "38" },
                  { x: "Matured", y: 52, yDisplay: "52" },
                  { x: "Defaulted", y: 14, yDisplay: "14" },
                ],
              }],
            },
            paymentPatternDistribution: {
              chartType: "donut",
              title: "Payment pattern",
              yAxis: { type: "count", label: "Enrollments" },
              series: [{
                key: "PATTERN",
                name: "Enrollments",
                data: [
                  { x: "Fixed", y: 340, yDisplay: "340" },
                  { x: "Flexible", y: 72, yDisplay: "72" },
                ],
              }],
            },
            enrollmentsByPlan: {
              chartType: "horizontalBar",
              title: "Enrollments by plan",
              yAxis: { type: "count", label: "Enrollments" },
              series: [{
                key: "PLAN",
                name: "Enrollments",
                data: [
                  { x: "Akshaya 12 Month", y: 120, yDisplay: "120" },
                  { x: "11+1 Gold weight", y: 86, yDisplay: "86" },
                  { x: "Sampoorna Flex 11", y: 64, yDisplay: "64" },
                ],
              }],
            },
          },
        },
      } as T;
    }
    case "redemptions": {
      const openOnly =
        params.open === true || params.open === "true" || params.open === "1";
      let rows = [
        {
          id: "rdm_01",
          redemptionNumber: "RDM-2609-01",
          customer: "Anjali Nair",
          scheme: "Akshaya 12",
          amount: 36000,
          status: "PENDING_APPROVAL",
          submittedAt: "Today",
        },
        {
          id: "rdm_02",
          redemptionNumber: "RDM-2609-02",
          customer: "Muhammed G",
          scheme: "Dhanam 11",
          amount: 55000,
          status: "APPROVED",
          submittedAt: "Yesterday",
        },
        {
          id: "rdm_03",
          redemptionNumber: "RDM-2608-99",
          customer: "Done Customer",
          scheme: "Akshaya 12",
          amount: 12000,
          status: "COMPLETED",
          submittedAt: "Aug 2026",
        },
      ];
      if (openOnly) {
        rows = rows.filter((r) =>
          ["REQUESTED", "PENDING_APPROVAL", "APPROVED"].includes(r.status),
        );
      } else if (params.status && params.status !== "ALL") {
        rows = rows.filter((r) => r.status === params.status);
      }
      const { items, page } = paginateSlice(rows, params);
      return { items, total: rows.length, ...page } as T;
    }
    case "approveRedemption":
    case "completeRedemption":
      return {
        __contract: true,
        payload: { id: params.id, status: "COMPLETED" },
      } as T;
    case "goldRateCurrent":
      return {
        __contract: true,
        payload: {
          isSetForToday: true,
          ratePerGram: mockDb.goldRates[0]?.ratePerGram ?? 7200,
          effectiveAt: mockDb.goldRates[0]?.effectiveAt,
        },
      } as T;
    case "staffCashDetail": {
      const staff =
        mockDb.staff.find((s) => s.id === String(params.staffId)) ??
        mockDb.staff[0];
      const collections = mockDb.payments
        .filter((p) => p.mode === "CASH")
        .slice(0, 8)
        .map((p) => ({
          receiptNo: p.receiptNo,
          amount: p.amount,
          customer: p.customer,
          paidAt: p.date,
          mode: p.mode,
        }));
      return {
        __contract: true,
        payload: {
          staff: { id: staff.id, name: staff.name },
          branch: staff.branch,
          cashInHand: { amountPaise: 1850000, amountDisplay: "₹18,500" },
          receiptCount: collections.length,
          collections,
        },
      } as T;
    }
    case "entityAudit": {
      const { items, page } = paginateSlice(
        mockDb.auditEvents.map((e, i) => ({
          ...e,
          summary: `${e.action} · ${e.entity}`,
          changes:
            i % 2 === 0
              ? [{ field: "status", from: "OPEN", to: "CLOSED" }]
              : [],
        })),
        params,
      );
      return { items, total: items.length, ...page } as T;
    }
    case "audit": {
      let rows = [...mockDb.auditEvents];
      const entityType = params.type ? String(params.type) : undefined;
      if (entityType) {
        rows = rows.filter((item) => item.entityType === entityType);
      }
      if (params.q) {
        const query = String(params.q);
        rows = rows.filter((item) =>
          includes(
            `${item.actor} ${item.action} ${item.entityType} ${item.entity}`,
            query,
          ),
        );
      }
      const from = params.from ? String(params.from) : undefined;
      const to = params.to ? String(params.to) : undefined;
      if (from || to) {
        rows = rows.filter((item) => matchesDemoDateRange(item.at, from, to));
      }
      const { items, page } = paginateSlice(rows, params);
      return { items, total: rows.length, ...page } as T;
    }
    case "settings":
      return {
        __contract: true,
        payload: { ...mockSettingsProfile },
      } as T;
    case "refreshToken":
      return {
        __contract: true,
        payload: {
          accessToken: "mock-access-token-refreshed",
          refreshToken: "mock-refresh-token-refreshed",
          expiresIn: "30m",
          tokenType: "Bearer",
        },
      } as T;
    case "forgotPassword":
      return {
        __contract: true,
        payload: { sent: true, expiresInSeconds: 300 },
      } as T;
    case "verifyPasswordResetOtp":
      return {
        __contract: true,
        payload: {
          resetToken: `mock-reset-token-${Date.now()}-${"x".repeat(16)}`,
        },
      } as T;
    case "resetPasswordWithToken":
      return {
        __contract: true,
        payload: { passwordSet: true },
      } as T;
    case "changePassword":
      return {
        __contract: true,
        payload: { passwordChanged: true, sessionsRevoked: true },
      } as T;
    case "logoutAll":
      return {
        __contract: true,
        payload: { loggedOut: true },
      } as T;
    case "getDevices":
      return {
        __contract: true,
        payload: [
          {
            deviceId: "web-demo-1",
            platform: "web",
            lastUsedAt: "2026-09-14T10:00:00+05:30",
            expiresAt: "2026-10-14T10:00:00+05:30",
          },
        ],
      } as T;
    case "revokeDevice":
      return {
        __contract: true,
        payload: { revoked: true },
      } as T;
    case "setPassword":
      return {
        __contract: true,
        payload: { passwordSet: true },
      } as T;
    case "addCustomerNote":
      return {
        __contract: true,
        payload: { saved: true },
      } as T;
    case "updateWhatsappOpt":
      return {
        __contract: true,
        payload: {
          customerId: String(params.id ?? "cus_demo"),
          optedIn: Boolean(body.optedIn),
          version: 2,
        },
      } as T;
    case "getCustomerNominee": {
      const customer =
        mockDb.customers.find((c) => c.id === String(params.id)) ??
        mockDb.customers[0];
      return {
        __contract: true,
        payload: customer?.nomineeDetail ?? {
          name: "Demo Nominee",
          relationship: "SPOUSE",
          relationshipLabel: "Spouse",
          mobile: "+919876543210",
        },
      } as T;
    }
    case "getCustomerStatement":
      return new Blob(
        [`Mock customer statement for ${String(params.id ?? "customer")}`],
        { type: "text/plain" },
      ) as T;
    case "shareCustomerStatementWhatsapp":
      return {
        __contract: true,
        payload: {
          queued: true,
          customerId: String(params.id ?? "cus_demo"),
        },
      } as T;
    case "getPayment": {
      const payment =
        mockDb.payments.find((p) => p.id === String(params.paymentId)) ??
        mockDb.payments[0];
      return {
        __contract: true,
        payload: payment ? toContractPayment(payment) : null,
      } as T;
    }
    case "getPendingPayments": {
      const rows = mockDb.payments.filter((p) => p.status === "PENDING");
      const { items, page } = paginateSlice(
        rows.map(toContractPayment),
        params,
      );
      return { items, total: rows.length, ...page } as T;
    }
    case "getLateSuccessPayments": {
      const rows = mockDb.payments.filter((p) => p.isLateSuccess);
      const { items, page } = paginateSlice(
        rows.map(toContractPayment),
        params,
      );
      return { items, total: rows.length, ...page } as T;
    }
    case "reversePayment":
      return {
        __contract: true,
        payload: {
          paymentId: String(params.paymentId),
          status: "REVERSED",
        },
      } as T;
    case "pollPaymentStatus":
      return {
        __contract: true,
        payload: {
          paymentId: String(params.paymentId),
          queued: true,
        },
      } as T;
    case "reconcilePayment":
      return {
        __contract: true,
        payload: {
          paymentId: String(params.paymentId),
          reconciled: true,
        },
      } as T;
    case "sharePaymentWhatsapp":
      return {
        __contract: true,
        payload: { queued: true },
      } as T;
    case "getPaymentReceipt":
      return new Blob(
        [`Mock payment receipt ${String(params.paymentId ?? "")}`],
        { type: "application/pdf" },
      ) as T;
    case "getPaymentPassbookImage":
      return new Blob(
        [
          `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120"><rect width="100%" height="100%" fill="#fcf6ee"/><text x="16" y="64" font-size="18">Passbook ${String(params.paymentId ?? "")}</text></svg>`,
        ],
        { type: "image/svg+xml" },
      ) as T;
    case "regeneratePassbookImage":
      return new Blob(
        [
          `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120"><rect width="100%" height="100%" fill="#fcf6ee"/><text x="16" y="64" font-size="18">Regenerated ${String(params.paymentId ?? "")}</text></svg>`,
        ],
        { type: "image/svg+xml" },
      ) as T;
    case "getPaymentLinks": {
      const rows = [
        {
          id: "plnk_01",
          url: "https://pay.example/link/01",
          status: "SENT",
          amountPaise: 300000,
          expiresAt: "2026-09-17T09:00:00+05:30",
        },
        {
          id: "plnk_02",
          url: "https://pay.example/link/02",
          status: "CANCELLED",
          amountPaise: 500000,
          expiresAt: "2026-09-16T09:00:00+05:30",
        },
      ];
      const { items, page } = paginateSlice(rows, params);
      return { items, total: rows.length, ...page } as T;
    }
    case "cancelPaymentLink":
      return {
        __contract: true,
        payload: { linkId: String(params.linkId), status: "CANCELLED" },
      } as T;
    case "resendPaymentLink":
      return {
        __contract: true,
        payload: { linkId: String(params.linkId), resent: true },
      } as T;
    case "getSchemeLedger": {
      const enrollment =
        mockDb.enrollments.find((e) => e.id === String(params.schemeId)) ??
        mockDb.enrollments[0];
      return {
        __contract: true,
        payload: {
          schemeId: enrollment?.id,
          entries: mockDb.payments
            .filter((p) => p.enrollmentNo === enrollment?.enrollmentNo)
            .slice(0, 8)
            .map((p) => ({
              date: p.date,
              receiptNo: p.receiptNo,
              amountPaise: amountPaise(p.amount),
              mode: p.mode,
              status: p.status,
            })),
        },
      } as T;
    }
    case "getSchemePassbook": {
      const enrollment =
        mockDb.enrollments.find((e) => e.id === String(params.schemeId)) ??
        mockDb.enrollments[0];
      return {
        __contract: true,
        payload: {
          schemeId: enrollment?.id,
          schemeNumber: enrollment?.enrollmentNo,
          customer: enrollment?.customer,
          plan: enrollment?.plan,
          entries: [],
        },
      } as T;
    }
    case "getMaturityProjection":
      return {
        __contract: true,
        payload: {
          schemeId: String(params.schemeId),
          projectedSettlementPaise: 3600000,
          projectedWeightMg: 4965,
          maturityDate: "2027-09-05",
        },
      } as T;
    case "getSchemePaymentIntents": {
      const rows = [
        {
          id: "pi_01",
          status: "PENDING",
          amountPaise: 300000,
          createdAt: "2026-09-14T08:00:00+05:30",
        },
      ];
      const { items, page } = paginateSlice(rows, params);
      return { items, total: rows.length, ...page } as T;
    }
    case "recomputeScheme":
      return {
        __contract: true,
        payload: {
          schemeId: String(params.schemeId),
          recomputed: true,
        },
      } as T;
    case "applyFlexibleLock":
      return {
        __contract: true,
        payload: {
          schemeId: String(params.schemeId),
          locked: true,
        },
      } as T;
    case "getRedemption": {
      const id = String(params.id ?? "rdm_01");
      return {
        __contract: true,
        payload: {
          _id: id,
          id,
          schemeId: "sch_01",
          customerId: "cus_01",
          closureType: "MATURITY_REDEMPTION",
          mode: "CASH",
          status: "PENDING_APPROVAL",
          principalPaise: 3400000,
          benefitPaise: 200000,
          penaltyPaise: 0,
          settlementPaise: 3600000,
          requestedAt: "2026-09-15T10:00:00+05:30",
          version: 1,
          customer: {
            _id: "cus_01",
            name: "Anjali Nair",
            mobile: "9847012345",
            customerNumber: "CUS-00042",
          },
          scheme: {
            _id: "sch_01",
            enrollmentNumber: "ENR-0000042",
            name: "Akshaya 12",
            maturityDate: "2027-09-01",
            status: "MATURED",
          },
          branch: { _id: "brn_01", name: "MG Road" },
        },
      } as T;
    }
    case "rejectRedemption":
      return {
        __contract: true,
        payload: { id: String(params.id), status: "REJECTED" },
      } as T;
    case "getRedemptionReceipt":
      return {
        __contract: true,
        payload: {
          receiptNumber: `RED-${String(params.id ?? "rdm_01")}`,
          completedAt: "2026-09-14T12:00:00+05:30",
          settlementPaise: 3600000,
          mode: "CASH",
        },
      } as T;
    case "createCashAdjustment":
      return {
        __contract: true,
        payload: {
          _id: `cad_${Date.now()}`,
          staffId: body.staffId,
          direction: body.direction,
          amountPaise: body.amountPaise,
          reason: body.reason,
        },
      } as T;
    case "getMessagingMessage": {
      const message =
        mockDb.messages.find((m) => m.id === String(params.messageId)) ??
        mockDb.messages[0];
      return {
        __contract: true,
        payload: message ?? {
          id: String(params.messageId),
          status: "SENT",
          type: "PAYMENT_SUCCESS",
        },
      } as T;
    }
    case "bulkResendMessages": {
      const ids = (body.messageIds as string[] | undefined) ?? [];
      return {
        __contract: true,
        payload: { queued: ids.length },
      } as T;
    }
    case "getMessagingOptOuts": {
      const rows = mockDb.customers.slice(0, 3).map((c) => ({
        _id: c.id,
        customerNumber: c.customerNo,
        name: c.name,
        mobile: c.phone,
        whatsappOptedOutAt: "2026-09-01T10:00:00+05:30",
      }));
      const { items, page } = paginateSlice(rows, params);
      return { items, total: rows.length, ...page } as T;
    }
    case "getMessagingQuota":
      return {
        __contract: true,
        payload: { used: 1280, limit: 5000 },
      } as T;
    case "getMessagingDeadLetter": {
      const rows = [
        {
          id: "whl_01",
          status: "DEAD_LETTER",
          topic: "whatsapp.delivery",
          failedAt: "2026-09-13T18:00:00+05:30",
        },
      ];
      const { items, page } = paginateSlice(rows, params);
      return { items, total: rows.length, ...page } as T;
    }
    case "requeueDeadLetter":
      return {
        __contract: true,
        payload: { id: String(params.id), queued: true },
      } as T;
    case "getMessagingInbound": {
      const { items, page } = paginateSlice([], params);
      return { items, total: 0, ...page } as T;
    }
    case "getDashboardActivity": {
      const rows = mockDb.auditEvents.slice(0, 10).map((e) => ({
        id: e.id,
        action: e.action,
        entity: e.entity,
        occurredAt: e.at ?? "2026-09-14T09:00:00+05:30",
        actor: e.actor ?? "System",
      }));
      const { items, page } = paginateSlice(rows, params);
      return { items, total: rows.length, ...page } as T;
    }
    case "getCollectionsSummary":
      return {
        __contract: true,
        payload: {
          amountPaise: 3100000,
          count: 18,
          byMode: [
            { mode: "CASH", label: "Cash", amountPaise: 1700000, count: 10 },
            { mode: "UPI", label: "UPI", amountPaise: 900000, count: 5 },
            { mode: "CARD", label: "Card", amountPaise: 500000, count: 3 },
          ],
        },
      } as T;
    case "getDefaulters": {
      const rows = mockDb.dues.filter((d) => d.status === "DEFAULTED");
      const { items, page } = paginateSlice(rows, params);
      return { items, total: rows.length, ...page } as T;
    }
    case "getFlexibleLocks": {
      const rows = mockDb.enrollments
        .filter((e) => e.paymentPattern === "FLEXIBLE")
        .slice(0, 5)
        .map((e) => ({
          id: e.id,
          schemeNumber: e.enrollmentNo,
          customer: e.customer,
          status: e.status,
          lockEligible: true,
        }));
      const { items, page } = paginateSlice(rows, params);
      return { items, total: rows.length, ...page } as T;
    }
    case "getDuesCount":
      return {
        __contract: true,
        payload: {
          due: mockDb.dues.filter((d) => d.status === "DUE").length,
          overdue: mockDb.dues.filter((d) => d.status === "OVERDUE").length,
          defaulted: mockDb.dues.filter((d) => d.status === "DEFAULTED").length,
        },
      } as T;
    case "getNavBadges":
      return {
        __contract: true,
        payload: {
          dues: mockDb.dues.filter((d) => ["DUE", "OVERDUE"].includes(d.status))
            .length,
          cashHandovers: mockDb.handovers.filter((h) => h.status === "PENDING")
            .length,
          openRedemptions: 3,
          failedMessages: mockDb.messages.filter((m) => m.status === "FAILED")
            .length,
        },
      } as T;
    case "getMaturitiesCalendar": {
      const month = params.month ? String(params.month).slice(0, 7) : "2026-09";
      const rows = mockDb.enrollments.filter((item) =>
        ["MATURED", "TERM_ENDED", "REDEMPTION_PENDING", "ACTIVE"].includes(
          item.status,
        ),
      );
      const items = rows.filter((item) =>
        String(item.maturity ?? "").startsWith(month),
      );
      const dayMap = new Map<string, { date: string; count: number }>();
      for (const row of items) {
        const date = String(row.maturity ?? "").slice(0, 10);
        if (!date) continue;
        const bucket = dayMap.get(date) ?? { date, count: 0 };
        bucket.count += 1;
        dayMap.set(date, bucket);
      }
      return {
        __contract: true,
        payload: {
          month,
          days: [...dayMap.values()].sort((a, b) =>
            a.date.localeCompare(b.date),
          ),
          items,
        },
      } as T;
    }
    case "listExports": {
      const rows = [
        {
          exportId: "exp_01",
          status: "READY",
          format: "CSV",
          createdAt: "2026-09-14T08:00:00+05:30",
        },
        {
          exportId: "exp_02",
          status: "PROCESSING",
          format: "XLSX",
          createdAt: "2026-09-14T09:30:00+05:30",
        },
      ];
      const { items, page } = paginateSlice(rows, params);
      return { items, total: rows.length, ...page } as T;
    }
    case "presignUpload":
      return {
        __contract: true,
        payload: {
          uploadId: `upl_${Date.now()}`,
          uploadUrl: "https://uploads.example/presigned",
          method: "PUT",
          headers: { "Content-Type": String(body.contentType ?? "image/jpeg") },
          expiresAt: "2026-09-14T10:15:00+05:30",
        },
      } as T;
    case "completeUpload":
      return {
        __contract: true,
        payload: {
          uploadId: String(params.uploadId ?? "upl_mock"),
          status: "UPLOADED",
          viewUrl: `/uploads/${String(params.uploadId ?? "upl_mock")}`,
        },
      } as T;
    case "getUploadDownload":
      return {
        __contract: true,
        payload: {
          uploadId: String(params.uploadId ?? "upl_mock"),
          status: "UPLOADED",
          fileName: "document.jpg",
          contentType: "image/jpeg",
          downloadUrl: "https://picsum.photos/seed/swarnagrow-admin-upload/1200/800",
        },
      } as T;
    case "globalSearch": {
      const needle = String(q ?? params.q ?? "").trim();
      if (needle.length < 2) return { query: needle, groups: [] } as T;
      const matchFields = (...values: unknown[]) =>
        fuzzyMatchAny(values, needle);
      const customerItems = mockDb.customers
        .filter((c) => matchFields(c.name, c.phone, c.customerNo))
        .slice(0, 6)
        .map((c) => ({
          id: c.id,
          kind: "CUSTOMER",
          title: c.name,
          subtitle: c.phone,
          meta: c.customerNo,
        }));
      const enrollmentItems = mockDb.enrollments
        .filter((e) => matchFields(e.enrollmentNo, e.customer, e.plan))
        .slice(0, 6)
        .map((e) => ({
          id: e.id,
          kind: "ENROLLMENT",
          title: e.enrollmentNo,
          subtitle: `${e.customer} · ${e.plan}`,
          meta: e.status,
        }));
      const receiptItems = mockDb.payments
        .filter((p) => matchFields(p.receiptNo, p.customer, p.enrollmentNo))
        .slice(0, 6)
        .map((p) => ({
          id: p.id,
          kind: "RECEIPT",
          title: p.receiptNo,
          subtitle: `${p.customer} · ${p.enrollmentNo}`,
          meta: p.date,
        }));
      const redemptionItems = [
        {
          id: "rdm_01",
          kind: "REDEMPTION",
          title: "RDM-2609-01",
          subtitle: "Anjali Nair · PENDING_APPROVAL",
          meta: "MATURITY_REDEMPTION",
        },
      ].filter((r) => matchFields(r.title, r.subtitle));
      const groups = [
        customerItems.length
          ? { kind: "CUSTOMER", label: "Customers", items: customerItems }
          : null,
        enrollmentItems.length
          ? { kind: "ENROLLMENT", label: "Enrollments", items: enrollmentItems }
          : null,
        receiptItems.length
          ? { kind: "RECEIPT", label: "Receipts", items: receiptItems }
          : null,
        redemptionItems.length
          ? { kind: "REDEMPTION", label: "Redemptions", items: redemptionItems }
          : null,
      ].filter(Boolean);
      return { query: needle, groups } as T;
    }
    default:
      throw {
        status: 404,
        data: {
          code: "MOCK_ROUTE_NOT_FOUND",
          message: `No mock handler for ${mockKey}`,
        },
      };
  }
}

function payableQuote(
  enrollment: Enrollment,
  targetCycle: string,
): PayableQuote {
  const displayMode = enrollment.displayMode ?? "FIXED";
  const matured =
    enrollment.status === "MATURED" ||
    enrollment.status === "REDEEMED" ||
    enrollment.status === "CLOSED_PREMATURE";
  const base = {
    schemeId: enrollment.id,
    paymentPattern: (enrollment.paymentPattern ?? "FIXED") as
      | "FIXED"
      | "FLEXIBLE",
    displayMode,
    customer: enrollment.customer,
    enrollmentNo: enrollment.enrollmentNo,
    plan: enrollment.plan,
    status: enrollment.status,
    blockingReasons: [] as PayableQuote["blockingReasons"],
  };
  if (matured || enrollment.canRecordPayment === false) {
    return {
      ...base,
      eligible: false,
      helperText:
        enrollment.helperText ??
        "This scheme is not payable. Matured accounts move to redemption.",
      suggested: null,
      min: 0,
      max: 0,
      blockingReasons: [
        {
          code: "SCHEME_NOT_ACTIVE",
          message: "Payments cannot be recorded on this scheme.",
        },
      ],
    };
  }
  if (displayMode === "FLEXIBLE_FREE_WINDOW") {
    return {
      ...base,
      eligible: true,
      helperText: enrollment.helperText ?? "Pay any amount in the free window.",
      suggested: null,
      min: enrollment.payableMin ?? 500,
      max: enrollment.payableMax ?? 100000,
      multipleOf: 100,
    };
  }
  if (displayMode === "FLEXIBLE_LOCK_WINDOW") {
    const remaining =
      enrollment.remainingThisCycle ?? enrollment.payableMax ?? 0;
    const cycle = targetCycle || enrollment.targetCycle || "2026-09";
    const bounds = cappedCyclePayableBounds(
      remaining,
      CAPPED_CYCLE_NORMAL_MIN,
      CAPPED_CYCLE_INCREMENT,
    );
    return {
      ...base,
      eligible: remaining > 0,
      helperText:
        remaining > 0
          ? (enrollment.helperText ??
            `₹${remaining} remains in this cycle's allowance.`)
          : "This month's allowance is fully paid.",
      suggested: bounds.suggested,
      min: bounds.min,
      max: bounds.max,
      multipleOf: bounds.multipleOf,
      targetCycle: cycle,
      cycleLabel: enrollment.cycleLabel ?? "September 2026",
      cycleNumber: 8,
      positionVersion: enrollment.positionVersion ?? 7,
      currentCycleCap: enrollment.currentCycleCap ?? 2500,
      confirmedThisCycle: enrollment.confirmedThisCycle ?? 0,
      remainingThisCycle: remaining,
      successfulPaymentCountThisCycle: enrollment.cyclePayments?.length ?? 0,
      finalRemainderException: bounds.finalRemainderException,
      formulaLabel: enrollment.formulaLabel,
      explainerText: enrollment.explainerText,
      nextCycleAction:
        remaining === 0
          ? {
              available: false,
              targetCycle: "2026-10",
              cycleLabel: "October 2026",
              remaining: enrollment.currentCycleCap ?? 2500,
              label: "Pay October in advance",
            }
          : null,
    };
  }
  return {
    ...base,
    eligible: true,
    helperText: enrollment.helperText ?? "Pay the installment amount.",
    suggested: enrollment.payableSuggested ?? enrollment.installment,
    min: enrollment.payableMin ?? enrollment.installment,
    max: enrollment.payableMax ?? enrollment.installment,
    coversInstallments: [
      Math.min((enrollment.progress ?? 0) + 1, enrollment.tenure),
    ],
  };
}

function findEnrollment(id: string): Enrollment {
  const requested = String(id ?? "");
  const resolvedId =
    requested === "sch_06" ? "sch_demo_flex_capped" : requested;
  return (
    mockDb.enrollments.find((item) => item.id === resolvedId) ??
    mockDb.enrollments.find((item) => item.id === requested) ??
    mockDb.enrollments[0]
  );
}

function buildSettlementPreview(
  enrollment: Enrollment,
  type: SettlementPreview["type"],
): SettlementPreview {
  const isMaturity = type === "MATURITY_REDEMPTION";
  const progress = enrollment.progress;
  const paid = enrollment.paid;
  const installment = enrollment.installment;
  const lockInMonths = 3;

  if (isMaturity) {
    const eligible =
      enrollment.status === "MATURED" ||
      enrollment.status === "REDEMPTION_PENDING" ||
      enrollment.canRedeem === true;
    if (!eligible) {
      return {
        type,
        eligible: false,
        blockers: [
          {
            code: "NOT_MATURED",
            message:
              "All installments must be paid before maturity redemption.",
          },
        ],
        lines: [],
        finalValue: 0,
        textBenefits: [],
        allowedModes: [],
        approvalRequired: false,
      };
    }
    const benefit = installment;
    const textBenefits =
      enrollment.valueBasis === "GOLD_WEIGHT" ||
      enrollment.plan.toLowerCase().includes("suvarna")
        ? [
            {
              text: "Zero making charges on gold ornaments purchased at maturity. Wastage capped at 8%.",
              displayLabel: "Making charges waived",
              note: "Apply this manually at the counter. It is not calculated in the settlement value below.",
            },
          ]
        : [];
    return {
      type,
      eligible: true,
      blockers: [],
      lines: [
        {
          key: "TOTAL_PAID",
          label: `Total paid (${progress} installments)`,
          amount: paid,
          sign: "+",
        },
        {
          key: "BENEFIT",
          label: "Plan benefit — 12th installment free",
          amount: benefit,
          sign: "+",
        },
        { key: "PENALTY", label: "Penalty", amount: 0, sign: "-" },
      ],
      finalValue: paid + benefit,
      finalWeightDisplay:
        enrollment.valueBasis === "GOLD_WEIGHT" ? "7.965 g" : undefined,
      textBenefits,
      allowedModes: [
        { mode: "CASH", label: "Cash payout", available: true },
        {
          mode: "GOLD_HANDOVER",
          label: "Take as gold",
          available: enrollment.valueBasis === "GOLD_WEIGHT",
          note: "Weight computed at today's rate",
        },
        {
          mode: "PURCHASE_ADJUSTMENT",
          label: "Adjust against purchase",
          available: true,
        },
        {
          mode: "TRANSFER_TO_SCHEME",
          label: "Start a new scheme",
          available: true,
        },
      ],
      modePreviews: {
        GOLD_HANDOVER: {
          rateDisplay: "₹7,250",
          weightDisplay: "8.276 g",
          note: "At today's rate of ₹7,250 per gram",
        },
      },
      approvalRequired: true,
      approvalReason:
        "Tenant setting requires admin approval for all redemptions",
      valuationNote:
        enrollment.valueBasis === "GOLD_WEIGHT"
          ? "Cash equivalent calculated at today's gold rate. This changes daily."
          : undefined,
    };
  }

  if (paid === 0) {
    return {
      type,
      eligible: true,
      blockers: [],
      lines: [{ key: "TOTAL_PAID", label: "Total paid", amount: 0, sign: "+" }],
      finalValue: 0,
      textBenefits: [],
      allowedModes: [{ mode: "CASH", label: "Cash payout", available: true }],
      approvalRequired: false,
      warningText:
        "No payments recorded — this closes the enrolment as a mistake.",
    };
  }

  if (progress < lockInMonths) {
    return {
      type,
      eligible: false,
      blockers: [
        {
          code: "LOCK_IN_NOT_MET",
          message: `This scheme has a ${lockInMonths}-month lock-in. It can be closed from 14 Dec 2026.`,
          eligibleFrom: "14 Dec 2026",
        },
      ],
      lines: [],
      finalValue: 0,
      textBenefits: [],
      allowedModes: [],
      approvalRequired: false,
    };
  }

  const penalty = Math.round(paid * 0.02);
  return {
    type,
    eligible: true,
    blockers: [],
    lines: [
      {
        key: "TOTAL_PAID",
        label: `Total paid (${progress} installments)`,
        amount: paid,
        sign: "+",
      },
      {
        key: "BENEFIT",
        label: "Plan benefit — forfeited",
        amount: 0,
        sign: "+",
        forfeited: true,
        forfeitReason: "Benefit applies only on maturity",
      },
      {
        key: "PENALTY",
        label: "Premature closure charge (2% of amount paid)",
        amount: penalty,
        sign: "-",
      },
    ],
    finalValue: paid - penalty,
    textBenefits: [],
    allowedModes: [
      { mode: "CASH", label: "Cash payout", available: true },
      { mode: "GOLD_HANDOVER", label: "Take as gold", available: true },
      {
        mode: "PURCHASE_ADJUSTMENT",
        label: "Adjust against purchase",
        available: true,
      },
    ],
    approvalRequired: true,
    warningText:
      "Closing early forfeits the maturity benefit and attracts a 2% charge. This cannot be undone.",
  };
}
