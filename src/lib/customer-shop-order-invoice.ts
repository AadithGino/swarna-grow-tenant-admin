import { env } from "@/src/config/env";
import { refreshCustomerAccessToken } from "@/src/lib/auth-refresh-fetch";
import { TOKEN_KEYS } from "@/src/lib/auth-token-storage";

function invoiceUrl(orderId: string) {
  const path = `/app/shop/orders/${encodeURIComponent(orderId)}/invoice.pdf`;
  return path.startsWith("http")
    ? path
    : `${env.apiBaseUrl.replace(/\/$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;
}

function customerAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(TOKEN_KEYS.customer.access)
      : null;
  return {
    Accept: "application/pdf",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function downloadCustomerShopOrderInvoice(
  orderId: string,
  orderNumber?: string,
) {
  const url = invoiceUrl(orderId);
  let response = await fetch(url, { headers: customerAuthHeaders() });
  if (response.status === 401 && (await refreshCustomerAccessToken())) {
    response = await fetch(url, { headers: customerAuthHeaders() });
  }
  if (!response.ok) {
    throw new Error("Invoice could not be downloaded");
  }
  const blob = await response.blob();
  const safeName = (orderNumber ?? orderId).replace(/[^\w.-]+/g, "_");
  const filename = safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`;
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
