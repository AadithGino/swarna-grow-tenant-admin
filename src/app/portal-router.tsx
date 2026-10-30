"use client";

import dynamic from "next/dynamic";
import { PageSkeleton } from "@/src/components/common/query-state";
import { isKnownPortalSection } from "@/src/lib/portal-routes";
import { CustomerRouter } from "./customer-router";
import { AgentRouter } from "./agent-router";
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
  { loading: () => <PageSkeleton cards={5} />, ssr: false },
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
const DigitalMetalsWorkspacePage = dynamic(
  () =>
    import("@/src/features/digital-metals/digital-metals-workspace-page").then(
      (m) => m.DigitalMetalsWorkspacePage,
    ),
  options,
);
const DigitalMetalsConfigPage = dynamic(
  () =>
    import("@/src/features/digital-metals/digital-metals-config-page").then(
      (m) => m.DigitalMetalsConfigPage,
    ),
  options,
);
const DigitalMetalsPurchasesPage = dynamic(
  () =>
    import("@/src/features/digital-metals/digital-metals-purchases-page").then(
      (m) => m.DigitalMetalsPurchasesPage,
    ),
  options,
);
const DigitalMetalsPurchaseDetailPage = dynamic(
  () =>
    import("@/src/features/digital-metals/digital-metals-purchases-page").then(
      (m) => m.DigitalMetalsPurchaseDetailPage,
    ),
  options,
);
const DigitalMetalsPaymentExceptionsPage = dynamic(
  () =>
    import("@/src/features/digital-metals/digital-metals-payment-exceptions-page").then(
      (m) => m.DigitalMetalsPaymentExceptionsPage,
    ),
  options,
);
const DigitalMetalsSellsPage = dynamic(
  () =>
    import("@/src/features/digital-metals/digital-metals-sells-page").then(
      (m) => m.DigitalMetalsSellsPage,
    ),
  options,
);
const DigitalMetalsSellDetailPage = dynamic(
  () =>
    import("@/src/features/digital-metals/digital-metals-sells-page").then(
      (m) => m.DigitalMetalsSellDetailPage,
    ),
  options,
);
const DigitalMetalsPayoutsPage = dynamic(
  () =>
    import("@/src/features/digital-metals/digital-metals-payouts-page").then(
      (m) => m.DigitalMetalsPayoutsPage,
    ),
  options,
);
const DigitalMetalsPayoutDetailPage = dynamic(
  () =>
    import("@/src/features/digital-metals/digital-metals-payout-detail-page").then(
      (m) => m.DigitalMetalsPayoutDetailPage,
    ),
  options,
);
const DigitalMetalsRedemptionCatalogPage = dynamic(
  () =>
    import("@/src/features/digital-metals/digital-metals-redemption-pages").then(
      (m) => m.DigitalMetalsRedemptionCatalogPage,
    ),
  options,
);
const DigitalMetalsRedemptionOrdersPage = dynamic(
  () =>
    import("@/src/features/digital-metals/digital-metals-redemption-pages").then(
      (m) => m.DigitalMetalsRedemptionOrdersPage,
    ),
  options,
);
const DigitalMetalsRedemptionOrderDetailPage = dynamic(
  () =>
    import("@/src/features/digital-metals/digital-metals-redemption-pages").then(
      (m) => m.DigitalMetalsRedemptionOrderDetailPage,
    ),
  options,
);
const DigitalMetalsRedemptionFulfilmentQueuePage = dynamic(
  () =>
    import("@/src/features/digital-metals/digital-metals-redemption-pages").then(
      (m) => m.DigitalMetalsRedemptionFulfilmentQueuePage,
    ),
  options,
);
const DigitalMetalsProcurementPage = dynamic(
  () =>
    import("@/src/features/digital-metals/digital-metals-procurement-page").then(
      (m) => m.DigitalMetalsProcurementPage,
    ),
  options,
);
const DigitalMetalsHedgePage = dynamic(
  () =>
    import("@/src/features/digital-metals/digital-metals-hedge-page").then(
      (m) => m.DigitalMetalsHedgePage,
    ),
  options,
);
const DigitalMetalsBankVerificationPage = dynamic(
  () =>
    import("@/src/features/digital-metals/digital-metals-bank-verification-page").then(
      (m) => m.DigitalMetalsBankVerificationPage,
    ),
  options,
);
const EcommerceStoreOverviewPage = dynamic(
  () =>
    import("@/src/features/ecommerce/ecommerce-store-overview-page").then(
      (m) => m.EcommerceStoreOverviewPage,
    ),
  options,
);
const EcommerceCatalogPage = dynamic(
  () =>
    import("@/src/features/ecommerce/ecommerce-catalog-page").then(
      (m) => m.EcommerceCatalogPage,
    ),
  options,
);
const EcommerceCategoriesPage = dynamic(
  () =>
    import("@/src/features/ecommerce/ecommerce-categories-page").then(
      (m) => m.EcommerceCategoriesPage,
    ),
  options,
);
const EcommerceCampaignsPage = dynamic(
  () =>
    import("@/src/features/ecommerce/ecommerce-campaigns-page").then(
      (m) => m.EcommerceCampaignsPage,
    ),
  options,
);
const EcommerceBannersPage = dynamic(
  () =>
    import("@/src/features/ecommerce/ecommerce-banners-page").then(
      (m) => m.EcommerceBannersPage,
    ),
  options,
);
const EcommerceGoldRatesPage = dynamic(
  () =>
    import("@/src/features/ecommerce/ecommerce-gold-rates-page").then(
      (m) => m.EcommerceGoldRatesPage,
    ),
  options,
);
const EcommerceTaxSettingsPage = dynamic(
  () =>
    import("@/src/features/ecommerce/ecommerce-tax-settings-page").then(
      (m) => m.EcommerceTaxSettingsPage,
    ),
  options,
);
const EcommerceInventoryPage = dynamic(
  () =>
    import("@/src/features/ecommerce/ecommerce-inventory-page").then(
      (m) => m.EcommerceInventoryPage,
    ),
  options,
);
const EcommerceFulfilmentPage = dynamic(
  () =>
    import("@/src/features/ecommerce/ecommerce-fulfilment-page").then(
      (m) => m.EcommerceFulfilmentPage,
    ),
  options,
);
const EcommerceOrdersPage = dynamic(
  () =>
    import("@/src/features/ecommerce/ecommerce-orders-page").then(
      (m) => m.EcommerceOrdersPage,
    ),
  options,
);
const EcommerceOrderDetailPage = dynamic(
  () =>
    import("@/src/features/ecommerce/ecommerce-orders-page").then(
      (m) => m.EcommerceOrderDetailPage,
    ),
  options,
);
const EcommerceCourierCodWorkspacePage = dynamic(
  () =>
    import("@/src/features/ecommerce/ecommerce-courier-cod-workspace-page").then(
      (m) => m.EcommerceCourierCodWorkspacePage,
    ),
  options,
);
const EcommercePaymentExceptionsPage = dynamic(
  () =>
    import("@/src/features/ecommerce/ecommerce-payment-exceptions-page").then(
      (m) => m.EcommercePaymentExceptionsPage,
    ),
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
  () =>
    import("@/src/features/platform/platform-login-page").then(
      (m) => m.PlatformLoginPage,
    ),
  options,
);
const PlatformDashboardPage = dynamic(
  () =>
    import("@/src/features/platform/platform-dashboard-page").then(
      (m) => m.PlatformDashboardPage,
    ),
  options,
);
const PlatformTenantsPage = dynamic(
  () =>
    import("@/src/features/platform/platform-tenants-page").then(
      (m) => m.PlatformTenantsPage,
    ),
  options,
);
const PlatformTenantCreatePage = dynamic(
  () =>
    import("@/src/features/platform/platform-tenant-create-page").then(
      (m) => m.PlatformTenantCreatePage,
    ),
  options,
);
const PlatformTenantDetailPage = dynamic(
  () =>
    import("@/src/features/platform/platform-tenant-detail-page").then(
      (m) => m.PlatformTenantDetailPage,
    ),
  options,
);
const PlatformPlansPage = dynamic(
  () =>
    import("@/src/features/platform/platform-plans-page").then(
      (m) => m.PlatformPlansPage,
    ),
  options,
);
const PlatformTemplateRegistryPage = dynamic(
  () =>
    import("@/src/features/platform/platform-template-registry-page").then(
      (m) => m.PlatformTemplateRegistryPage,
    ),
  options,
);
const PlatformMonitoringPage = dynamic(
  () =>
    import("@/src/features/platform/platform-monitoring-page").then(
      (m) => m.PlatformMonitoringPage,
    ),
  options,
);
const PlatformAuditPage = dynamic(
  () =>
    import("@/src/features/platform/platform-audit-page").then(
      (m) => m.PlatformAuditPage,
    ),
  options,
);
const PlatformSettingsPage = dynamic(
  () =>
    import("@/src/features/platform/platform-settings-page").then(
      (m) => m.PlatformSettingsPage,
    ),
  options,
);

function PlatformRouter({ slug }: { slug: string[] }) {
  const [, section, id, detail] = slug;
  if (section === "login") return <PlatformLoginPage />;
  if (!section) return <PlatformDashboardPage />;
  if (section === "tenants") {
    if (id === "new") return <PlatformTenantCreatePage />;
    if (id)
      return (
        <PlatformTenantDetailPage
          tenantId={id}
          initialTab={detail ?? "overview"}
        />
      );
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
  if (slug[0] === "agent") return <AgentRouter slug={slug} />;
  if (slug[0] === "platform") return <PlatformRouter slug={slug} />;
  if (slug[0] === "pay" && slug[1])
    return <CustomerLegacyPayRedirect linkToken={slug[1]} />;
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
      else if (id && action === "edit")
        page = <PlanBuilderWizard planId={id} />;
      else if (id) page = <PlanDetailPage planId={id} />;
      else page = <SchemesPage />;
      break;
    case "staff-branches":
      if (id === "staff" && action) page = <StaffDetailPage staffId={action} />;
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
    case "digital-metals": {
      let dmInner: React.ReactNode;
      if (id === "settings")
        dmInner = <DigitalMetalsConfigPage section="settings" />;
      else if (id === "rates")
        dmInner = <DigitalMetalsConfigPage section="rates" />;
      else if (id === "quote")
        dmInner = <DigitalMetalsConfigPage section="quote" />;
      else if (id === "purchases" && action)
        dmInner = <DigitalMetalsPurchaseDetailPage orderId={action} />;
      else if (id === "purchases") dmInner = <DigitalMetalsPurchasesPage />;
      else if (id === "payment-exceptions")
        dmInner = <DigitalMetalsPaymentExceptionsPage />;
      else if (id === "sells" && action)
        dmInner = <DigitalMetalsSellDetailPage orderId={action} />;
      else if (id === "sells") dmInner = <DigitalMetalsSellsPage />;
      else if (id === "payouts" && action)
        dmInner = <DigitalMetalsPayoutDetailPage payoutId={action} />;
      else if (id === "payouts") dmInner = <DigitalMetalsPayoutsPage />;
      else if (id === "redemption" && action === "orders" && slug[3])
        dmInner = <DigitalMetalsRedemptionOrderDetailPage orderId={slug[3]} />;
      else if (id === "redemption" && action === "orders")
        dmInner = <DigitalMetalsRedemptionOrdersPage />;
      else if (id === "redemption" && action === "fulfilment")
        dmInner = <DigitalMetalsRedemptionFulfilmentQueuePage />;
      else if (id === "redemption" && action === "catalogue")
        dmInner = <DigitalMetalsRedemptionCatalogPage />;
      else if (id === "hedge") dmInner = <DigitalMetalsHedgePage />;
      else if (id === "procurement") dmInner = <DigitalMetalsProcurementPage />;
      else if (id === "bank-verification")
        dmInner = <DigitalMetalsBankVerificationPage />;
      else dmInner = <DigitalMetalsWorkspacePage />;
      page = dmInner;
      break;
    }
    case "ecommerce":
      if (id === "categories") page = <EcommerceCategoriesPage />;
      else if (id === "campaigns") page = <EcommerceCampaignsPage />;
      else if (id === "banners") page = <EcommerceBannersPage />;
      else if (id === "gold-rates") page = <EcommerceGoldRatesPage />;
      else if (id === "tax") page = <EcommerceTaxSettingsPage />;
      else if (id === "inventory") page = <EcommerceInventoryPage />;
      else if (id === "fulfilment") page = <EcommerceFulfilmentPage />;
      else if (id === "orders" && action)
        page = <EcommerceOrderDetailPage orderId={action} />;
      else if (id === "orders") page = <EcommerceOrdersPage />;
      else if (id === "courier-cod")
        page = <EcommerceCourierCodWorkspacePage />;
      else if (id === "payment-exceptions")
        page = <EcommercePaymentExceptionsPage />;
      else if (id === "catalog" || id === "products") page = <EcommerceCatalogPage />;
      else page = <EcommerceStoreOverviewPage />;
      break;
    case "settings":
      if (id === "subscription")
        page = <SettingsPage initialTab="subscription" />;
      else if (id === "branding") page = <SettingsPage initialTab="branding" />;
      else if (id === "operations")
        page = <SettingsPage initialTab="operations" />;
      else if (id === "profile") page = <SettingsPage initialTab="profile" />;
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
