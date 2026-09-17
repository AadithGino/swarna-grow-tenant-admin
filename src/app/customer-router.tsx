"use client";

import dynamic from "next/dynamic";
import { PageSkeleton } from "@/src/components/common/query-state";
import { parseCustomerSlug } from "@/src/lib/customer-tenant";
import { CustomerSelfEnrolGuard } from "@/src/components/customer/customer-self-enrol-guard";

const options = { loading: () => <PageSkeleton /> };
const CustomerLoginPage = dynamic(() => import("@/src/features/customer/customer-auth-page").then((m) => m.CustomerLoginPage), options);
const CustomerOnboardingPage = dynamic(() => import("@/src/features/customer/customer-onboarding-page").then((m) => m.CustomerOnboardingPage), options);
const CustomerHomePage = dynamic(() => import("@/src/features/customer/customer-home-page").then((m) => m.CustomerHomePage), options);
const CustomerSchemesPage = dynamic(() => import("@/src/features/customer/customer-schemes-page").then((m) => m.CustomerSchemesPage), options);
const CustomerSchemeDetailPage = dynamic(() => import("@/src/features/customer/customer-scheme-detail-page").then((m) => m.CustomerSchemeDetailPage), options);
const CustomerPaymentStatusPage = dynamic(() => import("@/src/features/customer/customer-scheme-detail-page").then((m) => m.CustomerPaymentStatusPage), options);
const CustomerPaymentLinkPage = dynamic(() => import("@/src/features/customer/customer-scheme-detail-page").then((m) => m.CustomerPaymentLinkPage), options);
const CustomerPlansPage = dynamic(() => import("@/src/features/customer/customer-plans-page").then((m) => m.CustomerPlansPage), options);
const CustomerPlanDetailPage = dynamic(() => import("@/src/features/customer/customer-plan-detail-page").then((m) => m.CustomerPlanDetailPage), options);
const CustomerPaymentsPage = dynamic(() => import("@/src/features/customer/customer-payments-page").then((m) => m.CustomerPaymentsPage), options);
const CustomerPaymentDetailPage = dynamic(() => import("@/src/features/customer/customer-payments-page").then((m) => m.CustomerPaymentDetailPage), options);
const CustomerNotificationsPage = dynamic(() => import("@/src/features/customer/customer-activity-pages").then((m) => m.CustomerNotificationsPage), options);
const CustomerGoldRatePage = dynamic(() => import("@/src/features/customer/customer-activity-pages").then((m) => m.CustomerGoldRatePage), options);
const CustomerBranchesPage = dynamic(() => import("@/src/features/customer/customer-activity-pages").then((m) => m.CustomerBranchesPage), options);
const CustomerProfilePage = dynamic(() => import("@/src/features/customer/customer-profile-pages").then((m) => m.CustomerProfilePage), options);
const CustomerSecurityPage = dynamic(() => import("@/src/features/customer/customer-profile-pages").then((m) => m.CustomerSecurityPage), options);
const CustomerSupportPage = dynamic(() => import("@/src/features/customer/customer-support-pages").then((m) => m.CustomerSupportPage), options);
const CustomerGrievanceDetailPage = dynamic(() => import("@/src/features/customer/customer-support-pages").then((m) => m.CustomerGrievanceDetailPage), options);

function CustomerRoutes({ slug }: { slug: string[] }) {
  const { section, id } = parseCustomerSlug(slug);
  if (section === "login") return <CustomerLoginPage />;
  if (section === "onboarding") return <CustomerOnboardingPage />;
  if (!section) return <CustomerHomePage />;
  if (section === "schemes") return id ? <CustomerSchemeDetailPage id={id} /> : <CustomerSchemesPage />;
  if (section === "plans") {
    return (
      <CustomerSelfEnrolGuard>
        {id ? <CustomerPlanDetailPage id={id} /> : <CustomerPlansPage />}
      </CustomerSelfEnrolGuard>
    );
  }
  if (section === "payments") return id ? <CustomerPaymentDetailPage id={id} /> : <CustomerPaymentsPage />;
  if (section === "notifications") return <CustomerNotificationsPage />;
  if (section === "profile") return <CustomerProfilePage />;
  if (section === "security") return <CustomerSecurityPage />;
  if (section === "support") return id ? <CustomerGrievanceDetailPage id={id} /> : <CustomerSupportPage />;
  if (section === "gold-rate") return <CustomerGoldRatePage />;
  if (section === "branches") return <CustomerBranchesPage />;
  if (section === "pay" && id === "status") return <CustomerPaymentStatusPage />;
  if (section === "pay" && id) return <CustomerPaymentLinkPage linkToken={id} />;
  return <CustomerHomePage />;
}

export function CustomerRouter({ slug }: { slug: string[] }) {
  return <CustomerRoutes slug={slug} />;
}
