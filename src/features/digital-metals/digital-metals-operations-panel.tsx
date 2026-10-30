"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CirclePause, CirclePlay, LifeBuoy, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Surface } from "@/src/components/common/page-parts";
import { StatusBadge } from "@/src/components/common/status-badge";
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

function humanTopic(raw?: string) {
  if (!raw) return "Background task";
  return raw.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

/** Trading pause controls + the background recovery queue (notifications / PDFs). */
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
      toast.success(next ? "Customer trading paused" : "Customer trading resumed");
      if (!next) setReason("");
    } catch {
      toast.error("Could not update the pause state. Try again.");
    }
  }

  async function onRetryOutbox(eventId: string) {
    try {
      await retryOutbox({ eventId, idempotencyKey: newIdempotencyKey() }).unwrap();
      toast.success("Notification re-queued");
      workQueue.refetch();
    } catch {
      toast.error("Could not retry this notification");
    }
  }

  async function onRetryDocument(artifactId: string) {
    try {
      await retryDoc({ artifactId, idempotencyKey: newIdempotencyKey() }).unwrap();
      toast.success("Document generation re-queued");
      workQueue.refetch();
    } catch {
      toast.error("Could not retry this document");
    }
  }

  const summary = workQueue.data?.summary;
  const items = workQueue.data?.items ?? [];

  return (
    <div data-testid="digital-metals-operations-panel" className="space-y-6">
      <Surface
        icon={tenantPaused ? CirclePause : ShieldCheck}
        title="Trading controls"
        description="Pausing stops new buys, sells and redemptions. Orders already in progress continue."
      >
        <div className="space-y-4 px-5 py-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-[#efe5e1] bg-[#fcf9f8] px-3 py-2.5">
              <dt className="text-xs text-[#8a7c80]">Tenant:</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-2">
                <StatusBadge status={tenantPaused ? "SUSPENDED" : "ACTIVE"} label={tenantPaused ? "Paused" : "Trading"} />
              </dd>
              {tenantPaused && pause?.tenantPauseReason ? (
                <dd className="mt-1 text-xs text-[#6f6265]">{pause.tenantPauseReason}</dd>
              ) : null}
            </div>
            <div className="rounded-xl border border-[#efe5e1] bg-[#fcf9f8] px-3 py-2.5">
              <dt className="text-xs text-[#8a7c80]">Platform:</dt>
              <dd className="mt-1">
                <StatusBadge status={pause?.platformPaused ? "SUSPENDED" : "ACTIVE"} label={pause?.platformPaused ? "Paused" : "Running"} />
              </dd>
              {pause?.platformPaused && pause?.platformPauseReason ? (
                <dd className="mt-1 text-xs text-[#6f6265]">{pause.platformPauseReason}</dd>
              ) : null}
            </div>
          </dl>
          {!tenantPaused ? (
            <div className="space-y-2">
              <label htmlFor="dm-pause-reason" className="text-sm font-medium text-[#4f3d41]">
                Reason customers will see
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="dm-pause-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Rate update in progress"
                  className="h-10 rounded-xl"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                  disabled={pauseState.isLoading || reason.trim().length < 3}
                  onClick={() => togglePause(true)}
                >
                  <CirclePause /> Pause trading
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              className="h-10 rounded-xl"
              disabled={pauseState.isLoading}
              onClick={() => togglePause(false)}
            >
              <CirclePlay /> Resume trading
            </Button>
          )}
        </div>
      </Surface>

      <Surface
        icon={LifeBuoy}
        title="Recovery queue"
        description="Retries re-send notifications or rebuild PDFs — they never repeat a payment or settlement."
        data-testid="digital-metals-work-queue"
      >
        {summary ? (
          <dl className="grid grid-cols-2 gap-px bg-[#f1e8e5] text-sm sm:grid-cols-4">
            {[
              ["Waiting", summary.outboxPending],
              ["Failed", summary.outboxFailed],
              ["Stale", summary.outboxLeaseStale],
              ["Stuck PDFs", summary.documentsRetryable],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-white px-4 py-3">
                <dt className="text-xs text-[#8a7c80]">{label}</dt>
                <dd className={`mt-0.5 text-lg font-bold tabular-nums ${Number(value) > 0 && label !== "Waiting" ? "text-red-700" : "text-[#28161a]"}`}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        {workQueue.isLoading ? (
          <p className="px-5 py-4 text-sm text-[#7a6d70]">Loading…</p>
        ) : items.length === 0 ? (
          <p className="px-5 py-4 text-sm text-[#7a6d70]">Nothing waiting. Background work is healthy.</p>
        ) : (
          <ul className="divide-y divide-[#f3eae7] border-t border-[#efe5e1] text-sm">
            {items.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[#28161a]">
                    {humanTopic(item.kind === "OUTBOX" ? item.topic : item.docType)}
                  </p>
                  <p className="text-xs text-[#857a7d]">
                    {item.kind === "OUTBOX" ? "Notification" : "Document"} · waiting {formatAge(item.ageMs)}
                    {item.lastError ? ` · ${item.lastError}` : ""}
                  </p>
                </div>
                <StatusBadge status={item.status} />
                {item.safeActions.includes("RETRY_OUTBOX") ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    disabled={retryOutboxState.isLoading}
                    onClick={() => onRetryOutbox(item.id)}
                  >
                    <RotateCcw /> Retry
                  </Button>
                ) : null}
                {item.safeActions.includes("RETRY_DOCUMENT") ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    disabled={retryDocState.isLoading}
                    onClick={() => onRetryDocument(item.id)}
                  >
                    <RotateCcw /> Rebuild PDF
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
