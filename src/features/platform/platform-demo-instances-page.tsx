"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Copy, Link2, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ActionDialog } from "@/src/components/common/action-dialog";
import { DataTable, type DataColumn } from "@/src/components/common/data-table";
import { FieldLabel, PageHeader, StatCard, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { handleFormApiError } from "@/src/lib/form-api-error";
import {
  useCreateDemoInstanceMutation,
  useGetDemoInstancesQuery,
  useGetDemoTemplatesQuery,
} from "@/src/store/api/platform-api";
import type { DemoInstance } from "@/src/types/platform";
import { DemoLogoField } from "@/src/features/demo/demo-logo-field";

function demoShareLink(publicId: string, secret: string) {
  if (typeof window === "undefined") return `/demo/${publicId}?s=${encodeURIComponent(secret)}`;
  return `${window.location.origin}/demo/${publicId}?s=${encodeURIComponent(secret)}`;
}

export function PlatformDemoInstancesPage() {
  const searchParams = useSearchParams();
  const openCreate = searchParams.get("templateId") != null || searchParams.get("new") != null;
  const [createOpen, setCreateOpen] = useState(openCreate);
  const [pollingInterval, setPollingInterval] = useState(0);
  const query = useGetDemoInstancesQuery(undefined, {
    pollingInterval,
    refetchOnMountOrArgChange: true,
  });

  useEffect(() => {
    const rows = query.data?.rows ?? [];
    const busy = rows.some((r) => r.status === "PROVISIONING" || r.status === "RESETTING");
    setPollingInterval(busy ? 4000 : 0);
  }, [query.data]);

  if (query.isLoading) return <PageSkeleton cards={3} />;
  if (query.isError) return <QueryError error={query.error} onRetry={query.refetch} />;

  const rows = query.data?.rows ?? [];
  const readyCount = rows.filter((r) => r.status === "READY").length;
  const disabledCount = rows.filter((r) => r.status === "DISABLED").length;

  const columns: DataColumn<DemoInstance>[] = [
    {
      key: "prospectName",
      header: "Prospect",
      render: (row) => (
        <Link href={`/platform/demos/instances/${row.id}`} className="font-semibold text-[#2d191d] hover:underline">
          {row.prospectName}
        </Link>
      ),
    },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "publicId", header: "Link id", render: (row) => <code className="text-xs">{row.publicId}</code> },
    { key: "expiresAt", header: "Expires", render: (row) => new Date(row.expiresAt).toLocaleDateString("en-IN") },
    { key: "lastOpenedAt", header: "Last opened", render: (row) => (row.lastOpenedAt ? new Date(row.lastOpenedAt).toLocaleString("en-IN") : "Never") },
  ];

  return (
    <>
      <PageHeader
        back={{ href: "/platform/demos", label: "Demo Builder" }}
        title="Demo instances"
        description="Each instance is an isolated, cloned tenant served under its own branded share link."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Rocket />
            Create demo instance
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={Rocket} label="Total instances" value={rows.length} detail="Across all templates" />
        <StatCard icon={Check} label="Ready" value={readyCount} detail="Live and shareable" tone="green" />
        <StatCard icon={Link2} label="Disabled" value={disabledCount} detail="Link blocked" tone="cream" />
      </div>
      <Surface title="All demo instances">
        <DataTable columns={columns} rows={rows} emptyTitle="No demo instances yet" />
      </Surface>
      <CreateDemoInstanceDialog open={createOpen} onOpenChange={setCreateOpen} defaultTemplateId={searchParams.get("templateId") ?? ""} />
    </>
  );
}

function CreateDemoInstanceDialog({
  open,
  onOpenChange,
  defaultTemplateId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultTemplateId: string;
}) {
  const router = useRouter();
  const templatesQuery = useGetDemoTemplatesQuery(undefined, { skip: !open });
  const [create] = useCreateDemoInstanceMutation();
  const [templateId, setTemplateId] = useState(defaultTemplateId);
  const [prospectName, setProspectName] = useState("");
  const [prospectContactMobile, setProspectContactMobile] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#730321");
  const [accentColor, setAccentColor] = useState("#C9A227");
  const [splashTagline, setSplashTagline] = useState("");
  const [splashBackgroundColor, setSplashBackgroundColor] = useState("#fbf1f3");
  const [logoUploadId, setLogoUploadId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ publicId: string; linkSecret: string } | null>(null);

  const publishedTemplates = useMemo(
    () => (templatesQuery.data ?? []).filter((t) => t.currentPublishedVersionId),
    [templatesQuery.data],
  );

  const reset = () => {
    setTemplateId(defaultTemplateId);
    setProspectName("");
    setProspectContactMobile("");
    setDisplayName("");
    setSplashTagline("");
    setSplashBackgroundColor("#fbf1f3");
    setLogoUploadId(null);
    setErrors({});
    setResult(null);
  };

  if (result) {
    const link = demoShareLink(result.publicId, result.linkSecret);
    return (
      <ActionDialog
        open={open}
        onOpenChange={(v) => {
          onOpenChange(v);
          if (!v) {
            reset();
            router.replace("/platform/demos/instances");
          }
        }}
        title="Demo link created"
        description="Copy the link now — the secret is shown only once. The clone finishes in the background; wait until status is Ready before sharing."
        actionLabel="Done"
        onSubmit={() => {
          onOpenChange(false);
          reset();
          router.replace("/platform/demos/instances");
        }}
      >
        <div className="space-y-3">
          <div>
            <FieldLabel>Share link</FieldLabel>
            <div className="flex gap-2">
              <Input readOnly value={link} className="font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                onClick={async () => {
                  await navigator.clipboard.writeText(link);
                  toast.success("Link copied");
                }}
              >
                <Copy />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Status starts as Provisioning while ~1–2k demo records are cloned. The table refreshes automatically; the link works once Ready.
          </p>
        </div>
      </ActionDialog>
    );
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
      title="Create a demo instance"
      description="Clones the template's published snapshot into a new, isolated tenant and returns a shareable branded link."
      actionLabel="Create demo"
      submitDisabled={!templateId || !prospectName.trim()}
      onSubmit={async () => {
        if (!templateId || !prospectName.trim()) return false;
        try {
          const response = await create({
            templateId,
            prospectName: prospectName.trim(),
            ...(prospectContactMobile.trim() ? { prospectContactMobile: prospectContactMobile.trim() } : {}),
            branding: {
              ...(displayName.trim() ? { displayName: displayName.trim() } : {}),
              primaryColor,
              accentColor,
              ...(splashTagline.trim() ? { splashTagline: splashTagline.trim() } : {}),
              ...(splashBackgroundColor.trim() ? { splashBackgroundColor: splashBackgroundColor.trim() } : {}),
              ...(logoUploadId ? { logoUploadId } : {}),
            },
          }).unwrap();
          toast.success("Demo created — provisioning in background");
          setResult({ publicId: response.instance.publicId, linkSecret: response.linkSecret });
          return false; // keep dialog open to show the link
        } catch (err) {
          handleFormApiError(err, { setFieldErrors: setErrors, fallback: "Could not create this demo instance" });
          return false;
        }
      }}
    >
      <div className="space-y-4">
        <div>
          <FieldLabel>Template</FieldLabel>
          <Select value={templateId} onValueChange={setTemplateId} disabled={publishedTemplates.length === 0}>
            <SelectTrigger>
              <SelectValue
                placeholder={
                  publishedTemplates.length === 0
                    ? "No published templates yet"
                    : "Select a published template"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {publishedTemplates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {publishedTemplates.length === 0 ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Go to{" "}
              <a href="/platform/demos" className="font-medium text-[#730321] underline-offset-2 hover:underline">
                Demo templates
              </a>
              , then click <span className="font-medium">Publish</span> on a registered template first.
            </p>
          ) : null}
          <FormFieldError message={errors.templateId} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Prospect / business name</FieldLabel>
            <Input value={prospectName} onChange={(e) => setProspectName(e.target.value)} placeholder="e.g. Acme Jewels" />
            <FormFieldError message={errors.prospectName} />
          </div>
          <div>
            <FieldLabel>Prospect contact mobile (optional)</FieldLabel>
            <Input value={prospectContactMobile} onChange={(e) => setProspectContactMobile(e.target.value)} placeholder="+91 98xxxxxxx" />
            <FormFieldError message={errors.prospectContactMobile} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Branded display name (optional)</FieldLabel>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Shown in the customer app header" />
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
            <FieldLabel>Splash tagline (optional)</FieldLabel>
            <Textarea value={splashTagline} onChange={(e) => setSplashTagline(e.target.value)} rows={2} placeholder="Your gold savings, simplified" />
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
        <DemoLogoField logoUploadId={logoUploadId} onChange={setLogoUploadId} />
      </div>
    </ActionDialog>
  );
}
