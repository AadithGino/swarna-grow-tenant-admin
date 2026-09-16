import { paginateSlice } from "@/src/lib/cursor-pagination";
import { mockDb } from "./mock-db";
import type { AdminReportKey } from "@/src/types/admin-report";
import type { ContractWrapper } from "@/src/store/api/contract-adapters";

const paise = (rupees: number) => Math.round(rupees * 100);
const amt = (rupees: number) => ({
  amountPaise: paise(rupees),
  amountDisplay: `₹${rupees.toLocaleString("en-IN")}`,
});
const wt = (grams: number) => ({
  weightMg: Math.round(grams * 1000),
  weightDisplay: `${grams.toFixed(3)} g`,
});

const scope = { level: "TENANT", label: "All showrooms" };
const period = (from: string, to: string) => ({
  from,
  to,
  label: `${from} – ${to}`,
});

type ReportPayload = Record<string, unknown> & {
  rows: Record<string, unknown>[];
};

function branchCollectionRows() {
  return mockDb.branches.map((b, i) => ({
    key: b.id,
    label: b.name,
    paymentCount: 40 + i * 18,
    cash: amt(68000 + i * 12000),
    upi: amt(25200 + i * 8000),
    card: amt(9600 + i * 2000),
    bankTransfer: amt(4000 + i * 900),
    cheque: amt(3000 + i * 600),
    onlineGateway: amt(2200 + i * 400),
    total: amt(112400 - i * 8000),
    goldCredited: wt(155 - i * 12),
    drilldownPath: `/payments?branchId=${b.id}`,
  }));
}

const BUILDERS: Record<AdminReportKey, () => ReportPayload> = {
  COLLECTION: () => {
    const rows = branchCollectionRows();
    return {
      reportKey: "COLLECTION",
      title: "Collection report",
      scope,
      period: period("2026-09-01", "2026-09-14"),
      generatedAt: "2026-09-14T10:30:00+05:30",
      summary: [
        {
          key: "TOTAL_COLLECTED",
          label: "Total collected",
          value: amt(1845000),
          valueType: "currency",
          change: { percent: 12.4, direction: "up" },
        },
        {
          key: "PAYMENT_COUNT",
          label: "Payments",
          value: 184,
          valueType: "count",
        },
        {
          key: "AVERAGE_PAYMENT",
          label: "Average payment",
          value: amt(10027),
          valueType: "currency",
        },
        {
          key: "GOLD_CREDITED",
          label: "Gold credited",
          value: wt(254.482),
          valueType: "weight",
        },
        { key: "CASH_SHARE", label: "Cash share", value: 61.2, valueType: "percent" },
      ],
      charts: {
        trend: {
          chartType: "line",
          title: "Daily collection",
          yAxis: { type: "currency", label: "Amount" },
          series: [
            {
              key: "COLLECTED",
              name: "Collected",
              data: [
                { x: "2026-09-01", y: paise(45200), yDisplay: "₹45,200" },
                { x: "2026-09-02", y: paise(38100), yDisplay: "₹38,100" },
                { x: "2026-09-03", y: paise(52800), yDisplay: "₹52,800" },
                { x: "2026-09-04", y: paise(49600), yDisplay: "₹49,600" },
              ],
            },
          ],
        },
        byMode: {
          chartType: "donut",
          title: "By payment mode",
          yAxis: { type: "currency", label: "Amount" },
          series: [
            {
              key: "mode",
              name: "Amount",
              data: [
                { x: "Cash", y: paise(1129000), modeKey: "CASH" },
                { x: "UPI", y: paise(412000), modeKey: "UPI" },
                { x: "Card / POS", y: paise(156000), modeKey: "CARD" },
                { x: "Bank transfer", y: paise(68000), modeKey: "BANK_TRANSFER" },
                { x: "Cheque", y: paise(48000), modeKey: "CHEQUE" },
                { x: "Online payment", y: paise(32000), modeKey: "ONLINE_GATEWAY" },
              ],
            },
          ],
        },
        byBranch: {
          chartType: "stackedBar",
          title: "By showroom and mode",
          yAxis: { type: "currency", label: "Amount" },
          series: [
            {
              key: "CASH",
              name: "Cash",
              data: mockDb.branches.map((b, i) => ({
                x: b.name,
                y: paise(68400 - i * 8000),
              })),
            },
            {
              key: "UPI",
              name: "UPI",
              data: mockDb.branches.map((b, i) => ({
                x: b.name,
                y: paise(25200 - i * 3000),
              })),
            },
          ],
        },
      },
      columns: [
        { key: "label", label: "Showroom", type: "text", sticky: true, sortable: true },
        { key: "paymentCount", label: "Payments", type: "count", align: "right", sortable: true },
        { key: "cash", label: "Cash", type: "currency", align: "right" },
        { key: "upi", label: "UPI", type: "currency", align: "right" },
        { key: "card", label: "Card / POS", type: "currency", align: "right" },
        { key: "bankTransfer", label: "Bank transfer", type: "currency", align: "right" },
        { key: "cheque", label: "Cheque", type: "currency", align: "right" },
        { key: "onlineGateway", label: "Online payment", type: "currency", align: "right" },
        { key: "total", label: "Total", type: "currency", align: "right", emphasis: true },
        { key: "goldCredited", label: "Gold credited", type: "weight", align: "right" },
      ],
      rows,
      totalsRow: {
        label: "Total",
        paymentCount: 184,
        cash: amt(1129000),
        upi: amt(412000),
        card: amt(156000),
        bankTransfer: amt(68000),
        cheque: amt(48000),
        onlineGateway: amt(32000),
        total: amt(1845000),
        goldCredited: wt(254.482),
      },
      exportFormats: ["CSV", "XLSX", "PDF"],
    };
  },

  OUTSTANDING: () => ({
    reportKey: "OUTSTANDING",
    title: "Outstanding & ageing",
    scope,
    period: period("2026-09-01", "2026-09-14"),
    summary: [
      { key: "EXPECTED_TO_DATE", label: "Expected to date", value: amt(4280000), valueType: "currency" },
      { key: "COLLECTED_TO_DATE", label: "Collected to date", value: amt(3868000), valueType: "currency" },
      {
        key: "OUTSTANDING",
        label: "Outstanding",
        value: amt(412000),
        valueType: "currency",
        severity: "WARNING",
      },
      { key: "COLLECTION_EFFICIENCY", label: "Collection efficiency", value: 90.4, valueType: "percent" },
      { key: "FUTURE_EXPECTED", label: "Future installments", value: amt(9420000), valueType: "currency" },
    ],
    charts: {
      ageing: {
        chartType: "bar",
        title: "Outstanding by ageing",
        yAxis: { type: "currency", label: "Amount" },
        series: [
          {
            key: "OUTSTANDING",
            name: "Outstanding",
            data: [
              { x: "1–7 days", y: paise(90000) },
              { x: "8–15 days", y: paise(126000) },
              { x: "16–30 days", y: paise(98000) },
              { x: "30+ days", y: paise(98000) },
            ],
          },
        ],
      },
      efficiencyTrend: {
        chartType: "line",
        title: "Collection efficiency",
        yAxis: { type: "percent", label: "Efficiency", min: 0, max: 100 },
        series: [
          {
            key: "EFFICIENCY",
            name: "Efficiency",
            data: [
              { x: "2026-07", y: 92.1 },
              { x: "2026-08", y: 91.3 },
              { x: "2026-09", y: 90.4 },
            ],
          },
        ],
      },
    },
    columns: [
      { key: "customer", label: "Customer", type: "customer", sticky: true },
      { key: "schemeNumber", label: "Scheme", type: "text" },
      { key: "branch", label: "Showroom", type: "text" },
      { key: "overdueCount", label: "Missed", type: "count", align: "right" },
      { key: "overdueAmount", label: "Overdue", type: "currency", align: "right", emphasis: true },
      { key: "ageingDays", label: "Oldest (days)", type: "count", align: "right" },
      { key: "ageingBucket", label: "Bucket", type: "badge" },
      { key: "lastPaymentAt", label: "Last paid", type: "date" },
    ],
    rows: mockDb.enrollments.slice(0, 16).map((e, i) => ({
      key: e.id,
      customer: { id: e.customerId, name: e.customer, passbookNumber: e.enrollmentNo },
      schemeNumber: e.enrollmentNo,
      branch: e.branch,
      overdueCount: 1 + (i % 3),
      overdueAmount: amt(5000 + i * 1200),
      ageingDays: 12 + i * 9,
      ageingBucket: {
        value: i > 10 ? "30_PLUS" : "16_30",
        label: i > 10 ? "30+ days" : "16–30 days",
        severity: i > 10 ? "HIGH" : "MEDIUM",
      },
      lastPaymentAt: "2026-09-01",
      drilldownPath: `/schemes/${e.id}`,
    })),
    exportFormats: ["CSV", "XLSX", "PDF"],
  }),

  GOLD_ACCRUAL: () => ({
    reportKey: "GOLD_ACCRUAL",
    title: "Gold accrual & liability",
    valuationRate: {
      ratePerGramPaise: 725000,
      ratePerGramDisplay: "₹7,250",
      asOf: "2026-09-14T09:00:00+05:30",
    },
    summary: [
      { key: "TOTAL_GRAMS", label: "Gold owed", value: wt(2841.5), valueType: "weight" },
      { key: "LIABILITY_TODAY", label: "Liability at today's rate", value: amt(20600875), valueType: "currency" },
      { key: "AMOUNT_RECEIVED", label: "Amount received", value: amt(20412000), valueType: "currency" },
      {
        key: "RATE_EXPOSURE",
        label: "Rate exposure",
        value: amt(188875),
        valueType: "currency",
        note: "Difference between today's value and what customers paid.",
      },
    ],
    charts: {
      accrualTrend: {
        chartType: "area",
        title: "Cumulative grams",
        yAxis: { type: "weight", label: "Grams" },
        series: [
          {
            key: "GOLD_ACCRUED",
            name: "Grams",
            data: [
              { x: "2026-07", y: 2418200 },
              { x: "2026-08", y: 2634900 },
              { x: "2026-09", y: 2841500 },
            ],
          },
        ],
      },
      byPlan: {
        chartType: "horizontalBar",
        title: "Grams by plan",
        yAxis: { type: "weight", label: "Grams" },
        series: [
          {
            key: "grams",
            name: "Grams",
            data: mockDb.plans
              .filter((p) => p.status === "ACTIVE")
              .map((p) => ({ x: p.name, y: 1842300 - p.activeEnrollments * 100 })),
          },
        ],
      },
    },
    columns: [
      { key: "label", label: "Plan", type: "text", sticky: true },
      { key: "activeSchemes", label: "Schemes", type: "count", align: "right" },
      { key: "gramsAccrued", label: "Grams owed", type: "weight", align: "right", emphasis: true },
      { key: "amountReceived", label: "Received", type: "currency", align: "right" },
      { key: "liabilityToday", label: "Liability today", type: "currency", align: "right" },
      { key: "averageRatePaid", label: "Avg rate paid", type: "currency", align: "right" },
    ],
    rows: mockDb.plans
      .filter((p) => p.status === "ACTIVE")
      .map((p) => ({
        key: p.id,
        label: p.name,
        activeSchemes: p.activeEnrollments,
        gramsAccrued: wt(1842.3 - p.activeEnrollments * 0.05),
        amountReceived: amt(1328400 - p.activeEnrollments * 200),
        liabilityToday: amt(1335667 - p.activeEnrollments * 210),
        averageRatePaid: { ratePerGramPaise: 721050, ratePerGramDisplay: "₹7,211" },
      })),
    exportFormats: ["CSV", "XLSX", "PDF"],
  }),

  STAFF_PERFORMANCE: () => ({
    reportKey: "STAFF_PERFORMANCE",
    title: "Staff performance",
    summary: [
      { key: "TOTAL_COLLECTED", label: "Collected by staff", value: amt(1184000), valueType: "currency" },
      { key: "ENROLMENTS", label: "Enrolments", value: 34, valueType: "count" },
      { key: "STAFF_ACTIVE", label: "Active staff", value: mockDb.staff.length, valueType: "count" },
    ],
    charts: {
      collectionByStaff: {
        chartType: "horizontalBar",
        title: "Collection by staff",
        yAxis: { type: "currency", label: "Amount" },
        series: [
          {
            key: "COLLECTED",
            name: "Collected",
            data: mockDb.staff.map((s) => ({
              x: s.name,
              y: paise(s.today + 12000),
            })),
          },
        ],
      },
      enrolmentsByStaff: {
        chartType: "horizontalBar",
        title: "Enrolments by staff",
        yAxis: { type: "count", label: "Enrolments" },
        series: [
          {
            key: "enrolments",
            name: "Enrolments",
            data: mockDb.staff.map((s, i) => ({ x: s.name, y: 12 - i * 2 })),
          },
        ],
      },
    },
    columns: [
      { key: "staff", label: "Staff", type: "staff", sticky: true },
      { key: "branch", label: "Showroom", type: "text" },
      { key: "enrolments", label: "Enrolments", type: "count", align: "right" },
      { key: "collected", label: "Collected", type: "currency", align: "right", emphasis: true },
      { key: "receiptCount", label: "Receipts", type: "count", align: "right" },
      { key: "cashInHand", label: "Cash in hand", type: "currency", align: "right" },
      { key: "avgHoldingDays", label: "Avg holding (days)", type: "number", align: "right" },
      { key: "discrepancies", label: "Discrepancies", type: "count", align: "right" },
    ],
    rows: mockDb.staff.map((s, i) => ({
      key: s.id,
      staff: { id: s.id, name: s.name, role: s.role },
      branch: s.branch,
      enrolments: 12 - i * 2,
      collected: amt(s.today + 12000),
      receiptCount: 40 + i * 6,
      cashInHand: amt(s.today),
      avgHoldingDays: 1.2 + i * 0.3,
      discrepancies: i === 1 ? 1 : 0,
    })),
    exportFormats: ["CSV", "XLSX", "PDF"],
  }),

  ENROLMENT: () => ({
    reportKey: "ENROLMENT",
    title: "Enrolment report",
    summary: [
      { key: "NEW_ENROLMENTS", label: "New enrolments", value: 34, valueType: "count" },
      { key: "COMMITTED", label: "Total committed", value: amt(842000), valueType: "currency" },
      { key: "AVG_INSTALLMENT", label: "Average installment", value: amt(4200), valueType: "currency" },
    ],
    charts: {
      enrolmentTrend: {
        chartType: "bar",
        title: "Enrolments over time",
        yAxis: { type: "count", label: "Enrolments" },
        series: [
          {
            key: "ENROLMENTS",
            name: "Enrolments",
            data: [
              { x: "Week 1", y: 8 },
              { x: "Week 2", y: 11 },
              { x: "Week 3", y: 9 },
              { x: "Week 4", y: 6 },
            ],
          },
        ],
      },
      byPlan: {
        chartType: "horizontalBar",
        title: "By plan",
        yAxis: { type: "count", label: "Enrolments" },
        series: [
          {
            key: "enrolments",
            name: "Enrolments",
            data: mockDb.plans.map((p) => ({ x: p.code, y: Math.round(p.activeEnrollments / 20) })),
          },
        ],
      },
    },
    columns: [
      { key: "label", label: "Plan", type: "text", sticky: true },
      { key: "enrolments", label: "Enrolments", type: "count", align: "right" },
      { key: "totalCommitted", label: "Committed", type: "currency", align: "right" },
      { key: "averageInstallment", label: "Avg installment", type: "currency", align: "right" },
      { key: "firstInstallmentCollectedCount", label: "First paid", type: "count", align: "right" },
    ],
    rows: mockDb.plans.map((p) => ({
      key: p.id,
      label: p.name,
      enrolments: Math.round(p.activeEnrollments / 15),
      totalCommitted: amt(p.activeEnrollments * p.amount),
      averageInstallment: amt(p.amount),
      firstInstallmentCollectedCount: Math.round(p.activeEnrollments / 18),
    })),
    exportFormats: ["CSV", "XLSX", "PDF"],
  }),

  MATURITY_REDEMPTION: () => ({
    reportKey: "MATURITY_REDEMPTION",
    title: "Maturity & redemption",
    summary: [
      { key: "TOTAL_SETTLED", label: "Total settled", value: amt(1380000), valueType: "currency" },
      { key: "BENEFIT_PAID", label: "Benefit paid out", value: amt(42000), valueType: "currency" },
      { key: "PENALTY", label: "Penalty collected", value: amt(8000), valueType: "currency" },
      { key: "GOLD_HANDED", label: "Gold weight handed", value: wt(42.5), valueType: "weight" },
      {
        key: "GOLD_HANDOVER_VALUE",
        label: "Gold handover value",
        value: amt(920000),
        valueType: "currency",
        note: "42.500 g at handover-day rate",
      },
    ],
    charts: {
      settlementTrend: {
        chartType: "line",
        title: "Settlements",
        yAxis: { type: "currency", label: "Amount" },
        series: [
          {
            key: "SETTLED",
            name: "Settled",
            data: [
              { x: "Sep W1", y: paise(320000) },
              { x: "Sep W2", y: paise(410000) },
              { x: "Sep W3", y: paise(650000) },
            ],
          },
        ],
      },
      byMode: {
        chartType: "donut",
        title: "Settlement mode",
        yAxis: { type: "currency", label: "Amount" },
        series: [
          {
            key: "mode",
            name: "Amount",
            data: [
              { x: "Jewellery", y: paise(920000) },
              { x: "Cash", y: paise(460000) },
            ],
          },
        ],
      },
    },
    columns: [
      { key: "schemeNumber", label: "Scheme", type: "text", sticky: true },
      { key: "customer", label: "Customer", type: "customer" },
      { key: "branch", label: "Showroom", type: "text" },
      { key: "settledAmount", label: "Settled", type: "currency", align: "right", emphasis: true },
      { key: "goldWeight", label: "Gold (g)", type: "weight", align: "right" },
      { key: "goldHandoverValue", label: "Gold value (₹)", type: "currency", align: "right" },
      { key: "benefitPaid", label: "Benefit", type: "currency", align: "right" },
      { key: "mode", label: "Mode", type: "text" },
      { key: "settledAt", label: "Settled on", type: "date" },
    ],
    rows: mockDb.enrollments.slice(0, 14).map((e, i) => ({
      key: e.id,
      schemeNumber: e.enrollmentNo,
      customer: { name: e.customer },
      branch: e.branch,
      settledAmount: amt(48000 + i * 5000),
      goldWeight: i % 2 ? wt(8.97 + i * 0.1) : null,
      goldHandoverValue: i % 2 ? amt(65000 + i * 5000) : null,
      benefitPaid: amt(2000 + i * 200),
      mode: i % 2 ? "JEWELLERY" : "CASH",
      settledAt: "2026-09-10",
    })),
    exportFormats: ["CSV", "XLSX", "PDF"],
  }),

  CASH_HANDOVER: () => ({
    reportKey: "CASH_HANDOVER",
    title: "Cash handover",
    summary: [
      { key: "COLLECTED", label: "Cash collected", value: amt(942000), valueType: "currency" },
      { key: "HANDED", label: "Handed over", value: amt(894000), valueType: "currency" },
      { key: "IN_HAND", label: "In hand", value: amt(42600), valueType: "currency" },
      { key: "DISCREPANCY", label: "Discrepancy", value: amt(500), valueType: "currency" },
    ],
    charts: {
      collectedVsHandedOver: {
        chartType: "bar",
        title: "Collected vs handed over",
        yAxis: { type: "currency", label: "Amount" },
        series: [
          {
            key: "COLLECTED",
            name: "Collected",
            data: mockDb.staff.map((s) => ({ x: s.name, y: paise(s.today + 20000) })),
          },
          {
            key: "HANDED_OVER",
            name: "Handed over",
            data: mockDb.staff.map((s) => ({ x: s.name, y: paise(s.today + 15000) })),
          },
        ],
      },
    },
    columns: [
      { key: "label", label: "Staff / branch", type: "text", sticky: true },
      { key: "collected", label: "Collected", type: "currency", align: "right" },
      { key: "handedOver", label: "Handed over", type: "currency", align: "right" },
      { key: "inHand", label: "In hand", type: "currency", align: "right", emphasis: true },
      { key: "handoverCount", label: "Handovers", type: "count", align: "right" },
      { key: "discrepancies", label: "Discrepancies", type: "count", align: "right" },
    ],
    rows: [
      ...mockDb.staff.map((s, i) => ({
        key: s.id,
        label: s.name,
        collected: amt(s.today + 20000),
        handedOver: amt(s.today + 15000),
        inHand: amt(s.today),
        handoverCount: 4 + i,
        discrepancies: i === 1 ? 1 : 0,
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        key: `cash_grp_${i}`,
        label: `Collector ${i + 1}`,
        collected: amt(22000 + i * 3400),
        handedOver: amt(18000 + i * 2900),
        inHand: amt(4000 + i * 500),
        handoverCount: 2 + (i % 4),
        discrepancies: 0,
      })),
    ],
    exportFormats: ["CSV", "XLSX", "PDF"],
  }),

  REMINDER_DELIVERY: () => ({
    reportKey: "REMINDER_DELIVERY",
    title: "Reminder delivery",
    summary: [
      { key: "SENT", label: "Messages sent", value: 842, valueType: "count" },
      { key: "DELIVERED", label: "Delivered", value: 798, valueType: "count" },
      { key: "FAILED", label: "Failed", value: 17, valueType: "count" },
      { key: "DELIVERY_RATE", label: "Delivery rate", value: 94.8, valueType: "percent" },
    ],
    charts: {
      volumeTrend: {
        chartType: "line",
        title: "Message volume",
        yAxis: { type: "count", label: "Messages" },
        series: [
          {
            key: "SENT",
            name: "Sent",
            data: [
              { x: "Sep 10", y: 120 },
              { x: "Sep 11", y: 142 },
              { x: "Sep 12", y: 156 },
              { x: "Sep 13", y: 168 },
            ],
          },
        ],
      },
    },
    columns: [
      { key: "messageType", label: "Type", type: "text", sticky: true },
      { key: "sent", label: "Sent", type: "count", align: "right" },
      { key: "delivered", label: "Delivered", type: "count", align: "right" },
      { key: "failed", label: "Failed", type: "count", align: "right" },
      { key: "deliveryRate", label: "Rate", type: "percent", align: "right" },
    ],
    rows: [
      { key: "DUE", messageType: "Due reminder", sent: 320, delivered: 305, failed: 6, deliveryRate: 95.3 },
      { key: "OVERDUE", messageType: "Overdue reminder", sent: 210, delivered: 198, failed: 5, deliveryRate: 94.3 },
      { key: "MATURITY", messageType: "Maturity alert", sent: 180, delivered: 172, failed: 3, deliveryRate: 95.6 },
      { key: "RECEIPT", messageType: "Receipt", sent: 132, delivered: 123, failed: 3, deliveryRate: 93.2 },
    ],
    exportFormats: ["CSV", "XLSX", "PDF"],
  }),

  WHATSAPP_USAGE: () => ({
    reportKey: "WHATSAPP_USAGE",
    title: "WhatsApp usage",
    summary: [
      { key: "QUOTA", label: "Quota used", value: 86, valueType: "percent" },
      { key: "CONVERSATIONS", label: "Conversations", value: 1724, valueType: "count" },
      { key: "COST", label: "Estimated cost", value: amt(8420), valueType: "currency" },
    ],
    charts: {
      byType: {
        chartType: "donut",
        title: "By message type",
        yAxis: { type: "count", label: "Messages" },
        series: [
          {
            key: "type",
            name: "Messages",
            data: [
              { x: "Utility", y: 620 },
              { x: "Marketing", y: 180 },
              { x: "Authentication", y: 42 },
            ],
          },
        ],
      },
    },
    columns: [
      { key: "label", label: "Period", type: "text", sticky: true },
      { key: "utility", label: "Utility", type: "count", align: "right" },
      { key: "marketing", label: "Marketing", type: "count", align: "right" },
      { key: "authentication", label: "Authentication", type: "count", align: "right" },
      { key: "total", label: "Total", type: "count", align: "right", emphasis: true },
    ],
    rows: [
      { key: "w1", label: "Sep 1 – 7", utility: 142, marketing: 38, authentication: 12, total: 192 },
      { key: "w2", label: "Sep 8 – 14", utility: 156, marketing: 44, authentication: 14, total: 214 },
    ],
    exportFormats: ["CSV", "XLSX", "PDF"],
  }),

  SCHEME_REGISTER: () => ({
    reportKey: "SCHEME_REGISTER",
    title: "Scheme register",
    summary: [
      { key: "ACTIVE", label: "Active schemes", value: 431, valueType: "count" },
      { key: "OUTSTANDING", label: "Outstanding", value: amt(412000), valueType: "currency" },
      { key: "GRAMS", label: "Gold accrued", value: wt(2841.5), valueType: "weight" },
    ],
    charts: {
      statusDistribution: {
        chartType: "donut",
        title: "By status",
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
    },
    columns: [
      { key: "schemeNumber", label: "Scheme", type: "text", sticky: true },
      { key: "customer", label: "Customer", type: "customer" },
      { key: "plan", label: "Plan", type: "text" },
      { key: "status", label: "Status", type: "badge" },
      { key: "paid", label: "Paid", type: "currency", align: "right" },
      { key: "outstanding", label: "Outstanding", type: "currency", align: "right" },
      { key: "grams", label: "Grams", type: "weight", align: "right" },
    ],
    rows: mockDb.enrollments.map((e) => ({
      key: e.id,
      schemeNumber: e.enrollmentNo,
      customer: { name: e.customer },
      plan: e.plan,
      status: { label: e.status, value: e.status },
      paid: amt(e.paid),
      outstanding: amt(Math.max(0, e.installment * e.tenure - e.paid)),
      grams: wt(e.paid / 8000),
    })),
    exportFormats: ["CSV", "XLSX", "PDF"],
  }),

  DEFAULTER: () => ({
    reportKey: "DEFAULTER",
    title: "Defaulter report",
    summary: [
      { key: "DEFAULTERS", label: "Defaulted schemes", value: 32, valueType: "count" },
      { key: "RECOVERY", label: "Recovery value", value: amt(186000), valueType: "currency" },
      { key: "WRITTEN_OFF", label: "At risk", value: amt(42000), valueType: "currency", severity: "WARNING" },
    ],
    charts: {
      recoveryByBranch: {
        chartType: "horizontalBar",
        title: "Recovery by showroom",
        yAxis: { type: "currency", label: "Amount" },
        series: [
          {
            key: "RECOVERY",
            name: "Recovery",
            data: mockDb.branches.map((b, i) => ({
              x: b.name,
              y: paise(42000 + i * 12000),
            })),
          },
        ],
      },
    },
    columns: [
      { key: "customer", label: "Customer", type: "customer", sticky: true },
      { key: "schemeNumber", label: "Scheme", type: "text" },
      { key: "branch", label: "Showroom", type: "text" },
      { key: "defaultedAt", label: "Defaulted", type: "date" },
      { key: "recoveryValue", label: "Recovery value", type: "currency", align: "right", emphasis: true },
    ],
    rows: (
      mockDb.enrollments.filter((e) => String(e.status).includes("OVERDUE"))
        .length
        ? mockDb.enrollments.filter((e) =>
            String(e.status).includes("OVERDUE"),
          )
        : mockDb.enrollments.slice(0, 12)
    )
      .slice(0, 20)
      .map((e, i) => ({
        key: e.id,
        customer: { name: e.customer },
        schemeNumber: e.enrollmentNo,
        branch: e.branch,
        defaultedAt: "2026-08-22",
        recoveryValue: amt(8000 + i * 2500),
      })),
    exportFormats: ["CSV", "XLSX", "PDF"],
  }),

  CUSTOMER_LEDGER: () => ({
    reportKey: "CUSTOMER_LEDGER",
    title: "Customer ledger",
    summary: [
      { key: "OPENING", label: "Opening balance", value: amt(0), valueType: "currency" },
      { key: "CREDITS", label: "Credits", value: amt(84000), valueType: "currency" },
      { key: "CLOSING", label: "Closing balance", value: amt(84000), valueType: "currency" },
    ],
    charts: {},
    columns: [
      { key: "date", label: "Date", type: "date", sticky: true },
      { key: "description", label: "Description", type: "text" },
      { key: "debit", label: "Debit", type: "currency", align: "right" },
      { key: "credit", label: "Credit", type: "currency", align: "right" },
      { key: "balance", label: "Balance", type: "currency", align: "right", emphasis: true },
    ],
    rows: mockDb.payments.slice(0, 18).map((p, i) => ({
      key: p.id,
      date: p.date,
      description: `Payment ${p.receiptNo}`,
      debit: amt(0),
      credit: amt(p.amount),
      balance: amt(p.amount * (i + 1)),
    })),
    exportFormats: ["CSV", "XLSX", "PDF"],
  }),
};

export function mockAdminReport(
  reportKey: string,
  params: Record<string, unknown>,
): ContractWrapper {
  const key = (reportKey in BUILDERS ? reportKey : "OUTSTANDING") as AdminReportKey;
  const payload = BUILDERS[key]();
  const allRows = payload.rows ?? [];
  const { items, page } = paginateSlice(allRows, params);
  return {
    __contract: true,
    payload: { ...payload, rows: items },
    meta: page,
  };
}
