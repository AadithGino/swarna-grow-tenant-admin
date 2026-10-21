"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel, Surface } from "@/src/components/common/page-parts";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import {
  useGetDigitalMetalsCapabilityQuery,
  useGetDigitalMetalsOperationsWorkQueueQuery,
  useRetryDigitalMetalsDocumentFromOpsMutation,
  useRetryDigitalMetalsOutboxEventMutation,
  useSetDigitalMetalsTenantPauseMutation,
} from "@/src/store/api/admin-api";

function formatAge(ms: number | null | undefined) {
  if (ms == null) return "—";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${Math.round(ms / 3_600_000)}h`;
}

export function DigitalMetalsOperationsPanel() {
  const capability = useGetDigitalMetalsCapabilityQuery();
  const workQueue = useGetDigitalMetalsOperationsWorkQueueQuery(undefined, {
    pollingInterval: 30_000,
  });
  const [setPause, pauseState] = useSetDigitalMetalsTenantPauseMutation();
  const [retryOutbox, retryOutboxState] = useRetryDigitalMetalsOutboxEventMutation();
  const [retryDoc, retryDocState] = useRetryDigitalMetalsDocumentFromOpsMutation();
  const pause = capability.data?.pause;
  const tenantPaused = pause?.tenantPaused === true;
  const [reason, setReason] = useState("");

  async function togglePause(next: boolean) {
    try {
      await setPause({
        pause: next,
        reason: next ? reason : undefined,
        idempotencyKey: newIdempotencyKey(),
      }).unwrap();
      toast.success(next ? "Tenant trading paused" : "Tenant trading resumed");
      if (!next) setReason("");
    } catch {
      toast.error("Could not update pause state");
    }
  }

  async function onRetryOutbox(eventId: string) {
    try {
      await retryOutbox({ eventId, idempotencyKey: newIdempotencyKey() }).unwrap();
      toast.success("Outbox event re-queued (notification/document only)");
      workQueue.refetch();
    } catch {
      toast.error("Could not retry outbox event");
    }
  }

  async function onRetryDocument(artifactId: string) {
    try {
      await retryDoc({ artifactId, idempotencyKey: newIdempotencyKey() }).unwrap();
      toast.success("Document generation re-queued");
      workQueue.refetch();
    } catch {
      toast.error("Could not retry document");
    }
  }

  const summary = workQueue.data?.summary;

  return (
    <div data-testid="digital-metals-operations-panel" className="space-y-4">
      <Surface className="space-y-4">
        <p className="text-sm font-semibold text-[#28161a]">Operations pause</p>
        <div className="grid gap-2 text-sm text-[#5c3d42]">
          <p>
            <span className="font-medium">Tenant:</span>{" "}
            {tenantPaused ? "Paused" : "Active"}
            {tenantPaused && pause?.tenantPauseReason ? ` — ${pause.tenantPauseReason}` : ""}
          </p>
          <p>
            <span className="font-medium">Platform:</span>{" "}
            {pause?.platformPaused ? "Paused" : "Active"}
            {pause?.platformPaused && pause?.platformPauseReason
              ? ` — ${pause.platformPauseReason}`
              : ""}
          </p>
        </div>
        {!tenantPaused ? (
          <div className="space-y-2">
            <FieldLabel>Pause reason (required)</FieldLabel>
            <Input
              id="dm-pause-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Maintenance window"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={pauseState.isLoading || reason.trim().length < 3}
              onClick={() => togglePause(true)}
            >
              Pause tenant trading
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pauseState.isLoading}
            onClick={() => togglePause(false)}
          >
            Resume tenant trading
          </Button>
        )}
      </Surface>

      <Surface className="space-y-3" data-testid="digital-metals-work-queue">
        <p className="text-sm font-semibold text-[#28161a]">Recovery work queue</p>
        <p className="text-xs text-[#5c3d42]">
          Retries re-queue notifications or PDF generation — they never repeat financial settlement.
        </p>
        {summary ? (
          <div className="flex flex-wrap gap-3 text-xs text-[#5c3d42]">
            <span>Outbox pending: {summary.outboxPending}</span>
            <span>Outbox failed: {summary.outboxFailed}</span>
            <span>Stale leases: {summary.outboxLeaseStale}</span>
            <span>Documents stuck: {summary.documentsRetryable}</span>
          </div>
        ) : null}
        {workQueue.isLoading ? (
          <p className="text-sm text-[#5c3d42]">Loading work queue…</p>
        ) : (workQueue.data?.items?.length ?? 0) === 0 ? (
          <p className="text-sm text-[#5c3d42]">No pending or failed background work.</p>
        ) : (
          <ul className="divide-y divide-[#ece3e5] text-sm">
            {workQueue.data?.items.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="flex flex-wrap items-start gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[#28161a]">
                    {item.kind === "OUTBOX" ? item.topic : item.docType} · {item.status}
                  </p>
                  <p className="text-xs text-[#5c3d42]">
                    Age {formatAge(item.ageMs)}
                    {item.lastError ? ` · ${item.lastError}` : ""}
                  </p>
                </div>
                {item.safeActions.includes("RETRY_OUTBOX") ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={retryOutboxState.isLoading}
                    onClick={() => onRetryOutbox(item.id)}
                  >
                    Retry notify
                  </Button>
                ) : null}
                {item.safeActions.includes("RETRY_DOCUMENT") ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={retryDocState.isLoading}
                    onClick={() => onRetryDocument(item.id)}
                  >
                    Retry document
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Surface>
    </div>
  );
}
