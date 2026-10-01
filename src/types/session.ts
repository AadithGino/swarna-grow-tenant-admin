export type PortalCapabilities = {
  multiBranch?: boolean;
  flexibleScheme?: boolean;
  goldWeightScheme?: boolean;
  prematureRedemption?: boolean;
  onlinePayments?: boolean;
  selfEnrolEnabled?: boolean;
};

export type PortalUser = {
  id: string;
  name: string;
  mobile: string;
  role: string;
  permissions: string[];
  branch?: { id: string; name: string; code: string };
};

export type PortalTenant = {
  id: string;
  tenantCode: string;
  displayName: string;
  /** Legacy alias used in some receipt/success UI copy. */
  name?: string;
  status: string;
};

export type SetupTaskKey =
  | "PROFILE"
  | "BRANDING"
  | "OPERATIONS"
  | "BRANCH"
  | "STAFF"
  | "GOLD_RATE"
  | "FIRST_PLAN";

export type SetupTask = {
  key: SetupTaskKey;
  label: string;
  completed: boolean;
  href: string;
};

export type PortalSession = {
  accessToken: string;
  user: PortalUser;
  tenant: PortalTenant;
  capabilities: PortalCapabilities;
  setupTasks?: SetupTask[];
  setupComplete?: boolean;
};

export const SESSION_STORAGE_KEY = "swarnagrow.session";
