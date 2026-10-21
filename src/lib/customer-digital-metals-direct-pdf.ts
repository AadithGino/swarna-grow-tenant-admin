import { env } from "@/src/config/env";
import { refreshCustomerAccessToken } from "@/src/lib/auth-refresh-fetch";
import { TOKEN_KEYS } from "@/src/lib/auth-token-storage";

export type CustomerDigitalMetalsDirectPdfDocType =
  | "REDEMPTION_CHARGE_RECEIPT"
  | "HANDOVER_RECEIPT"
  | "SELL_ACKNOWLEDGEMENT"
  | "METAL_STATEMENT";

function resolveApiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = env.apiBaseUrl.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function customerDigitalMetalsPdfPath(
  docType: CustomerDigitalMetalsDirectPdfDocType,
  opts: { subjectId?: string; fromBusinessDate?: string; toBusinessDate?: string },
): string | null {
  const subjectId = opts.subjectId ? encodeURIComponent(opts.subjectId) : "";
  switch (docType) {
    case "REDEMPTION_CHARGE_RECEIPT":
      return subjectId
        ? `/app/digital-metals/redemption/orders/${subjectId}/charge-receipt.pdf`
        : null;
    case "HANDOVER_RECEIPT":
      return subjectId
        ? `/app/digital-metals/redemption/orders/${subjectId}/handover-receipt.pdf`
        : null;
    case "SELL_ACKNOWLEDGEMENT":
      return subjectId ? `/app/digital-metals/sell-orders/${subjectId}/acknowledgement.pdf` : null;
    case "METAL_STATEMENT": {
      const from = opts.fromBusinessDate?.trim();
      const to = opts.toBusinessDate?.trim();
      if (!from || !to) return null;
      const q = new URLSearchParams({ fromBusinessDate: from, toBusinessDate: to });
      return `/app/digital-metals/statements/metal.pdf?${q.toString()}`;
    }
    default:
      return null;
  }
}

function customerAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEYS.customer.access) : null;
  return {
    Accept: "application/pdf",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function downloadCustomerDigitalMetalsPdf(
  docType: CustomerDigitalMetalsDirectPdfDocType,
  opts: {
    subjectId?: string;
    fromBusinessDate?: string;
    toBusinessDate?: string;
    filenameHint?: string;
  },
): Promise<void> {
  const path = customerDigitalMetalsPdfPath(docType, opts);
  if (!path) throw new Error("PDF is not available for this document yet.");
  const url = resolveApiUrl(path);
  let response = await fetch(url, { headers: customerAuthHeaders() });
  if (response.status === 401 && (await refreshCustomerAccessToken())) {
    response = await fetch(url, { headers: customerAuthHeaders() });
  }
  if (!response.ok) {
    let message = "PDF could not be downloaded.";
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body?.error?.message) message = body.error.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const blob = await response.blob();
  const hint = (opts.filenameHint ?? docType).replace(/[^\w.-]+/g, "_");
  const filename = hint.endsWith(".pdf") ? hint : `${hint}.pdf`;
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
