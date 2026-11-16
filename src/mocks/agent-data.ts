import type { AgentCashSummary, AgentCollectionSummary, AgentCustomer, AgentGoldRate, AgentHandover, AgentPayment, AgentReport, AgentScheme } from "@/src/types/agent";

export const agentTenantChoices = [
  { tenantCode: "KAIRALI", displayName: "Kairali Jewellers", logoUrl: null },
  { tenantCode: "SWARNA", displayName: "Swarna Gold & Diamonds", logoUrl: null },
];

export const agentUser = {
  id: "usr_agent_vijay",
  name: "Vijay Field",
  mobile: "9847012352",
  role: "COLLECTION_AGENT" as const,
  tenantId: "tnt_kairali",
  branchId: "brn_kochi",
  branchName: "Kochi Main",
  tenantName: "Kairali Jewellers",
  tenantCode: "KAIRALI",
  permissions: ["CUSTOMER_READ", "SCHEME_READ", "PAYMENT_READ", "PAYMENT_RECORD", "CASH_READ", "CASH_HANDOVER", "GOLD_RATE_READ"],
  agentCapabilities: { registerCustomers: true, enrolSchemes: true, kycMandatory: false },
  mustSetPassword: false,
};

export const agentPlans = [
  {
    _id: "spl_gold11",
    name: "Swarna Gold 11",
    code: "SG11",
    valueBasis: "GOLD_WEIGHT",
    paymentPattern: "FIXED",
    durationMonths: 11,
    amountRules: { amountMode: "JEWELLER_SLABS", slabsPaise: [100000, 250000, 500000] },
    scheduleRules: { firstInstallmentModeDefault: "COLLECT_NOW", firstInstallmentModeEditable: true },
    benefit: { displayLabel: "One installment free on maturity" },
  },
  {
    _id: "spl_cash12",
    name: "Cash Saver 12",
    code: "CS12",
    valueBasis: "CASH",
    paymentPattern: "FIXED",
    durationMonths: 12,
    amountRules: { amountMode: "CUSTOMER_CHOSEN", minInstallmentPaise: 50000, maxInstallmentPaise: 2000000, multipleOfPaise: 10000 },
    scheduleRules: { firstInstallmentModeDefault: "COLLECT_NOW", firstInstallmentModeEditable: false },
  },
];

export const agentGoldRate: AgentGoldRate = { id: "rate_today", ratePerGramPaise: 724000, effectiveDate: "2026-09-17", purity: "22K" };

const schemes: AgentScheme[] = [
  { id: "agt_fixed", enrollmentNumber: "ENR-000456", planName: "Akshaya 12 Month", status: "ACTIVE", paymentPattern: "FIXED", valueBasis: "CASH", progressLabel: "8 of 12 paid", totalPaidPaise: 2000000, nextAmountPaise: 250000, maturityDate: "2027-01-17", customerId: "agt_cus_1", startDate: "2026-01-17", installmentAmountPaise: 250000, positionVersion: 8, version: 13, installments: [{ number: 9, dueDate: "2026-09-17", amountPaise: 250000, paidPaise: 0, status: "DUE" }] },
  { id: "agt_gold", enrollmentNumber: "ENR-000462", planName: "Suvarna Gold 12", status: "ACTIVE", paymentPattern: "FIXED", valueBasis: "GOLD_WEIGHT", progressLabel: "6 of 12 paid", totalPaidPaise: 1800000, goldBalanceMg: 2540, nextAmountPaise: 300000, maturityDate: "2027-03-04", customerId: "agt_cus_1", startDate: "2026-03-04", installmentAmountPaise: 300000, positionVersion: 7, version: 9 },
  { id: "agt_flex_free", enrollmentNumber: "ENR-000491", planName: "Sampoorna Flex 11", status: "ACTIVE", paymentPattern: "FLEXIBLE", valueBasis: "CASH", phase: "FREE", progressLabel: "Free phase · month 3 of 6", totalPaidPaise: 420000, maturityDate: "2027-05-10", customerId: "agt_cus_2", startDate: "2026-07-10", positionVersion: 4, version: 5 },
  { id: "agt_flex_capped", enrollmentNumber: "ENR-000438", planName: "Suvarna Flexible", status: "ACTIVE", paymentPattern: "FLEXIBLE", valueBasis: "CASH", phase: "CAPPED", progressLabel: "Capped phase · month 8 of 11", totalPaidPaise: 1840000, nextAmountPaise: 150000, maturityDate: "2026-12-06", customerId: "agt_cus_3", startDate: "2026-01-06", positionVersion: 7, version: 10 },
];

export const agentCustomers: AgentCustomer[] = [
  { id: "agt_cus_1", customerNumber: "C000412", name: "Anjali Menon", mobile: "+91 98476 54321", email: "anjali@example.com", status: "ACTIVE", passbookNumber: "KOC/2026/00412", kyc: { status: "VERIFIED", type: "AADHAAR", numberMasked: "XXXX XXXX 1234" }, schemes: schemes.filter((s) => s.customerId === "agt_cus_1"), version: 3 },
  { id: "agt_cus_2", customerNumber: "C000427", name: "Ramesh Nair", mobile: "+91 98956 23456", status: "ACTIVE", passbookNumber: "KOC/2026/00427", kyc: { status: "VERIFIED" }, schemes: schemes.filter((s) => s.customerId === "agt_cus_2"), version: 2 },
  { id: "agt_cus_3", customerNumber: "C000438", name: "Priya Pillai", mobile: "+91 94460 34567", status: "ACTIVE", passbookNumber: "KOC/2026/00438", kyc: { status: "VERIFIED" }, schemes: schemes.filter((s) => s.customerId === "agt_cus_3"), version: 4 },
  { id: "agt_cus_4", customerNumber: "C000445", name: "Muhammed G", mobile: "+91 99950 45678", status: "ACTIVE", passbookNumber: "KOC/2026/00445", schemes: [{ ...schemes[0], id: "agt_fixed_2", enrollmentNumber: "ENR-000502", planName: "Akshaya 12 Month", progressLabel: "4 of 12 paid" }], version: 1 },
];

export const agentSchemes = schemes;

export const agentPayments: AgentPayment[] = [
  { id: "agt_pay_1", receiptNumber: "RCP-2026-0001234", amountPaise: 250000, mode: "CASH", status: "SUCCESS", source: "STAFF_APP", paidAt: "2026-09-17T11:05:22.000Z", customer: { id: "agt_cus_1", name: "Anjali Menon" }, scheme: { id: "agt_fixed", enrollmentNumber: "ENR-000456", planName: "Akshaya 12 Month" } },
  { id: "agt_pay_2", receiptNumber: "RCP-2026-0001233", amountPaise: 300000, weightMg: 414, ratePerGramPaise: 724000, mode: "UPI", status: "SUCCESS", source: "STAFF_APP", paidAt: "2026-09-17T09:42:00.000Z", customer: { id: "agt_cus_1", name: "Anjali Menon" }, scheme: { id: "agt_gold", enrollmentNumber: "ENR-000462", planName: "Suvarna Gold 12" } },
  { id: "agt_pay_3", receiptNumber: "RCP-2026-0001228", amountPaise: 150000, mode: "CARD", status: "SUCCESS", source: "STAFF_APP", paidAt: "2026-09-16T15:18:00.000Z", customer: { id: "agt_cus_3", name: "Priya Pillai" }, scheme: { id: "agt_flex_capped", enrollmentNumber: "ENR-000438", planName: "Suvarna Flexible" } },
  { id: "agt_pay_4", receiptNumber: "RCP-2026-0001224", amountPaise: 100000, mode: "ONLINE_GATEWAY", status: "SUCCESS", source: "CUSTOMER_APP", paidAt: "2026-09-16T11:30:00.000Z", customer: { id: "agt_cus_2", name: "Ramesh Nair" }, scheme: { id: "agt_flex_free", enrollmentNumber: "ENR-000491", planName: "Sampoorna Flex 11" } },
];

export let agentCashSummary: AgentCashSummary = {
  cashCollectedPaise: 2500000,
  cashInHandPaise: 1850000,
  cashPendingAcceptancePaise: 0,
  availableForHandoverPaise: 1850000,
  collectedPaise: 2500000,
  handedOverPaise: 650000,
  adjustmentPaise: 0,
};
export const agentCollectionSummary: AgentCollectionSummary = {
  amountPaise: 800000,
  count: 4,
  byMode: [
    { mode: "CASH", label: "Cash in hand", amountPaise: 250000, count: 1 },
    { mode: "UPI", label: "UPI", amountPaise: 300000, count: 1 },
    { mode: "CARD", label: "Card / POS", amountPaise: 150000, count: 1 },
    { mode: "ONLINE_GATEWAY", label: "Online payment", amountPaise: 100000, count: 1 },
  ],
};
export const agentHandovers: AgentHandover[] = [
  { id: "agt_ho_1", amountPaise: 650000, status: "ACCEPTED", initiator: "STAFF", remarks: "Closing handover", submittedAt: "2026-09-16T18:00:00.000Z", settledAt: "2026-09-16T19:15:00.000Z" },
  { id: "agt_ho_2", amountPaise: 400000, status: "PENDING", initiator: "STAFF", remarks: "Morning route collection", submittedAt: "2026-09-17T12:30:00.000Z", settledAt: null },
];

export const agentReport: AgentReport = {
  amountPaise: 4350000,
  count: 19,
  goldWeightMg: 1248,
  averageCollectionPaise: 228947,
  days: [
    { date: "2026-09-12", amountPaise: 550000, count: 3, goldWeightMg: 0 },
    { date: "2026-09-13", amountPaise: 800000, count: 4, goldWeightMg: 414 },
    { date: "2026-09-14", amountPaise: 600000, count: 3, goldWeightMg: 0 },
    { date: "2026-09-15", amountPaise: 750000, count: 3, goldWeightMg: 420 },
    { date: "2026-09-16", amountPaise: 950000, count: 4, goldWeightMg: 414 },
    { date: "2026-09-17", amountPaise: 700000, count: 2, goldWeightMg: 0 },
  ],
};

export function updateMockCashSummary(next: AgentCashSummary) { agentCashSummary = next; }
