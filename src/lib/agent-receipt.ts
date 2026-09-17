import { env } from "@/src/config/env";
import { AGENT_ACCESS_KEY } from "@/src/store/slices/agent-session-slice";

function agentReceiptUrl(paymentId: string) {
  return `${env.apiBaseUrl}/staff/payments/${encodeURIComponent(paymentId)}/receipt`;
}

function agentAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem(AGENT_ACCESS_KEY) : null;
  return {
    Accept: "application/pdf",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function downloadAgentPaymentReceipt(paymentId: string, filename = "payment-receipt.pdf") {
  const url = agentReceiptUrl(paymentId);
  const response = await fetch(url, { headers: agentAuthHeaders() });
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
