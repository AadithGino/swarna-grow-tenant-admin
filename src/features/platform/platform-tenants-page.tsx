"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Building2, CircleCheck, CircleDashed, Download, Plus, SlidersHorizontal } from "lucide-react";
import { downloadCsv } from "@/src/lib/download";
import { Button } from "@/components/ui/button";
import { ListSearchInput } from "@/src/components/common/list-search-input";
import { useDebouncedValue } from "@/src/hooks/use-debounced-value";
import {
  listSearchQueryForApi,
  sanitizeListSearchQueryInput,
  shouldSkipListSearchQuery,
} from "@/src/lib/list-date-range";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DataColumn } from "@/src/components/common/data-table";
import { PageHeader, StatCard, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { useGetPlatformTenantsQuery } from "@/src/store/api/platform-api";
import type { PlatformTenantRow } from "@/src/types/platform";

export function PlatformTenantsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(() =>
    sanitizeListSearchQueryInput(searchParams.get("q") ?? ""),
  );
  const [status, setStatus] = useState(searchParams.get("status") ?? "ALL");
  const [tier, setTier] = useState(searchParams.get("tier") ?? "ALL");
  const debouncedQ = useDebouncedValue(q, 350);

  const query = useGetPlatformTenantsQuery(
    { q: listSearchQueryForApi(debouncedQ), status, tier, limit: 100 },
    { skip: shouldSkipListSearchQuery(debouncedQ) },
  );
  const rows = query.data?.rows ?? [];
  const summary = query.data?.meta?.summary;

  const columns = useMemo<DataColumn<PlatformTenantRow>[]>(
    () => [
      {
        key: "business",
        header: "Jeweller",
        render: (row) => (
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f7e9c9] text-xs font-bold text-[#730321]">
              {row.displayName.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <p className="font-semibold">{row.businessName}</p>
              <p className="text-xs text-muted-foreground">
                {row.tenantCode} · {row.displayName} · {row.city ?? "—"}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: "owner",
        header: "Owner",
        render: (row) => (
          <div>
            <p>{row.ownerName ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{row.ownerMobile ?? "—"}</p>
          </div>
        ),
      },
      {
        key: "plan",
        header: "Subscription",
        render: (row) => (
          <div>
            <p className="font-medium">{row.subscription.tier}</p>
            <p className="text-xs text-muted-foreground">
              {row.subscription.status} · {row.subscription.billingCycle} · {row.subscription.daysRemaining ?? "—"}d left
            </p>
          </div>
        ),
      },
      {
        key: "usage",
        header: "Usage",
        render: (row) => {
          const limit = row.usage.limits?.activeCustomers;
          const pct = row.usage.activeCustomersPercent;
          return (
            <div>
              <p>
                {row.usage.activeCustomers.toLocaleString("en-IN")} customers
                {limit != null ? ` / ${limit.toLocaleString("en-IN")}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {row.usage.branches} branches · {row.usage.staff} staff
                {pct != null ? ` · ${pct}% of customer limit` : ""}
              </p>
            </div>
          );
        },
      },
      {
        key: "setup",
        header: "Provisioning",
        render: (row) => (
          <div className="flex items-center gap-2">
            {row.provisioning.readyToGoLive ? (
              <CircleCheck className="size-4 text-emerald-600" />
            ) : (
              <CircleDashed className="size-4 text-amber-600" />
            )}
            <span className="text-sm">
              {row.provisioning.templatesConfigured}/{row.provisioning.templatesRequired} templates
            </span>
          </div>
        ),
      },
      {
        key: "created",
        header: "Onboarded",
        render: (row) => (
          <span className="text-sm">{new Date(row.createdAt).toLocaleDateString("en-IN")}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => <StatusBadge status={row.status} />,
      },
    ],
    [],
  );

  if (query.isLoading) return <PageSkeleton cards={4} />;
  if (query.isError) return <QueryError error={query.error} onRetry={query.refetch} />;

  const stats = summary ?? {
    total: rows.length,
    active: rows.filter((r) => r.status === "ACTIVE").length,
    pendingSetup: rows.filter((r) => r.status === "PENDING_SETUP").length,
    suspended: rows.filter((r) => r.status === "SUSPENDED").length,
    cancelled: rows.filter((r) => r.status === "CANCELLED").length,
    atCustomerLimit: 0,
  };

  const filterHint =
    q || status !== "ALL" || tier !== "ALL"
      ? "Counts reflect current search and filters"
      : "All jewellers on the platform";

  function exportJewellersCsv() {
    if (!rows.length) {
      toast.error("No jewellers match the current filters.");
      return;
    }
    downloadCsv(
      `swarnagrow-jewellers-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "Business",
        "Code",
        "Display name",
        "Owner",
        "Owner mobile",
        "City",
        "Status",
        "Plan tier",
        "Subscription status",
      ],
      rows.map((r) => [
        r.businessName,
        r.tenantCode,
        r.displayName,
        r.ownerName ?? "",
        r.ownerMobile ?? "",
        r.city ?? "",
        r.status,
        r.subscription.tier,
        r.subscription.status,
      ]),
    );
    toast.success("Jeweller list exported.");
  }

  return (
    <>
      <PageHeader
        eyebrow="Tenant lifecycle"
        title="Jewellers"
        description="Onboard, provision and operate every jewellery business on the Swarna Grow platform."
        actions={
          <>
            <Button variant="outline" onClick={exportJewellersCsv}>
              <Download />
              Export
            </Button>
            <Button onClick={() => router.push("/platform/tenants/new")}>
              <Plus />
              Add jeweller
            </Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Building2} label="Matching jewellers" value={stats.total} detail={filterHint} />
        <StatCard icon={CircleCheck} label="Active" value={stats.active} detail={`${stats.suspended} suspended · ${stats.cancelled} cancelled`} tone="green" />
        <StatCard icon={CircleDashed} label="Pending setup" value={stats.pendingSetup} detail="Provisioning incomplete" tone="gold" />
        <StatCard
          icon={SlidersHorizontal}
          label="At customer limit"
          value={stats.atCustomerLimit}
          detail="≥90% of plan active-customer limit"
          tone="red"
        />
      </div>
      <Surface>
        <div className="grid gap-3 border-b p-4 md:grid-cols-[minmax(18rem,1fr)_12rem_12rem_auto]">
          <ListSearchInput
            value={q}
            onChange={setQ}
            placeholder="Name, owner, phone, tenant code or city"
            iconClassName="size-4"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PENDING_SETUP">Pending setup</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All plans</SelectItem>
              <SelectItem value="STARTER">Starter</SelectItem>
              <SelectItem value="GROWTH">Growth</SelectItem>
              <SelectItem value="PRO">Pro</SelectItem>
              <SelectItem value="CUSTOM">Custom</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => {
              setQ("");
              setStatus("ALL");
              setTier("ALL");
            }}
          >
            Reset
          </Button>
        </div>
        <DataTable
          rows={rows}
          columns={columns}
          onRowClick={(row) => router.push(`/platform/tenants/${row.id}`)}
          emptyTitle="No jewellers match these filters"
        />
      </Surface>
    </>
  );
}
