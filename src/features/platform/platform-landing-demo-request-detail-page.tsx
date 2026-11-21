"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FieldLabel, PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import {
  useGetLandingDemoRequestQuery,
  useLazyGetLandingDemoShareLinkQuery,
  usePatchLandingDemoRequestMutation,
  useRetryLandingDemoProvisionMutation,
} from "@/src/store/api/platform-api";
import type { LandingDemoRequestStatus } from "@/src/types/platform";

function ColorSwatchPlain({ label, hex }: { label: string; hex: string | null }) {
  if (!hex) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="size-8 rounded-md border border-[#e5d5d8]" style={{ background: hex }} />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7a7d]">{label}</p>
        <p className="font-mono text-sm text-[#2d191d]">{hex}</p>
      </div>
    </div>
  );
}

export function PlatformLandingDemoRequestDetailPage({ requestId }: { requestId: string }) {
  const [patch, patchState] = usePatchLandingDemoRequestMutation();
  const [retry, retryState] = useRetryLandingDemoProvisionMutation();
  const [fetchLink, linkState] = useLazyGetLandingDemoShareLinkQuery();
  const [pollMs, setPollMs] = useState(0);
  const query = useGetLandingDemoRequestQuery(requestId, { pollingInterval: pollMs });
  const data = query.data;

  useEffect(() => {
    const busy =
      data?.provisionStatus === "RUNNING" ||
      data?.provisionStatus === "PENDING" ||
      data?.demoInstanceStatus === "PROVISIONING";
    setPollMs(busy ? 4000 : 0);
  }, [data?.provisionStatus, data?.demoInstanceStatus]);

  const [status, setStatus] = useState<LandingDemoRequestStatus | "">("");
  const [notes, setNotes] = useState("");
  const [demoSent, setDemoSent] = useState(false);

  useEffect(() => {
    if (!data) return;
    setDemoSent(data.demoSent);
    setStatus(data.status);
    setNotes(data.notes ?? "");
  }, [data]);

  if (query.isLoading) return <PageSkeleton cards={2} />;
  if (query.isError || !data) return <QueryError error={query.error} onRetry={query.refetch} />;

  const effectiveStatus = (status || data.status) as LandingDemoRequestStatus;

  const save = async () => {
    if (effectiveStatus === "ARCHIVED" && !demoSent) {
      toast.error("Mark “Demo sent to prospect” before archiving.");
      return;
    }
    try {
      await patch({
        requestId,
        body: {
          status: effectiveStatus,
          notes: notes.trim() || undefined,
          demoSent,
        },
      }).unwrap();
      toast.success("Request updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  };

  const copyShareLink = async () => {
    try {
      const link = await fetchLink(requestId).unwrap();
      const url = link.shareUrl?.startsWith("http")
        ? link.shareUrl
        : `${window.location.origin}${link.sharePath}`;
      await navigator.clipboard.writeText(url);
      toast.success("Demo link copied — share when the instance shows Ready.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not fetch the demo link");
    }
  };

  return (
    <>
      <PageHeader
        back={{ href: "/platform/demos/requests", label: "Demo requests" }}
        title={data.brandName || data.showroom}
        description={`Submitted ${data.submittedAt ? new Date(data.submittedAt).toLocaleString("en-IN") : ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={data.status} />
            <StatusBadge status={data.provisionStatus} />
            {data.demoInstanceStatus ? <StatusBadge status={data.demoInstanceStatus} /> : null}
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Surface className="space-y-5 p-6 text-sm">
          <dl className="grid gap-3 sm:grid-cols-2">
            {[
              ["Phone", data.phone],
              ["Location", data.location || "—"],
              ["Customer band", data.customers || "—"],
              ["Plan", data.planTag ? `${data.planTag} (${data.planPrice})` : "—"],
              ["Setup fee quoted", data.setupFee || "—"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#8a7a7d]">{label}</dt>
                <dd className="mt-1 font-medium text-[#2d191d]">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="grid gap-3 sm:grid-cols-3">
            <ColorSwatchPlain label="Primary" hex={data.autoPrimaryColor} />
            <ColorSwatchPlain label="Accent" hex={data.autoAccentColor} />
            <ColorSwatchPlain label="Splash bg" hex={data.autoSplashBackgroundColor} />
          </div>
          {data.logoDataUrl ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7a7d]">Logo</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.logoDataUrl}
                alt={data.logoFileName || "Uploaded logo"}
                className="mt-2 max-h-40 rounded-lg border border-[#ead9dc] bg-white object-contain p-2"
              />
            </div>
          ) : null}
          {data.provisionError ? (
            <p className="rounded-lg bg-[#fff0f2] px-3 py-2 text-xs text-[#8b1c35]">{data.provisionError}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {data.demoInstanceId ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/platform/demos/instances/${data.demoInstanceId}`}>Open demo instance</Link>
              </Button>
            ) : null}
            {data.demoInstanceId ? (
              <Button variant="outline" size="sm" onClick={copyShareLink} disabled={linkState.isFetching}>
                <Copy className="size-4" />
                Copy share link
              </Button>
            ) : null}
            {!data.demoInstanceId && (data.provisionStatus === "FAILED" || data.provisionStatus === "SKIPPED") ? (
              <Button
                size="sm"
                onClick={() =>
                  retry(requestId)
                    .unwrap()
                    .then(() => toast.success("Provisioning started"))
                    .catch((e) => toast.error(e instanceof Error ? e.message : "Retry failed"))
                }
                disabled={retryState.isLoading}
              >
                <RefreshCw className="size-4" />
                Retry auto-provision
              </Button>
            ) : null}
          </div>
        </Surface>
        <Surface className="space-y-4 p-6">
          <FieldLabel>Workflow status</FieldLabel>
          <Select value={effectiveStatus} onValueChange={(v) => setStatus(v as LandingDemoRequestStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="CONTACTED">Contacted</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
          <FieldLabel>Internal notes</FieldLabel>
          <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Follow-up notes…" />
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#ead9dc] bg-[#fff9fa] p-3">
            <Checkbox checked={demoSent} onCheckedChange={(v) => setDemoSent(v === true)} className="mt-0.5" />
            <span className="text-sm leading-snug text-[#2d191d]">
              <strong>Demo link sent to prospect</strong> (required before you archive this lead)
            </span>
          </label>
          {!demoSent ? (
            <p className="text-xs text-[#8b5f08]">Check this after you share the branded demo URL.</p>
          ) : null}
          <Button onClick={save} disabled={patchState.isLoading} className="w-full">
            Save
          </Button>
        </Surface>
      </div>
    </>
  );
}