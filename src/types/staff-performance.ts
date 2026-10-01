export type StaffPerformanceMoneyBlock = {
  amountPaise?: number;
  amountDisplay?: string;
};

export type StaffPerformanceSummaryView = {
  range?: { from?: string; to?: string };
  trendGroupBy?: string;
  collectionTotal?: StaffPerformanceMoneyBlock;
  averageTicket?: StaffPerformanceMoneyBlock;
  enrolments?: number;
  customersServed?: number;
  paymentsCount?: number;
  collectionTrend?: Array<{
    date?: string;
    label?: string;
    count?: number;
    amount?: StaffPerformanceMoneyBlock;
  }>;
  cash?: {
    cashInHand?: StaffPerformanceMoneyBlock;
    cashPendingAcceptance?: StaffPerformanceMoneyBlock;
    cashCollected?: StaffPerformanceMoneyBlock;
    handedOver?: StaffPerformanceMoneyBlock;
  };
};

export type StaffPerformanceCollectionRow = {
  paidAt?: string;
  receiptNumber?: string;
  mode?: string;
  source?: string;
  amount?: StaffPerformanceMoneyBlock;
  customer?: { id?: string; name?: string };
  scheme?: { id?: string; enrollmentNumber?: string };
};

export type StaffPerformanceEnrolmentRow = {
  id?: string;
  createdAt?: string;
  enrollmentNumber?: string;
  status?: string;
  customer?: { id?: string; name?: string };
  plan?: { name?: string; code?: string };
};

export type StaffPerformanceHandoverRow = {
  submittedAt?: string;
  settledAt?: string;
  status?: string;
  amount?: StaffPerformanceMoneyBlock;
  acceptedAmount?: StaffPerformanceMoneyBlock;
};

export type StaffPerformanceCollectionsSection = {
  kind: "collections";
  items: StaffPerformanceCollectionRow[];
  page: import("@/src/lib/cursor-pagination").ListPageMeta;
  range?: { from?: string; to?: string };
};

export type StaffPerformanceEnrolmentsSection = {
  kind: "enrolments";
  items: StaffPerformanceEnrolmentRow[];
  page: import("@/src/lib/cursor-pagination").ListPageMeta;
  range?: { from?: string; to?: string };
};

export type StaffPerformanceHandoversSection = {
  kind: "handovers";
  items: StaffPerformanceHandoverRow[];
  page: import("@/src/lib/cursor-pagination").ListPageMeta;
  range?: { from?: string; to?: string };
};

export type StaffPerformanceSectionResult =
  | StaffPerformanceCollectionsSection
  | StaffPerformanceEnrolmentsSection
  | StaffPerformanceHandoversSection;
