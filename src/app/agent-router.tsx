"use client";

import dynamic from "next/dynamic";
import { PageSkeleton } from "@/src/components/common/query-state";

const options = { loading: () => <PageSkeleton /> };
const Login = dynamic(() => import("@/src/features/agent/agent-login-page").then((module) => module.AgentLoginPage), options);
const Dashboard = dynamic(() => import("@/src/features/agent/agent-dashboard-page").then((module) => module.AgentDashboardPage), options);
const Search = dynamic(() => import("@/src/features/agent/agent-collect-pages").then((module) => module.AgentCustomerSearchPage), options);
const Customer = dynamic(() => import("@/src/features/agent/agent-collect-pages").then((module) => module.AgentCustomerDetailPage), options);
const Collect = dynamic(() => import("@/src/features/agent/agent-collect-pages").then((module) => module.AgentCollectPaymentPage), options);
const History = dynamic(() => import("@/src/features/agent/agent-history-pages").then((module) => module.AgentHistoryPage), options);
const Handover = dynamic(() => import("@/src/features/agent/agent-history-pages").then((module) => module.AgentHandoverPage), options);
const HandoverDetail = dynamic(() => import("@/src/features/agent/agent-history-pages").then((module) => module.AgentHandoverDetailPage), options);
const CollectionDetail = dynamic(() => import("@/src/features/agent/agent-history-pages").then((module) => module.AgentPaymentDetailPage), options);
const Report = dynamic(() => import("@/src/features/agent/agent-report-page").then((module) => module.AgentReportPage), options);
const Account = dynamic(() => import("@/src/features/agent/agent-account-page").then((module) => module.AgentAccountPage), options);
const NewCustomer = dynamic(() => import("@/src/features/agent/agent-onboarding-pages").then((module) => module.AgentNewCustomerPage), options);
const Enrol = dynamic(() => import("@/src/features/agent/agent-onboarding-pages").then((module) => module.AgentEnrolPage), options);
const Notifications = dynamic(() => import("@/src/features/agent/agent-notifications-page").then((module) => module.AgentNotificationsPage), options);

export function AgentRouter({ slug }: { slug: string[] }) {
  const [, section, id, detail] = slug;
  if (section === "login") return <Login />;
  if (!section) return <Dashboard />;
  if (section === "collect") return id ? <Collect schemeId={id} /> : <Search />;
  if (section === "customers" && id === "new") return <NewCustomer />;
  if (section === "customers" && id && detail === "enrol") return <Enrol customerId={id} />;
  if (section === "customers" && id) return <Customer id={id} />;
  if (section === "history" && id === "handovers" && detail) return <HandoverDetail id={detail} />;
  if (section === "history" && id === "collections" && detail) return <CollectionDetail id={detail} />;
  if (section === "history") return <History />;
  if (section === "handover") return <Handover />;
  if (section === "report") return <Report />;
  if (section === "account") return <Account />;
  if (section === "notifications") return <Notifications />;
  return <Dashboard />;
}
