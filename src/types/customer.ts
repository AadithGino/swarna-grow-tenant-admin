export type MoneyRef = { amountPaise: number; amountDisplay: string };
export type WeightRef = { weightMg: number; weightDisplay: string };

export type PaymentGoldAccrual = {
  weightMg: number;
  weightDisplay: string;
  ratePerGramPaise: number;
  ratePerGramDisplay: string;
  purchasedAt?: string;
};

export type CustomerDisplayMode =
  | "FIXED"
  | "FLEXIBLE_FREE_WINDOW"
  | "FLEXIBLE_LOCK_WINDOW"
  /** @deprecated use FLEXIBLE_LOCK_WINDOW */
  | "FLEXIBLE_CAPPED_WINDOW";

export type CustomerSchemeStatus =
  | "ACTIVE"
  | "FULLY_PAID"
  | "MATURED"
  | "REDEMPTION_REQUESTED"
  | "CLOSED";

export type CustomerProfile = {
  id: string;
  tenantId?: string;
  customerNumber: string;
  passbookNumber: string;
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  mobileImmutable: true;
  memberSince: string;
  profileComplete: boolean;
  branch: { id: string; name: string; code: string; address?: string; mobile?: string };
  kyc?: {
    status: "NOT_SUBMITTED" | "PENDING" | "SUBMITTED" | "VERIFIED" | "REJECTED";
    statusLabel: string;
    type?: string;
    numberMasked?: string;
    canUpdate: boolean;
    verifiedAt?: string;
    submittedAt?: string | null;
    rejectionReason?: string | null;
    documents?: Array<{
      side: string;
      label: string;
      uploadId: string;
      fileName?: string | null;
      viewUrl?: string | null;
    }>;
  };
  nominee?: {
    name: string;
    relationship: string;
    relationshipLabel?: string;
    mobile?: string;
    notes?: string | null;
  };
  nomineeEditable?: boolean;
  version?: number;
  tenant: TenantBranding;
};

export type TenantBranding = {
  id?: string;
  tenantCode: string;
  displayName: string;
  appDisplayName: string;
  logoUrl?: string | null;
  primaryColor: string;
  accentColor: string;
  foregroundColor: string;
  contrastColor: string;
  supportNumber: string;
  city: string;
  kycMandatory?: boolean;
  redemptionKycRequired?: boolean;
  selfKycEnabled?: boolean;
  kycAllowedTypes?: string[];
  customerSelfRegistration?: boolean;
  customerSelfEnrol?: boolean;
  multiScheme?: boolean;
  customerLoginMode?: "OTP_ONLY" | "PASSWORD_ONLY";
  /** SMS OTP length configured for Message Central (4–8). */
  otpLength?: number;
  authCountryCode?: string;
  customerAppWriteEnabled?: boolean;
  customerAppPaymentsEnabled?: boolean;
};

export type CustomerPastScheme = {
  id: string;
  schemeNumber: string;
  planName: string;
  closureType: string;
  closedAt: string;
  finalValue: MoneyRef;
  benefitReceived: MoneyRef;
  redemptionMode?: string | null;
  billNumber?: string | null;
  closureReceiptUrl?: string | null;
  passbookAvailable: boolean;
  displayMode?: CustomerDisplayMode;
};

export type SchemeCardRecentPayment = {
  id: string;
  amount: MoneyRef;
  paidAt: string;
  receiptNumber?: string;
};

export type SchemeCard = {
  id: string;
  schemeNumber: string;
  passbookNumber?: string;
  planName: string;
  subtitle: string;
  displayMode: CustomerDisplayMode;
  valueBasis?: "CASH" | "GOLD_WEIGHT";
  status: CustomerSchemeStatus;
  statusLabel: string;
  progressPhase?: "FIXED" | "FREE_WINDOW" | "CAPPED";
  progressPercent: number;
  progressLabel: string;
  progressDetail?: string;
  totalPaid: MoneyRef;
  /** Present for GOLD_WEIGHT schemes. Some V1 payloads call this `goldAccrued`. */
  goldAccumulated?: WeightRef;
  goldAccrued?: WeightRef;
  currentValuation?: MoneyRef;
  freeWindowMonth?: number;
  freeWindowMonths?: number;
  cycleCap?: MoneyRef;
  remainingThisCycle?: MoneyRef;
  maturityDate: string;
  nextActionLabel: string;
  nextActionAmount?: MoneyRef;
  canPay: boolean;
  benefitLabel: string;
  recentPayments?: SchemeCardRecentPayment[];
};

export type PayableRangeTargetCycleOption = {
  cycle: string;
  label: string;
  remaining: MoneyRef;
  isCurrentCycle?: boolean;
};

export type PayableRange = {
  model: "FIXED" | "FLEXIBLE";
  phase?: "FIXED" | "FLEXIBLE" | "FREE" | "CAPPED" | null;
  payable?: boolean;
  contributionIsOptional: boolean;
  targetCycle?: string;
  minPayable: MoneyRef;
  maxPayable: MoneyRef;
  cycleCap?: MoneyRef;
  remainingThisCycle?: MoneyRef;
  suggested: MoneyRef;
  multipleOfPaise: number;
  quickAmounts: MoneyRef[];
  helperText: string;
  positionVersion: number;
  unusedAllowanceCarriesForward: false;
  paidMoneyNeverExpires: true;
  allowFutureCycleSelection?: boolean;
  targetCycleOptions?: PayableRangeTargetCycleOption[];
  advancePaymentAllowed?: boolean;
  maxAdvanceInstallments?: number | null;
  partialPaymentAllowed?: boolean;
  allowedAmountsPaise?: number[] | null;
  reservedPaise?: number;
  expectedPositionVersion?: number;
  reservationExpiresAt?: string | null;
};

export type CustomerSchemeDetail = SchemeCard & {
  passbookNumber?: string;
  header: { eyebrow: string; title: string; description: string };
  maturityBenefit?: CustomerMaturityBenefit;
  planRules?: { sections: CustomerPlanRulesSection[] };
  progressCard: {
    type: CustomerDisplayMode;
    installmentsPaid?: number;
    installmentsTotal?: number;
    freeWindowMonth?: number;
    freeWindowMonths?: number;
    /** Full free-window months elapsed; current month is not counted until it ends. */
    freeWindowMonthsCompleted?: number;
    cycleCap?: MoneyRef;
    remainingThisCycle?: MoneyRef;
    lockedAverage?: MoneyRef;
    goldAccumulated?: WeightRef;
    goldAccrued?: WeightRef;
  };
  statCards: Array<{ label: string; value: string; caption: string }>;
  payButton: { visible: boolean; enabled: boolean; label: string; reason?: string; helperText?: string };
  passbookSummary: { totalEntries: number; lastPaymentAt: string; totalPaid: MoneyRef };
  redemption: {
    eligible: boolean;
    status: string;
    preferredModes: Array<string | { mode: string; label: string }>;
    blocker?: string;
  };
  lifecycleActions: string[] | Record<string, boolean>;
  planId?: string;
  valueBasis?: "CASH" | "GOLD_WEIGHT";
  uiStatus?: string;
  version: number;
  positionVersion: number;
  helperText: string;
  payableRange?: PayableRange;
  payments: PaymentListItem[];
};

export type SchemePlan = {
  id: string;
  name: string;
  code: string;
  tagline: string;
  model: "FIXED" | "FLEXIBLE";
  durationMonths: number;
  /** Short label for cards; use `contributionDetail` on detail when present. */
  amountSummary: string;
  contributionDetail?: string;
  benefitSummary: string;
  benefitType?: "CASH_BONUS" | "GOLD_BENEFIT" | "ONE_FREE_INSTALLMENT" | "FIXED_BONUS_AMOUNT" | string;
  valueBasisLabel?: string;
  paymentPatternLabel?: string;
  rules: string[];
  canEnrol: boolean;
  blockedReason?: string;
  featured?: boolean;
  amountMinPaise?: number;
  amountMaxPaise?: number;
  multipleOfPaise?: number;
  fixedAmountPaise?: number;
  slabsPaise?: number[];
  amountMode?: string;
  enrolRules?: import("@/src/lib/enrol-plan-rules").EnrolPlanRules;
  termsText?: string;
  firstInstallmentRequired?: boolean;
  firstInstallmentModeDefault?: "COLLECT_NOW" | "START_NEXT_CYCLE";
  firstInstallmentModeEditable?: boolean;
  flexibleSummary?: {
    freeWindowMonths?: number | null;
    lockWindowMonths?: number | null;
    explainer?: string | null;
    minPerPayment?: MoneyRef | null;
    maxPerPayment?: MoneyRef | null;
  };
};

export type PaymentListItem = {
  id: string;
  amount: MoneyRef;
  grossAmount?: MoneyRef;
  refundedAmount?: MoneyRef;
  netAmount?: MoneyRef;
  grossAmountPaise?: number;
  refundedAmountPaise?: number;
  netAmountPaise?: number;
  status: "PENDING" | "SUCCESS" | "PARTIALLY_REFUNDED" | "FAILED" | "REVERSED" | "UNALLOCATED_PENDING_REVIEW";
  statusLabel?: string;
  paidAt?: string;
  createdAt: string;
  schemeId: string;
  schemeNumber: string;
  schemeName: string;
  receiptNumber?: string;
  receiptDownloadPath?: string;
  channel: "PHONEPE" | "CASH" | "UPI" | "CARD" | "BANK_TRANSFER";
  channelLabel?: string;
  recordedByLabel?: string;
  paymentPattern: "FIXED" | "FLEXIBLE";
  targetCycle?: string;
  valueBasis?: "CASH" | "GOLD_WEIGHT";
  goldAccrual?: PaymentGoldAccrual | null;
  transactionId?: string;
};

export type CustomerPassbookRow = {
  entryNumber: number;
  installmentNumber?: number;
  dueDate?: string;
  status: string;
  paidAt?: string;
  amountDue?: MoneyRef;
  amountPaid?: MoneyRef;
  grossAmount?: MoneyRef;
  refundedAmount?: MoneyRef;
  netAmount?: MoneyRef;
  mode?: string;
  receiptNumber?: string;
  payment?: { id: string; receiptNumber?: string; paidAt?: string; amountPaid?: MoneyRef } | null;
  goldAccrual?: PaymentGoldAccrual | null;
};

export type CustomerPassbook = {
  scheme: { id: string; schemeNumber: string; displayMode: CustomerDisplayMode };
  rows: CustomerPassbookRow[];
  totals: Record<string, MoneyRef | number>;
};

export type CustomerSettlementPreview = {
  /** False when the API payload could not be trusted (missing fields, malformed amounts). */
  previewAvailable: boolean;
  eligible: boolean;
  blockers: Array<{ code: string; message: string }>;
  computation: {
    lines: Array<{ key: string; label: string; amount: MoneyRef; sign: "+" | "-"; forfeited?: boolean }>;
    finalValue: MoneyRef;
    goldWeight?: WeightRef | null;
  };
  allowedModes: Array<{ mode: string; label: string; available: boolean; note?: string }>;
  modePreviews?: Record<string, Record<string, unknown>>;
  warningText?: string;
  valuationNote?: string;
  cashSettlementBasis?: "GOLD_VALUE" | "PAID_AMOUNT";
  paidAmountBenefitTreatment?: "EXCLUDE" | "INCLUDE_MONETARY";
  valuationRatePerGramPaise?: number;
  valuationRateEffectiveDate?: string;
  principalPaise: number;
  benefitPaise: number;
  penaltyPaise: number;
  settlementPaise: number;
  weightMg?: number;
  mode?: string | null;
};

export type CustomerPlanRulesSection = {
  title: string;
  items: string[];
};

export type CustomerMaturityBenefit = {
  title: string;
  summary: string;
  type?: string;
  details: string[];
  eligibility: string[];
};

export type CustomerNotification = {
  id: string;
  type: "GENERAL" | "PAYMENT" | "SCHEME" | "GRIEVANCE";
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  deepLink?: string;
  cta?: string;
};

export type GrievanceMessage = {
  id: string;
  authorType: "CUSTOMER" | "STAFF";
  body: string;
  createdAt: string;
};

export type CustomerGrievanceContext = {
  amountDisplay?: string;
  schemeName?: string;
  dateLabel?: string;
};

export type CustomerGrievance = {
  id: string;
  ticketNumber: string;
  category: string;
  status: "OPEN" | "IN_PROGRESS" | "AWAITING_CUSTOMER" | "RESOLVED" | "CLOSED";
  statusLabel: string;
  subject: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  slaDueAt: string;
  unreadForCustomer: boolean;
  version: number;
  messages: GrievanceMessage[];
  allowedActions: string[];
  context?: CustomerGrievanceContext;
};

export type CustomerHome = {
  tenant: TenantBranding;
  customer: { id: string; name: string; profileComplete: boolean; passbookNumber?: string | null };
  recentPayments?: Array<
    SchemeCardRecentPayment & { schemeId: string; schemeNumber: string; schemeName: string }
  >;
  recentActivity?: Array<{
    id: string;
    kind: string;
    direction?: "IN" | "OUT";
    title: string;
    subtitle?: string;
    amount: MoneyRef;
    occurredAt: string;
    statusLabel?: string;
    entityId: string;
    metal?: string;
  }>;
  greeting: { text: string; subtext: string };
  /** At least one enrolled scheme uses gold-weight accumulation (value basis GOLD_WEIGHT). */
  hasGoldAccumulationScheme?: boolean;
  summary: {
    activeSchemeCount: number;
    pastSchemeCount: number;
    totalPaid: MoneyRef;
    goldAccumulated?: WeightRef;
    currentValuation?: MoneyRef;
  };
  goldRate: {
    ratePerGramPaise: number;
    ratePerGramDisplay: string;
    effectiveDate: string;
    purity: string;
    movement?: number | null;
  } | null;
  actionCard: {
    type: "PAY_DUE" | "REDEEM";
    schemeId: string;
    title: string;
    priority: number | string;
    planName?: string;
    subtitle?: string | null;
  } | null;
  activeSchemes: SchemeCard[];
  quickActions: Array<{ key: "PAY" | "ENROL" | "PASSBOOK"; label: string; enabled?: boolean }>;
  emptyState?: { message: string; cta: string } | null;
  cacheTtlSeconds?: number;
  pastSchemesPreview?: Array<{ id: string; schemeNumber: string; status: string }>;
  unreadNotificationCount: number;
  contributionTrend?: Array<
    | { month: string; amountPaise: number }
    | { month: string; amount: MoneyRef }
  >;
  goldAccumulationTrend?: Array<{ month: string; weight: WeightRef }>;
};
