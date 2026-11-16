import type { CollectionFrequency, CollectionRules } from "./collection";
export type AgentTenantChoice = {
  tenantCode: string;
  displayName: string;
  logoUrl?: string | null;
};

export type AgentUser = {
  id: string;
  name: string;
  mobile?: string;
  role: "COLLECTION_AGENT";
  tenantId: string;
  branchId: string;
  branchName?: string;
  tenantName?: string;
  tenantCode?: string;
  permissions: string[];
  agentCapabilities?: AgentCapabilities;
  mustSetPassword?: boolean;
};

export type AgentCapabilities = {
  registerCustomers: boolean;
  enrolSchemes: boolean;
  /** When true, agents must capture KYC docs before enrolment can proceed (admin still verifies). */
  kycMandatory: boolean;
};

export type AgentPlan = {
  oneTimeRules?: import("./one-time-gold").OneTimeGoldRules;
  collectionRules?: CollectionRules;
  id: string;
  name: string;
  code: string;
  valueBasis: "CASH" | "GOLD_WEIGHT";
  paymentPattern: "FIXED" | "FLEXIBLE";
  durationMonths: number;
  amountMode?: "JEWELLER_FIXED" | "JEWELLER_SLABS" | "CUSTOMER_CHOSEN";
  fixedAmountPaise?: number;
  slabsPaise: number[];
  minInstallmentPaise?: number;
  maxInstallmentPaise?: number;
  multipleOfPaise?: number;
  firstInstallmentModeDefault: "COLLECT_NOW" | "START_NEXT_CYCLE";
  firstInstallmentModeEditable: boolean;
  benefitLabel?: string;
};

export type AgentCreateCustomerInput = {
  name: string;
  mobile: string;
  email?: string;
  address: string;
  passbookNumber?: string;
};

export type AgentEnrolInput = {
  collectionFrequency?: CollectionFrequency;
  customerId: string;
  planId: string;
  installmentAmountPaise?: number;
  firstInstallmentMode: "COLLECT_NOW" | "START_NEXT_CYCLE";
};

export type AgentLoginResponse = {
  user: AgentUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: "Bearer";
};

export type AgentSession = AgentLoginResponse & { selectedTenant: AgentTenantChoice };

export type AgentCashSummary = {
  cashCollectedPaise: number;
  cashInHandPaise: number;
  cashPendingAcceptancePaise: number;
  availableForHandoverPaise: number;
  collectedPaise: number;
  handedOverPaise: number;
  adjustmentPaise: number;
};

export type AgentCollectionSummary = {
  amountPaise: number;
  count: number;
  byMode: Array<{ mode: string; label: string; amountPaise: number; count: number }>;
};

export type AgentManualPaymentMode = "CASH" | "UPI" | "CARD" | "BANK_TRANSFER";

export type AgentSchemeSummary = {
  id: string;
  enrollmentNumber: string;
  planName: string;
  status: string;
  paymentPattern: "FIXED" | "FLEXIBLE";
  valueBasis: "CASH" | "GOLD_WEIGHT";
  phase?: "FREE" | "CAPPED";
  progressLabel?: string;
  totalPaidPaise?: number;
  goldBalanceMg?: number;
  installmentAmountPaise?: number;
  nextAmountPaise?: number;
  payableMaxPaise?: number;
  payableLabel?: string;
  payable?: boolean;
  maturityDate?: string;
};

export type AgentCustomer = {
  id: string;
  customerNumber: string;
  name: string;
  mobile: string;
  email?: string;
  status: string;
  passbookNumber: string;
  kyc?: { status: string; type?: string; numberMasked?: string };
  schemes?: AgentSchemeSummary[];
  schemeSummary?: { active: number; total: number };
  version: number;
};

export type AgentScheme = AgentSchemeSummary & {
  customerId: string;
  startDate: string;
  installmentAmountPaise?: number;
  positionVersion: number;
  version: number;
  installments?: Array<{ number: number; dueDate: string; amountPaise: number; paidPaise: number; status: string }>;
};

export type AgentPayableRange = {
  model: "FIXED" | "FLEXIBLE";
  phase?: "FREE" | "CAPPED";
  contributionIsOptional?: boolean;
  targetCycle?: string;
  installmentNumber?: number;
  minPayablePaise: number;
  maxPayablePaise: number;
  suggestedPaise: number;
  paymentIncrementPaise?: number;
  unusedAllowanceCarriesForward?: boolean;
  expectedVersion?: number;
  positionVersion?: number;
  payable: boolean;
  nextCycleAction?: string;
  allowedAmountsPaise?: number[] | null;
  maxPaymentPerTransactionPaise?: number | null;
  reservedPaise?: number;
  remainingPayablePaise?: number;
  currentInstallmentNumber?: number;
  consecutivePayableInstallments?: number;
  partialPaymentAllowed?: boolean;
  advancePaymentAllowed?: boolean;
  maxAdvanceInstallments?: number | null;
  capPaise?: number;
  paidPaise?: number;
  remainingPaise?: number;
  allowFinalRemainderBelowMinimum?: boolean;
  allowFutureCycleSelection?: boolean;
  targetCycleOptions?: Array<{ cycle: string; label?: string; remainingPaise?: number; isCurrentCycle?: boolean }>;
};

export type AgentGoldRate = {
  id: string;
  ratePerGramPaise: number;
  effectiveDate: string;
  purity: string;
};

export type AgentPaymentGoldAccrual = {
  weightMg: number;
  weightDisplay?: string;
  ratePerGramPaise: number;
  ratePerGramDisplay?: string;
  purchasedAt?: string | null;
};

export type AgentPayment = {
  id: string;
  receiptNumber: string;
  amountPaise: number;
  grossAmountPaise?: number;
  refundedAmountPaise?: number;
  netAmountPaise?: number;
  grossWeightMg?: number;
  refundedWeightMg?: number;
  netWeightMg?: number;
  weightMg?: number | null;
  ratePerGramPaise?: number | null;
  goldAccrual?: AgentPaymentGoldAccrual | null;
  mode: string;
  status: string;
  source: string;
  paidAt: string;
  targetCycle?: string;
  remarks?: string;
  reversedAt?: string | null;
  reversalReason?: string;
  branch?: { id?: string; name?: string; code?: string };
  collectedBy?: { id?: string; name?: string } | string;
  customer: { id: string; name: string; mobile?: string; customerNumber?: string };
  scheme: {
    id: string;
    enrollmentNumber: string;
    planName?: string;
    paymentPattern?: string;
    valueBasis?: string;
    status?: string;
  };
};

export type AgentPaymentLink = {
  id: string;
  token: string;
  url: string;
  status: string;
  expiresAt: string;
  paymentIntentId?: string;
  positionVersion?: number;
};

export type AgentPaymentQrSession = AgentPaymentLink & {
  amountPaise: number;
  paymentId?: string | null;
  gatewayUrl?: string | null;
  qrPayload: string;
  providerOrderId?: string | null;
};

export type AgentPaymentQrStatus = {
  linkId?: string;
  status: string;
  processing?: boolean;
  paid?: boolean;
  failed?: boolean;
  receipt?: {
    paymentId?: string;
    receiptNumber?: string;
    paidAt?: string;
  } | null;
  retryAfterSeconds?: number | null;
};

export type AgentNotification = {
  id: string;
  type: string;
  title?: string;
  body?: string;
  status?: string;
  createdAt: string;
  customerId?: string;
  schemeId?: string;
};

export type AgentHandoverStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "DISCREPANCY" | "CANCELLED";

export type AgentHandoverTimelineEvent = {
  event: string;
  at: string;
  by: string;
  note?: string;
};

export type AgentHandover = {
  id: string;
  amountPaise: number;
  acceptedAmountPaise?: number | null;
  discrepancyPaise?: number | null;
  status: AgentHandoverStatus;
  initiator: "STAFF";
  remarks?: string;
  reason?: string;
  submittedAt: string;
  settledAt?: string | null;
  branch?: { id?: string; name?: string; code?: string };
  settledBy?: { id?: string; name?: string } | null;
  timeline?: AgentHandoverTimelineEvent[];
};

export type AgentPassbook = {
  scheme: { id: string; enrollmentNumber: string; status: string };
  ledger: Array<{
    id: string;
    type: string;
    sequence: number;
    amountPaise: number;
    weightMg?: number;
    cycle?: string;
    effectiveAt: string;
    paymentId: string;
    receiptNumber?: string;
    mode?: string;
    installmentNumber?: number;
    status?: string;
    grossAmountPaise?: number;
    refundedAmountPaise?: number;
    netAmountPaise?: number;
  }>;
};

export type AgentReport = {
  amountPaise: number;
  count: number;
  goldWeightMg: number;
  averageCollectionPaise: number;
  byMode?: Array<{ mode: string; label: string; amountPaise: number; count: number }>;
  days: Array<{ date: string; amountPaise: number; count: number; goldWeightMg: number }>;
};
