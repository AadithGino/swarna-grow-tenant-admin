"use client";

import { useMemo, useState } from "react";
import { AlertOctagon, CheckCircle2, Database, RefreshCcw, Search, Server, Webhook, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type DataColumn } from "@/src/components/common/data-table";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { PageHeader, StatCard, Surface } from "@/src/components/common/page-parts";
import { handleFormApiError } from "@/src/lib/form-api-error";
import {
  sanitizeMonitoringTenantIdInput,
  sanitizeMonitoringTraceIdInput,
  validateMonitoringClientSearchQuery,
  validateMonitoringTenantIdFilter,
  validateMonitoringTraceIdFilter,
  validateWebhookProviderFilter,
  type WebhookProviderFilter,
} from "@/src/lib/platform-monitoring-filters-validation";
import { useDebouncedValue } from "@/src/hooks/use-debounced-value";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import {
  useGetPlatformErrorLogsQuery,
  useGetPlatformLivenessHealthQuery,
  useGetPlatformReadinessHealthQuery,
  useGetWebhookFailuresQuery,
  useLazyGetWebhookFailuresQuery,
  useRetryWebhookFailureMutation,
} from "@/src/store/api/platform-api";
import type { ErrorLog, WebhookFailure } from "@/src/types/platform";

function readinessLabel(state: string): string {
  if (state === "ready") return "Ready";
  if (state === "optional-unavailable") return "Optional (offline)";
  return "Unavailable";
}

function readinessOk(state: string): boolean {
  return state === "ready" || state === "optional-unavailable";
}

function formatWhen(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN");
}

export function PlatformMonitoringPage() {
  const [provider, setProvider] = useState<WebhookProviderFilter>("ALL");
  const [webhookSearch, setWebhookSearch] = useState("");
  const [errorTenantId, setErrorTenantId] = useState("");
  const [errorTraceId, setErrorTraceId] = useState("");
  const [errorSearch, setErrorSearch] = useState("");

  const debouncedErrorTenantId = useDebouncedValue(errorTenantId, 400);
  const debouncedErrorTraceId = useDebouncedValue(errorTraceId, 400);

  const providerError = validateWebhookProviderFilter(provider);
  const webhookSearchError = validateMonitoringClientSearchQuery(webhookSearch);
  const errorSearchError = validateMonitoringClientSearchQuery(errorSearch);
  const errorTenantIdError = validateMonitoringTenantIdFilter(errorTenantId);
  const errorTraceIdError = validateMonitoringTraceIdFilter(errorTraceId);
  const debouncedTenantIdError = validateMonitoringTenantIdFilter(
    debouncedErrorTenantId,
  );
  const debouncedTraceIdError = validateMonitoringTraceIdFilter(
    debouncedErrorTraceId,
  );
  const skipErrorLogsQuery = Boolean(debouncedTenantIdError || debouncedTraceIdError);

  const queueSummary = useGetWebhookFailuresQuery({ provider: "ALL", limit: 1 });
  const webhooks = useGetWebhookFailuresQuery(
    { provider, limit: 50 },
    { skip: Boolean(providerError) },
  );
  const [fetchMoreWebhooks, { isFetching: loadingMoreWebhooks }] = useLazyGetWebhookFailuresQuery();
  const [webhookRows, setWebhookRows] = useState<WebhookFailure[]>([]);
  const [webhookNextCursor, setWebhookNextCursor] = useState<string | null>(null);

  const errors = useGetPlatformErrorLogsQuery(
    {
      tenantId: debouncedErrorTenantId.trim() || undefined,
      traceId: debouncedErrorTraceId.trim() || undefined,
    },
    { skip: skipErrorLogsQuery },
  );
  const liveness = useGetPlatformLivenessHealthQuery(undefined, { pollingInterval: 60_000 });
  const readiness = useGetPlatformReadinessHealthQuery(undefined, { pollingInterval: 60_000 });
  const [retry] = useRetryWebhookFailureMutation();

  const webhookDataSignature = `${provider}|${webhooks.data?.meta.nextCursor ?? ""}|${webhooks.data?.rows?.length ?? 0}`;
  const [syncedWebhookData, setSyncedWebhookData] = useState(webhookDataSignature);
  if (syncedWebhookData !== webhookDataSignature) {
    setSyncedWebhookData(webhookDataSignature);
    setWebhookRows(webhooks.data?.rows ?? []);
    setWebhookNextCursor(webhooks.data?.meta.nextCursor ?? null);
  }

  const filteredWebhookRows = useMemo(() => {
    if (webhookSearchError) return webhookRows;
    const q = webhookSearch.trim().toLowerCase();
    if (!q) return webhookRows;
    return webhookRows.filter(
      (row) =>
        row.providerEventId.toLowerCase().includes(q) ||
        row.id.toLowerCase().includes(q) ||
        (row.tenantId ?? "platform").toLowerCase().includes(q) ||
        (row.lastError ?? "").toLowerCase().includes(q) ||
        (row.traceId ?? "").toLowerCase().includes(q),
    );
  }, [webhookRows, webhookSearch, webhookSearchError]);

  const errorRows = useMemo(
    () => (skipErrorLogsQuery ? [] : (errors.data?.rows ?? [])),
    [skipErrorLogsQuery, errors.data?.rows],
  );
  const filteredErrorRows = useMemo(() => {
    if (errorSearchError) return errorRows;
    const q = errorSearch.trim().toLowerCase();
    if (!q) return errorRows;
    return errorRows.filter(
      (row) =>
        row.code.toLowerCase().includes(q) ||
        row.message.toLowerCase().includes(q) ||
        row.traceId.toLowerCase().includes(q) ||
        (row.tenantId ?? "platform").toLowerCase().includes(q),
    );
  }, [errorRows, errorSearch, errorSearchError]);

  const whCols = useMemo<DataColumn<WebhookFailure>[]>(
    () => [
      {
        key: "event",
        header: "Provider event",
        render: (r) => (
          <div>
            <p className="font-semibold">{r.providerEventId}</p>
            <p className="font-mono text-xs text-muted-foreground">{r.id}</p>
          </div>
        ),
      },
      { key: "provider", header: "Provider", render: (r) => <StatusBadge status={r.provider} /> },
      { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
      {
        key: "tenant",
        header: "Tenant",
        render: (r) => <span className="font-mono text-xs">{r.tenantId ?? "Platform"}</span>,
      },
      { key: "attempts", header: "Attempts", render: (r) => r.attempts },
      {
        key: "received",
        header: "Received",
        render: (r) => <span className="text-sm">{formatWhen(r.createdAt)}</span>,
      },
      {
        key: "processed",
        header: "Processed",
        render: (r) => <span className="text-sm">{formatWhen(r.processedAt)}</span>,
      },
      {
        key: "trace",
        header: "Trace ID",
        render: (r) => <span className="font-mono text-xs">{r.traceId || "—"}</span>,
      },
      {
        key: "error",
        header: "Last error",
        className: "max-w-[20rem]",
        render: (r) => <span className="line-clamp-2">{r.lastError ?? "—"}</span>,
      },
      {
        key: "action",
        header: "",
        render: (r) => (
          <Button
            size="sm"
            variant="outline"
            disabled={!r.retryEligible}
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await retry(r.id).unwrap();
                toast.success("Webhook retry queued");
              } catch (err) {
                handleFormApiError(err, {
                  fallback: "Could not queue retry",
                });
              }
            }}
          >
            <RefreshCcw />
            Retry
          </Button>
        ),
      },
    ],
    [retry],
  );

  const errCols = useMemo<DataColumn<ErrorLog>[]>(
    () => [
      {
        key: "code",
        header: "Error",
        render: (r) => (
          <div>
            <p className="font-semibold text-red-700">{r.code}</p>
            <p className="text-xs text-muted-foreground">HTTP {r.statusCode}</p>
          </div>
        ),
      },
      { key: "message", header: "Message", render: (r) => r.message },
      {
        key: "tenant",
        header: "Tenant",
        render: (r) => <span className="font-mono text-xs">{r.tenantId ?? "Platform"}</span>,
      },
      { key: "trace", header: "Trace ID", render: (r) => <span className="font-mono text-xs">{r.traceId || "—"}</span> },
      { key: "at", header: "Occurred", render: (r) => formatWhen(r.occurredAt) },
    ],
    [],
  );

  const refreshAll = () => {
    queueSummary.refetch();
    webhooks.refetch();
    errors.refetch();
    liveness.refetch();
    readiness.refetch();
  };

  const loadMoreWebhooks = async () => {
    if (!webhookNextCursor) return;
    const page = await fetchMoreWebhooks({ provider, cursor: webhookNextCursor, limit: 50 }).unwrap();
    setWebhookRows((prev) => {
      const seen = new Set(prev.map((row) => row.id));
      return [...prev, ...page.rows.filter((row) => !seen.has(row.id))];
    });
    setWebhookNextCursor(page.meta.nextCursor ?? null);
  };

  const isFetching =
    queueSummary.isFetching ||
    webhooks.isFetching ||
    errors.isFetching ||
    liveness.isFetching ||
    readiness.isFetching;

  const loading =
    queueSummary.isLoading ||
    webhooks.isLoading ||
    (!skipErrorLogsQuery && errors.isLoading);
  const queryFailed =
    queueSummary.isError ||
    webhooks.isError ||
    (!skipErrorLogsQuery && errors.isError);

  if (loading) return <PageSkeleton cards={4} />;
  if (queryFailed) {
    return (
      <QueryError
        onRetry={refreshAll}
        error={queueSummary.error ?? webhooks.error ?? errors.error}
      />
    );
  }

  const webhookTotal = queueSummary.data?.meta.total ?? queueSummary.data?.rows.length ?? 0;
  const errorTotal = skipErrorLogsQuery
    ? 0
    : (errors.data?.meta.total ?? errorRows.length);
  const errorLimit = skipErrorLogsQuery
    ? 0
    : (errors.data?.meta.limit ?? errorRows.length);

  const apiHealthy = liveness.isSuccess && liveness.data?.status === "ok";
  const dbReady = readiness.data?.database === "ready";
  const redisReadyState = readinessOk(readiness.data?.queue ?? "unavailable");
  const workersReady = readinessOk(readiness.data?.workers ?? "unavailable");
  const systemReady = readiness.isSuccess && dbReady && redisReadyState && workersReady;

  return (
    <>
      <PageHeader
        eyebrow="Reliability operations"
        title="Monitoring"
        description="Review gateway and WhatsApp webhook failures, retry eligible events, and correlate application errors by trace ID."
        actions={
          <Button variant="outline" onClick={refreshAll} disabled={isFetching}>
            <RefreshCcw className={isFetching ? "animate-spin" : ""} />
            Refresh
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Server}
          label="API health"
          value={apiHealthy ? "Healthy" : "Degraded"}
          detail={apiHealthy ? "/health responding" : "GET /health failed"}
          tone={apiHealthy ? "green" : "red"}
        />
        <StatCard
          icon={Database}
          label="Readiness"
          value={systemReady ? "Ready" : "Not ready"}
          detail={
            readiness.data
              ? `DB ${readinessLabel(readiness.data.database)} · Redis ${readinessLabel(readiness.data.queue)} · Workers ${readinessLabel(readiness.data.workers)}`
              : "Database, Redis, and workers"
          }
          tone={systemReady ? "green" : "gold"}
        />
        <StatCard
          icon={Webhook}
          label="Webhook failures"
          value={webhookTotal}
          detail="Current operational queue"
          tone={webhookTotal > 0 ? "red" : "green"}
        />
        <StatCard
          icon={AlertOctagon}
          label="Application errors"
          value={errorTotal}
          detail={`Showing up to ${errorLimit} retained entries`}
          tone={errorTotal > 0 ? "gold" : "green"}
        />
      </div>
      <Tabs defaultValue="webhooks">
        <TabsList variant="detail">
          <TabsTrigger value="webhooks">
            <Webhook />
            Webhook failures
          </TabsTrigger>
          <TabsTrigger value="errors">
            <AlertOctagon />
            Error logs
          </TabsTrigger>
          <TabsTrigger value="health">
            <CheckCircle2 />
            Service health
          </TabsTrigger>
        </TabsList>
        <TabsContent value="webhooks">
          <Surface
            title="Webhook failure queue"
            description={
              webhooks.data?.meta.hasMore
                ? `Loaded ${webhookRows.length} of ${webhookTotal} failures`
                : `${webhookTotal} failure${webhookTotal === 1 ? "" : "s"} in queue`
            }
            action={
              <Select
                value={provider}
                onValueChange={(v) => setProvider(v as WebhookProviderFilter)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All providers</SelectItem>
                  <SelectItem value="PHONEPE">PhonePe</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            }
          >
            <div className="border-b p-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={webhookSearch}
                  onChange={(e) => setWebhookSearch(e.target.value)}
                  placeholder="Search event ID, tenant, trace, or error"
                  className={cn("pl-10", webhookSearchError && "border-red-600")}
                  aria-invalid={Boolean(webhookSearchError)}
                  maxLength={120}
                />
              </div>
              <FormFieldError message={webhookSearchError} />
            </div>
            <DataTable
              rows={filteredWebhookRows}
              columns={whCols}
              emptyTitle={webhookSearch ? "No webhook failures match your search" : "No webhook failures"}
            />
            {webhookNextCursor ? (
              <div className="flex justify-center border-t p-4">
                <Button variant="outline" onClick={() => void loadMoreWebhooks()} disabled={loadingMoreWebhooks}>
                  {loadingMoreWebhooks ? "Loading…" : "Load more"}
                </Button>
              </div>
            ) : null}
          </Surface>
        </TabsContent>
        <TabsContent value="errors">
          <Surface
            title="Application error log"
            description={`Use trace IDs to correlate gateway, API and queue activity · ${errorRows.length} loaded`}
          >
            <div className="grid gap-3 border-b p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={errorSearch}
                    onChange={(e) => setErrorSearch(e.target.value)}
                    placeholder="Search code, message, trace"
                    className={cn("pl-10", errorSearchError && "border-red-600")}
                    aria-invalid={Boolean(errorSearchError)}
                    maxLength={120}
                  />
                </div>
                <FormFieldError message={errorSearchError} />
              </div>
              <div>
                <Input
                  value={errorTenantId}
                  onChange={(e) =>
                    setErrorTenantId(
                      sanitizeMonitoringTenantIdInput(e.target.value),
                    )
                  }
                  placeholder="Filter tenant ID (API)"
                  className={cn(
                    "font-mono text-sm",
                    errorTenantIdError && "border-red-600",
                  )}
                  aria-invalid={Boolean(errorTenantIdError)}
                />
                <FormFieldError message={errorTenantIdError} />
              </div>
              <div>
                <Input
                  value={errorTraceId}
                  onChange={(e) =>
                    setErrorTraceId(
                      sanitizeMonitoringTraceIdInput(e.target.value),
                    )
                  }
                  placeholder="Filter trace UUID (API)"
                  className={cn(
                    "font-mono text-sm",
                    errorTraceIdError && "border-red-600",
                  )}
                  aria-invalid={Boolean(errorTraceIdError)}
                />
                <FormFieldError message={errorTraceIdError} />
              </div>
              <Button
                variant="outline"
                className="self-start"
                onClick={() => {
                  setErrorTenantId("");
                  setErrorTraceId("");
                  setErrorSearch("");
                }}
              >
                Reset
              </Button>
            </div>
            {skipErrorLogsQuery && (debouncedTenantIdError || debouncedTraceIdError) ? (
              <p className="px-4 pb-2 text-sm text-muted-foreground">
                Fix API filter errors to load error logs from the server.
              </p>
            ) : null}
            <DataTable
              rows={filteredErrorRows}
              columns={errCols}
              emptyTitle={errorSearch || errorTenantId || errorTraceId ? "No errors match these filters" : "No errors recorded"}
            />
          </Surface>
        </TabsContent>
        <TabsContent value="health">
          <div className="grid gap-5 md:grid-cols-2">
            <HealthCard
              title="Liveness"
              route="GET /health"
              ok={apiHealthy}
              items={[
                { label: "API process responding", ok: apiHealthy, detail: apiHealthy ? "Ready" : "Unavailable" },
                {
                  label: "Server timestamp",
                  ok: apiHealthy,
                  detail: liveness.data?.timestamp ? formatWhen(liveness.data.timestamp) : "—",
                },
              ]}
            />
            <HealthCard
              title="Readiness"
              route="GET /health/ready"
              ok={systemReady}
              items={[
                {
                  label: "MongoDB",
                  ok: readinessOk(readiness.data?.database ?? "unavailable"),
                  detail: readinessLabel(readiness.data?.database ?? "unavailable"),
                },
                {
                  label: "Redis (queue backend)",
                  ok: readinessOk(readiness.data?.queue ?? "unavailable"),
                  detail: readinessLabel(readiness.data?.queue ?? "unavailable"),
                },
                {
                  label: "Background workers (BullMQ)",
                  ok: readinessOk(readiness.data?.workers ?? "unavailable"),
                  detail: readinessLabel(readiness.data?.workers ?? "unavailable"),
                },
              ]}
            />
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

function HealthCard({
  title,
  route,
  ok,
  items,
}: {
  title: string;
  route: string;
  ok: boolean;
  items: { label: string; ok: boolean; detail?: string }[];
}) {
  return (
    <Surface title={title} description={route}>
      <div className="space-y-3 p-5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 rounded-xl border p-4">
            {item.ok ? (
              <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
            ) : (
              <XCircle className="size-5 shrink-0 text-amber-600" />
            )}
            <span className="font-medium">{item.label}</span>
            <span className={`ml-auto text-sm ${item.ok ? "text-emerald-700" : "text-amber-700"}`}>
              {item.detail ?? (item.ok ? "Ready" : "Check required")}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
          {ok ? <CheckCircle2 className="size-4 text-emerald-600" /> : <XCircle className="size-4 text-amber-600" />}
          Overall: {ok ? "Healthy" : "Needs attention"}
        </div>
      </div>
    </Surface>
  );
}
