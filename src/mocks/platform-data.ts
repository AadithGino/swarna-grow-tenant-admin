import type {
  AuditLog,
  DemoInstance,
  DemoTemplate,
  DemoTemplateVersion,
  ErrorLog,
  PlatformInvoice,
  PlatformPlan,
  PlatformTenantDetail,
  TenantTemplate,
  TemplateDefinition,
  WebhookFailure,
} from "@/src/types/platform";

const money = (amountPaise: number) => ({ amountPaise, amountDisplay: `₹${(amountPaise / 100).toLocaleString("en-IN")}` });

export const platformPlans: PlatformPlan[] = [
  { id: "splan_starter", tier: "STARTER", name: "Starter", displayName: "Starter", monthlyPrice: money(249900), yearlyPrice: money(2699000), trialDays: 14, highlighted: false, sortOrder: 1, supportedBillingCycles: ["MONTHLY", "ANNUAL"], limits: { activeCustomers: 300, branches: 1, staffSeats: 3, schemePlans: 4 }, features: { multiBranch: false, customApp: false, flexibleScheme: false, goldWeightScheme: true, prematureRedemption: true, customerSelfEnrol: false, advancedReports: false }, displayFeatures: [{ label: "Active customers", value: "300" }, { label: "Branches", value: "1" }], tenantCount: 21, status: "ACTIVE", version: 3 },
  { id: "splan_growth", tier: "GROWTH", name: "Growth", displayName: "Growth", monthlyPrice: money(500000), yearlyPrice: money(5400000), trialDays: 14, highlighted: true, sortOrder: 2, supportedBillingCycles: ["MONTHLY", "ANNUAL"], limits: { activeCustomers: 1000, branches: 2, staffSeats: 10, schemePlans: 10 }, features: { multiBranch: true, customApp: false, flexibleScheme: true, goldWeightScheme: true, prematureRedemption: true, customerSelfEnrol: true, advancedReports: false }, displayFeatures: [{ label: "Active customers", value: "1,000" }, { label: "Staff seats", value: "10" }], tenantCount: 31, status: "ACTIVE", version: 7 },
  { id: "splan_pro", tier: "PRO", name: "Pro", displayName: "Pro", monthlyPrice: money(950000), yearlyPrice: money(10260000), trialDays: 14, highlighted: false, sortOrder: 3, supportedBillingCycles: ["MONTHLY", "ANNUAL"], limits: { activeCustomers: 5000, branches: 8, staffSeats: 40, schemePlans: 30 }, features: { multiBranch: true, customApp: true, flexibleScheme: true, goldWeightScheme: true, prematureRedemption: true, customerSelfEnrol: true, advancedReports: true }, displayFeatures: [{ label: "Active customers", value: "5,000" }, { label: "Advanced reports", value: "Included" }], tenantCount: 13, status: "ACTIVE", version: 4 },
  { id: "splan_custom", tier: "CUSTOM", name: "Enterprise", displayName: "Enterprise", monthlyPrice: money(0), yearlyPrice: money(0), trialDays: 0, highlighted: false, sortOrder: 4, supportedBillingCycles: ["MONTHLY", "ANNUAL"], limits: { activeCustomers: null, branches: null, staffSeats: null, schemePlans: null }, features: { multiBranch: true, customApp: true, flexibleScheme: true, goldWeightScheme: true, prematureRedemption: true, customerSelfEnrol: true, advancedReports: true }, displayFeatures: [{ label: "Limits", value: "Custom" }], tenantCount: 2, status: "ACTIVE", version: 2 },
];

const makeTenant = (id: string, code: string, name: string, city: string, tier: PlatformTenantDetail["subscription"]["tier"], status: PlatformTenantDetail["status"], customers: number, ready = true): PlatformTenantDetail => ({
  id, tenantCode: code, businessName: `${name} Jewellery`, displayName: name, ownerName: id === "tnt_01" ? "Mahesh Kumar" : `${name.split(" ")[0]} Owner`, ownerMobile: "+91 98465 43210", ownerEmail: `owner@${code.toLowerCase()}.in`, city, status,
  subscription: { tier, status: status === "PENDING_SETUP" ? "TRIAL" : status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE", billingCycle: "MONTHLY", currentPeriodEnd: "2026-10-01", daysRemaining: 15 },
  provisioning: { paymentGatewayConfigured: ready, readyToGoLive: ready && status === "PENDING_SETUP" },
  usage: { activeCustomers: customers, branches: tier === "STARTER" ? 1 : 2, staff: tier === "STARTER" ? 2 : 6 }, createdAt: "2026-05-14T09:30:00Z",
  gstin: "32ABCDE1234F1Z5", address: `42 MG Road, ${city} 682011`, supportNumber: "+91 98465 43211", goLiveAt: status === "PENDING_SETUP" ? null : "2026-05-18T10:00:00Z",
  branding: { logoUrl: null, primaryColor: "#730321", accentColor: "#D59A16", displayName: name }, settings: { multiSchemePerCustomer: true, kycMandatory: false, customerSelfEnrolEnabled: tier !== "STARTER" },
  integrations: { paymentGateway: { configured: ready, clientCredentialsConfigured: ready, provider: "PHONEPE", clientIdMasked: `${code.slice(0, 4)}••••SDK`, environment: "PRODUCTION", verificationStatus: ready ? "VERIFIED" : "PENDING", lastVerifiedAt: ready ? "2026-09-15T08:35:00Z" : null } },
  usageDetail: { activeCustomers: { used: customers, limit: tier === "STARTER" ? 300 : tier === "GROWTH" ? 1000 : 5000, percentage: tier === "STARTER" ? customers / 3 : customers / 10 }, branches: { used: tier === "STARTER" ? 1 : 2, limit: tier === "STARTER" ? 1 : tier === "GROWTH" ? 2 : 8, percentage: tier === "STARTER" ? 100 : tier === "GROWTH" ? 100 : 25 }, staff: { used: tier === "STARTER" ? 2 : 6, limit: tier === "STARTER" ? 3 : tier === "GROWTH" ? 10 : 40, percentage: tier === "STARTER" ? 66.7 : tier === "GROWTH" ? 60 : 15 }, schemePlans: { used: 4, limit: tier === "STARTER" ? 4 : 10, percentage: tier === "STARTER" ? 100 : 40 } },
  branches: [{ id: `${id}_br1`, name: "Main Showroom", code: "MAIN", status: "ACTIVE" }], owner: { id: `${id}_owner`, name: id === "tnt_01" ? "Mahesh Kumar" : `${name.split(" ")[0]} Owner`, mobile: "+91 98465 43210", email: `owner@${code.toLowerCase()}.in` }, stats: { totalSchemes: Math.round(customers * 1.25), activeSchemes: Math.round(customers * 1.05) }, flags: { customerSelfEnrol: tier !== "STARTER", flexibleScheme: tier !== "STARTER", passbookImageOnPayment: true, onlinePayments: true, staffAppEnabled: true, customerAppEnabled: true }, effectiveFlags: { customerSelfEnrol: tier !== "STARTER", flexibleScheme: tier !== "STARTER", passbookImageOnPayment: true, onlinePayments: true, staffAppEnabled: true, customerAppEnabled: true }, audit: { createdAt: "2026-05-14T09:30:00Z", version: 12 },
});

export const platformTenants: PlatformTenantDetail[] = [
  makeTenant("tnt_01", "SREEGOLD", "Sree Gold", "Kochi", "GROWTH", "ACTIVE", 412),
  makeTenant("tnt_02", "KAIRALI", "Kairali Jewellers", "Thrissur", "PRO", "ACTIVE", 1420),
  makeTenant("tnt_03", "MALABAR", "Malabar Gold House", "Kozhikode", "GROWTH", "PENDING_SETUP", 0, false),
  makeTenant("tnt_04", "AKSHAYA", "Akshaya Gold", "Trivandrum", "STARTER", "ACTIVE", 268),
  makeTenant("tnt_05", "NAVARATNA", "Navaratna", "Kannur", "GROWTH", "SUSPENDED", 886),
  makeTenant("tnt_06", "ROYAL", "Royal Gold", "Kollam", "PRO", "ACTIVE", 2175),
];

export const templateDefinitions: TemplateDefinition[] = [
  ["OTP", "Login OTP", true, ["otpCode", "validMinutes", "jewellerName"]], ["SCHEME_JOINED", "Scheme joined", true, ["customerName", "schemeName", "schemeNumber", "jewellerName"]], ["PAYMENT_DUE", "Payment due reminder", true, ["customerName", "schemeName", "installmentNumber", "amountDisplay", "dueDateDisplay", "jewellerName"]], ["PAYMENT_OVERDUE", "Payment overdue reminder", true, ["customerName", "schemeName", "amountDisplay", "dueDateDisplay", "jewellerName"]], ["PAYMENT_SUCCESS", "Payment success with passbook", true, ["customerName", "amountDisplay", "schemeName", "receiptNumber", "paidInstallments", "jewellerName"]], ["FLEXI_LOCK_APPLIED", "Flexible cap locked", true, ["customerName", "schemeName", "capAmountDisplay", "jewellerName"]], ["SCHEME_MATURED", "Scheme matured", true, ["customerName", "schemeName", "maturityDateDisplay", "jewellerName"]], ["SCHEME_CLOSED", "Scheme closed", true, ["customerName", "schemeName", "settlementDisplay", "jewellerName"]], ["PAYMENT_SUCCESS_TEXT_FALLBACK", "Payment success (text fallback)", false, ["customerName", "amountDisplay", "schemeName", "receiptNumber", "paidInstallments", "jewellerName"]],
].map(([messageType, label, required, vars]) => ({ messageType: String(messageType), label: String(label), required: Boolean(required), variables: (vars as string[]).map((key, index) => ({ index: index + 1, key, sample: key === "amountDisplay" ? "₹5,000" : "Sample" })), hasUrlButton: messageType === "PAYMENT_DUE" || messageType === "PAYMENT_OVERDUE", hasMediaHeader: messageType === "PAYMENT_SUCCESS" }));

export const tenantTemplates: Record<string, TenantTemplate[]> = {};

export const platformInvoices: Record<string, PlatformInvoice[]> = Object.fromEntries(platformTenants.map((t, i) => [t.id, [{ id: `inv_${i + 1}`, invoiceNumber: `PLT/2026/0${294 + i}`, subtotal: money(500000), tax: money(90000), total: money(590000), status: i === 4 ? "UNPAID" : "PAID", dueDate: "2026-09-07", pdfUrl: "#", paidAt: i === 4 ? null : "2026-09-04T12:00:00Z" }]]));

export const auditLogs: AuditLog[] = platformTenants.map((t, i) => ({ id: `aud_${i + 1}`, at: `2026-09-${String(15 - i).padStart(2, "0")}T10:20:00Z`, actor: { id: "pusr_ops", type: "PLATFORM_USER" }, tenant: { id: t.id }, action: i % 2 ? "TENANT_SUBSCRIPTION_CHANGED" : "TENANT_CONFIGURATION_UPDATED", entityType: i % 2 ? "SUBSCRIPTION" : "TENANT", entityId: t.id, changes: [], ip: "103.21.x.x", traceId: `trace-audit-${i + 1}` }));
export const webhookFailures: WebhookFailure[] = [{ id: "whk_01", tenantId: "tnt_02", provider: "PHONEPE", providerEventId: "PG-882719", status: "FAILED", attempts: 3, lastError: "Gateway timeout while acknowledging callback", traceId: "trace-wh-1", retryEligible: true, createdAt: "2026-09-16T07:35:00Z", processedAt: null }, { id: "whk_02", tenantId: "tnt_03", provider: "PHONEPE", providerEventId: "PG-991204", status: "SIGNATURE_FAILED", attempts: 1, lastError: "Signature mismatch", traceId: "trace-wh-2", retryEligible: false, createdAt: "2026-09-16T06:12:00Z", processedAt: null }];
export const errorLogs: ErrorLog[] = [{ id: "err_01", code: "GATEWAY_TIMEOUT", message: "PhonePe status request timed out", statusCode: 504, traceId: "trace-wh-1", occurredAt: "2026-09-16T07:35:00Z", tenantId: "tnt_02" }, { id: "err_02", code: "TEMPLATE_REJECTED", message: "Meta rejected template variable ordering", statusCode: 422, traceId: "trace-tpl-4", occurredAt: "2026-09-15T18:20:00Z", tenantId: "tnt_03" }];

export const dashboardSummary = { tenants: { total: 67, active: 61, pendingSetup: 4, suspended: 2, cancelled: 0 }, tenantsByTier: [{ tier: "STARTER", count: 21 }, { tier: "GROWTH", count: 31 }, { tier: "PRO", count: 13 }, { tier: "CUSTOM", count: 2 }], mrr: money(27400000), platformVolume: { collectionThisMonth: money(8420000000), activeCustomersTotal: 18420, activeSchemesTotal: 21055 }, alerts: [{ severity: "HIGH", key: "WEBHOOK_FAILURES", message: "PhonePe callbacks need attention", count: 18 }, { severity: "MEDIUM", key: "TENANT_SETUP", message: "Jewellers are waiting for provisioning", count: 4 }] };

export const chartData: Record<string, unknown> = {
  "tenant-growth": { chartType: "line", title: "Tenant growth", xAxis: { type: "category", label: "Period" }, yAxis: { type: "count", label: "Tenants", unit: "count" }, series: [{ key: "TENANTS", name: "New tenants", data: [3, 5, 4, 7, 6, 9].map((y, i) => ({ x: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"][i], y, yDisplay: String(y) })) }] },
  "mrr-trend": { chartType: "area", title: "MRR trend", xAxis: { type: "category", label: "Period" }, yAxis: { type: "currency", label: "MRR", unit: "INR" }, series: [{ key: "MRR", name: "MRR", data: [194, 207, 218, 236, 251, 274].map((y, i) => ({ x: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"][i], y: y * 100000, yDisplay: `₹${y},000` })) }] },
  "tier-distribution": { chartType: "donut", title: "Subscription distribution", series: [{ key: "TIER", name: "Tenants", data: [{ x: "Starter", y: 21 }, { x: "Growth", y: 31 }, { x: "Pro", y: 13 }, { x: "Custom", y: 2 }] }] },
};

// --- Demo Builder (mock mode) ---
export const platformDemoTemplates: DemoTemplate[] = [
  {
    id: "dtpl_kairali",
    name: "Kairali Jewellers — standard demo",
    approvedSourceTenantId: "tnt_02",
    currentPublishedVersionId: "dtplv_kairali_2",
    status: "ACTIVE",
    createdBy: "pusr_ops",
    version: 1,
    createdAt: "2026-08-02T09:00:00Z",
    updatedAt: "2026-09-10T11:15:00Z",
  },
  {
    id: "dtpl_sreegold",
    name: "Sree Gold — small jeweller demo",
    approvedSourceTenantId: "tnt_01",
    currentPublishedVersionId: null,
    status: "DRAFT",
    createdBy: "pusr_ops",
    version: 1,
    createdAt: "2026-09-20T14:30:00Z",
    updatedAt: "2026-09-20T14:30:00Z",
  },
];

export const platformDemoTemplateVersions: Record<string, DemoTemplateVersion[]> = {
  dtpl_kairali: [
    {
      id: "dtplv_kairali_2",
      templateId: "dtpl_kairali",
      version: 2,
      schemaVersion: "demo-slice-1",
      status: "PUBLISHED",
      checksum: "sha256-mock-2",
      manifest: { counts: { Branch: 2, Customer: 48, SchemePlan: 6, Scheme: 61, Payment: 318, LedgerEntry: 318 } },
      dateAnchor: "2026-09-10T11:15:00Z",
      publishedBy: "pusr_ops",
      publishedAt: "2026-09-10T11:15:00Z",
      failureReason: null,
      createdAt: "2026-09-10T11:12:00Z",
    },
    {
      id: "dtplv_kairali_1",
      templateId: "dtpl_kairali",
      version: 1,
      schemaVersion: "demo-slice-1",
      status: "PUBLISHED",
      checksum: "sha256-mock-1",
      manifest: { counts: { Branch: 2, Customer: 40, SchemePlan: 5, Scheme: 50, Payment: 260, LedgerEntry: 260 } },
      dateAnchor: "2026-08-02T09:05:00Z",
      publishedBy: "pusr_ops",
      publishedAt: "2026-08-02T09:05:00Z",
      failureReason: null,
      createdAt: "2026-08-02T09:01:00Z",
    },
  ],
  dtpl_sreegold: [],
};

export const platformDemoInstances: DemoInstance[] = [
  {
    id: "dins_acmejewels",
    publicId: "pub_acmejewels9f2",
    prospectName: "Acme Jewels (prospect)",
    prospectContactMobile: "+919847700001",
    branding: {
      logoUploadId: null,
      primaryColor: "#730321",
      accentColor: "#C9A227",
      displayName: "Acme Jewels",
      splashBackgroundColor: "#fbf1f3",
      splashTagline: "Your gold savings, simplified",
      splashEnabled: true,
      revision: 2,
    },
    templateVersionId: "dtplv_kairali_2",
    activeTenantId: "tnt_demo_acmejewels",
    activeGenerationId: "dgen_1",
    status: "READY",
    expiresAt: "2026-12-10T00:00:00Z",
    createdBy: "pusr_ops",
    linkVersion: 1,
    disabledAt: null,
    lastOpenedAt: "2026-11-02T06:40:00Z",
    version: 3,
    createdAt: "2026-10-10T08:00:00Z",
  },
  {
    id: "dins_vellayani",
    publicId: "pub_vellayani4a1",
    prospectName: "Vellayani Gold House (prospect)",
    prospectContactMobile: null,
    branding: {
      logoUploadId: null,
      primaryColor: "#5e0a20",
      accentColor: "#d2a94d",
      displayName: "Vellayani Gold House",
      splashBackgroundColor: null,
      splashTagline: null,
      splashEnabled: true,
      revision: 1,
    },
    templateVersionId: "dtplv_kairali_2",
    activeTenantId: "tnt_demo_vellayani",
    activeGenerationId: "dgen_1",
    status: "DISABLED",
    expiresAt: "2026-11-25T00:00:00Z",
    createdBy: "pusr_ops",
    linkVersion: 2,
    disabledAt: "2026-10-28T10:00:00Z",
    lastOpenedAt: "2026-10-27T05:12:00Z",
    version: 5,
    createdAt: "2026-09-28T07:45:00Z",
  },
];
