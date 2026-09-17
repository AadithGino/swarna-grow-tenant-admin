export type ReportColumnType =
  | "text"
  | "currency"
  | "count"
  | "weight"
  | "percent"
  | "number"
  | "date"
  | "customer"
  | "staff"
  | "badge";

export type ReportColumnDef = {
  key: string;
  label: string;
  type: ReportColumnType;
  sortable?: boolean;
  sticky?: boolean;
  align?: "left" | "right";
  emphasis?: boolean;
};

export type ChartSeriesPoint = {
  x: string;
  y: number;
  yDisplay?: string;
  xDisplay?: string;
  modeKey?: string;
  statusKey?: string;
};

export type ChartSeriesBlock = {
  chartType: string;
  title: string;
  subtitle?: string;
  yAxis?: { type?: string; label?: string; min?: number; max?: number };
  series?: {
    key: string;
    name: string;
    data: ChartSeriesPoint[];
  }[];
};

export type ReportSummaryItem = {
  key: string;
  label: string;
  value: unknown;
  valueType: "currency" | "count" | "weight" | "percent" | "number";
  change?: { percent: number; direction: string; isGood?: boolean };
  severity?: string;
  note?: string;
};

export type AdminReportRow = Record<string, unknown> & {
  key: string;
  id?: string;
  drilldownPath?: string;
};

export type AdminReportView = {
  reportKey: string;
  title: string;
  scope?: { level?: string; label?: string };
  period?: { from?: string; to?: string; label?: string };
  generatedAt?: string;
  valuationRate?: Record<string, unknown>;
  summary: ReportSummaryItem[];
  charts: Record<string, ChartSeriesBlock>;
  columns: ReportColumnDef[];
  rows: AdminReportRow[];
  totalsRow?: Record<string, unknown>;
  exportFormats?: string[];
  page: import("@/src/lib/cursor-pagination").ListPageMeta;
};

export const ADMIN_REPORT_KEYS = [
  "COLLECTION",
  "ENROLMENT",
  "OUTSTANDING",
  "MATURITY_REDEMPTION",
  "GOLD_ACCRUAL",
  "CUSTOMER_PERFORMANCE",
  "STAFF_PERFORMANCE",
  "CASH_HANDOVER",
  "REMINDER_DELIVERY",
  "WHATSAPP_USAGE",
  "SCHEME_REGISTER",
  "DEFAULTER",
  "BRANCH_PERFORMANCE",
  "SCHEME_PERFORMANCE",
] as const;

export type AdminReportKey = (typeof ADMIN_REPORT_KEYS)[number];

export const ADMIN_REPORT_LABELS: Record<AdminReportKey, string> = {
  COLLECTION: "Collection",
  ENROLMENT: "Enrolment",
  OUTSTANDING: "Outstanding & ageing",
  MATURITY_REDEMPTION: "Maturity & redemption",
  GOLD_ACCRUAL: "Gold accrual & liability",
  CUSTOMER_PERFORMANCE: "Customer performance",
  STAFF_PERFORMANCE: "Staff performance",
  CASH_HANDOVER: "Cash handover",
  REMINDER_DELIVERY: "Reminder delivery",
  WHATSAPP_USAGE: "WhatsApp usage",
  SCHEME_REGISTER: "Scheme register",
  DEFAULTER: "Defaulter",
  BRANCH_PERFORMANCE: "Branch performance",
  SCHEME_PERFORMANCE: "Scheme performance",
};
