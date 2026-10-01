/** Labels and grouping for backend permission keys (see swarnagrow-backend permissions.js). */

export const ALL_PERMISSION_KEYS = [
  "customer.read",
  "customer.write",
  "customer.kyc",
  "customer.block",
  "plan.read",
  "plan.write",
  "scheme.read",
  "scheme.write",
  "payment.read",
  "payment.record",
  "payment.reverse",
  "cash.read",
  "cash.handover",
  "cash.handover.accept",
  "redemption.read",
  "redemption.write",
  "redemption.approve",
  "message.read",
  "message.send",
  "report.read",
  "report.export",
  "staff.read",
  "staff.write",
  "branch.read",
  "branch.write",
  "gold-rate.read",
  "gold-rate.write",
  "settings.read",
  "settings.write",
  "grievance.read",
  "grievance.reply",
  "grievance.assign",
  "grievance.resolve",
  "audit.read",
] as const;

const PERMISSION_LABELS: Record<string, string> = {
  "customer.read": "View customer profiles",
  "customer.write": "Create and update customers",
  "customer.kyc": "Verify and update KYC",
  "customer.block": "Block or restrict customers",
  "plan.read": "View scheme plans",
  "plan.write": "Create and edit plans",
  "scheme.read": "View enrolments",
  "scheme.write": "Enrol customers and manage schemes",
  "payment.read": "View payment history",
  "payment.record": "Record instalment payments",
  "payment.reverse": "Reverse posted payments",
  "cash.read": "View cash balances and ledger",
  "cash.handover": "Submit cash handovers",
  "cash.handover.accept": "Accept incoming handovers",
  "redemption.read": "View redemption requests",
  "redemption.write": "Create redemption entries",
  "redemption.approve": "Approve redemptions",
  "message.read": "View WhatsApp and message logs",
  "message.send": "Send customer messages",
  "report.read": "View operational reports",
  "report.export": "Export report data",
  "staff.read": "View staff directory",
  "staff.write": "Invite and manage staff",
  "branch.read": "View branches",
  "branch.write": "Create and edit branches",
  "gold-rate.read": "View gold rate history",
  "gold-rate.write": "Update daily gold rates",
  "settings.read": "View tenant settings",
  "settings.write": "Change branding and configuration",
  "grievance.read": "View support tickets",
  "grievance.reply": "Reply to customers on tickets",
  "grievance.assign": "Assign tickets to staff",
  "grievance.resolve": "Close and resolve tickets",
  "audit.read": "View audit trail",
};

export const PERMISSION_GROUP_ORDER = [
  "customer",
  "plan",
  "scheme",
  "payment",
  "cash",
  "redemption",
  "message",
  "report",
  "staff",
  "branch",
  "gold-rate",
  "settings",
  "grievance",
  "audit",
  "other",
] as const;

export const PERMISSION_GROUP_LABELS: Record<string, string> = {
  customer: "Customers",
  plan: "Plans",
  scheme: "Enrolments",
  payment: "Payments",
  cash: "Cash control",
  redemption: "Redemptions",
  message: "Messaging",
  report: "Reports",
  staff: "Staff",
  branch: "Branches",
  "gold-rate": "Gold rates",
  settings: "Settings",
  grievance: "Support & grievances",
  audit: "Audit",
  other: "Other",
};

export function permissionDomain(key: string): string {
  const dot = key.indexOf(".");
  if (dot === -1) return "other";
  return key.slice(0, dot) || "other";
}

export function permissionLabel(key: string): string {
  if (key === "*") return "Full access";
  return (
    PERMISSION_LABELS[key] ??
    key
      .split(".")
      .map((part) =>
        part
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
      )
      .join(" · ")
  );
}

export function isFullAccess(permissions: string[]): boolean {
  return permissions.includes("*");
}

const KNOWN_PERMISSION_KEYS = new Set<string>(ALL_PERMISSION_KEYS);

export function normalizeStaffPermissions(permissions: string[]): string[] {
  if (isFullAccess(permissions)) return [...ALL_PERMISSION_KEYS];
  const set = new Set(permissions.filter(Boolean));
  const known = ALL_PERMISSION_KEYS.filter((k) => set.has(k));
  const extra = [...set].filter(
    (k) => k !== "*" && !KNOWN_PERMISSION_KEYS.has(k),
  );
  return [...known, ...extra];
}

export type PermissionGroup = {
  id: string;
  label: string;
  permissions: string[];
};

export function groupStaffPermissions(permissions: string[]): PermissionGroup[] {
  const keys = normalizeStaffPermissions(permissions);
  const byDomain = keys.reduce<Record<string, string[]>>((acc, key) => {
    const id = permissionDomain(key);
    acc[id] = acc[id] ?? [];
    acc[id].push(key);
    return acc;
  }, {});

  return PERMISSION_GROUP_ORDER.filter((id) => (byDomain[id]?.length ?? 0) > 0).map(
    (id) => ({
      id,
      label: PERMISSION_GROUP_LABELS[id] ?? id,
      permissions: byDomain[id]!.sort(),
    }),
  );
}

export function permissionSummaryStats(permissions: string[]): {
  capabilityCount: number;
  areaCount: number;
  fullAccess: boolean;
} {
  const fullAccess = isFullAccess(permissions);
  const groups = groupStaffPermissions(permissions);
  const capabilityCount = fullAccess
    ? ALL_PERMISSION_KEYS.length
    : normalizeStaffPermissions(permissions).length;
  return {
    capabilityCount,
    areaCount: groups.length,
    fullAccess,
  };
}
