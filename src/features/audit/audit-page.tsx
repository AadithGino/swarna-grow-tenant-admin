"use client";

import { Download, Loader2, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormFieldError } from "@/src/components/common/form-field-error";
import { PaginatedDataTable } from "@/src/components/common/paginated-data-table";
import { PageHeader, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { downloadCsv } from "@/src/lib/download";
import {
  emptyPageMeta,
  pageRangeLabel,
} from "@/src/lib/cursor-pagination";
import {
  defaultListRangeFrom,
  defaultListRangeTo,
  LIST_SEARCH_QUERY_MAX,
  listSearchQueryForApi,
  shouldSkipListSearchQuery,
  validateListDateRange,
  validateListSearchQuery,
} from "@/src/lib/list-date-range";
import {
  useActingBranchId,
  useActingBranchKey,
} from "@/src/hooks/use-acting-branch-id";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import { useDebouncedValue } from "@/src/hooks/use-debounced-value";
import { adminApi, useGetAuditQuery } from "@/src/store/api/admin-api";
import { useAppDispatch } from "@/src/store/hooks";
import { fetchAllListPages } from "@/src/lib/fetch-all-list-pages";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const AUDIT_ENTITY_TYPES = [
  "PAYMENT",
  "REDEMPTION",
  "SCHEME",
  "CUSTOMER",
  "CASH_HANDOVER",
  "GOLD_RATE",
  "MESSAGE",
  "GRIEVANCE",
  "STAFF",
  "BRANCH",
  "PLAN",
  "PAYMENT_LINK",
  "PAYMENT_INTENT",
] as const;

const AUDIT_PAGE_LIMIT = 25;

type AuditRow = {
  id: string;
  at: string;
  actor: string;
  action: string;
  summary: string;
  entityType?: string;
  entity?: string;
  branch?: string;
  ip?: string;
  changes?: { field: string; from: string; to: string }[];
};

function labelOrDash(value?: string | null) {
  if (!value) return "—";
  return value.replaceAll("_", " ");
}

export function AuditPage() {
  const dispatch = useAppDispatch();
  const [exportBusy, setExportBusy] = useState(false);
  const [q, setQ] = useState("");
  const [type, setType] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("");
  const [from, setFrom] = useState(() => defaultListRangeFrom());
  const [to, setTo] = useState(() => defaultListRangeTo());
  const debouncedQ = useDebouncedValue(q, 350);
  const debouncedAction = useDebouncedValue(actionFilter.trim(), 350);
  const [inspectRow, setInspectRow] = useState<AuditRow | null>(null);
  const branchId = useActingBranchId();
  const branchKey = useActingBranchKey();
  const pager = useCursorPagination(
    AUDIT_PAGE_LIMIT,
    `${debouncedQ}|${type}|${debouncedAction}|${from}|${to}|${branchKey}`,
  );
  const dateRangeError = useMemo(
    () => validateListDateRange(from, to),
    [from, to],
  );
  const searchError = validateListSearchQuery(q);

  const query = useGetAuditQuery(
    {
      q: listSearchQueryForApi(debouncedQ),
      type: type === "ALL" ? undefined : type,
      action: debouncedAction || undefined,
      from: from || undefined,
      to: to || undefined,
      branchId,
      ...pager.queryParams,
    },
    {
      skip: Boolean(dateRangeError) || shouldSkipListSearchQuery(debouncedQ),
    },
  );
  if (query.isLoading && !dateRangeError) return <PageSkeleton cards={3} />;
  if (!dateRangeError && (query.isError || !query.data)) {
    return (
      <QueryError error={query.error} onRetry={query.refetch} />
    );
  }
  const rows = (query.data?.items ?? []) as AuditRow[];
  const page = query.data?.page ?? emptyPageMeta(AUDIT_PAGE_LIMIT);
  const resultSummary = pageRangeLabel(pager.pageIndex, page, rows.length);
  return (
    <>
      <PageHeader
        eyebrow="Security & control"
        title="Audit timeline"
        description="Immutable, permission-gated history of financial and administrative mutations."
        actions={
          <Button
            variant="outline"
            disabled={exportBusy}
            onClick={async () => {
              const rangeErr = validateListDateRange(from, to);
              if (rangeErr) {
                toast.error(rangeErr);
                return;
              }
              const qErr = validateListSearchQuery(debouncedQ);
              if (qErr) {
                toast.error(qErr);
                return;
              }
              setExportBusy(true);
              try {
                const all = await fetchAllListPages<AuditRow>(async (cursor) => {
                  const result = await dispatch(
                    adminApi.endpoints.getAudit.initiate({
                      q: listSearchQueryForApi(debouncedQ),
                      type: type === "ALL" ? undefined : type,
                      action: debouncedAction || undefined,
                      from: from || undefined,
                      to: to || undefined,
                      limit: 100,
                      cursor,
                    }),
                  ).unwrap();
                  return {
                    items: result.items as AuditRow[],
                    page: result.page,
                  };
                });
                downloadCsv(
                  "audit-timeline.csv",
                  [
                    "Date",
                    "Actor",
                    "Action",
                    "Entity type",
                    "Entity",
                    "Branch",
                    "IP",
                  ],
                  all.map((r) => [
                    r.at,
                    r.actor,
                    labelOrDash(r.action),
                    labelOrDash(r.entityType),
                    r.entity ?? "—",
                    r.branch ?? "—",
                    r.ip ?? "—",
                  ]),
                );
                toast.success(`Exported ${all.length} events`);
              } catch {
                toast.error("Export failed");
              } finally {
                setExportBusy(false);
              }
            }}
          >
            {exportBusy ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Download />
            )}
            Export all
          </Button>
        }
      />
      <Surface>
        <div className="grid gap-3 p-4 md:grid-cols-[1fr_180px_220px_160px_160px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) =>
                setQ(e.target.value.slice(0, LIST_SEARCH_QUERY_MAX))
              }
              placeholder="Actor, action or entity"
              className={cn("h-11 pl-11", searchError && "border-red-600")}
              aria-invalid={Boolean(searchError)}
            />
            <div className="mt-1 pl-11">
              <FormFieldError message={searchError} />
            </div>
          </div>
          <Input
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value.slice(0, 80))}
            placeholder="Action contains…"
            className="h-11"
          />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All entity types</SelectItem>
              {AUDIT_ENTITY_TYPES.map((entityType) => (
                <SelectItem key={entityType} value={entityType}>
                  {labelOrDash(entityType)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={cn("h-11", dateRangeError && "border-red-600")}
            aria-invalid={Boolean(dateRangeError)}
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={cn("h-11", dateRangeError && "border-red-600")}
            aria-invalid={Boolean(dateRangeError)}
          />
        </div>
        {dateRangeError ? (
          <div className="px-4 pb-4">
            <FormFieldError message={dateRangeError} />
          </div>
        ) : null}
      </Surface>
      {dateRangeError ? (
        <Surface title="Adjust filters">
          <p className="p-5 text-sm text-muted-foreground">
            {dateRangeError} Audit events load after the date range is valid.
          </p>
        </Surface>
      ) : (
      <Surface
        title="Immutable events"
        description={resultSummary}
        action={
          <div className="flex items-center gap-2 text-xs text-emerald-700">
            <ShieldCheck className="size-4" />
            Tamper protected
          </div>
        }
      >
        <PaginatedDataTable
          rows={rows}
          page={page}
          pageIndex={pager.pageIndex}
          onNext={() => pager.goNext(page.nextCursor)}
          onPrevious={pager.goPrevious}
          canPrevious={pager.canPrevious}
          columns={[
            { key: "time", header: "Timestamp", render: (r: any) => r.at },
            {
              key: "actor",
              header: "Actor",
              render: (r: any) => <strong>{r.actor}</strong>,
            },
            {
              key: "action",
              header: "Action",
              render: (r) => labelOrDash(r.action),
            },
            {
              key: "type",
              header: "Entity type",
              render: (r) => labelOrDash(r.entityType),
            },
            { key: "entity", header: "Entity", render: (r) => r.entity ?? "—" },
            { key: "branch", header: "Branch", render: (r) => r.branch ?? "—" },
            {
              key: "ip",
              header: "IP address",
              render: (r) => (
                <code className="text-xs">{r.ip ?? "—"}</code>
              ),
            },
            {
              key: "view",
              header: "",
              render: (r) => (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setInspectRow(r)}
                >
                  Inspect
                </Button>
              ),
            },
          ]}
        />
      </Surface>
      )}
      <Dialog
        open={inspectRow != null}
        onOpenChange={(open) => !open && setInspectRow(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{labelOrDash(inspectRow?.action)}</DialogTitle>
          </DialogHeader>
          {inspectRow ? (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">{inspectRow.summary}</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt className="text-muted-foreground">When</dt>
                <dd>{inspectRow.at}</dd>
                <dt className="text-muted-foreground">Actor</dt>
                <dd>{inspectRow.actor}</dd>
                <dt className="text-muted-foreground">Entity</dt>
                <dd>{inspectRow.entity ?? "—"}</dd>
                <dt className="text-muted-foreground">Branch</dt>
                <dd>{inspectRow.branch ?? "—"}</dd>
              </dl>
              {inspectRow.changes?.length ? (
                <div>
                  <p className="mb-2 font-medium">Changes</p>
                  <ul className="space-y-1 rounded-md border p-3">
                    {inspectRow.changes.map((change) => (
                      <li key={change.field}>
                        <span className="font-medium">{change.field}</span>:{" "}
                        {change.from} → {change.to}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
