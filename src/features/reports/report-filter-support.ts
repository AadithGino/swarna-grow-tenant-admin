import type { AdminReportKey } from "@/src/types/admin-report";

/** Reports that honour GET /admin/reports?branchId= */
export const REPORTS_WITH_BRANCH_FILTER = new Set<AdminReportKey>([
  "COLLECTION",
  "ENROLMENT",
  "OUTSTANDING",
  "MATURITY_REDEMPTION",
  "GOLD_ACCRUAL",
  "STAFF_PERFORMANCE",
  "CASH_HANDOVER",
  "REMINDER_DELIVERY",
  "WHATSAPP_USAGE",
  "SCHEME_REGISTER",
  "DEFAULTER",
]);

/** Reports that honour GET /admin/reports?planId= */
export const REPORTS_WITH_PLAN_FILTER = new Set<AdminReportKey>([
  "COLLECTION",
  "ENROLMENT",
  "OUTSTANDING",
  "GOLD_ACCRUAL",
  "SCHEME_REGISTER",
  "DEFAULTER",
  "STAFF_PERFORMANCE",
]);

export function reportSupportsBranchFilter(reportKey: AdminReportKey) {
  return REPORTS_WITH_BRANCH_FILTER.has(reportKey);
}

export function reportSupportsPlanFilter(reportKey: AdminReportKey) {
  return REPORTS_WITH_PLAN_FILTER.has(reportKey);
}
