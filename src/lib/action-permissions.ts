/** Action-level permission keys aligned with backend Permission enum. */
export const ACTION = {
  customerWrite: "customer.write",
  customerPasswordWrite: "customer.password.write",
  customerRead: "customer.read",
  schemeEnrol: "scheme.write",
  planWrite: "plan.write",
  paymentRecord: "payment.record",
  cashHandoverAccept: "cash.handover.accept",
  tenantBrandingWrite: "settings.write",
  tenantSettingsWrite: "settings.write",
  staffWrite: "staff.write",
  branchWrite: "branch.write",
} as const;
