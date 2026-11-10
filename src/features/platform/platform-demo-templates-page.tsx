"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Rocket, Sparkles, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ActionDialog } from "@/src/components/common/action-dialog";
import { DataTable, type DataColumn } from "@/src/components/common/data-table";
import { FieldLabel, PageHeader, StatCard, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { handleFormApiError } from "@/src/lib/form-api-error";
import {
  useGetDemoTemplatesQuery,
  useGetPlatformTenantsQuery,
  usePublishDemoTemplateVersionMutation,
  useRegisterDemoTemplateMutation,
} from "@/src/store/api/platform-api";
import type { DemoTemplate } from "@/src/types/platform";

export function PlatformDemoTemplatesPage() {
  const query = useGetDemoTemplatesQuery();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [publish, publishState] = usePublishDemoTemplateVersionMutation();

  if (query.isLoading) return <PageSkeleton cards={3} />;
  if (query.isError) return <QueryError error={query.error} onRetry={query.refetch} />;

  const templates = query.data ?? [];
  const activeCount = templates.filter((t) => t.status === "ACTIVE").length;
  const draftCount = templates.filter((t) => t.status === "DRAFT").length;

  const columns: DataColumn<DemoTemplate>[] = [
    {
      key: "name",
      header: "Template",
      render: (row) => (
        <Link href={`/platform/demos/templates/${row.id}`} className="font-semibold text-[#2d191d] hover:underline">
          {row.name}
        </Link>
      ),
    },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "version",
      header: "Published version",
      render: (row) => (row.currentPublishedVersionId ? "Published" : "Not published yet"),
    },
    { key: "source", header: "Source tenant", render: (row) => row.approvedSourceTenantId },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={publishState.isLoading}
            onClick={async (e) => {
              e.stopPropagation();
              const templateId = row.id || (row as { _id?: string })._id;
              if (!templateId) {
                toast.error("This template has no id — refresh the page and try again.");
                return;
              }
              try {
                await publish(templateId).unwrap();
                toast.success("New template version published");
              } catch (err) {
                handleFormApiError(err, { fallback: "Could not publish this template" });
              }
            }}
          >
            <UploadCloud />
            Publish
          </Button>
          <Button size="sm" asChild>
            <Link href={`/platform/demos/instances/new?templateId=${row.id}`}>
              <Rocket />
              Create demo
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Demo Builder"
        title="Demo templates"
        description="Register an approved tenant as a demo master, then publish a snapshot before creating prospect demo links."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/platform/demos/instances">View demo instances</Link>
            </Button>
            <Button onClick={() => setRegisterOpen(true)}>
              <Sparkles />
              Register template
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={Sparkles} label="Templates" value={templates.length} detail="Registered demo masters" />
        <StatCard icon={UploadCloud} label="Published" value={activeCount} detail="Ready to create demos from" tone="green" />
        <StatCard icon={Rocket} label="Draft" value={draftCount} detail="Awaiting first publish" tone="cream" />
      </div>
      <Surface title="All templates">
        <DataTable columns={columns} rows={templates} emptyTitle="No demo templates registered yet" />
      </Surface>
      <RegisterTemplateDialog open={registerOpen} onOpenChange={setRegisterOpen} />
    </>
  );
}

function RegisterTemplateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const tenantsQuery = useGetPlatformTenantsQuery({}, { skip: !open });
  const [register] = useRegisterDemoTemplateMutation();
  const [name, setName] = useState("");
  const [sourceTenantId, setSourceTenantId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const tenants = useMemo(
    () => (tenantsQuery.data?.rows ?? []).filter((t) => t.status === "ACTIVE"),
    [tenantsQuery.data],
  );

  return (
    <ActionDialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setName("");
          setSourceTenantId("");
          setErrors({});
        }
      }}
      title="Register a demo template"
      description="Pick an approved, already-live tenant to snapshot. A demo tenant can never be used as a source."
      actionLabel="Register"
      submitDisabled={!name.trim() || !sourceTenantId}
      onSubmit={async () => {
        if (!name.trim() || !sourceTenantId) return false;
        try {
          await register({ name: name.trim(), approvedSourceTenantId: sourceTenantId }).unwrap();
          toast.success("Template registered — publish a version when you're ready");
        } catch (err) {
          handleFormApiError(err, { setFieldErrors: setErrors, fallback: "Could not register this template" });
          return false;
        }
      }}
    >
      <div className="space-y-4">
        <div>
          <FieldLabel>Template name</FieldLabel>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kairali Jewellers — standard demo" />
          <FormFieldError message={errors.name} />
        </div>
        <div>
          <FieldLabel>Approved source tenant</FieldLabel>
          <Select value={sourceTenantId} onValueChange={setSourceTenantId}>
            <SelectTrigger>
              <SelectValue placeholder="Select the live tenant to snapshot" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.businessName} ({t.tenantCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormFieldError message={errors.approvedSourceTenantId} />
        </div>
      </div>
    </ActionDialog>
  );
}
