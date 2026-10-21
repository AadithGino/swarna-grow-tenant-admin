"use client";

import { Button } from "@/components/ui/button";

export type DigitalMetalsDocumentArtifactView = {
  id: string;
  status: string;
  documentNumber?: string | null;
  lastError?: string | null;
};

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

  return (
    <div className="rounded-md border px-4 py-3 text-sm" data-testid="digital-metals-document-panel">
      <p className="font-medium">{title}</p>
      {staffAttestedLabel ? (
        <p className="text-xs text-muted-foreground">{staffAttestedLabel}</p>
      ) : null}
      <p className="mt-1 text-xs text-muted-foreground">
        {status
          ? `Status: ${status}${artifact?.documentNumber ? ` · ${artifact.documentNumber}` : ""}`
          : "No document requested yet."}
      </p>
      {status === "FAILED" && artifact?.lastError ? (
        <p className="mt-1 text-xs text-destructive">{artifact.lastError}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {!status || status === "FAILED" ? (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onRequest}>
            {status === "FAILED" ? "Request again" : "Request PDF"}
          </Button>
        ) : null}
        {status === "FAILED" && onRetry ? (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onRetry}>
            Retry generation
          </Button>
        ) : null}
        {status === "READY" && onDownload ? (
          <Button type="button" size="sm" disabled={busy} onClick={onDownload}>
            Download
          </Button>
        ) : null}
        {status === "PENDING" || status === "PROCESSING" ? (
          <span className="text-xs text-muted-foreground">Generating…</span>
        ) : null}
      </div>
    </div>
  );
}
