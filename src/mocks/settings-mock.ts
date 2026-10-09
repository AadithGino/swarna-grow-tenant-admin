/** Contract-shaped settings & subscription payloads from 03-tenant-config.md §§1–2, §6. */

export const mockSettingsProfile = {
  businessName: "Kairali Jewellers",
  displayName: "Kairali",
  ownerName: "Mahesh Kumar",
  ownerMobile: "9846543210",
  ownerEmail: "mahesh@kairalijewellers.in",
  address: {
    line1: "42 MG Road",
    city: "Kochi",
    state: "Kerala",
    pincode: "682011",
  },
  supportNumber: "9846543211",
  gstin: "32AAHFK8821B1ZP",
  tenantCode: "KAIRALI",
  audit: { updatedAt: "2026-08-02T14:10:00+05:30", version: 6 },
};

export const mockSettingsBranding = {
  logoUrl: "https://picsum.photos/seed/kairali-logo/256/256",
  primaryColor: "#730321",
  secondaryColor: "#C9A227",
  appDisplayName: "Kairali Savings",
  previewUrls: {
    appIcon: "https://picsum.photos/seed/kairali-icon/512/512",
    receiptHeader: "https://picsum.photos/seed/kairali-receipt/800/240",
    passbookImage: "https://picsum.photos/seed/kairali-passbook/600/900",
  },
  audit: { version: 6 },
};

export const mockSettingsOperations = {
  multiSchemePerCustomer: true,
  kycMandatory: false,
  kycAllowedTypes: ["AADHAAR", "PAN"] as string[],
  customerSelfEnrolEnabled: true,
  customerSelfRegistrationEnabled: true,
  customerLoginMode: "OTP_ONLY",
  customerAppWriteEnabled: true,
  customerAppPaymentsEnabled: true,
  receiptPrefix: "KL",
  receiptNumberFormat: "{prefix}/{branchCode}/{year}/{seq:6}",
  passbookNumberFormat: "{branchCode}/{year}/{seq:5}",
  schemeNumberFormat: "{branchCode}/{planCode}/{year}/{seq:5}",
  goldPurity: "22K",
  weightRoundingMode: "HALF_UP",
  paymentReversalWindowHours: 48,
  redemptionApprovalRequired: true,
  termsAndConditions:
    "1. Scheme is valid for the stated tenure.\n2. Benefit applies only if all installments are paid.",
  ecommerceEnabled: false,
  ecommerce: { planEntitled: false, enabled: false, active: false },
  audit: { version: 4 },
};

export const mockSubscription = {
  currentPlan: {
    tier: "GROWTH",
    name: "Growth",
    monthlyPrice: { amountPaise: 500000, amountDisplay: "₹5,000" },
    billingCycle: "MONTHLY",
  },
  status: "ACTIVE",
  currentPeriodStart: "2026-09-01",
  currentPeriodEnd: "2026-10-01",
  daysRemaining: 17,
  renewsAutomatically: false,
  usage: {
    activeCustomers: {
      used: 412,
      limit: 1000,
      percent: 41.2,
      status: "OK",
    },
    branches: {
      used: 2,
      limit: 2,
      percent: 100,
      status: "AT_LIMIT",
    },
    staffSeats: {
      used: 6,
      limit: 10,
      percent: 60,
      status: "OK",
    },
    schemePlans: {
      used: 4,
      limit: 10,
      percent: 40,
      status: "OK",
    },
    whatsappMessages: {
      used: 4310,
      limit: 5000,
      percent: 86.2,
      status: "NEAR_LIMIT",
      resetsOn: "2026-10-01",
    },
  },
  features: {
    multiBranch: true,
    customApp: false,
    flexibleScheme: true,
    goldWeightScheme: true,
    prematureRedemption: true,
    customerSelfEnrol: true,
    advancedReports: false,
    ecommerce: false,
  },
  ecommerce: { planEntitled: false, enabled: false, active: false },
};

export const mockAvailablePlans = [
  {
    tier: "GROWTH",
    name: "Growth",
    monthlyPrice: { amountPaise: 500000, amountDisplay: "₹5,000" },
    isCurrent: true,
    isUpgrade: false,
    isDowngrade: false,
    limits: {
      activeCustomers: 1000,
      branches: 2,
      staffSeats: 10,
      whatsappMessagesPerMonth: 5000,
    },
    includes: [
      "1,000 active customers",
      "2 showrooms",
      "10 staff seats",
      "5,000 WhatsApp messages",
      "Flexible schemes",
      "Multi-showroom",
      "Gold weight schemes",
      "Premature redemption",
      "Customer self-enrol",
    ],
    gains: [],
    losses: [],
    blockedReasons: [],
  },
  {
    tier: "PRO",
    name: "Pro",
    monthlyPrice: { amountPaise: 800000, amountDisplay: "₹8,000" },
    isCurrent: false,
    isUpgrade: true,
    isDowngrade: false,
    limits: {
      activeCustomers: 3000,
      branches: 5,
      staffSeats: 30,
      whatsappMessagesPerMonth: 20000,
    },
    gains: [
      "3,000 active customers",
      "5 showrooms",
      "Custom branded app",
      "20,000 WhatsApp messages",
    ],
    losses: [],
    blockedReasons: [],
  },
  {
    tier: "STARTER",
    name: "Starter",
    monthlyPrice: { amountPaise: 300000, amountDisplay: "₹3,000" },
    isCurrent: false,
    isUpgrade: false,
    isDowngrade: true,
    limits: {
      activeCustomers: 100,
      branches: 1,
      staffSeats: 3,
      whatsappMessagesPerMonth: 1000,
    },
    gains: [],
    losses: ["Multi-showroom", "Flexible schemes"],
    blockedReasons: [
      {
        limitKey: "activeCustomers",
        message: "You have 412 active customers. Starter allows 100.",
      },
      {
        limitKey: "branches",
        message: "You have 2 showrooms. Starter allows 1.",
      },
    ],
  },
];

export const mockSubscriptionInvoices = [
  {
    id: "inv_01",
    number: "SG-INV-2026-09",
    periodLabel: "Sep 2026",
    dueDate: "Sep 2026",
    amount: { amountPaise: 499900, amountDisplay: "₹4,999" },
    status: "PAID",
    paidAt: "2026-09-01T10:00:00+05:30",
  },
  {
    id: "inv_02",
    number: "SG-INV-2026-08",
    periodLabel: "Aug 2026",
    dueDate: "Aug 2026",
    amount: { amountPaise: 499900, amountDisplay: "₹4,999" },
    status: "PAID",
    paidAt: "2026-08-01T10:00:00+05:30",
  },
  {
    id: "inv_03",
    number: "SG-INV-2026-10",
    periodLabel: "Oct 2026",
    dueDate: "Oct 2026",
    amount: { amountPaise: 499900, amountDisplay: "₹4,999" },
    status: "ISSUED",
    paidAt: null,
  },
];

export function buildBrandingPreview(primary: string, secondary: string, appDisplayName: string) {
  const seed = primary.replace("#", "");
  return {
    logoUrl: "https://picsum.photos/seed/kairali-logo/256/256",
    primaryColor: primary,
    secondaryColor: secondary,
    appDisplayName,
    previewUrls: {
      appIcon: `https://picsum.photos/seed/icon-${seed}/512/512`,
      receiptHeader: `https://picsum.photos/seed/receipt-${seed}/800/240`,
      passbookImage: `https://picsum.photos/seed/passbook-${seed}/600/900`,
    },
    audit: { version: 7 },
    auditEventId: "aud_settings_branding",
  };
}
