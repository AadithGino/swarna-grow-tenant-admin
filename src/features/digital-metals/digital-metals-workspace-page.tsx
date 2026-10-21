"use client";

import { PageHeader } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { useGetDigitalMetalsWorkspaceQuery } from "@/src/store/api/admin-api";
import { useDigitalMetalsServerEntitlement } from "./digital-metals-admin-shared";
import { DigitalMetalsOperationsPanel } from "./digital-metals-operations-panel";
import { DigitalMetalsWorkspaceOverview } from "./digital-metals-workspace-overview";

export function DigitalMetalsWorkspacePage() {
  const ent = useDigitalMetalsServerEntitlement();
  const workspace = useGetDigitalMetalsWorkspaceQuery(undefined, {
    skip: !ent.workspaceVisible,
  });

  if (ent.loading) return <PageSkeleton cards={2} />;
  if (!ent.workspaceVisible) {
    return (
      <div className="space-y-4 p-6">
        <PageHeader title="Digital Gold & Silver" eyebrow="Operations" />
        <p className="text-sm text-muted-foreground">
          {ent.disabledMessage
            ?? (ent.planEntitled
              ? "Enable Digital Gold & Silver under Settings → Operations, or complete platform tax approval and published customer terms."
              : "Digital metals is not included in this tenant's plan.")}
        </p>
      </div>
    );
  }

  if (workspace.isLoading) return <PageSkeleton cards={4} />;
  if (workspace.isError) {
    return <QueryError error={workspace.error} onRetry={workspace.refetch} />;
  }

  const ws = workspace.data;

  return (
    <div className="space-y-6 p-6" data-testid="digital-metals-workspace-shell">
      <PageHeader
        eyebrow="Digital metals"
        title={ws?.title ?? "Overview"}
        description={
          ws?.workspaceLive
            ? "Live counts and queues below come from your tenant API."
            : "Workspace is not live for customers yet — resolve capability blockers before trading."
        }
      />
      <DigitalMetalsWorkspaceOverview workspaceVisible={ent.workspaceVisible} />
      <DigitalMetalsOperationsPanel />
    </div>
  );
}
