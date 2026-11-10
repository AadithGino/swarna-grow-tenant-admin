"use client";

import { useState } from "react";
import { Ban, Copy, FileWarning, Play, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldLabel, PageHeader, StatCard, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { handleFormApiError } from "@/src/lib/form-api-error";
import {
  useCopyDemoInstanceLinkMutation,
  useDisableDemoInstanceMutation,
  useGetDemoInstanceQuery,
  useReactivateDemoInstanceMutation,
  useRotateDemoInstanceLinkMutation,
  useUpdateDemoInstanceMutation,
} from "@/src/store/api/platform-api";
import { DemoLogoField } from "@/src/features/demo/demo-logo-field";

function demoShareLink(publicId: string, secret: string) {
  if (typeof window === "undefined") return `/demo/${publicId}?s=${encodeURIComponent(secret)}`;
  return `${window.location.origin}/demo/${publicId}?s=${encodeURIComponent(secret)}`;
}

export function PlatformDemoInstanceDetailPage({ instanceId }: { instanceId: string }) {
  const query = useGetDemoInstanceQuery(instanceId);
  const [update, updateState] = useUpdateDemoInstanceMutation();
  const [rotateLink, rotateState] = useRotateDemoInstanceLinkMutation();
  const [copyLink, copyState] = useCopyDemoInstanceLinkMutation();
  const [disable, disableState] = useDisableDemoInstanceMutation();
  const [reactivate, reactivateState] = useReactivateDemoInstanceMutation();
  const [revealedLink, setRevealedLink] = useState<string | null>(null);

  const instance = query.data;
  const [displayName, setDisplayName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [splashTagline, setSplashTagline] = useState("");
  const [splashBackgroundColor, setSplashBackgroundColor] = useState("#fbf1f3");
  const [logoUploadId, setLogoUploadId] = useState<string | null>(null);
  const [seededId, setSeededId] = useState<string | null>(null);

  if (instance && seededId !== instance.id) {
    setDisplayName(instance.branding.displayName ?? "");
    setPrimaryColor(instance.branding.primaryColor ?? "#730321");
    setAccentColor(instance.branding.accentColor ?? "#C9A227");
    setSplashTagline(instance.branding.splashTagline ?? "");
    setSplashBackgroundColor(instance.branding.splashBackgroundColor ?? "#fbf1f3");
    setLogoUploadId(instance.branding.logoUploadId ?? null);
    setSeededId(instance.id);
  }

  if (query.isLoading) return <PageSkeleton cards={2} />;
  if (query.isError) return <QueryError error={query.error} onRetry={query.refetch} />;
  if (!instance) return null;

  const saveBranding = async () => {
    try {
      await update({
        instanceId: instance.id,
        body: {
          expectedVersion: instance.version,
          branding: {
            displayName,
            primaryColor,
            accentColor,
            splashTagline,
            splashBackgroundColor,
            logoUploadId,
          },
        },
      }).unwrap();
      toast.success("Branding updated");
    } catch (err) {
      handleFormApiError(err, { fallback: "Could not update branding" });
    }
  };

  return (
    <>
      <PageHeader
        back={{ href: "/platform/demos/instances", label: "Demo instances" }}
        title={instance.prospectName}
        meta={<StatusBadge status={instance.status} />}
        description={`Expires ${new Date(instance.expiresAt).toLocaleDateString("en-IN")} · link id ${instance.publicId}`}
        actions={
          <div className="flex gap-2">
            {instance.status === "DISABLED" ? (
              <Button
                variant="outline"
                disabled={reactivateState.isLoading}
                onClick={async () => {
                  try {
                    await reactivate(instance.id).unwrap();
                    toast.success("Demo instance reactivated");
                  } catch (err) {
                    handleFormApiError(err, { fallback: "Could not reactivate this demo" });
                  }
                }}
              >
                <Play />
                Reactivate
              </Button>
            ) : (
              <Button
                variant="outline"
                className="text-red-700"
                disabled={disableState.isLoading}
                onClick={async () => {
                  try {
                    await disable(instance.id).unwrap();
                    toast.success("Demo instance disabled");
                  } catch (err) {
                    handleFormApiError(err, { fallback: "Could not disable this demo" });
                  }
                }}
              >
                <Ban />
                Disable
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={FileWarning} label="Link version" value={instance.linkVersion} detail="Bumped on every rotation" />
        <StatCard
          icon={Play}
          label="Last opened"
          value={instance.lastOpenedAt ? new Date(instance.lastOpenedAt).toLocaleDateString("en-IN") : "Never"}
          detail="By a prospect visiting the link"
        />
        <StatCard icon={RefreshCw} label="Record version" value={instance.version} detail="Optimistic concurrency version" />
      </div>

      <Surface title="Share link" description="The secret is only recoverable if it was saved at creation time — otherwise, rotate to get a new one.">
        <div className="space-y-3 p-5">
          {revealedLink ? (
            <div className="flex gap-2">
              <Input readOnly value={revealedLink} className="font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                onClick={async () => {
                  await navigator.clipboard.writeText(revealedLink);
                  toast.success("Link copied");
                }}
              >
                <Copy />
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Link id: <code>{instance.publicId}</code></p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={copyState.isLoading}
              onClick={async () => {
                try {
                  const res = await copyLink(instance.id).unwrap();
                  setRevealedLink(demoShareLink(res.publicId, res.linkSecret));
                } catch (err) {
                  handleFormApiError(err, {
                    fallback: "This link's secret wasn't saved for recovery — rotate the link to get a new one",
                  });
                }
              }}
            >
              <Copy />
              Copy existing link
            </Button>
            <Button
              variant="outline"
              disabled={rotateState.isLoading}
              onClick={async () => {
                try {
                  const res = await rotateLink(instance.id).unwrap();
                  setRevealedLink(demoShareLink(res.instance.publicId, res.linkSecret));
                  toast.success("Link rotated — the old link no longer works");
                } catch (err) {
                  handleFormApiError(err, { fallback: "Could not rotate this link" });
                }
              }}
            >
              <RefreshCw />
              Rotate link
            </Button>
          </div>
        </div>
      </Surface>

      <Surface title="Branding" description="Changes apply immediately to the live demo tenant.">
        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Display name</FieldLabel>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <FieldLabel>Primary colour</FieldLabel>
                <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
              </div>
              <div>
                <FieldLabel>Accent colour</FieldLabel>
                <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div>
              <FieldLabel>Splash tagline</FieldLabel>
              <Textarea value={splashTagline} onChange={(e) => setSplashTagline(e.target.value)} rows={2} />
            </div>
            <div>
              <FieldLabel>Splash background</FieldLabel>
              <Input
                type="color"
                value={splashBackgroundColor}
                onChange={(e) => setSplashBackgroundColor(e.target.value)}
                className="h-10 w-16 cursor-pointer p-1"
              />
            </div>
          </div>
          <DemoLogoField
            logoUploadId={logoUploadId}
            onChange={setLogoUploadId}
            disabled={updateState.isLoading}
          />
          <Button onClick={saveBranding} disabled={updateState.isLoading}>
            <Save />
            Save branding
          </Button>
        </div>
      </Surface>
    </>
  );
}
