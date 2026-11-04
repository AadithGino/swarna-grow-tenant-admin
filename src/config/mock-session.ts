import type { PortalSession } from "@/src/types/session";

/** Full tenant-owner session for mock login (all permissions). */
export const MOCK_OWNER_SESSION: PortalSession = {
  accessToken: "mock-access-token",
  user: {
    id: "usr_owner",
    name: "Arun Raj",
    mobile: "9847012345",
    role: "TENANT_OWNER",
    permissions: ["*"],
    branch: { id: "brn_01", name: "Kochi Main", code: "KCH" },
  },
  tenant: {
    id: "tnt_01",
    tenantCode: "KAIRALI",
    displayName: "Kairali Jewellers",
    status: "ACTIVE",
  },
  capabilities: {
    multiBranch: true,
    flexibleScheme: true,
    goldWeightScheme: true,
    prematureRedemption: true,
    onlinePayments: true,
    selfEnrolEnabled: true,
  },
  setupComplete: false,
  setupTasks: [
    { key: "PROFILE", label: "Business profile & GSTIN", completed: true, href: "/settings" },
    { key: "BRANDING", label: "Logo and brand colours", completed: false, href: "/settings" },
    { key: "OPERATIONS", label: "Operational rules", completed: true, href: "/settings" },
    { key: "BRANCH", label: "Add at least one branch", completed: true, href: "/staff-branches" },
    { key: "STAFF", label: "Invite staff", completed: false, href: "/staff-branches" },
    { key: "GOLD_RATE", label: "Set today's scheme gold rate", completed: false, href: "/gold-rates" },
    { key: "STORE_GOLD_RATE", label: "Publish online store gold rate", completed: false, href: "/ecommerce/gold-rates" },
    { key: "DM_RATES", label: "Publish digital metals buy/sell rates", completed: false, href: "/digital-metals/rates" },
    { key: "FIRST_PLAN", label: "Create first scheme plan", completed: true, href: "/schemes" },
  ],
};

/** Starter tier — no flexible schemes (for capability demo). */
export const MOCK_STARTER_SESSION: PortalSession = {
  ...MOCK_OWNER_SESSION,
  capabilities: {
    ...MOCK_OWNER_SESSION.capabilities,
    flexibleScheme: false,
    multiBranch: false,
  },
};
