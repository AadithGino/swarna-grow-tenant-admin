import type { CustomerNotification } from "@/src/types/customer";

function dedupeKey(item: CustomerNotification): string {
  const when = item.createdAt?.slice(0, 16) ?? "";
  return `${item.type}|${item.title}|${item.body}|${when}`;
}

/** Collapse duplicate inbox rows when API returns both WhatsApp and push Message docs. */
export function dedupeCustomerNotifications(
  items: CustomerNotification[],
): CustomerNotification[] {
  const byKey = new Map<string, CustomerNotification>();
  for (const item of items) {
    const key = dedupeKey(item);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, item);
      continue;
    }
    if (existing.read && !item.read) {
      byKey.set(key, item);
    }
  }
  return [...byKey.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
