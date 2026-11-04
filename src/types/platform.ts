export type PlatformTenantStatus = "PENDING_SETUP" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
export type SubscriptionTier = "STARTER" | "GROWTH" | "PRO" | "CUSTOM";
export type BillingCycle = "MONTHLY" | "ANNUAL";

export type MoneyRef = { amountPaise: number; amountDisplay: string };

export type PlatformDashboardSummary = {
  tenants: {
    total: number;
    active: number;
    pendingSetup: number;
    suspended: number;
    cancelled?: number;
  };
  tenantsByTier: { tier: string; count: number }[];
  mrr: MoneyRef;
  platformVolume: {
    collectionThisMonth: MoneyRef;
    activeCustomersTotal: number;
    activeSchemesTotal: number;
  };
  alerts: {
    severity: "HIGH" | "MEDIUM" | "LOW" | string;
    key: string;
    message: string;
    count: number;
  }[];
};

export type PlatformPlan = {
  id: string;
  tier: SubscriptionTier;
  name: string;
  displayName: string;
  monthlyPrice: MoneyRef;
  yearlyPrice: MoneyRef;
  priceLabel?: string;
  trialDays: number;
  highlighted: boolean;
  sortOrder: number;
  supportedBillingCycles: BillingCycle[];
  limits: Record<string, number | null>;
  features: Record<string, boolean>;
  displayFeatures: { label: string; value: string }[];
  tenantCount: number;
  status: "ACTIVE" | "DEPRECATED";
  version: number;
};

export type PlatformTenantRow = {
  id: string;
  tenantCode: string;
  businessName: string;
  displayName: string;
  ownerName: string;
  ownerMobile: string;
  ownerEmail: string;
  city: string;
  status: PlatformTenantStatus;
  subscription: {
    tier: SubscriptionTier;
    status: string;
    billingCycle: BillingCycle;
    currentPeriodStart?: string | null;
    currentPeriodEnd: string;
    daysRemaining: number;
    limits?: Record<string, number | null>;
    limitOverrides?: Record<string, number | null>;
    features?: Record<string, boolean>;
  };
  provisioning: {
    paymentGatewayConfigured: boolean;
    readyToGoLive: boolean;
  };
  usage: {
    activeCustomers: number;
    branches: number;
    staff: number;
    limits?: Record<string, number | null>;
    activeCustomersPercent?: number | null;
  };
  createdAt: string;
};

export type PlatformTenantListSummary = {
  total: number;
  active: number;
  pendingSetup: number;
  suspended: number;
  cancelled: number;
  atCustomerLimit: number;
};

export type PlatformTenantListResponse = {
  rows: PlatformTenantRow[];
  meta: {
    nextCursor?: string | null;
    hasMore?: boolean;
    limit?: number;
    summary?: PlatformTenantListSummary;
  };
};

export type UsageMetric = { used: number; limit: number | null; percentage: number; resetDate?: string };

export type PaymentGatewayIntegration = {
  configured: boolean;
  clientCredentialsConfigured?: boolean;
  provider: string;
  clientIdMasked?: string | null;
  environment?: string;
  verificationStatus: string;
  lastVerifiedAt?: string | null;
};

export type MessageCentralIntegration = {
  configured: boolean;
  provider: string;
  customerIdMasked?: string | null;
  email?: string | null;
  countryCode?: string;
  flowType?: string;
  otpLength?: number;
  verificationStatus: string;
  lastVerifiedAt?: string | null;
};

export type PlatformTenantDetail = PlatformTenantRow & {
  ownerEmail?: string | null;
  gstin: string;
  address: string;
  supportNumber: string;
  goLiveAt: string | null;
  branding: { logoUrl: string | null; primaryColor: string; accentColor: string; displayName: string };
  settings: Record<string, boolean>;
  integrations: {
    paymentGateway: PaymentGatewayIntegration;
    messageCentral?: MessageCentralIntegration;
    fcm?: Record<string, unknown>;
  };
  usageDetail: Record<string, UsageMetric>;
  branches: { id: string; name: string; code: string; status: string }[];
  owner: { id: string; name: string; mobile: string; email: string };
  stats: { totalSchemes: number; activeSchemes: number };
  flags: Record<string, boolean>;
  effectiveFlags: Record<string, boolean>;
  audit: { createdAt: string; version: number };
};

export type TemplateDefinition = {
  messageType: string;
  label: string;
  required: boolean;
  variables: { index: number; key: string; sample: string }[];
  hasUrlButton?: boolean;
  hasMediaHeader?: boolean;
  mediaHeaderType?: string;
  mediaHeaderNote?: string;
  buttonUrlVariable?: { index: number; key: string; sample?: string };
  installmentScope?: string;
  scopeNote?: string;
  suggestedBody?: string;
};

export type TenantTemplate = {
  id: string;
  messageType: string;
  templateName: string;
  templateId: string;
  languageCode: string;
  variableOrder: string[];
  buttonUrlVariableKey?: string;
  approvalStatus: string;
  notes?: string;
  active: boolean;
  version: number;
};

export type PlatformInvoice = {
  id: string;
  invoiceNumber: string;
  subtotal: MoneyRef;
  tax: MoneyRef;
  total: MoneyRef;
  status: "UNPAID" | "PAID" | "VOID";
  dueDate: string;
  pdfUrl?: string;
  paidAt: string | null;
};

export type AuditLog = {
  id: string;
  at: string;
  actor: { id: string; type: string };
  tenant: { id: string } | null;
  action: string;
  entityType: string;
  entityId: string;
  changes: unknown[];
  ip: string;
  traceId: string;
};

export type WebhookFailure = {
  id: string; tenantId: string | null; provider: "PHONEPE"; providerEventId: string;
  status: "FAILED" | "SIGNATURE_FAILED" | "DEAD_LETTER"; attempts: number; lastError: string | null;
  traceId: string | null; retryEligible: boolean; createdAt: string; processedAt: string | null;
};

export type ErrorLog = {
  id: string; code: string; message: string; statusCode: number; traceId: string; occurredAt: string; tenantId: string | null;
};
