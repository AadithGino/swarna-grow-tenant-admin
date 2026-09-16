"use client";

import { Download, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Surface } from "@/src/components/common/page-parts";
import { StatusBadge } from "@/src/components/common/status-badge";
import {
  useGetExportStatusQuery,
  useListExportsQuery,
} from "@/src/store/api/admin-api";
import { env } from "@/src/config/env";
import { fetchAuthorizedBlob } from "@/src/lib/download-api";

function ExportDownloadButton({ exportId }: { exportId: string }) {
  const { data } = useGetExportStatusQuery(exportId, {
    skip: !exportId,
    pollingInterval: 5000,
  });
  if (data?.status !== "READY") {
    return (
      <span className="text-xs text-muted-foreground">
        {data?.status ?? "PROCESSING"}
      </span>
    );
  }
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        if (env.useMocks) {
          toast.info("Download URL available in production");
          return;
        }
        void fetchAuthorizedBlob(`/admin/exports/${exportId}/file`)
          .then((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `swarnagrow-export-${exportId}.csv`;
            link.click();
            URL.revokeObjectURL(url);
          })
          .catch(() => toast.error("Download failed"));
      }}
    >
      <Download />
      Download
    </Button>
  );
}

export function ExportsPanel() {
  const { data, isLoading, refetch, isFetching } = useListExportsQuery({
    limit: 25,
  });
  const rows = data?.items ?? [];

  return (
    <Surface
      title="Async export jobs"
      description="Large report exports run in the background"
      action={
        <Button
          size="sm"
          variant="outline"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          <RefreshCcw className={isFetching ? "animate-spin" : ""} />
          Refresh
        </Button>
      }
    >
      {isLoading ? (
        <p className="p-5 text-sm text-muted-foreground">Loading exports…</p>
      ) : rows.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">
          No export jobs yet. Queue one from a report using Export async.
        </p>
      ) : (
        <ul className="divide-y">
          {rows.map((row: Record<string, unknown>) => {
            const exportId = String(
              row.exportId ?? row._id ?? row.id ?? "",
            );
            return (
              <li
                key={exportId}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"
              >
                <div>
                  <strong className="font-mono text-xs">{exportId}</strong>
                  <p className="text-muted-foreground">
                    {String(row.type ?? row.reportKey ?? "Report")} ·{" "}
                    {String(row.format ?? "CSV")}
                    {row.createdAt
                      ? ` · ${String(row.createdAt).slice(0, 16)}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge
                    status={String(row.status ?? "PROCESSING")}
                  />
                  {exportId && row.status === "READY" && row.downloadUrl ? (
                    env.useMocks ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          toast.info("Download URL available in production")
                        }
                      >
                        Download
                      </Button>
                    ) : (
                      <ExportDownloadButton exportId={exportId} />
                    )
                  ) : exportId && row.status === "READY" ? (
                    <ExportDownloadButton exportId={exportId} />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Surface>
  );
}
