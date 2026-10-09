"use client";

import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Headphones,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaginatedDataTable } from "@/src/components/common/paginated-data-table";
import {
  PageHeader,
  StatCard,
  Surface,
} from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { GrievanceDetailSheet } from "@/src/features/support/grievance-detail-sheet";
import { CustomerLink } from "@/src/components/common/portal-entity-links";
import { SlaChip } from "@/src/features/support/sla-chip";
import { emptyPageMeta } from "@/src/lib/cursor-pagination";
import { useCursorPagination } from "@/src/hooks/use-cursor-pagination";
import {
  useActingBranchId,
  useActingBranchKey,
} from "@/src/hooks/use-acting-branch-id";
import { useDebouncedValue } from "@/src/hooks/use-debounced-value";
import { FormFieldError } from "@/src/components/common/form-field-error";
import {
  LIST_SEARCH_QUERY_MAX,
  listSearchQueryForApi,
  shouldSkipListSearchQuery,
  validateListSearchQuery,
} from "@/src/lib/list-date-range";
import { useGetGrievancesQuery } from "@/src/store/api/admin-api";
import type { Grievance } from "@/src/types/domain";

export function SupportPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const debouncedQ = useDebouncedValue(q, 350);
  const branchId = useActingBranchId();
  const branchKey = useActingBranchKey();
  const pager = useCursorPagination(
    8,
    `${debouncedQ}|${status}|${priority}|${overdueOnly}|${branchKey}`,
  );
  const queryArgs = useMemo(
    () => ({
      q: listSearchQueryForApi(debouncedQ),
      status: status === "ALL" ? undefined : status,
      priority: priority === "ALL" ? undefined : priority,
      overdueOnly: overdueOnly || undefined,
      branchId,
      ...pager.queryParams,
    }),
    [debouncedQ, status, priority, overdueOnly, branchId, pager.queryParams],
  );
  const searchError = validateListSearchQuery(q);
  const query = useGetGrievancesQuery(queryArgs, {
    skip: shouldSkipListSearchQuery(debouncedQ),
  });
  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data)
    return <QueryError error={query.error} onRetry={query.refetch} />;
  const s = query.data.summary;
  const rows = query.data.items;
  const page = query.data.page ?? emptyPageMeta();
  return (
    <>
      <PageHeader
        eyebrow="Engagement & insight"
        title="Support desk"
        description="Customer grievances, fixed SLA timers, assignment, conversation history and resolution."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard
          icon={Headphones}
          label="Open"
          value={s.open}
          detail={
            (s.inProgress ?? 0) > 0 || (s.waitingForCustomer ?? 0) > 0
              ? `${s.inProgress ?? 0} in progress · ${s.waitingForCustomer ?? 0} waiting`
              : "New tickets"
          }
        />
        <StatCard
          icon={Clock3}
          label="In progress"
          value={s.inProgress ?? 0}
          detail="Assigned / being worked"
          tone="cream"
        />
        <StatCard
          icon={Headphones}
          label="Waiting on customer"
          value={s.waitingForCustomer ?? 0}
          detail="Awaiting customer reply"
        />
        <StatCard
          icon={AlertTriangle}
          label="Urgent"
          value={s.urgent}
          detail="Respond immediately"
          tone="red"
        />
        <StatCard
          icon={Clock3}
          label="SLA overdue"
          value={s.overdue}
          detail="Requires escalation"
          tone="gold"
        />
        <StatCard
          icon={CheckCircle2}
          label="Resolved today"
          value={s.resolvedToday}
          detail="Within target"
          tone="green"
        />
      </div>
      <Surface
        title="Customer requests"
        description="Open a ticket to assign, reply or change status"
      >
        <div className="border-b p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All priority</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant={overdueOnly ? "default" : "outline"}
              onClick={() => setOverdueOnly(!overdueOnly)}
            >
              SLA overdue
            </Button>
          </div>
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) =>
                setQ(e.target.value.slice(0, LIST_SEARCH_QUERY_MAX))
              }
              placeholder="Ticket, customer or subject"
              className="h-11 pl-11"
              aria-invalid={Boolean(searchError)}
            />
            <div className="mt-1 pl-11">
              <FormFieldError message={searchError} />
            </div>
          </div>
        </div>
        <PaginatedDataTable
          rows={rows}
          page={page}
          pageIndex={pager.pageIndex}
          onNext={() => pager.goNext(page.nextCursor)}
          onPrevious={pager.goPrevious}
          canPrevious={pager.canPrevious}
          onRowClick={(r: Grievance) => setSelectedId(r.id)}
          columns={[
            {
              key: "ticket",
              header: "Ticket",
              render: (r) => <strong>{r.ticketNo}</strong>,
            },
            {
              key: "customer",
              header: "Customer",
              render: (r) => (
                <CustomerLink customerId={r.customerId}>{r.customer}</CustomerLink>
              ),
            },
            {
              key: "subject",
              header: "Subject",
              render: (r) => (
                <span className="max-w-[340px] truncate">{r.subject}</span>
              ),
            },
            { key: "category", header: "Category", render: (r) => r.category },
            {
              key: "priority",
              header: "Priority",
              render: (r) => <StatusBadge status={r.priority} />,
            },
            { key: "assignee", header: "Assignee", render: (r) => r.assignee },
            {
              key: "sla",
              header: "SLA",
              render: (r) => (
                <SlaChip
                  sla={r.sla}
                  slaOverdue={r.sla.includes("Overdue")}
                  firstResponded={r.status !== "OPEN"}
                />
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (r) => <StatusBadge status={r.status} />,
            },
          ]}
        />
      </Surface>
      <GrievanceDetailSheet
        grievanceId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}
