import type {
  CustomerGrievance,
  CustomerHome,
  CustomerNotification,
  CustomerProfile,
  CustomerSchemeDetail,
  MoneyRef,
  PaymentListItem,
  SchemePlan,
  TenantBranding,
} from "@/src/types/customer";

export const money = (amountPaise: number): MoneyRef => ({
  amountPaise,
  amountDisplay: new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amountPaise / 100),
});

export const customerTenant: TenantBranding = {
  tenantCode: "KAI",
  displayName: "Kairali Jewellers",
  appDisplayName: "Kairali Gold Savings",
  primaryColor: "#730321",
  accentColor: "#D5A52E",
  foregroundColor: "#FFFFFF",
  contrastColor: "#48101D",
  supportNumber: "+91 98470 22110",
  city: "Kochi",
  kycMandatory: false,
  customerSelfRegistration: true,
  customerSelfEnrol: true,
  multiScheme: true,
  customerLoginMode: "OTP_ONLY",
  customerAppWriteEnabled: true,
  customerAppPaymentsEnabled: true,
};

export const customerProfile: CustomerProfile = {
  id: "cus_10482",
  customerNumber: "CUS-10482",
  passbookNumber: "KAI/2026/00128",
  name: "Anjali Nair",
  mobile: "+91 98470 12345",
  email: "anjali.nair@example.com",
  address: "Panampilly Nagar, Kochi, Kerala 682036",
  mobileImmutable: true,
  whatsappOptIn: true,
  memberSince: "2025-05-14",
  profileComplete: true,
  branch: { id: "br_kochi", name: "Kochi Main", code: "MAIN", address: "M.G. Road, Kochi", mobile: "+91 484 2211000" },
  nominee: { name: "Arun Nair", relationship: "SPOUSE", relationshipLabel: "Spouse", mobile: "+91 98472 00981", notes: "Primary contact" },
  nomineeEditable: true,
  version: 3,
  tenant: customerTenant,
};

const payments: PaymentListItem[] = [
  { id: "pay_01", amount: money(300000), status: "SUCCESS", paidAt: "2026-09-08T10:22:00Z", createdAt: "2026-09-08T10:20:00Z", schemeId: "sch_fixed", schemeNumber: "ENR-24091", schemeName: "Akshaya 12 Month", receiptNumber: "RCT-260908-128", channel: "PHONEPE", paymentPattern: "FIXED" },
  { id: "pay_02", amount: money(200000), status: "SUCCESS", paidAt: "2026-08-12T08:14:00Z", createdAt: "2026-08-12T08:12:00Z", schemeId: "sch_free", schemeNumber: "ENR-24520", schemeName: "Sampoorna Flex 11", receiptNumber: "RCT-260812-094", channel: "PHONEPE", paymentPattern: "FLEXIBLE" },
  { id: "pay_03", amount: money(150000), status: "SUCCESS", paidAt: "2026-09-03T11:41:00Z", createdAt: "2026-09-03T11:40:00Z", schemeId: "sch_capped", schemeNumber: "ENR-23218", schemeName: "Suvarna Flexible", receiptNumber: "RCT-260903-043", channel: "PHONEPE", paymentPattern: "FLEXIBLE" },
  { id: "pay_04", amount: money(300000), status: "SUCCESS", paidAt: "2026-08-08T09:05:00Z", createdAt: "2026-08-08T09:04:00Z", schemeId: "sch_fixed", schemeNumber: "ENR-24091", schemeName: "Akshaya 12 Month", receiptNumber: "RCT-260808-112", channel: "CASH", paymentPattern: "FIXED" },
  { id: "pay_05", amount: money(500000), status: "SUCCESS", paidAt: "2026-08-15T09:05:00Z", createdAt: "2026-08-15T09:04:00Z", schemeId: "sch_gold", schemeNumber: "ENR-24308", schemeName: "Suvarna Gold Savings", receiptNumber: "RCT-260815-172", channel: "PHONEPE", paymentPattern: "FIXED" },
];

export const customerSchemes: CustomerSchemeDetail[] = [
  {
    id: "sch_fixed", schemeNumber: "ENR-24091", planName: "Akshaya 12 Month", subtitle: "Fixed monthly gold savings", displayMode: "FIXED", valueBasis: "CASH", status: "ACTIVE", statusLabel: "Active", progressPercent: 67, progressLabel: "8 of 12 instalments", totalPaid: money(2400000), maturityDate: "2027-01-14", nextActionLabel: "Next payment · 08 Oct", nextActionAmount: money(300000), canPay: true, benefitLabel: "One free instalment on completion",
    header: { eyebrow: "FIXED SAVINGS", title: "Your goal is 67% complete", description: "Four instalments remain before your scheme reaches maturity." },
    progressCard: { type: "FIXED", installmentsPaid: 8, installmentsTotal: 12 },
    statCards: [{ label: "Paid so far", value: "₹24,000", caption: "Across 8 instalments" }, { label: "Next payment", value: "₹3,000", caption: "08 October 2026" }, { label: "Matures", value: "14 Jan 2027", caption: "No early maturity" }],
    payButton: { visible: true, enabled: true, label: "Pay ₹3,000 with PhonePe" }, passbookSummary: { totalEntries: 8, lastPaymentAt: "2026-09-08", totalPaid: money(2400000) }, redemption: { eligible: false, status: "NOT_ELIGIBLE", preferredModes: ["JEWELLERY_PURCHASE", "BANK_TRANSFER"], blocker: "Available after contractual maturity" }, lifecycleActions: ["DOWNLOAD_PASSBOOK", "VIEW_PLAN"], version: 8, positionVersion: 12, helperText: "Your plan matures on the contractual date even if all instalments are paid early.", payments: payments.filter((p) => p.schemeId === "sch_fixed"),
    payableRange: { model: "FIXED", phase: "FIXED", contributionIsOptional: false, minPayable: money(300000), maxPayable: money(300000), suggested: money(300000), multipleOfPaise: 100, quickAmounts: [money(300000)], helperText: "Your fixed instalment for this month.", positionVersion: 12, unusedAllowanceCarriesForward: false, paidMoneyNeverExpires: true },
  },
  {
    id: "sch_free", schemeNumber: "ENR-24520", planName: "Sampoorna Flex 11", subtitle: "Flexible savings · Free window", displayMode: "FLEXIBLE_FREE_WINDOW", valueBasis: "CASH", status: "ACTIVE", statusLabel: "Free window", progressPercent: 50, progressPhase: "FREE_WINDOW", progressLabel: "Month 3 of 6", freeWindowMonth: 3, freeWindowMonths: 6, totalPaid: money(620000), maturityDate: "2027-05-20", nextActionLabel: "Contribute any time", canPay: true, benefitLabel: "Cash bonus based on completed cycles",
    header: { eyebrow: "FLEXIBLE · FREE WINDOW", title: "Save at your own pace", description: "Contribute any permitted amount this month. Contributions are optional." }, progressCard: { type: "FLEXIBLE_FREE_WINDOW", freeWindowMonth: 3, freeWindowMonths: 6, freeWindowMonthsCompleted: 2 },
    statCards: [{ label: "Paid so far", value: "₹6,200", caption: "Money never expires" }, { label: "This month", value: "₹2,000", caption: "Optional contribution" }, { label: "Free window", value: "3 months left", caption: "Cap calculated after month 6" }],
    payButton: { visible: true, enabled: true, label: "Contribute with PhonePe" }, passbookSummary: { totalEntries: 4, lastPaymentAt: "2026-08-12", totalPaid: money(620000) }, redemption: { eligible: false, status: "NOT_ELIGIBLE", preferredModes: ["BANK_TRANSFER"], blocker: "Available after maturity" }, lifecycleActions: ["DOWNLOAD_PASSBOOK", "VIEW_PLAN"], version: 4, positionVersion: 6, helperText: "Unused monthly room does not carry forward. Everything you already paid remains in your balance.", payments: payments.filter((p) => p.schemeId === "sch_free"),
    payableRange: { model: "FLEXIBLE", phase: "FREE", contributionIsOptional: true, minPayable: money(50000), maxPayable: money(1000000), suggested: money(200000), multipleOfPaise: 100, quickAmounts: [money(100000), money(200000), money(500000)], helperText: "Choose any amount from ₹500 to ₹10,000.", positionVersion: 6, unusedAllowanceCarriesForward: false, paidMoneyNeverExpires: true },
  },
  {
    id: "sch_gold", schemeNumber: "ENR-24308", planName: "Suvarna Gold Savings", subtitle: "Accumulate gold with every contribution", displayMode: "FIXED", valueBasis: "GOLD_WEIGHT", status: "ACTIVE", statusLabel: "Active", progressPercent: 42, progressLabel: "5 of 12 months", totalPaid: money(3250000), goldAccumulated: { weightMg: 4486, weightDisplay: "4.486 g" }, goldAccrued: { weightMg: 4486, weightDisplay: "4.486 g" }, currentValuation: money(3250000), maturityDate: "2027-04-18", nextActionLabel: "Next contribution · 18 Sep", nextActionAmount: money(500000), canPay: true, benefitLabel: "Gold balance available toward jewellery at maturity",
    header: { eyebrow: "GOLD ACCUMULATION", title: "Your gold balance is growing", description: "Each verified contribution is converted into gold weight using the applicable scheme rate." },
    progressCard: { type: "FIXED", installmentsPaid: 5, installmentsTotal: 12, goldAccumulated: { weightMg: 4486, weightDisplay: "4.486 g" }, goldAccrued: { weightMg: 4486, weightDisplay: "4.486 g" } },
    statCards: [{ label: "Gold balance", value: "4.486 g", caption: "Credited from verified payments" }, { label: "Contributed", value: "₹32,500", caption: "Across 5 months" }, { label: "Matures", value: "18 Apr 2027", caption: "Contractual maturity" }],
    payButton: { visible: true, enabled: true, label: "Add ₹5,000 with PhonePe" }, passbookSummary: { totalEntries: 5, lastPaymentAt: "2026-08-15", totalPaid: money(3250000) }, redemption: { eligible: false, status: "NOT_ELIGIBLE", preferredModes: ["JEWELLERY_PURCHASE", "GOLD"], blocker: "Available after contractual maturity" }, lifecycleActions: ["DOWNLOAD_PASSBOOK", "VIEW_PLAN"], version: 6, positionVersion: 9, helperText: "Gold weight is credited using the applicable scheme rate for each successful contribution.", payments: payments.filter((p) => p.schemeId === "sch_gold"),
    payableRange: { model: "FIXED", phase: "FIXED", contributionIsOptional: false, minPayable: money(500000), maxPayable: money(500000), suggested: money(500000), multipleOfPaise: 100, quickAmounts: [money(500000)], helperText: "Your fixed contribution for this month.", positionVersion: 9, unusedAllowanceCarriesForward: false, paidMoneyNeverExpires: true },
  },
  {
    id: "sch_capped", schemeNumber: "ENR-23218", planName: "Suvarna Flexible", subtitle: "Flexible savings · Capped phase", displayMode: "FLEXIBLE_CAPPED_WINDOW", valueBasis: "CASH", status: "ACTIVE", statusLabel: "Capped phase", progressPercent: 73, progressPhase: "CAPPED", progressLabel: "Month 8 of 11", totalPaid: money(1840000), cycleCap: money(200000), remainingThisCycle: money(150000), maturityDate: "2026-12-06", nextActionLabel: "₹1,500 room this month", nextActionAmount: money(150000), canPay: true, benefitLabel: "Gold benefit valued at maturity rate",
    header: { eyebrow: "FLEXIBLE · CAPPED PHASE", title: "₹1,500 available this cycle", description: "Your monthly limit is based on the snapshotted free-window average." }, progressCard: { type: "FLEXIBLE_CAPPED_WINDOW", cycleCap: money(200000), remainingThisCycle: money(150000), lockedAverage: money(200000) },
    statCards: [{ label: "Paid so far", value: "₹18,400", caption: "Permanent ledger balance" }, { label: "Monthly limit", value: "₹2,000", caption: "Snapshotted average" }, { label: "Available now", value: "₹1,500", caption: "No carry-forward" }],
    payButton: { visible: true, enabled: true, label: "Contribute up to ₹1,500" }, passbookSummary: { totalEntries: 10, lastPaymentAt: "2026-09-03", totalPaid: money(1840000) }, redemption: { eligible: false, status: "NOT_ELIGIBLE", preferredModes: ["JEWELLERY_PURCHASE", "GOLD"], blocker: "Matures 06 December 2026" }, lifecycleActions: ["DOWNLOAD_PASSBOOK", "VIEW_PLAN"], version: 10, positionVersion: 21, helperText: "This is a contribution limit, not an amount due. Skipping it does not create overdue or default.", payments: payments.filter((p) => p.schemeId === "sch_capped"),
    payableRange: { model: "FLEXIBLE", phase: "CAPPED", contributionIsOptional: true, targetCycle: "2026-09", minPayable: money(50000), maxPayable: money(150000), cycleCap: money(200000), remainingThisCycle: money(150000), suggested: money(150000), multipleOfPaise: 100, quickAmounts: [money(50000), money(100000), money(150000)], helperText: "Optional contribution. Unused room does not carry forward.", positionVersion: 21, unusedAllowanceCarriesForward: false, paidMoneyNeverExpires: true },
  },
];

export const schemePlans: SchemePlan[] = [
  { id: "plan_akshaya", name: "Akshaya 12 Month", code: "AKS12", tagline: "A simple monthly habit with a rewarding finish", model: "FIXED", durationMonths: 12, amountSummary: "₹1,000–₹25,000 monthly", benefitSummary: "One free instalment", benefitType: "ONE_FREE_INSTALLMENT", rules: ["Same instalment every month", "No early maturity", "Benefit after all instalments"], canEnrol: true, featured: true },
  { id: "plan_sampoorna", name: "Sampoorna Flex 11", code: "SPF11", tagline: "Start flexible, then continue with a comfortable cap", model: "FLEXIBLE", durationMonths: 11, amountSummary: "₹500–₹10,000 per contribution", benefitSummary: "Up to 5% cash bonus", benefitType: "CASH_BONUS", rules: ["First 6 months flexible", "Months 7–11 use snapshotted average cap", "Unused allowance never carries forward"], canEnrol: true },
  { id: "plan_suvarna", name: "Suvarna Gold 12", code: "SVG12", tagline: "Build value toward your next jewellery purchase", model: "FIXED", durationMonths: 12, amountSummary: "From ₹2,500 monthly", benefitSummary: "Gold benefit at maturity rate", benefitType: "GOLD_BENEFIT", rules: ["Gold benefit uses latest rate on or before maturity", "Redeem at your jewellery", "Contractual maturity only"], canEnrol: true },
];

export const customerPayments = payments;

export const customerNotifications: CustomerNotification[] = [
  { id: "not_1", type: "PAYMENT", title: "Payment received", body: "₹3,000 was added to Akshaya 12 Month.", read: false, createdAt: "2026-09-08T10:24:00Z", deepLink: "/payments/pay_1", cta: "View receipt" },
  { id: "not_2", type: "SCHEME", title: "Your monthly contribution window is open", body: "You can contribute up to ₹1,500 to Suvarna Flexible this month.", read: false, createdAt: "2026-09-01T06:00:00Z", deepLink: "/customer/schemes/sch_capped", cta: "View scheme" },
  { id: "not_3", type: "GENERAL", title: "Gold rate updated", body: "Today’s 22K rate is ₹7,240 per gram.", read: true, createdAt: "2026-09-14T04:10:00Z", deepLink: "/customer/gold-rate" },
];

export const customerGrievances: CustomerGrievance[] = [
  { id: "grv_1", ticketNumber: "SG-2609-014", category: "PAYMENT", status: "IN_PROGRESS", statusLabel: "In progress", subject: "Cash payment not showing", description: "My branch payment from 10 September is not visible in the passbook.", createdAt: "2026-09-10T14:20:00Z", updatedAt: "2026-09-11T09:15:00Z", slaDueAt: "2026-09-12T14:20:00Z", unreadForCustomer: true, version: 2, messages: [{ id: "msg_1", authorType: "CUSTOMER", body: "My branch payment from 10 September is not visible in the passbook.", createdAt: "2026-09-10T14:20:00Z" }, { id: "msg_2", authorType: "STAFF", body: "We found the collection and are verifying the handover. We’ll update you shortly.", createdAt: "2026-09-11T09:15:00Z" }], allowedActions: ["REPLY"] },
  { id: "grv_2", ticketNumber: "SG-2608-052", category: "PROFILE", status: "RESOLVED", statusLabel: "Resolved", subject: "Update nominee mobile", description: "Please update the mobile number for my nominee.", createdAt: "2026-08-16T08:00:00Z", updatedAt: "2026-08-17T11:30:00Z", slaDueAt: "2026-08-18T08:00:00Z", unreadForCustomer: false, version: 3, messages: [{ id: "msg_3", authorType: "STAFF", body: "Your nominee details have been updated.", createdAt: "2026-08-17T11:30:00Z" }], allowedActions: ["REOPEN"] },
];

export const customerHome: CustomerHome = {
  tenant: customerTenant,
  customer: { id: customerProfile.id, name: "Anjali", profileComplete: true, passbookNumber: customerProfile.passbookNumber },
  recentPayments: customerPayments
    .filter((payment) => Boolean(payment.paidAt))
    .slice(0, 6)
    .map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      paidAt: payment.paidAt!,
      receiptNumber: payment.receiptNumber,
      schemeId: payment.schemeId,
      schemeNumber: payment.schemeNumber,
      schemeName: payment.schemeName,
    })),
  hasGoldAccumulationScheme: true,
  greeting: { text: "Good evening, Anjali", subtext: "Your gold savings are growing steadily." },
  summary: { activeSchemeCount: 4, pastSchemeCount: 1, totalPaid: money(8110000), goldAccumulated: { weightMg: 4486, weightDisplay: "4.486 g" }, currentValuation: money(3247864) },
  goldRate: { ratePerGramPaise: 724000, ratePerGramDisplay: "₹7,240 / g", effectiveDate: "2026-09-16", purity: "22K", movement: 0.42 },
  actionCard: { type: "PAY_DUE", schemeId: "sch_fixed", title: "Your next instalment is ready", priority: 1 },
  activeSchemes: customerSchemes,
  quickActions: [{ key: "PAY", label: "Pay now" }, { key: "ENROL", label: "Explore plans" }, { key: "PASSBOOK", label: "Passbook" }],
  unreadNotificationCount: 2,
  contributionTrend: [{ month: "Apr", amountPaise: 500000 }, { month: "May", amountPaise: 720000 }, { month: "Jun", amountPaise: 620000 }, { month: "Jul", amountPaise: 800000 }, { month: "Aug", amountPaise: 820000 }, { month: "Sep", amountPaise: 650000 }],
};
