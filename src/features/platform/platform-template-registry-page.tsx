"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, MessageCircleMore, ShieldCheck } from "lucide-react";
import { PageHeader, StatCard, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { useGetPlatformTenantsQuery, useGetTemplateDefinitionsQuery } from "@/src/store/api/platform-api";
import type { TemplateDefinition } from "@/src/types/platform";

function sortedVariables(def: TemplateDefinition) {
  return [...def.variables].sort((a, b) => a.index - b.index);
}

export function PlatformTemplateRegistryPage() {
  const defs = useGetTemplateDefinitionsQuery();
  const tenants = useGetPlatformTenantsQuery({ limit: 100 });

  const definitions = defs.data ?? [];
  const tenantRows = tenants.data?.rows ?? [];

  const stats = useMemo(() => {
    const required = definitions.filter((d) => d.required);
    const optional = definitions.filter((d) => !d.required);
    const ready = tenantRows.filter(
      (t) => t.provisioning.templatesConfigured >= t.provisioning.templatesRequired,
    ).length;
    return {
      total: definitions.length,
      requiredCount: required.length,
      optionalCount: optional.length,
      ready,
      incomplete: tenantRows.length - ready,
    };
  }, [definitions, tenantRows]);

  if (defs.isLoading || tenants.isLoading) return <PageSkeleton cards={3} />;
  if (defs.isError || tenants.isError) {
    return (
      <QueryError
        onRetry={() => {
          defs.refetch();
          tenants.refetch();
        }}
        error={defs.error ?? tenants.error}
      />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Messaging governance"
        title="Template registry"
        description="Canonical Meta Cloud API definitions used to validate every tenant registration. Due and overdue reminders are fixed-installment only."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={MessageCircleMore}
          label="Template definitions"
          value={stats.total}
          detail={`${stats.requiredCount} required · ${stats.optionalCount} optional`}
        />
        <StatCard
          icon={CheckCircle2}
          label="Jewellers complete"
          value={stats.ready}
          detail={`${stats.ready} of ${tenantRows.length} jewellers at ${stats.requiredCount}/${stats.requiredCount} required types`}
          tone="green"
        />
        <StatCard
          icon={AlertTriangle}
          label="Incomplete"
          value={stats.incomplete}
          detail="Missing one or more required template registrations"
          tone="red"
        />
      </div>
      <Surface
        title="Canonical definitions"
        description="Variable index matches Meta {{1}}…{{n}} slots in the approved template body."
      >
        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          {definitions.map((def) => (
            <DefinitionCard key={def.messageType} def={def} />
          ))}
        </div>
      </Surface>
      <Surface title="Tenant readiness" description="Required template types registered per jeweller">
        {tenantRows.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">No jewellers on the platform yet.</p>
        ) : (
          <div className="divide-y">
            {tenantRows.map((t) => {
              const complete = t.provisioning.templatesConfigured >= t.provisioning.templatesRequired;
              const missing = Math.max(0, t.provisioning.templatesRequired - t.provisioning.templatesConfigured);
              return (
                <Link
                  key={t.id}
                  href={`/platform/tenants/${t.id}/templates`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-[#fbf7f4]"
                >
                  <ShieldCheck className={`size-5 ${complete ? "text-emerald-600" : "text-amber-600"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{t.businessName}</p>
                    <p className="text-sm text-muted-foreground">
                      {t.tenantCode} · {t.provisioning.templatesConfigured}/{t.provisioning.templatesRequired}{" "}
                      required types
                      {missing > 0 ? ` · ${missing} missing` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      WhatsApp {t.provisioning.whatsappConfigured ? "configured" : "pending"} · Payments{" "}
                      {t.provisioning.paymentGatewayConfigured ? "configured" : "pending"}
                    </p>
                  </div>
                  <StatusBadge status={complete ? "COMPLETED" : "PENDING"} />
                </Link>
              );
            })}
          </div>
        )}
      </Surface>
    </>
  );
}

function DefinitionCard({ def }: { def: TemplateDefinition }) {
  const vars = sortedVariables(def);
  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f7ecee] text-[#730321]">
          <MessageCircleMore className="size-5" />
        </span>
        <StatusBadge status={def.required ? "REQUIRED" : "OPTIONAL"} />
      </div>
      <h3 className="mt-4 font-bold">{def.label}</h3>
      <p className="mt-1 font-mono text-xs text-muted-foreground">{def.messageType}</p>
      {def.installmentScope && (
        <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-900">
          {def.scopeNote ?? def.installmentScope}
        </p>
      )}
      <div className="mt-4 space-y-2">
        {vars.map((v) => (
          <div key={`${def.messageType}-${v.key}`} className="flex gap-2 text-sm">
            <span
              className="grid size-5 shrink-0 place-items-center rounded-full bg-[#f5eeeb] text-xs"
              title="Meta template variable index"
            >
              {v.index}
            </span>
            <code>{v.key}</code>
            <span className="truncate text-muted-foreground">e.g. {v.sample}</span>
          </div>
        ))}
      </div>
      {def.hasUrlButton && def.buttonUrlVariable && (
        <p className="mt-3 text-xs text-blue-700">
          URL button variable: {def.buttonUrlVariable.key} (index {def.buttonUrlVariable.index})
        </p>
      )}
      {def.hasMediaHeader && (
        <p className="mt-3 text-xs text-purple-700">
          {def.mediaHeaderType ?? "IMAGE"} header
          {def.mediaHeaderNote ? ` — ${def.mediaHeaderNote}` : ""}
        </p>
      )}
      {def.suggestedBody && (
        <p className="mt-3 rounded-lg bg-[#fbf7f4] p-2 text-xs text-muted-foreground">{def.suggestedBody}</p>
      )}
    </div>
  );
}
