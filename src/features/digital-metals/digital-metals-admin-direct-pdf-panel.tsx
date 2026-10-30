"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Loader2 } from "lucide-react";
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
    <div
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#ebe1dc] bg-white px-4 py-3.5 text-sm"
      data-testid="admin-digital-metals-direct-pdf"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f8eef0] text-[#7b0a2b]">
        <FileText className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[#28161a]">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Generated when you download.</p>
      </div>
      <Button type="button" size="sm" variant="outline" className="rounded-lg" disabled={loading} onClick={() => void onDownload()}>
        {loading ? <Loader2 className="animate-spin" /> : <Download />}
        {loading ? "Preparing…" : "Download PDF"}
      </Button>
    </div>
  );
}
