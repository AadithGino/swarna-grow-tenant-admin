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
const CustomerPaymentStatusPage = dynamic(() => import("@/src/features/customer/customer-payment-status-page").then((m) => m.CustomerPaymentStatusPage), options);
const CustomerPaymentLinkPage = dynamic(() => import("@/src/features/customer/customer-scheme-detail-page").then((m) => m.CustomerPaymentLinkPage), options);
const CustomerPlansPage = dynamic(() => import("@/src/features/customer/customer-plans-page").then((m) => m.CustomerPlansPage), options);
const CustomerPlanDetailPage = dynamic(() => import("@/src/features/customer/customer-plan-detail-page").then((m) => m.CustomerPlanDetailPage), options);
const CustomerPaymentsPage = dynamic(() => import("@/src/features/customer/customer-payments-page").then((m) => m.CustomerPaymentsPage), options);
const CustomerPaymentDetailPage = dynamic(() => import("@/src/features/customer/customer-payments-page").then((m) => m.CustomerPaymentDetailPage), options);
const CustomerNotificationsPage = dynamic(() => import("@/src/features/customer/customer-activity-pages").then((m) => m.CustomerNotificationsPage), options);
const CustomerGoldRatePage = dynamic(() => import("@/src/features/customer/customer-activity-pages").then((m) => m.CustomerGoldRatePage), options);
const CustomerBranchesPage = dynamic(() => import("@/src/features/customer/customer-activity-pages").then((m) => m.CustomerBranchesPage), options);
const CustomerProfilePage = dynamic(() => import("@/src/features/customer/customer-profile-pages").then((m) => m.CustomerProfilePage), options);
const CustomerProfileKycPage = dynamic(() => import("@/src/features/customer/customer-profile-kyc-page").then((m) => m.CustomerProfileKycPage), options);
const CustomerProfileNomineePage = dynamic(() => import("@/src/features/customer/customer-profile-nominee-page").then((m) => m.CustomerProfileNomineePage), options);
const CustomerSecurityPage = dynamic(() => import("@/src/features/customer/customer-profile-pages").then((m) => m.CustomerSecurityPage), options);
const CustomerSupportPage = dynamic(() => import("@/src/features/customer/customer-support-pages").then((m) => m.CustomerSupportPage), options);
const CustomerGrievanceDetailPage = dynamic(() => import("@/src/features/customer/customer-support-pages").then((m) => m.CustomerGrievanceDetailPage), options);
const CustomerShopPage = dynamic(() => import("@/src/features/customer/customer-shop-page").then((m) => m.CustomerShopPage), options);
const CustomerShopProductPage = dynamic(() => import("@/src/features/customer/customer-shop-page").then((m) => m.CustomerShopProductPage), options);
const CustomerShopCartPage = dynamic(() => import("@/src/features/customer/customer-shop-cart-page").then((m) => m.CustomerShopCartPage), options);
const CustomerShopQuotePage = dynamic(() => import("@/src/features/customer/customer-shop-quote-page").then((m) => m.CustomerShopQuotePage), options);
const CustomerShopOrderPage = dynamic(() => import("@/src/features/customer/customer-shop-order-page").then((m) => m.CustomerShopOrderPage), options);
const CustomerShopOrdersPage = dynamic(() => import("@/src/features/customer/customer-shop-orders-page").then((m) => m.CustomerShopOrdersPage), options);
const CustomerDigitalMetalsPage = dynamic(() => import("@/src/features/customer/customer-digital-metals-page").then((m) => m.CustomerDigitalMetalsPage), options);
const CustomerDigitalMetalsBuyPage = dynamic(() => import("@/src/features/customer/customer-digital-metals-buy-pages").then((m) => m.CustomerDigitalMetalsBuyPage), options);
const CustomerDigitalMetalsBuyReviewPage = dynamic(() => import("@/src/features/customer/customer-digital-metals-buy-pages").then((m) => m.CustomerDigitalMetalsBuyReviewPage), options);
const CustomerDigitalMetalsBuyOrderPage = dynamic(() => import("@/src/features/customer/customer-digital-metals-buy-pages").then((m) => m.CustomerDigitalMetalsBuyOrderPage), options);
const CustomerDigitalMetalsSellPage = dynamic(() => import("@/src/features/customer/customer-digital-metals-sell-pages").then((m) => m.CustomerDigitalMetalsSellPage), options);
const CustomerDigitalMetalsSellReviewPage = dynamic(() => import("@/src/features/customer/customer-digital-metals-sell-pages").then((m) => m.CustomerDigitalMetalsSellReviewPage), options);
const CustomerDigitalMetalsSellOrderPage = dynamic(() => import("@/src/features/customer/customer-digital-metals-sell-pages").then((m) => m.CustomerDigitalMetalsSellOrderPage), options);
const CustomerDigitalMetalsBankPage = dynamic(() => import("@/src/features/customer/customer-digital-metals-bank-pages").then((m) => m.CustomerDigitalMetalsBankPage), options);
const CustomerDigitalMetalsBankEditPage = dynamic(() => import("@/src/features/customer/customer-digital-metals-bank-pages").then((m) => m.CustomerDigitalMetalsBankEditPage), options);
const CustomerDigitalMetalsRedeemCatalogPage = dynamic(() => import("@/src/features/customer/customer-digital-metals-redeem-pages").then((m) => m.CustomerDigitalMetalsRedeemCatalogPage), options);
const CustomerDigitalMetalsRedeemSetupPage = dynamic(() => import("@/src/features/customer/customer-digital-metals-redeem-pages").then((m) => m.CustomerDigitalMetalsRedeemSetupPage), options);
const CustomerDigitalMetalsRedeemReviewPage = dynamic(() => import("@/src/features/customer/customer-digital-metals-redeem-pages").then((m) => m.CustomerDigitalMetalsRedeemReviewPage), options);
const CustomerDigitalMetalsRedeemOrderPage = dynamic(() => import("@/src/features/customer/customer-digital-metals-redeem-pages").then((m) => m.CustomerDigitalMetalsRedeemOrderPage), options);
const CustomerDigitalMetalsDocumentPage = dynamic(
  () => import("@/src/features/customer/customer-digital-metals-document-page").then((m) => m.CustomerDigitalMetalsDocumentPage),
  options,
);
const CustomerDigitalMetalsOrdersPage = dynamic(
  () =>
    import("@/src/features/customer/customer-digital-metals-orders-page").then(
      (m) => m.CustomerDigitalMetalsOrdersPage,
    ),
  options,
);

function CustomerRoutes({ slug }: { slug: string[] }) {
  const { section, id, extra } = parseCustomerSlug(slug);
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
  if (section === "profile") {
    if (id === "kyc") return <CustomerProfileKycPage />;
    if (id === "nominee") return <CustomerProfileNomineePage />;
    return <CustomerProfilePage />;
  }
  if (section === "security") return <CustomerSecurityPage />;
  if (section === "support") return id ? <CustomerGrievanceDetailPage id={id} /> : <CustomerSupportPage />;
  if (section === "gold-rate") return <CustomerGoldRatePage />;
  if (section === "branches") return <CustomerBranchesPage />;
  if (section === "digital-metals") {
    if (id === "buy") return <CustomerDigitalMetalsBuyPage />;
    if (id === "review" && extra) return <CustomerDigitalMetalsBuyReviewPage quoteId={extra} />;
    if (id === "order" && extra) return <CustomerDigitalMetalsBuyOrderPage orderId={extra} />;
    if (id === "sell") return <CustomerDigitalMetalsSellPage />;
    if (id === "sell-review" && extra) return <CustomerDigitalMetalsSellReviewPage quoteId={extra} />;
    if (id === "sell-order" && extra) return <CustomerDigitalMetalsSellOrderPage orderId={extra} />;
    if (id === "bank") return <CustomerDigitalMetalsBankPage />;
    if (id === "bank-edit" && extra) return <CustomerDigitalMetalsBankEditPage destinationId={extra} />;
    if (id === "redeem") return <CustomerDigitalMetalsRedeemCatalogPage />;
    if (id === "redeem-setup" && extra) return <CustomerDigitalMetalsRedeemSetupPage catalogueItemId={extra} />;
    if (id === "redeem-review" && extra) return <CustomerDigitalMetalsRedeemReviewPage quoteId={extra} />;
    if (id === "redeem-order" && extra) return <CustomerDigitalMetalsRedeemOrderPage orderId={extra} />;
    if (id === "document" && extra) return <CustomerDigitalMetalsDocumentPage artifactId={extra} />;
    if (id === "orders") return <CustomerDigitalMetalsOrdersPage />;
    return <CustomerDigitalMetalsPage />;
  }
  if (section === "shop") {
    if (id === "cart") return <CustomerShopCartPage />;
    if (id === "orders") return <CustomerShopOrdersPage />;
    if (id === "quote" && extra) return <CustomerShopQuotePage quoteId={extra} />;
    if (id === "order" && extra) return <CustomerShopOrderPage orderId={extra} />;
    if (id) return <CustomerShopProductPage slug={id} />;
    return <CustomerShopPage />;
  }
  if (section === "pay" && id === "status") return <CustomerPaymentStatusPage />;
  if (section === "pay" && id) return <CustomerPaymentLinkPage linkToken={id} />;
  return <CustomerHomePage />;
}

export function CustomerRouter({ slug }: { slug: string[] }) {
  return <CustomerRoutes slug={slug} />;
}
