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
