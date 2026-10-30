"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CalendarCheck, FileText, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { EmptyState, QueryError } from "@/src/components/common/query-state";
import { Notice } from "@/src/components/admin-ui/detail-parts";
import { toastApiError } from "@/src/lib/api-error";
import { newIdempotencyKey } from "@/src/lib/idempotency";
import { contractPayload } from "@/src/store/api/contract-adapters";
import {
  useCloseDigitalMetalsHedgeDayMutation,
  useGetDigitalMetalsHedgeInvalidatedQuery,
  useGetDigitalMetalsHedgeLiveQuery,
} from "@/src/store/api/admin-api";
import { cn } from "@/lib/utils";
import { useDigitalMetalsServerEntitlement } from "./digital-metals-admin-shared";
import { DM_SECTION, DmGate, MetalPill, dmWeight } from "./digital-metals-admin-ui";

type HedgeLine = Record<string, unknown>;

function CoverageCard({ line }: { line: HedgeLine }) {
  const obligation = Number(line.closingObligationUg ?? 0);
  const hedge = Number(line.closingHedgePositionUg ?? 0);
  const uncovered = Number(line.uncoveredUg ?? 0);
  const pct = obligation > 0 ? Math.min(100, (hedge / obligation) * 100) : 100;
  const short = uncovered > 0;
  return (
    <article className="overflow-hidden rounded-[1.15rem] border border-[#e8dcd7] bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-[#f3eae7] px-5 py-4">
        <div className="flex items-center gap-2">
          <MetalPill metal={String(line.metal)} />
          <span className="text-sm text-[#857a7d]">{(Number(line.finenessPpm ?? 0) / 10_000).toFixed(1)}% fine</span>
        </div>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", short ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700")}>
          {short ? `${dmWeight(String(uncovered))} uncovered` : "Fully covered"}
        </span>
      </div>
      <div className="space-y-4 px-5 py-4">
        <div>
          <div className="mb-1.5 flex items-baseline justify-between text-sm">
            <span className="text-[#6f6265]">Coverage</span>
            <span className="font-bold tabular-nums text-[#28161a]">{pct.toFixed(1)}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[#f3ebe8]" role="meter" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Hedge coverage">
            <div
              className={cn("h-full rounded-full", short ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-gradient-to-r from-[#d6b46e] to-[#b8862f]")}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-xs text-[#8a7c80]">Customers own</dt>
            <dd className="mt-0.5 font-bold tabular-nums">{dmWeight(String(obligation))}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#8a7c80]">You hold</dt>
            <dd className="mt-0.5 font-bold tabular-nums">{dmWeight(String(hedge))}</dd>
          </div>
          <div>
            <dt className="text-xs text-[#8a7c80]">Gap</dt>
            <dd className={cn("mt-0.5 font-bold tabular-nums", short ? "text-amber-700" : "text-emerald-700")}>{dmWeight(String(uncovered))}</dd>
          </div>
        </dl>
        {line.coverageIncomplete === true ? (
          <Notice tone="amber" icon={AlertTriangle}>
            Opening position is incomplete — don&apos;t treat this as zero exposure. Record an opening position in Procurement.
          </Notice>
        ) : null}
        {line.walletReconcileDeltaUg ? (
          <p className="text-xs text-[#857a7d]">Wallet reconcile difference: {dmWeight(String(line.walletReconcileDeltaUg))}</p>
        ) : null}
      </div>
    </article>
  );
}

export function DigitalMetalsHedgePage() {
  const ent = useDigitalMetalsServerEntitlement();
  const live = useGetDigitalMetalsHedgeLiveQuery(undefined, { skip: !ent.workspaceVisible });
  const invalidated = useGetDigitalMetalsHedgeInvalidatedQuery(undefined, { skip: !ent.workspaceVisible });
  const [closeDay, closeState] = useCloseDigitalMetalsHedgeDayMutation();
  const [revisionReason, setRevisionReason] = useState("");
  const [closeBusinessDate, setCloseBusinessDate] = useState("");

  const liveData = contractPayload(live.data) as Record<string, unknown> | undefined;
  const invalidItems = ((contractPayload(invalidated.data) as { items?: Record<string, unknown>[] } | undefined)?.items ?? []) as Record<string, unknown>[];
  const showRecomputeBanner = liveData?.recomputationRequired === true || invalidItems.length > 0;
  const lines = (liveData?.lines ?? []) as HedgeLine[];

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
    <DmGate loading={ent.loading || live.isLoading} visible={ent.workspaceVisible} message={ent.disabledMessage} title="Hedge book">
      <div className="space-y-6" data-testid="digital-metals-hedge">
        <PageHeader
          eyebrow={DM_SECTION}
          icon={TrendingUp}
          title="Hedge book"
          description="How much metal customers own versus the physical metal you've received — live, on the IST business calendar."
          meta={liveData?.businessDate ? <span>Business date {String(liveData.businessDate)}</span> : undefined}
          actions={
            <Button variant="outline" asChild className="rounded-xl">
              <Link href="/digital-metals/procurement">
                <FileText /> Procurement journal
              </Link>
            </Button>
          }
        />
        {showRecomputeBanner ? (
          <Notice tone="amber" icon={AlertTriangle} title="Re-close needed">
            {typeof liveData?.invalidationNotice === "string"
              ? liveData.invalidationNotice
              : "Later snapshots were invalidated by a revision. Re-close the affected business dates below before using totals."}
          </Notice>
        ) : null}
        {live.isError ? <QueryError error={live.error} onRetry={live.refetch} /> : null}
        {lines.length === 0 && !live.isError ? (
          <div className="rounded-[1.15rem] border border-[#e8dcd7] bg-white">
            <EmptyState icon={TrendingUp} title="No positions yet" detail="Positions appear after the first customer purchase or an opening position." />
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {lines.map((line) => (
              <CoverageCard key={`${String(line.metal)}-${String(line.finenessPpm)}`} line={line} />
            ))}
          </div>
        )}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <Surface icon={CalendarCheck} title="Close a business day" description="Records an end-of-day snapshot. Re-closing a day needs a reason.">
            <div className="grid gap-3 px-5 py-4 sm:grid-cols-[11rem_minmax(0,1fr)_auto] sm:items-end">
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-[#4f3d41]">Business date (IST)</span>
                <Input type="date" value={closeBusinessDate} onChange={(e) => setCloseBusinessDate(e.target.value)} className="h-10 rounded-xl" />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-[#4f3d41]">Reason (when re-closing)</span>
                <Input
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  placeholder="Required when replacing a closed day"
                  className="h-10 rounded-xl"
                />
              </label>
              <Button type="button" className="h-10 rounded-xl" disabled={closeState.isLoading} onClick={() => void onCloseDay()}>
                Close day
              </Button>
            </div>
          </Surface>
          <Surface title="Snapshots to re-close" description="Invalidated by a later revision">
            {invalidItems.length === 0 ? (
              <p className="px-5 py-4 text-sm text-[#7a6d70]">None — every closed day is current.</p>
            ) : (
              <ul className="divide-y divide-[#f3eae7] text-sm">
                {invalidItems.map((row) => (
                  <li key={String(row.id)} className="flex items-center justify-between px-5 py-2.5">
                    <span className="font-medium">{String(row.businessDate)}</span>
                    <span className="flex items-center gap-2 text-[#857a7d]">
                      <MetalPill metal={String(row.metal)} /> v{String(row.snapshotVersion)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Surface>
        </div>
      </div>
    </DmGate>
  );
}
