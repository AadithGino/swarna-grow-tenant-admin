"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fetchAuthorizedBlob } from "@/src/lib/download-api";
import { parseApiError } from "@/src/lib/api-error";

export function AdminDigitalMetalsDirectPdfPanel(props: {
  title: string;
  downloadPath: string;
  filenameHint?: string;
  skip?: boolean;
}) {
  const { title, downloadPath, filenameHint, skip } = props;
  const [loading, setLoading] = useState(false);
  if (skip) return null;

  async function onDownload() {
    setLoading(true);
    try {
      const blob = await fetchAuthorizedBlob(downloadPath);
      const hint = (filenameHint ?? title).replace(/[^\w.-]+/g, "_");
      const filename = hint.endsWith(".pdf") ? hint : `${hint}.pdf`;
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success("PDF downloaded.");
    } catch (err) {
      const parsed = parseApiError(err);
      toast.error(parsed.message ?? "PDF could not be downloaded.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-md border px-4 py-3 text-sm" data-testid="admin-digital-metals-direct-pdf">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">Generated on demand — no separate upload step.</p>
      <Button type="button" size="sm" variant="outline" className="mt-2" disabled={loading} onClick={() => void onDownload()}>
        {loading ? "Preparing…" : "Download PDF"}
      </Button>
    </div>
  );
}
