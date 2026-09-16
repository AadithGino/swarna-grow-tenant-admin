import { env } from "@/src/config/env";

export async function downloadCustomerPaymentReceipt(
  receiptDownloadPath: string,
  filename = "payment-receipt.pdf",
) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("swarnagrow.customer.accessToken") : null;
  const url = receiptDownloadPath.startsWith("http")
    ? receiptDownloadPath
    : `${env.apiBaseUrl}${receiptDownloadPath.startsWith("/") ? "" : "/"}${receiptDownloadPath}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/pdf",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
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
