"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { toastApiError } from "@/src/lib/api-error";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import {
  useFindDigitalMetalsDocumentBySubjectQuery,
  useGetDigitalMetalsDocumentDownloadUrlMutation,
  useRequestDigitalMetalsDocumentMutation,
  useRetryDigitalMetalsDocumentMutation,
} from "@/src/store/api/admin-api";
import {
  DigitalMetalsDocumentPanel,
  type DigitalMetalsDocumentArtifactView,
} from "./digital-metals-document-panel";

export function AdminDigitalMetalsDocumentPanel(props: {
  title: string;
  docType: string;
  subjectId?: string;
  fromBusinessDate?: string;
  toBusinessDate?: string;
  customerId?: string;
  staffAttestedLabel?: string;
  skip?: boolean;
}) {
  const { title, docType, subjectId, fromBusinessDate, toBusinessDate, customerId, staffAttestedLabel, skip } =
    props;
  const params: Record<string, string> = { docType };
  if (fromBusinessDate && toBusinessDate) {
    params.fromBusinessDate = fromBusinessDate;
    params.toBusinessDate = toBusinessDate;
  } else if (subjectId) {
    params.subjectId = subjectId;
  }
  const find = useFindDigitalMetalsDocumentBySubjectQuery(params, {
    skip: skip || (!subjectId && !(fromBusinessDate && toBusinessDate)),
  });
  const [requestDoc, requestState] = useRequestDigitalMetalsDocumentMutation();
  const [retryDoc, retryState] = useRetryDigitalMetalsDocumentMutation();
  const [downloadUrl, downloadState] = useGetDigitalMetalsDocumentDownloadUrlMutation();

  useEffect(() => {
    const status = find.data?.artifact?.status;
    if (status !== "PENDING" && status !== "PROCESSING") return undefined;
    const id = window.setInterval(() => find.refetch(), 2500);
    return () => window.clearInterval(id);
  }, [find.data?.artifact?.status, find]);

  const artifact = find.data?.artifact as DigitalMetalsDocumentArtifactView | null | undefined;
  const busy = requestState.isLoading || retryState.isLoading || downloadState.isLoading;

  async function onRequest() {
    try {
      const body: Record<string, unknown> = { docType };
      if (fromBusinessDate && toBusinessDate) {
        body.fromBusinessDate = fromBusinessDate;
        body.toBusinessDate = toBusinessDate;
        if (customerId) body.customerId = customerId;
      } else if (subjectId) {
        body.subjectId = subjectId;
      }
      await requestDoc({ idempotencyKey: newIdempotencyKey(), body }).unwrap();
      toast.success("Document queued.");
      find.refetch();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function onRetry() {
    if (!artifact?.id) return;
    try {
      await retryDoc({ artifactId: artifact.id, idempotencyKey: newIdempotencyKey() }).unwrap();
      toast.success("Retry queued.");
      find.refetch();
    } catch (err) {
      toastApiError(err);
    }
  }

  async function onDownload() {
    if (!artifact?.id) return;
    try {
      const res = await downloadUrl(artifact.id).unwrap();
      window.open(res.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      toastApiError(err);
    }
  }

  return (
    <DigitalMetalsDocumentPanel
      title={title}
      artifact={artifact}
      staffAttestedLabel={staffAttestedLabel}
      busy={busy}
      onRequest={() => void onRequest()}
      onRetry={() => void onRetry()}
      onDownload={() => void onDownload()}
    />
  );
}
