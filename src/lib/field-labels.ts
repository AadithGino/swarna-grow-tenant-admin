const USAGE_AND_LIMIT_LABELS: Record<string, string> = {
  activeCustomers: "Active customers",
  branches: "Branches",
  staff: "Staff",
  staffSeats: "Staff seats",
  schemePlans: "Scheme plan templates",
  whatsappMessages: "WhatsApp messages",
  whatsappMessagesPerMonth: "WhatsApp messages (monthly)",
  whatsappUsedThisMonth: "WhatsApp used this month",
};

const PLATFORM_FLAG_LABELS: Record<string, string> = {
  customerSelfEnrol: "Customer self-enrol",
  ecommerce: "Ecommerce (online store)",
  flexibleScheme: "Flexible scheme",
  passbookImageOnPayment: "Passbook image on payment",
  onlinePayments: "Online payments",
  staffAppEnabled: "Staff app enabled",
  customerAppEnabled: "Customer app enabled",
};

/** Human-readable labels for API camelCase keys (usage meters, flags, settings). */
export function fieldLabel(value: string): string {
  if (USAGE_AND_LIMIT_LABELS[value]) return USAGE_AND_LIMIT_LABELS[value];
  if (PLATFORM_FLAG_LABELS[value]) return PLATFORM_FLAG_LABELS[value];
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
