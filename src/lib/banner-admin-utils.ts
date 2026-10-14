export type BannerEffectiveStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "LIVE"
  | "EXPIRED"
  | "ARCHIVED";

export function bannerEffectiveStatus(row: {
  status: string;
  startsAt?: string | null;
  endsAt?: string | null;
}): BannerEffectiveStatus {
  if (row.status === "ARCHIVED") return "ARCHIVED";
  if (row.status === "DRAFT") return "DRAFT";
  const now = Date.now();
  if (row.startsAt && new Date(row.startsAt).getTime() > now) return "SCHEDULED";
  if (row.endsAt && new Date(row.endsAt).getTime() < now) return "EXPIRED";
  return "LIVE";
}

export function bannerEffectiveStatusLabel(status: BannerEffectiveStatus): string {
  switch (status) {
    case "DRAFT":
      return "Draft (not on customer app)";
    case "SCHEDULED":
      return "Scheduled (not visible yet)";
    case "LIVE":
      return "Live (may still depend on store/plan rules)";
    case "EXPIRED":
      return "Expired (hidden from customers)";
    case "ARCHIVED":
      return "Archived (read-only)";
    default:
      return status;
  }
}

/** Admin list hint when customer visibility cannot be determined from list data alone. */
export function bannerCustomerVisibilityHint(row: {
  status: string;
  placement?: string;
  destinationType?: string;
}): string | null {
  if (row.status === "DRAFT" || row.status === "ARCHIVED") return null;
  if (row.destinationType === "ORDERS") {
    return "Customers only see ORDERS promos when they have order history.";
  }
  if (row.placement === "SHOP") {
    return "Requires an active online store.";
  }
  return null;
}
