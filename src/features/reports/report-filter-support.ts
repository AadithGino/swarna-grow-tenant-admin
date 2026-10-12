import type { AdminReportKey, SchemeAdminReportKey } from "@/src/types/admin-report";
import { isEcommerceAdminReportKey } from "@/src/types/admin-report";

/** Reports that honour GET /admin/reports?branchId= */
export const REPORTS_WITH_BRANCH_FILTER = new Set<SchemeAdminReportKey>([
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
export const REPORTS_WITH_PLAN_FILTER = new Set<SchemeAdminReportKey>([
  "COLLECTION",
  "ENROLMENT",
  "OUTSTANDING",
  "GOLD_ACCRUAL",
  "SCHEME_REGISTER",
  "DEFAULTER",
  "STAFF_PERFORMANCE",
]);

export function reportSupportsBranchFilter(reportKey: AdminReportKey) {
  if (isEcommerceAdminReportKey(reportKey)) return false;
  return REPORTS_WITH_BRANCH_FILTER.has(reportKey as SchemeAdminReportKey);
}

export function reportSupportsPlanFilter(reportKey: AdminReportKey) {
  if (isEcommerceAdminReportKey(reportKey)) return false;
  return REPORTS_WITH_PLAN_FILTER.has(reportKey as SchemeAdminReportKey);
}

export function reportUsesBranchFocusSelector(reportKey: AdminReportKey) {
  return reportKey === "BRANCH_PERFORMANCE";
}

export function reportUsesSchemeFocusSelector(reportKey: AdminReportKey) {
  return reportKey === "SCHEME_PERFORMANCE";
}

export function reportUsesCustomerFocusSelector(reportKey: AdminReportKey) {
  return reportKey === "CUSTOMER_PERFORMANCE";
}
