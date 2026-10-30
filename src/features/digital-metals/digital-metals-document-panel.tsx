"use client";

import { Download, FileText, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/src/components/common/status-badge";

export type DigitalMetalsDocumentArtifactView = {
  id: string;
  status: string;
  documentNumber?: string | null;
  lastError?: string | null;
};

/** PDF document row shared by admin and customer screens (receipts, statements, acknowledgements). */
export function DigitalMetalsDocumentPanel(props: {
  title: string;
  artifact?: DigitalMetalsDocumentArtifactView | null;
  staffAttestedLabel?: string;
  busy?: boolean;
  onRequest: () => void;
  onRetry?: () => void;
  onDownload?: () => void;
}) {
  const { title, artifact, staffAttestedLabel, busy, onRequest, onRetry, onDownload } = props;
  const status = artifact?.status;
  const generating = status === "PENDING" || status === "PROCESSING";

  return (
    <div
      className="flex flex-wrap items-start gap-3 rounded-2xl border border-[#ebe1dc] bg-white px-4 py-3.5 text-sm shadow-[0_1px_2px_rgb(67_15_25/4%)]"
      data-testid="digital-metals-document-panel"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--primary)_8%,white)] text-[var(--primary)]">
        <FileText className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-[#28161a]">{title}</p>
          {status ? <StatusBadge status={status} label={status} className="py-0 text-[0.68rem]" /> : null}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {status
            ? artifact?.documentNumber
              ? `Document ${artifact.documentNumber}`
              : generating
                ? "Generating — this usually takes a few seconds."
                : "PDF document"
            : "Not generated yet."}
        </p>
        {staffAttestedLabel ? <p className="mt-0.5 text-xs text-muted-foreground">{staffAttestedLabel}</p> : null}
        {status === "FAILED" && artifact?.lastError ? (
          <p className="mt-1 text-xs text-destructive">{artifact.lastError}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!status || status === "FAILED" ? (
          <Button type="button" size="sm" variant="outline" className="rounded-lg" disabled={busy} onClick={onRequest}>
            <FileText /> {status === "FAILED" ? "Request again" : "Request PDF"}
          </Button>
        ) : null}
        {status === "FAILED" && onRetry ? (
          <Button type="button" size="sm" variant="outline" className="rounded-lg" disabled={busy} onClick={onRetry}>
            <RotateCcw /> Retry
          </Button>
        ) : null}
        {status === "READY" && onDownload ? (
          <Button type="button" size="sm" className="rounded-lg" disabled={busy} onClick={onDownload}>
            <Download /> Download
          </Button>
        ) : null}
        {generating ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" aria-hidden /> Generating…
          </span>
        ) : null}
      </div>
    </div>
  );
}
