import { describe, expect, it } from "vitest";
import { buildFixedSchedule } from "@/src/features/customer/customer-scheme-schedule";
import type { CustomerSchemeDetail } from "@/src/types/customer";

function baseScheme(
  overrides: Partial<CustomerSchemeDetail> = {},
): CustomerSchemeDetail {
  return {
    id: "sch_1",
    schemeNumber: "ENR-1",
    planName: "Gold 11",
    subtitle: "Fixed",
    displayMode: "FIXED",
    status: "ACTIVE",
    statusLabel: "Active",
    progressPercent: 8,
    progressLabel: "1 of 12",
    totalPaid: { amountPaise: 500_000, amountDisplay: "₹5,000" },
    maturityDate: "2027-11-06",
    nextActionLabel: "Next payment · 2027-01-06",
    nextActionAmount: { amountPaise: 500_000, amountDisplay: "₹5,000" },
    canPay: true,
    benefitLabel: "",
    progressCard: { type: "FIXED", installmentsPaid: 1, installmentsTotal: 12 },
    header: { eyebrow: "", title: "", description: "" },
    statCards: [],
    payButton: { visible: true, enabled: true, label: "Pay" },
    passbookSummary: {
      totalEntries: 1,
      lastPaymentAt: "2026-11-06",
      totalPaid: { amountPaise: 500_000, amountDisplay: "₹5,000" },
    },
    redemption: { eligible: false, status: "NOT_ELIGIBLE", preferredModes: [] },
    lifecycleActions: [],
    version: 1,
    positionVersion: 1,
    helperText: "",
    payments: [
      {
        id: "pay_1",
        status: "SUCCESS",
        paidAt: "2026-11-06T10:00:00.000Z",
        amount: { amountPaise: 500_000, amountDisplay: "₹5,000" },
        channel: "ONLINE_GATEWAY",
        channelLabel: "PhonePe",
        receiptNumber: "R1",
      },
    ],
    ...overrides,
  } as CustomerSchemeDetail;
}

describe("buildFixedSchedule", () => {
  it("keeps the daily collection dates from the API", () => {
    const amount = { amountPaise: 50_000, amountDisplay: "₹500" };
    const rows = buildFixedSchedule(baseScheme({
      collectionFrequency: "DAILY",
      installmentSchedule: [
        { number: 1, dueDate: "2026-11-06", status: "PAID", amount, remaining: { amountPaise: 0, amountDisplay: "₹0" } },
        { number: 2, dueDate: "2026-11-07", status: "DUE", amount, remaining: amount },
        { number: 3, dueDate: "2026-11-08", status: "PENDING", amount, remaining: amount },
      ],
    }));
    expect(rows).toHaveLength(3);
    expect(rows[1].label).toContain("7 Nov");
    expect(rows[2].label).toContain("8 Nov");
    expect(buildFixedSchedule(baseScheme({ collectionFrequency: "DAILY" }))).toEqual([]);
  });

  it("uses API installment due dates in chronological order", () => {
    const scheme = baseScheme({
      installmentSchedule: [
        { number: 1, dueDate: "2026-11-06", status: "PAID", amount: { amountPaise: 500_000, amountDisplay: "₹5,000" }, remaining: { amountPaise: 0, amountDisplay: "₹0" } },
        { number: 2, dueDate: "2026-12-06", status: "DUE", amount: { amountPaise: 500_000, amountDisplay: "₹5,000" }, remaining: { amountPaise: 500_000, amountDisplay: "₹5,000" } },
        { number: 3, dueDate: "2027-01-06", status: "PENDING", amount: { amountPaise: 500_000, amountDisplay: "₹5,000" }, remaining: { amountPaise: 500_000, amountDisplay: "₹5,000" } },
      ],
      nextActionLabel: "Next payment · 2026-12-06",
    });
    const rows = buildFixedSchedule(scheme);
    expect(rows[1]?.status).toBe("DUE");
    expect(rows[1]?.label).toContain("Dec");
    expect(rows[2]?.status).toBe("UPCOMING");
    expect(rows[2]?.label).toContain("Jan");
  });

  it("legacy fallback does not place upcoming months before the due row", () => {
    const scheme = baseScheme({ installmentSchedule: undefined });
    const rows = buildFixedSchedule(scheme);
    expect(rows[1]?.status).toBe("DUE");
    const dueMonth = rows[1]?.label ?? "";
    const upcomingMonth = rows[2]?.label ?? "";
    expect(dueMonth.includes("Dec") || dueMonth.includes("Jan")).toBe(true);
    expect(upcomingMonth.includes("Jan") || upcomingMonth.includes("Feb")).toBe(true);
  });
});
