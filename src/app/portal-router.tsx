"use client";

import dynamic from "next/dynamic";
import { PageSkeleton } from "@/src/components/common/query-state";
import { isKnownPortalSection } from "@/src/lib/portal-routes";
import { CustomerRouter } from "./customer-router";
import { CustomerLegacyPayRedirect } from "@/src/features/customer/customer-legacy-pay-redirect";

const options = { loading: () => <PageSkeleton /> };
const LoginPage = dynamic(
  () => import("@/src/features/auth/login-page").then((m) => m.LoginPage),
  options,
);
const DashboardPage = dynamic(
  () =>
    import("@/src/features/dashboard/dashboard-page").then(
      (m) => m.DashboardPage,
    ),
  options,
);
const CustomersPage = dynamic(
  () =>
    import("@/src/features/customers/customers-page").then(
      (m) => m.CustomersPage,
    ),
  options,
);
const CustomerDetailPage = dynamic(
  () =>
    import("@/src/features/customers/customer-detail-page").then(
      (m) => m.CustomerDetailPage,
    ),
  options,
);
const EnrollmentsPage = dynamic(
  () =>
    import("@/src/features/enrollments/enrollments-page").then(
      (m) => m.EnrollmentsPage,
    ),
  options,
);
const EnrollmentDetailPage = dynamic(
  () =>
    import("@/src/features/enrollments/enrollment-detail-page").then(
      (m) => m.EnrollmentDetailPage,
    ),
  options,
);
const DuesPage = dynamic(
  () => import("@/src/features/dues/dues-page").then((m) => m.DuesPage),
  options,
);
const CollectionsPage = dynamic(
  () =>
    import("@/src/features/collections/collections-page").then(
      (m) => m.CollectionsPage,
    ),
  options,
);
const CashControlPage = dynamic(
  () =>
    import("@/src/features/cash/cash-control-page").then(
      (m) => m.CashControlPage,
    ),
  options,
);
const MaturityPage = dynamic(
  () =>
    import("@/src/features/maturity/maturity-page").then((m) => m.MaturityPage),
  options,
);
const GoldRatesPage = dynamic(
  () =>
    import("@/src/features/gold/gold-rates-page").then((m) => m.GoldRatesPage),
  options,
);
const RemindersPage = dynamic(
  () =>
    import("@/src/features/reminders/reminders-page").then(
      (m) => m.RemindersPage,
    ),
  options,
);
const ReportsPage = dynamic(
  () =>
    import("@/src/features/reports/reports-page").then((m) => m.ReportsPage),
  options,
);
const SchemesPage = dynamic(
  () =>
    import("@/src/features/schemes/schemes-page").then((m) => m.SchemesPage),
  options,
);
const PlanBuilderWizard = dynamic(
  () =>
    import("@/src/features/schemes/plan-builder-wizard").then(
      (m) => m.PlanBuilderWizard,
    ),
  options,
);
const PlanDetailPage = dynamic(
  () =>
    import("@/src/features/schemes/plan-detail-page").then(
      (m) => m.PlanDetailPage,
    ),
  options,
);
const StaffBranchesPage = dynamic(
  () =>
    import("@/src/features/access/staff-branches-page").then(
      (m) => m.StaffBranchesPage,
    ),
  options,
);
const StaffDetailPage = dynamic(
  () =>
    import("@/src/features/access/staff-detail-page").then(
      (m) => m.StaffDetailPage,
    ),
  options,
);
const BranchDetailPage = dynamic(
  () =>
    import("@/src/features/access/branch-detail-page").then(
      (m) => m.BranchDetailPage,
    ),
  options,
);
const SupportPage = dynamic(
  () =>
    import("@/src/features/support/support-page").then((m) => m.SupportPage),
  options,
);
const AuditPage = dynamic(
  () => import("@/src/features/audit/audit-page").then((m) => m.AuditPage),
  options,
);
const SettingsPage = dynamic(
  () =>
    import("@/src/features/settings/settings-page").then((m) => m.SettingsPage),
  options,
);
const AlertsPage = dynamic(
  () => import("@/src/features/alerts/alerts-page").then((m) => m.AlertsPage),
  options,
);
const PortalNotFoundPage = dynamic(
  () =>
    import("@/src/features/errors/portal-not-found-page").then(
      (m) => m.PortalNotFoundPage,
    ),
  options,
);
const PlatformLoginPage = dynamic(
  () => import("@/src/features/platform/platform-login-page").then((m) => m.PlatformLoginPage),
  options,
);
const PlatformDashboardPage = dynamic(
  () => import("@/src/features/platform/platform-dashboard-page").then((m) => m.PlatformDashboardPage),
  options,
);
const PlatformTenantsPage = dynamic(
  () => import("@/src/features/platform/platform-tenants-page").then((m) => m.PlatformTenantsPage),
  options,
);
const PlatformTenantCreatePage = dynamic(
  () => import("@/src/features/platform/platform-tenant-create-page").then((m) => m.PlatformTenantCreatePage),
  options,
);
const PlatformTenantDetailPage = dynamic(
  () => import("@/src/features/platform/platform-tenant-detail-page").then((m) => m.PlatformTenantDetailPage),
  options,
);
const PlatformPlansPage = dynamic(
  () => import("@/src/features/platform/platform-plans-page").then((m) => m.PlatformPlansPage),
  options,
);
const PlatformTemplateRegistryPage = dynamic(
  () => import("@/src/features/platform/platform-template-registry-page").then((m) => m.PlatformTemplateRegistryPage),
  options,
);
const PlatformMonitoringPage = dynamic(
  () => import("@/src/features/platform/platform-monitoring-page").then((m) => m.PlatformMonitoringPage),
  options,
);
const PlatformAuditPage = dynamic(
  () => import("@/src/features/platform/platform-audit-page").then((m) => m.PlatformAuditPage),
  options,
);
const PlatformSettingsPage = dynamic(
  () => import("@/src/features/platform/platform-settings-page").then((m) => m.PlatformSettingsPage),
  options,
);

function PlatformRouter({ slug }: { slug: string[] }) {
  const [, section, id, detail] = slug;
  if (section === "login") return <PlatformLoginPage />;
  if (!section) return <PlatformDashboardPage />;
  if (section === "tenants") {
    if (id === "new") return <PlatformTenantCreatePage />;
    if (id) return <PlatformTenantDetailPage tenantId={id} initialTab={detail ?? "overview"} />;
    return <PlatformTenantsPage />;
  }
  if (section === "plans") return <PlatformPlansPage />;
  if (section === "templates") return <PlatformTemplateRegistryPage />;
  if (section === "monitoring") return <PlatformMonitoringPage />;
  if (section === "audit") return <PlatformAuditPage />;
  if (section === "settings") return <PlatformSettingsPage />;
  return <PortalNotFoundPage path={slug.join("/")} />;
}

export function PortalRouter({ slug }: { slug: string[] }) {
  if (slug[0] === "customer") return <CustomerRouter slug={slug} />;
  if (slug[0] === "platform") return <PlatformRouter slug={slug} />;
  if (slug[0] === "pay" && slug[1]) return <CustomerLegacyPayRedirect linkToken={slug[1]} />;
  const [section = "dashboard", id, action] = slug;
  if (section === "login") return <LoginPage />;
  if (!isKnownPortalSection(section)) {
    return <PortalNotFoundPage path={slug.join("/")} />;
  }
  let page: React.ReactNode;
  switch (section) {
    case "dashboard":
      page = <DashboardPage />;
      break;
    case "customers":
      page = id ? <CustomerDetailPage id={id} /> : <CustomersPage />;
      break;
    case "enrollments":
      page = id ? <EnrollmentDetailPage id={id} /> : <EnrollmentsPage />;
      break;
    case "dues":
      page = <DuesPage />;
      break;
    case "collections":
      page = <CollectionsPage />;
      break;
    case "cash-control":
      page = <CashControlPage />;
      break;
    case "maturity":
      page = <MaturityPage />;
      break;
    case "gold-rates":
      page = <GoldRatesPage />;
      break;
    case "reminders":
      page = <RemindersPage />;
      break;
    case "reports":
      page = <ReportsPage />;
      break;
    case "schemes":
      if (id === "new") page = <PlanBuilderWizard />;
      else if (id && action === "duplicate")
        page = <PlanBuilderWizard duplicateFromPlanId={id} />;
      else if (id && action === "edit") page = <PlanBuilderWizard planId={id} />;
      else if (id) page = <PlanDetailPage planId={id} />;
      else page = <SchemesPage />;
      break;
    case "staff-branches":
      if (id === "staff" && action)
        page = <StaffDetailPage staffId={action} />;
      else if (id === "branches" && action)
        page = <BranchDetailPage branchId={action} />;
      else page = <StaffBranchesPage />;
      break;
    case "support":
      page = <SupportPage />;
      break;
    case "audit":
      page = <AuditPage />;
      break;
    case "settings":
      if (id === "subscription")
        page = <SettingsPage initialTab="subscription" />;
      else if (id === "branding")
        page = <SettingsPage initialTab="branding" />;
      else if (id === "operations")
        page = <SettingsPage initialTab="operations" />;
      else if (id === "profile")
        page = <SettingsPage initialTab="profile" />;
      else page = <SettingsPage />;
      break;
    case "alerts":
      page = <AlertsPage />;
      break;
    default:
      page = <PortalNotFoundPage path={slug.join("/")} />;
  }
  return page;
}
