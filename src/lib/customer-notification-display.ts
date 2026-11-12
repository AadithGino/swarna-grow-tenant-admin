import type { CustomerNotification } from "@/src/types/customer";
import { customerPath } from "@/src/lib/customer-tenant";

/** Resolve API deep links (`/payments/:id`) to tenant-scoped customer routes. */
export function resolveCustomerNotificationHref(
  deepLink: string | undefined,
  tenantSlug: string | null | undefined,
): string | null {
  if (!deepLink?.trim()) return null;
  if (deepLink.startsWith("http://") || deepLink.startsWith("https://")) return deepLink;
  if (deepLink.startsWith("/customer/")) return deepLink;
  // Redemption handover OTP → open home with reveal query (global drawer).
  const redemptionOtp = deepLink.match(
    /^\/schemes\/redemptions\/([^/]+)\/handover-otp\/?$/i,
  );
  if (redemptionOtp?.[1]) {
    const base = customerPath(tenantSlug, "");
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}handoverOtp=${encodeURIComponent(redemptionOtp[1])}`;
  }
  const relative = deepLink.replace(/^\//, "");
  return customerPath(tenantSlug, relative);
}

export type NotificationDayGroup = {
  key: string;
  label: string;
  items: CustomerNotification[];
};

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function groupCustomerNotificationsByDay(
  items: CustomerNotification[],
): NotificationDayGroup[] {
  const today = startOfLocalDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const buckets = new Map<string, NotificationDayGroup>();

  for (const item of items) {
    const at = new Date(item.createdAt);
    const day = startOfLocalDay(at);
    let label: string;
    let key: string;
    if (day.getTime() === today.getTime()) {
      label = "Today";
      key = "today";
    } else if (day.getTime() === yesterday.getTime()) {
      label = "Yesterday";
      key = "yesterday";
    } else {
      label = at.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: at.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
      key = day.toISOString().slice(0, 10);
    }
    const bucket = buckets.get(key) ?? { key, label, items: [] };
    bucket.items.push(item);
    buckets.set(key, bucket);
  }

  return [...buckets.values()];
}

export function formatNotificationTime(iso: string): string {
  const at = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - at.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24 && startOfLocalDay(at).getTime() === startOfLocalDay(now).getTime()) {
    return at.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  }
  return at.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
