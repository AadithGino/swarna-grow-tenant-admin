import { env } from "@/src/config/env";
import { refreshCustomerAccessToken } from "@/src/lib/auth-refresh-fetch";

function customerReceiptUrl(receiptDownloadPath: string) {
  return receiptDownloadPath.startsWith("http")
    ? receiptDownloadPath
    : `${env.apiBaseUrl}${receiptDownloadPath.startsWith("/") ? "" : "/"}${receiptDownloadPath}`;
}

function customerAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("swarnagrow.customer.accessToken")
      : null;
  return {
    Accept: "application/pdf",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function downloadCustomerPaymentReceipt(
  receiptDownloadPath: string,
  filename = "payment-receipt.pdf",
) {
  const url = customerReceiptUrl(receiptDownloadPath);
  let response = await fetch(url, { headers: customerAuthHeaders() });
  if (response.status === 401 && (await refreshCustomerAccessToken())) {
    response = await fetch(url, { headers: customerAuthHeaders() });
  }
  if (!response.ok) {
    throw new Error("Receipt could not be downloaded");
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
