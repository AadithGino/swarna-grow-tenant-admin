"use client";

import Link from "next/link";
import { Rocket, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable, type DataColumn } from "@/src/components/common/data-table";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { handleFormApiError } from "@/src/lib/form-api-error";
import {
  useGetDemoTemplateQuery,
  useGetDemoTemplateVersionsQuery,
  usePublishDemoTemplateVersionMutation,
} from "@/src/store/api/platform-api";
import type { DemoTemplateVersion } from "@/src/types/platform";

export function PlatformDemoTemplateDetailPage({ templateId }: { templateId: string }) {
  const templateQuery = useGetDemoTemplateQuery(templateId);
  const versionsQuery = useGetDemoTemplateVersionsQuery(templateId);
  const [publish, publishState] = usePublishDemoTemplateVersionMutation();

  if (templateQuery.isLoading || versionsQuery.isLoading) return <PageSkeleton cards={2} />;
  if (templateQuery.isError) return <QueryError error={templateQuery.error} onRetry={templateQuery.refetch} />;
  if (versionsQuery.isError) return <QueryError error={versionsQuery.error} onRetry={versionsQuery.refetch} />;

  const template = templateQuery.data;
  const versions = versionsQuery.data ?? [];
  if (!template) return null;

  const columns: DataColumn<DemoTemplateVersion>[] = [
    { key: "version", header: "Version", render: (row) => `v${row.version}` },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "counts",
      header: "Snapshot counts",
      render: (row) =>
        row.manifest?.counts
          ? Object.entries(row.manifest.counts)
              .map(([k, v]) => `${k}: ${v}`)
              .join(" · ")
          : row.failureReason ?? "—",
    },
    { key: "publishedAt", header: "Published", render: (row) => (row.publishedAt ? new Date(row.publishedAt).toLocaleString("en-IN") : "—") },
  ];

  return (
    <>
      <PageHeader
        back={{ href: "/platform/demos", label: "Demo templates" }}
        title={template.name}
        meta={<StatusBadge status={template.status} />}
        description={`Source tenant: ${template.approvedSourceTenantId}`}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={publishState.isLoading}
              onClick={async () => {
                try {
                  await publish(template.id).unwrap();
                  toast.success("New template version published");
                } catch (err) {
                  handleFormApiError(err, { fallback: "Could not publish a new version" });
                }
              }}
            >
              <UploadCloud />
              Publish new version
            </Button>
            {template.currentPublishedVersionId ? (
              <Button asChild>
                <Link href={`/platform/demos/instances/new?templateId=${template.id}`}>
                  <Rocket />
                  Create demo instance
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />
      <Surface title="Versions" description="Each publish takes a fresh snapshot of the source tenant's sample data.">
        <DataTable columns={columns} rows={versions} emptyTitle="No versions published yet" />
      </Surface>
    </>
  );
}
