"use client";

import { toast } from "sonner";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { useCustomerTenant } from "@/src/components/customer/customer-tenant-context";
import { customerPath } from "@/src/lib/customer-tenant";
import { toastApiError } from "@/src/lib/api-error";
import {
  useGetCustomerDigitalMetalsDocumentDownloadUrlMutation,
  useGetCustomerDigitalMetalsDocumentQuery,
} from "@/src/store/api/customer-api";
import { DigitalMetalsDocumentPanel } from "@/src/features/digital-metals/digital-metals-document-panel";
import { CustomerDmPageShell, CustomerDmSurface } from "@/src/features/customer/customer-digital-metals-shared";

export function CustomerDigitalMetalsDocumentPage({ artifactId }: { artifactId: string }) {
  const { tenantSlug } = useCustomerTenant();
  const doc = useGetCustomerDigitalMetalsDocumentQuery(artifactId, { skip: !tenantSlug || !artifactId });
  const [downloadUrl, downloadState] = useGetCustomerDigitalMetalsDocumentDownloadUrlMutation();

  if (doc.isLoading) return <PageSkeleton cards={1} />;
  if (doc.isError) return <QueryError error={doc.error} onRetry={() => doc.refetch()} />;

  const artifact = doc.data;

  async function onDownload() {
    if (!artifactId) return;
    try {
      const res = await downloadUrl(artifactId).unwrap();
      if (res.downloadUrl) window.open(res.downloadUrl, "_blank", "noopener,noreferrer");
      else toast.error("Download not available yet");
    } catch (err) {
      toastApiError(err);
    }
  }

  const title = artifact?.docType?.replace(/_/g, " ") ?? "Document";

  return (
    <CustomerDmPageShell
      title={title}
      subtitle="Secure PDF from your jeweller. Generation may take a moment."
      backHref={customerPath(tenantSlug, "digital-metals")}
      backLabel="Portfolio"
      testId="customer-digital-metals-document-page"
    >
      <CustomerDmSurface>
        <DigitalMetalsDocumentPanel
          title={title}
          artifact={
            artifact
              ? {
                  id: artifact.id,
                  status: artifact.status,
                  documentNumber: artifact.documentNumber,
                  lastError: artifact.lastError,
                }
              : null
          }
          busy={downloadState.isLoading}
          onRequest={() => undefined}
          onDownload={artifact?.status === "READY" ? onDownload : undefined}
        />
        {artifact?.status === "FAILED" && artifact.lastError ? (
          <p className="mt-3 text-sm text-red-900" role="alert">
            {artifact.lastError}
          </p>
        ) : null}
      </CustomerDmSurface>
    </CustomerDmPageShell>
  );
}
