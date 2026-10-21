"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { toastApiError } from "@/src/lib/api-error";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import {
  useCloseDigitalMetalsHedgeDayMutation,
  useGetDigitalMetalsHedgeInvalidatedQuery,
  useGetDigitalMetalsHedgeLiveQuery,
} from "@/src/store/api/admin-api";
import { useDigitalMetalsServerEntitlement } from "./digital-metals-admin-shared";
import { ugToGramsDisplay } from "@/src/lib/digital-metals-display";

export function DigitalMetalsHedgePage() {
  const ent = useDigitalMetalsServerEntitlement();
  const live = useGetDigitalMetalsHedgeLiveQuery(undefined, { skip: !ent.workspaceVisible });
  const invalidated = useGetDigitalMetalsHedgeInvalidatedQuery(undefined, {
    skip: !ent.workspaceVisible,
  });
  const [closeDay, closeState] = useCloseDigitalMetalsHedgeDayMutation();
  const [revisionReason, setRevisionReason] = useState("");
  const [closeBusinessDate, setCloseBusinessDate] = useState("");

  const showRecomputeBanner =
    live.data?.recomputationRequired === true
    || (invalidated.data?.items?.length ?? 0) > 0;

  if (ent.loading || live.isLoading) return <PageSkeleton cards={2} />;
  if (!ent.workspaceVisible) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">{ent.disabledMessage}</p>
      </div>
    );
  }
  if (live.isError) return <QueryError error={live.error} onRetry={live.refetch} />;

  const lines = (live.data?.lines ?? []) as Record<string, unknown>[];

  async function onCloseDay() {
    try {
      await closeDay({
        idempotencyKey: newIdempotencyKey(),
        ...(closeBusinessDate ? { businessDate: closeBusinessDate } : {}),
        ...(revisionReason.trim() ? { revisionReason: revisionReason.trim() } : {}),
      }).unwrap();
      toast.success("Day-end snapshot recorded.");
      live.refetch();
      invalidated.refetch();
      setRevisionReason("");
    } catch (err) {
      toastApiError(err);
    }
  }

  return (
    <div className="space-y-6 p-6" data-testid="digital-metals-hedge">
      <PageHeader
        title="Hedge dashboard"
        description="Live obligation vs received-metal position (IST business calendar)."
      />
      {showRecomputeBanner ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {typeof live.data?.invalidationNotice === "string"
            ? live.data.invalidationNotice
            : "Later hedge snapshots were invalidated by a revision. Re-close affected business dates below before using totals."}
        </p>
      ) : null}
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs">
          Business date (IST)
          <Input
            type="date"
            className="mt-1 w-auto"
            value={closeBusinessDate}
            onChange={(e) => setCloseBusinessDate(e.target.value)}
          />
        </label>
        <label className="text-xs">
          Revision reason (when re-closing)
          <Input
            className="mt-1 w-64"
            value={revisionReason}
            onChange={(e) => setRevisionReason(e.target.value)}
            placeholder="Required when superseding a closed day"
          />
        </label>
        <Button type="button" size="sm" disabled={closeState.isLoading} onClick={() => void onCloseDay()}>
          Close / re-close business day
        </Button>
      </div>
      <Surface title="Live lines">
        <div className="divide-y">
          {lines.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No wallet assets yet.</p>
          ) : (
            lines.map((line) => (
              <div key={`${line.metal}-${line.finenessPpm}`} className="space-y-1 px-4 py-3 text-sm">
                <p className="font-medium">
                  {String(line.metal)} · {String(line.finenessPpm)} ppm
                </p>
                <p>Obligation: {ugToGramsDisplay(String(line.closingObligationUg ?? "0"))}</p>
                <p>Hedge position: {ugToGramsDisplay(String(line.closingHedgePositionUg ?? "0"))}</p>
                <p>Uncovered: {ugToGramsDisplay(String(line.uncoveredUg ?? "0"))}</p>
                {line.coverageIncomplete === true ? (
                  <p className="text-xs text-amber-700">Opening position incomplete — do not treat as zero exposure.</p>
                ) : null}
                {line.walletReconcileDeltaUg ? (
                  <p className="text-xs text-muted-foreground">
                    Wallet reconcile delta: {ugToGramsDisplay(String(line.walletReconcileDeltaUg))}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </Surface>
      {invalidated.data?.items?.length ? (
        <Surface title="Invalidated snapshots (re-close required)">
          <ul className="divide-y text-sm">
            {invalidated.data.items.map((row) => (
              <li key={String(row.id)} className="px-4 py-2">
                {String(row.businessDate)} · {String(row.metal)} · v{String(row.snapshotVersion)}
              </li>
            ))}
          </ul>
        </Surface>
      ) : null}
    </div>
  );
}
