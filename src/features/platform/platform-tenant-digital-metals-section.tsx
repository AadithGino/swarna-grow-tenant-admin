"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionDialog } from "@/src/components/common/action-dialog";
import { FieldLabel, Surface } from "@/src/components/common/page-parts";
import { QueryError, PageSkeleton } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { handleFormApiError } from "@/src/lib/form-api-error";
import {
  useGetPlatformDigitalMetalsStatusQuery,
  usePausePlatformDigitalMetalsMutation,
  useApprovePlatformDigitalMetalsTaxMutation,
  usePublishPlatformDigitalMetalsTermsMutation,
} from "@/src/store/api/platform-api";

export function PlatformTenantDigitalMetalsSection({ tenantId }: { tenantId: string }) {
  const status = useGetPlatformDigitalMetalsStatusQuery(tenantId);
  const [pauseMut] = usePausePlatformDigitalMetalsMutation();
  const [taxMut] = useApprovePlatformDigitalMetalsTaxMutation();
  const [termsMut] = usePublishPlatformDigitalMetalsTermsMutation();
  const [pauseReason, setPauseReason] = useState("");
  const [termsVersion, setTermsVersion] = useState("");
  const [termsContentRef, setTermsContentRef] = useState("");
  const [termsContentSnapshot, setTermsContentSnapshot] = useState("");

  if (status.isLoading) return <PageSkeleton cards={2} />;
  if (status.isError || !status.data) {
    return <QueryError error={status.error} onRetry={status.refetch} />;
  }

  const data = status.data as {
    operations?: Record<string, unknown>;
    entitlement?: { planEntitled?: boolean };
    capability?: {
      blockers?: { code: string; message: string }[];
      canPlaceNewBuy?: boolean;
      canViewHoldings?: boolean;
    };
  };
  const ops = data.operations ?? {};
  const cap = data.capability ?? {};
  const blockers = cap.blockers ?? [];

  return (
    <Surface
      title="Digital Gold & Silver"
      description="Platform entitlement, tenant enablement, operational pauses and live-trading readiness (server-authoritative)."
    >
      <div className="space-y-5 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Info label="Plan entitled" value={data.entitlement?.planEntitled ? "Yes" : "No"} />
          <Info label="Tenant module enabled" value={ops.digitalMetalsEnabled === true ? "Yes" : "No"} />
          <Info
            label="Tenant pause"
            value={
              ops.digitalMetalsPaused === true
                ? String(ops.digitalMetalsPauseReason || "Paused")
                : "Not paused"
            }
          />
          <Info
            label="Platform pause"
            value={
              ops.digitalMetalsPlatformPaused === true
                ? String(ops.digitalMetalsPlatformPauseReason || "Paused")
                : "Not paused"
            }
          />
          <Info
            label="Tax profile approved"
            value={ops.digitalMetalsTaxProfileApprovedAt ? "Yes (platform)" : "No"}
          />
          <Info label="Published terms version" value={String(ops.digitalMetalsTermsVersion || "—")} />
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Capability blockers</p>
          {blockers.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#5c3d42]">
              {blockers.map((b) => (
                <li key={b.code}>
                  <span className="font-mono text-xs">{b.code}</span> — {b.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No blockers reported.</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusBadge
            status={cap.canPlaceNewBuy ? "ACTIVE" : "PENDING"}
            label={cap.canPlaceNewBuy ? "New trading allowed" : "New trading blocked"}
          />
          <StatusBadge
            status={cap.canViewHoldings ? "ACTIVE" : "INACTIVE"}
            label={cap.canViewHoldings ? "Holdings/history access" : "No holdings access"}
          />
        </div>

        <div className="grid gap-4 border-t pt-4 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="font-semibold">Platform operational pause</p>
            {ops.digitalMetalsPlatformPaused === true ? (
              <Button
                variant="outline"
                onClick={() =>
                  void pauseMut({ tenantId, pause: false })
                    .unwrap()
                    .then(() => toast.success("Platform pause cleared"))
                    .catch((e) => handleFormApiError(e, { fallback: "Resume failed" }))
                }
              >
                Resume platform trading
              </Button>
            ) : (
              <ActionDialog
                trigger={<Button variant="outline">Pause platform trading</Button>}
                title="Pause digital metals (platform)"
                description="Blocks new buy/sell/redemption; legacy holdings and settlement paths remain."
                actionLabel="Pause"
                onSubmit={async () => {
                  await pauseMut({ tenantId, pause: true, reason: pauseReason }).unwrap();
                  toast.success("Platform pause applied");
                }}
              >
                <FieldLabel>Reason</FieldLabel>
                <Input value={pauseReason} onChange={(e) => setPauseReason(e.target.value)} />
              </ActionDialog>
            )}
          </div>

          <div className="space-y-3">
            <p className="font-semibold">Live readiness (platform only)</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  void taxMut({ tenantId, approve: !ops.digitalMetalsTaxProfileApprovedAt })
                    .unwrap()
                    .then(() => toast.success("Tax approval updated"))
                    .catch((e) => handleFormApiError(e, { fallback: "Tax approval failed" }))
                }
              >
                {ops.digitalMetalsTaxProfileApprovedAt ? "Revoke tax approval" : "Approve tax profile"}
              </Button>
            </div>
            <FieldLabel>Publish customer terms (immutable content ref)</FieldLabel>
            <div className="flex flex-col gap-2">
              <Input
                value={termsVersion}
                onChange={(e) => setTermsVersion(e.target.value)}
                placeholder="Version label e.g. 2026-10-01"
              />
              <textarea
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={termsContentSnapshot}
                onChange={(e) => setTermsContentSnapshot(e.target.value)}
                placeholder="Immutable terms body (stored server-side; hash computed from this text)"
              />
              <Input
                value={termsContentRef}
                onChange={(e) => setTermsContentRef(e.target.value)}
                placeholder="Optional display ref e.g. s3://terms/v2026-10-01.pdf"
              />
              <Button
                size="sm"
                disabled={!termsVersion.trim() || termsContentSnapshot.trim().length < 32}
                onClick={() =>
                  void termsMut({
                    tenantId,
                    termsVersion: termsVersion.trim(),
                    contentSnapshot: termsContentSnapshot.trim(),
                    contentRef: termsContentRef.trim(),
                  })
                    .unwrap()
                    .then(() => toast.success("Terms version published"))
                    .catch((e) => handleFormApiError(e, { fallback: "Publish failed" }))
                }
              >
                Publish
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Surface>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
