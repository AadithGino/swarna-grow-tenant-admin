export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export type GlobalSearchKind =
  | "CUSTOMER"
  | "ENROLLMENT"
  | "RECEIPT"
  | "REDEMPTION";

export interface GlobalSearchItem {
  id: string;
  kind: GlobalSearchKind;
  title: string;
  subtitle?: string;
  meta?: string;
  href: string;
}

export interface GlobalSearchResult {
  query: string;
  groups: Array<{
    kind: GlobalSearchKind;
    label: string;
    items: GlobalSearchItem[];
  }>;
}

export type CustomerKycType = "AADHAAR" | "PAN";
export type CustomerKycStatus =
  | "NOT_SUBMITTED"
  | "SUBMITTED"
  | "VERIFIED"
  | "REJECTED";

export interface CustomerKycDocument {
  side: "FRONT" | "BACK" | "SINGLE";
  label: string;
  uploadId?: string;
  previewUrl?: string;
}

export interface CustomerKycDetail {
  type: CustomerKycType;
  status: CustomerKycStatus;
  number?: string;
  submittedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionRemarks?: string;
  documents: CustomerKycDocument[];
}

export type NomineeRelationship =
  | "SPOUSE"
  | "PARENT"
  | "CHILD"
  | "SIBLING"
  | "RELATIVE"
  | "FRIEND"
  | "OTHER";

export interface CustomerNomineeDetail {
  name: string;
  relationship: NomineeRelationship;
  relationshipLabel: string;
  mobile: string;
  notes?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface Customer {
  id: string;
  customerNo: string;
  name: string;
  initials: string;
  phone: string;
  email: string;
  branch: string;
  branchId: string;
  activeSchemes: number;
  lifetimePaid?: number;
  paymentCount?: number;
  nextDue: string;
  nextDueAmount: number;
  overdueAmount: number;
  lastPayment: string;
  lastPaymentAmount: number;
  kyc: "VERIFIED" | "PENDING" | "REJECTED";
  status: "ACTIVE" | "BLOCKED" | "INACTIVE";
  joined: string;
  address: string;
  version: number;
  nominee?: string;
  kycDetail?: CustomerKycDetail;
  nomineeDetail?: CustomerNomineeDetail;
}

export type DisplayMode =
  "FIXED" | "FLEXIBLE_FREE_WINDOW" | "FLEXIBLE_LOCK_WINDOW";
export type SchemeStatus =
  | "PENDING_PAYMENT"
  | "ENROLMENT_EXPIRED"
  | "ACTIVE"
  | "LOCKED"
  | "MATURED"
  | "DEFAULTED"
  | "REDEEMED"
  | "CLOSED_PREMATURE";
export type ScheduleStatus =
  "PAID" | "DUE" | "PARTIALLY_PAID" | "UPCOMING" | "EXPIRED" | "MATURED";

export interface ScheduleRow {
  goldAccrual?: import("@/src/types/customer").PaymentGoldAccrual | null;
  id: string;
  cycle: number;
  label: string;
  due: string;
  amount: number;
  paid?: number;
  remaining?: number;
  paymentCount?: number;
  status: ScheduleStatus;
  receipt?: string;
  paymentId?: string;
  note?: string;
}

export interface PayableQuote {
  schemeId: string;
  paymentPattern: "FIXED" | "FLEXIBLE";
  displayMode: DisplayMode;
  eligible: boolean;
  helperText: string;
  suggested: number | null;
  min: number;
  max: number;
  multipleOf?: number;
  coversInstallments?: number[];
  targetCycle?: string;
  cycleLabel?: string;
  cycleNumber?: number;
  positionVersion?: number;
  currentCycleCap?: number;
  confirmedThisCycle?: number;
  remainingThisCycle?: number;
  successfulPaymentCountThisCycle?: number;
  finalRemainderException?: boolean;
  formulaLabel?: string;
  explainerText?: string;
  nextCycleAction?: {
    available: boolean;
    targetCycle: string;
    cycleLabel: string;
    remaining: number;
    label: string;
  } | null;
  blockingReasons?: { code: string; message: string }[];
  customer: string;
  enrollmentNo: string;
  plan: string;
  status: SchemeStatus;
}

export interface Enrollment {
  id: string;
  enrollmentNo: string;
  customerId: string;
  customer: string;
  plan: string;
  branch: string;
  progress: number;
  tenure: number;
  paid: number;
  installment: number;
  outstanding?: number;
  nextDue: string;
  nextDueAmount?: number;
  maturity: string;
  status: SchemeStatus;
  valueBasis: "CASH" | "GOLD_WEIGHT";
  accumulatedGold?: number;
  paymentPattern?: "FIXED" | "FLEXIBLE";
  displayMode?: DisplayMode;
  phase?: "FREE_WINDOW" | "CAPPED" | "MATURED";
  version?: number;
  canRecordPayment?: boolean;
  canRedeem?: boolean;
  pendingRedemption?: {
    id: string;
    status: string;
    closureType?: string;
    settlementPaise?: number;
    mode?: string;
    requestedAt?: string;
  } | null;
  completedRedemption?: {
    id: string;
    status: string;
    closureType?: string;
    settlementPaise?: number;
    mode?: string;
    completedAt?: string;
    requestedAt?: string;
  } | null;
  helperText?: string;
  payableMin?: number;
  payableMax?: number;
  payableSuggested?: number | null;
  positionVersion?: number;
  targetCycle?: string;
  allowedRedemptionModes?: Array<"CASH" | "GOLD_HANDOVER" | "PURCHASE_ADJUSTMENT">;
  cycleLabel?: string;
  formulaLabel?: string;
  explainerText?: string;
  currentCycleCap?: number;
  confirmedThisCycle?: number;
  remainingThisCycle?: number;
  lockDate?: string;
  daysToLock?: number;
  projectedMonthly?: number;
  schedule?: ScheduleRow[];
  monthlyBreakdown?: {
    month: string;
    paid: number;
    paymentCount: number;
    status: ScheduleStatus;
  }[];
  cyclePayments?: {
    receiptNo: string;
    paidAt: string;
    mode: string;
    amount: number;
  }[];
}

export interface Payment {
  id: string;
  receiptNo: string;
  date: string;
  customer: string;
  customerId: string;
  enrollmentNo: string;
  schemeId?: string;
  amount: number;
  mode:
    | "CASH"
    | "CARD"
    | "UPI"
    | "BANK_TRANSFER"
    | "ONLINE_GATEWAY";
  staff: string;
  branch: string;
  status:
    | "PENDING"
    | "SUCCESS"
    | "FAILED"
    | "AMOUNT_MISMATCH_PENDING_REVIEW"
    | "UNALLOCATED_PENDING_REVIEW"
    | "PARTIALLY_REFUNDED"
    | "REVERSED";
  grossAmount?: number;
  refundedAmount?: number;
  netAmount?: number;
  gatewayRefundReservedAmount?: number;
  requiresReview?: boolean;
  reviewReason?: string | null;
  source: "ADMIN" | "STAFF" | "PAYMENT_LINK";
  isLateSuccess?: boolean;
  goldAccrual?: import("@/src/types/customer").PaymentGoldAccrual | null;
}

export interface DueItem {
  id: string;
  customer: string;
  customerId: string;
  phone: string;
  enrollmentNo: string;
  /** Enrollment / scheme id for payment & link actions */
  schemeId?: string;
  plan: string;
  branch: string;
  dueDate: string;
  amount: number;
  overdueDays: number;
  status: "DUE" | "OVERDUE" | "GRACE" | "DEFAULTED";
  /** Present for flexible capped-cycle dues returned by the latest backend. */
  paymentPattern?: "FIXED" | "FLEXIBLE";
  flexiblePhase?: "FLEXIBLE" | "CAPPED";
  targetCycle?: string;
}

export interface GoldRate {
  id: string;
  effectiveAt: string;
  ratePerGram: number;
  enteredBy: string;
  branch: string;
}
export interface Staff {
  id: string;
  name: string;
  initials: string;
  role: string;
  branch: string;
  today: number;
  sessions: number;
  lastSeen: string;
  status: "ACTIVE" | "SUSPENDED";
}
export interface Branch {
  id: string;
  name: string;
  code: string;
  city: string;
  staff: number;
  customers: number;
  status: "ACTIVE" | "INACTIVE";
}
export interface Grievance {
  id: string;
  ticketNo: string;
  customer: string;
  subject: string;
  category: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  status: "OPEN" | "IN_PROGRESS" | "WAITING_CUSTOMER" | "RESOLVED";
  assignee: string;
  createdAt: string;
  sla: string;
  version?: number;
}

export type GrievanceMessageType =
  | "PUBLIC_REPLY"
  | "INTERNAL_NOTE"
  | "SYSTEM_EVENT"
  | "CUSTOMER_MESSAGE";

export interface GrievanceMessage {
  id: string;
  messageType: GrievanceMessageType;
  body: string;
  authorName: string;
  authorType: "USER" | "CUSTOMER" | "SYSTEM";
  createdAt: string;
}

export interface GrievanceDetail extends Grievance {
  description: string;
  customerMobile?: string;
  branchName?: string;
  relatedEntityLabel?: string;
  relatedEntityPath?: string;
  slaDueAt?: string;
  slaFirstRespondedAt?: string;
  slaOverdue?: boolean;
  messages: GrievanceMessage[];
  version: number;
}
export interface SchemePlan {
  id: string;
  code: string;
  name: string;
  valueBasis: "CASH" | "GOLD_WEIGHT";
  paymentPattern: "FIXED_DATE" | "FLEXIBLE_AVERAGE";
  amountMode: string;
  tenure: number;
  amount: number;
  fixedAmount?: number;
  slabs?: number[];
  minAmount?: number;
  maxAmount?: number;
  amountStep?: number;
  firstInstallmentModeDefault?: "COLLECT_NOW" | "START_NEXT_CYCLE";
  firstInstallmentModeEditable?: boolean;
  activeEnrollments: number;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  editLocked?: boolean;
}
export interface CashHandover {
  id: string;
  handoverNo: string;
  staff: string;
  branch: string;
  amount: number;
  declared: number;
  payments: number;
  submittedAt: string;
  status: "PENDING" | "ACCEPTED" | "DISCREPANCY" | "REJECTED";
  initiatedBy?: "STAFF" | "ADMIN";
  acceptedBy?: string;
  remarks?: string;
}

export interface CashHandoverPaymentLine {
  id: string;
  receiptNo: string;
  customer: string;
  amount: number;
  paidAt: string;
}

export interface CashHandoverTimelineEvent {
  at: string;
  event: string;
  by: string;
  note?: string;
}

export interface CashHandoverDetail extends CashHandover {
  systemAmount: number;
  declaredReceiptCount: number;
  coversFrom?: string;
  coversUntil?: string;
  paymentLines: CashHandoverPaymentLine[];
  denominations?: { denomination: number; count: number }[];
  timeline: CashHandoverTimelineEvent[];
}
export interface MessageLog {
  id: string;
  date: string;
  customer: string;
  type: string;
  channel: "WHATSAPP";
  status: "DELIVERED" | "READ" | "FAILED" | "QUEUED";
  cost: number;
  failure?: string;
}
export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action: string;
  entityType: string;
  entity: string;
  branch: string;
  ip: string;
}

/** Portal alert centre item (`GET /admin/alerts`, dashboard `summary.alerts`). */
export type AlertSeverity = "HIGH" | "MEDIUM" | "LOW" | "INFO";

export interface PortalAlert {
  id: string;
  severity: AlertSeverity;
  key: string;
  title: string;
  message: string;
  actionLabel?: string;
  actionPath: string;
  dismissible: boolean;
  count?: number;
  createdAt?: string;
}

export interface DashboardGoldRate {
  isSetForToday: boolean;
  ratePerGram: number;
  changeDisplay?: string;
  asOf?: string;
  warning?: string;
}

export type SettlementPreviewType =
  | "MATURITY_REDEMPTION"
  | "PREMATURE_CLOSURE";

export interface SettlementLine {
  key: string;
  label: string;
  amount: number;
  sign: "+" | "-";
  forfeited?: boolean;
  forfeitReason?: string;
  weightDisplay?: string;
  note?: string;
}

export interface SettlementPreview {
  type: SettlementPreviewType;
  eligible: boolean;
  blockers: { code: string; message: string; eligibleFrom?: string }[];
  scheme?: {
    schemeNumber?: string;
    planName?: string;
    maturityDate?: string;
    monthsCompleted?: number;
    lockInMonths?: number;
    lockInMet?: boolean;
  };
  customer?: {
    name?: string;
    mobile?: string;
    passbookNumber?: string;
  };
  lines: SettlementLine[];
  finalValue: number;
  finalWeightDisplay?: string;
  textBenefits: {
    text: string;
    displayLabel: string;
    note: string;
  }[];
  allowedModes: {
    mode: string;
    label: string;
    available: boolean;
    note?: string;
  }[];
  modePreviews?: Record<
    string,
    { note?: string; weightDisplay?: string; rateDisplay?: string }
  >;
  approvalRequired: boolean;
  approvalReason?: string;
  warningText?: string;
  valuationNote?: string;
  /** Cash-value gold handover: settlement minus valued handover weight (paise as rupees). */
  roundingDelta?: number;
  handoverValue?: number;
}

export interface RedemptionRecord {
  id: string;
  redemptionNumber: string;
  type: SettlementPreviewType;
  status: "PENDING_APPROVAL" | "COMPLETED" | "APPROVED";
  mode: string;
  finalValue: number;
  schemeStatus: SchemeStatus;
}
