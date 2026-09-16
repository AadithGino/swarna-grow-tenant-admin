"use client";

import { useMemo, useState } from "react";
import { Download, FileClock, Filter, Loader2, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CursorPagination } from "@/src/components/common/cursor-pagination";
import { DateRangeFilter } from "@/src/components/common/date-range-filter";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { DataTable, type DataColumn } from "@/src/components/common/data-table";
import { PageHeader, StatCard, Surface } from "@/src/components/common/page-parts";
import { EmptyState, PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { downloadCsv } from "@/src/lib/download";
import { useDebouncedValue } from "@/src/hooks/use-debounced-value";
import { useValidatedListDateRange } from "@/src/hooks/use-validated-list-date-range";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import { fetchAllListPages } from "@/src/lib/fetch-all-list-pages";
import {
  platformApi,
  useGetPlatformAuditLogsQuery,
} from "@/src/store/api/platform-api";
import { useAppDispatch } from "@/src/store/hooks";
import type { AuditLog } from "@/src/types/platform";

function formatChanges(changes: unknown[]): string {
  if (!changes?.length) return "—";
  return changes
    .map((row) => {
      if (row && typeof row === "object" && "field" in row) {
        const c = row as { field?: string; from?: unknown; to?: unknown };
        return `${c.field ?? "field"}: ${String(c.from ?? "—")} → ${String(c.to ?? "—")}`;
      }
      return JSON.stringify(row);
    })
    .join("; ");
}

export function PlatformAuditPage() {
  const dispatch = useAppDispatch();
  const [exportBusy, setExportBusy] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const debouncedTenantId = useDebouncedValue(tenantId.trim(), 350);
  const debouncedAction = useDebouncedValue(action.trim(), 350);
  const debouncedEntityType = useDebouncedValue(entityType.trim(), 350);
  const { from, setFrom, to, setTo, dateRangeError, skipForBadDates } =
    useValidatedListDateRange();
  const pager = useCursorPagination(
    20,
    `${debouncedTenantId}|${debouncedAction}|${debouncedEntityType}|${from}|${to}`,
  );

  const query = useGetPlatformAuditLogsQuery(
    {
      tenantId: debouncedTenantId || undefined,
      action: debouncedAction || undefined,
      entityType: debouncedEntityType || undefined,
      from: skipForBadDates ? undefined : from,
      to: skipForBadDates ? undefined : to,
      ...pager.queryParams,
    },
    { skip: skipForBadDates },
  );

  const rows = query.data?.items ?? [];
  const page = query.data?.page;

  const cols = useMemo<DataColumn<AuditLog>[]>(
    () => [
      {
        key: "at",
        header: "Timestamp",
        render: (r) => (
          <div>
            <p className="font-medium">{new Date(r.at).toLocaleDateString("en-IN")}</p>
            <p className="text-xs text-muted-foreground">{new Date(r.at).toLocaleTimeString("en-IN")}</p>
          </div>
        ),
      },
      { key: "action", header: "Action", render: (r) => <StatusBadge status={r.action} /> },
      {
        key: "actor",
        header: "Actor",
        render: (r) => (
          <div>
            <p className="font-mono text-xs">{r.actor.id || "—"}</p>
            <p className="text-xs text-muted-foreground">{r.actor.type}</p>
          </div>
        ),
      },
      {
        key: "tenant",
        header: "Tenant",
        render: (r) => <span className="font-mono text-xs">{r.tenant?.id ?? "Platform"}</span>,
      },
      {
        key: "entity",
        header: "Entity",
        render: (r) => (
          <div>
            <p>{r.entityType}</p>
            <p className="font-mono text-xs text-muted-foreground">{r.entityId}</p>
          </div>
        ),
      },
      {
        key: "changes",
        header: "Changes",
        className: "max-w-[18rem]",
        render: (r) => <span className="line-clamp-3 text-xs">{formatChanges(r.changes as unknown[])}</span>,
      },
      {
        key: "trace",
        header: "Trace / IP",
        render: (r) => (
          <div>
            <p className="font-mono text-xs">{r.traceId || "—"}</p>
            <p className="text-xs text-muted-foreground">{r.ip || "—"}</p>
          </div>
        ),
      },
    ],
    [],
  );

  async function exportCsvAll() {
    if (skipForBadDates) {
      toast.error(dateRangeError ?? "Fix the date range first.");
      return;
    }
    setExportBusy(true);
    try {
      const all = await fetchAllListPages<AuditLog>(async (cursor) => {
        const result = await dispatch(
          platformApi.endpoints.getPlatformAuditLogs.initiate({
            tenantId: debouncedTenantId || undefined,
            action: debouncedAction || undefined,
            entityType: debouncedEntityType || undefined,
            from,
            to,
            limit: 100,
            cursor,
          }),
        ).unwrap();
        return { items: result.items, page: result.page };
      });
      if (!all.length) {
        toast.error("No audit events match these filters.");
        return;
      }
      downloadCsv(
        `platform-audit-${new Date().toISOString().slice(0, 10)}.csv`,
        [
          "Timestamp",
          "Action",
          "Actor ID",
          "Actor type",
          "Tenant",
          "Entity type",
          "Entity ID",
          "Trace ID",
          "IP",
          "Changes",
        ],
        all.map((r) => [
          r.at,
          r.action,
          r.actor.id ?? "",
          r.actor.type,
          r.tenant?.id ?? "",
          r.entityType,
          r.entityId,
          r.traceId ?? "",
          r.ip ?? "",
          formatChanges(r.changes as unknown[]),
        ]),
      );
      toast.success(`Exported ${all.length} audit events`);
    } catch {
      toast.error("Export failed");
    } finally {
      setExportBusy(false);
    }
  }

  if (query.isLoading && !skipForBadDates) return <PageSkeleton cards={3} />;
  if (!skipForBadDates && query.isError) {
    return <QueryError error={query.error} onRetry={query.refetch} />;
  }

  return (
    <>
      <PageHeader
        eyebrow="Platform accountability"
        title="Audit trail"
        description="Immutable, tenant-aware history of provisioning, subscription and security-sensitive platform actions."
        actions={
          <Button
            variant="outline"
            onClick={() => void exportCsvAll()}
            disabled={exportBusy || skipForBadDates}
          >
            {exportBusy ? <Loader2 className="animate-spin" /> : <Download />}
            Export audit
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={FileClock} label="Events on page" value={rows.length} detail="Current filtered page" />
        <StatCard icon={ShieldCheck} label="Actor type" value="Platform" detail="SUPER_ADMIN operations" tone="green" />
        <StatCard icon={Filter} label="Retention" value="Immutable" detail="Changes recorded with trace IDs" tone="gold" />
      </div>
      <Surface>
        <div className="space-y-3 border-b p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="Filter tenant ID"
                className="pl-10"
              />
            </div>
            <Input
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="Action contains… e.g. SUBSCRIPTION"
            />
            <Input
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              placeholder="Entity type e.g. TENANT"
            />
            <Button
              variant="outline"
              onClick={() => {
                setTenantId("");
                setAction("");
                setEntityType("");
              }}
            >
              Reset filters
            </Button>
          </div>
          <div>
            <DateRangeFilter
              label="Occurred"
              from={from}
              to={to}
              onFromChange={setFrom}
              onToChange={setTo}
            />
            <div className="mt-2">
              <FormFieldError message={dateRangeError} />
            </div>
          </div>
        </div>
        {skipForBadDates ? (
          <EmptyState
            title="Fix the date range"
            detail={dateRangeError ?? "Enter a valid from and to date."}
          />
        ) : (
          <>
            <DataTable rows={rows} columns={cols} emptyTitle="No audit events match these filters" />
            {page ? (
              <CursorPagination
                page={page}
                pageIndex={pager.pageIndex}
                rowCount={rows.length}
                canPrevious={pager.canPrevious}
                onPrevious={pager.goPrevious}
                onNext={() => pager.goNext(page.nextCursor)}
              />
            ) : null}
          </>
        )}
      </Surface>
    </>
  );
}
