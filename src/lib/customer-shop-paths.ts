import { customerPath } from "@/src/lib/customer-tenant";

export function customerShopQuotePath(tenantSlug: string | null, quoteId: string): string {
  return customerPath(tenantSlug, "shop", "quote", quoteId);
}

export function customerShopOrderPath(tenantSlug: string | null, orderId: string): string {
  return customerPath(tenantSlug, "shop", "order", orderId);
}

export function customerShopOrdersPath(tenantSlug: string | null): string {
  return customerPath(tenantSlug, "shop", "orders");
}

export function customerShopBookingPath(tenantSlug: string | null, bookingId: string): string {
  return customerPath(tenantSlug, "shop", "booking", bookingId);
}

export function customerShopBookingsPath(tenantSlug: string | null): string {
  return customerPath(tenantSlug, "shop", "bookings");
}

export function customerShopActivityPath(tenantSlug: string | null, filter?: string): string {
  const base = customerPath(tenantSlug, "shop", "activity");
  if (!filter || filter === "all") return base;
  return `${base}?filter=${encodeURIComponent(filter)}`;
}
