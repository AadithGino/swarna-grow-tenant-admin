"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/src/components/common/page-parts";
import { EmptyState, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { AdminTable, ListPanel, type AdminColumn } from "@/src/components/admin-ui/admin-table";
import { FilterBar, FilterSearch, QuickViews } from "@/src/components/admin-ui/filter-bar";
import { Notice } from "@/src/components/admin-ui/detail-parts";
import { useGetPaymentsNeedingAttentionQuery } from "@/src/store/api/admin-api";
import { hasAnyPermission, hasPermission } from "@/src/lib/permissions";
import { useAppSelector } from "@/src/store/hooks";

function formatInr(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

type AttentionItem = {
  id: string;
  domain: "ECOMMERCE" | "DIGITAL_METALS";
  kind: string;
  reasonLabel: string;
  nextActionLabel: string;
  amountPaise: number;
  status: string;
  customer?: { id?: string; name?: string; mobile?: string; customerNumber?: string } | null;
  transactionLabel?: string;
  transactionHref?: string;
  refundObligation?: {
    domain: string;
    refundCaseId: string;
    status?: string | null;
    amountPaise: number;
  } | null;
  updatedAt?: string | null;
};

const DOMAIN_LABEL: Record<string, string> = {
  ECOMMERCE: "Online store",
  DIGITAL_METALS: "Digital gold & silver",
};

export function PaymentsNeedingAttentionPage() {
  const user = useAppSelector((s) => s.session.session?.user);
  const canEcom = hasPermission(user, "ecommerce.read");
  const canDm = hasPermission(user, "digital-metals.read");
  const canRead = hasAnyPermission(user, ["ecommerce.read", "digital-metals.read"]);

  const query = useGetPaymentsNeedingAttentionQuery({ limit: 80 }, { skip: !canRead });
  const [domainFilter, setDomainFilter] = useState<"ALL" | "ECOMMERCE" | "DIGITAL_METALS">("ALL");
  const [search, setSearch] = useState("");

  const items = useMemo(
    () => (query.data?.items ?? []) as AttentionItem[],
    [query.data?.items],
  );
  const domainsIncluded = query.data?.domainsIncluded;

  const counts = useMemo(() => {
    const acc: Record<string, number> = { ALL: items.length };
    for (const row of items) {
      acc[row.domain] = (acc[row.domain] ?? 0) + 1;
    }
    return acc;
  }, [items]);

  const needle = search.trim().toLowerCase();
  const rows = items.filter((r) => {
    if (domainFilter !== "ALL" && r.domain !== domainFilter) return false;
    if (!needle) return true;
    const hay = [
      r.reasonLabel,
      r.nextActionLabel,
      r.kind,
      r.customer?.name,
      r.customer?.mobile,
      r.customer?.customerNumber,
      r.transactionLabel,
      r.refundObligation?.refundCaseId,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(needle);
  });

  const columns: AdminColumn<AttentionItem>[] = [
    {
      key: "reason",
      header: "Reason",
      primary: true,
      cell: (row) => (
        <div className="max-w-[22rem]">
          <p className="font-semibold text-[#28161a]">{row.reasonLabel}</p>
          <p className="text-xs text-[#857a7d]">{DOMAIN_LABEL[row.domain] ?? row.domain}</p>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (row) =>
        row.customer?.name ? (
          <div>
            <p className="font-medium">{row.customer.name}</p>
            <p className="text-xs text-muted-foreground">{row.customer.mobile ?? row.customer.customerNumber ?? "—"}</p>
          </div>
        ) : (
          "—"
        ),
    },
    {
      key: "next",
      header: "Next action",
      cell: (row) => <span className="text-sm text-[#5c4a4e]">{row.nextActionLabel}</span>,
      hideOnMobile: true,
    },
    {
      key: "refund",
      header: "Refund obligation",
      cell: (row) =>
        row.refundObligation ? (
          <span className="text-xs font-medium text-amber-900">
            {formatInr(row.refundObligation.amountPaise)}
            {row.refundObligation.status ? (
              <>
                {" "}
                · <StatusBadge status={String(row.refundObligation.status)} />
              </>
            ) : null}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
      hideOnMobile: true,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      primary: true,
      cell: (row) => <span className="font-bold tabular-nums">{formatInr(Number(row.amountPaise ?? 0))}</span>,
      sortValue: (row) => Number(row.amountPaise ?? 0),
    },
    {
      key: "link",
      header: "",
      align: "right",
      cell: (row) =>
        row.transactionHref ? (
          <Button variant="outline" size="sm" className="rounded-lg" asChild>
            <Link href={row.transactionHref}>
              {row.transactionLabel ?? "Open"} <ExternalLink className="size-3.5" />
            </Link>
          </Button>
        ) : null,
    },
  ];

  if (!canRead) {
    return (
      <PageHeader
        title="Payments needing attention"
        description="You need online store or digital metals read access to view this queue."
      />
    );
  }

  return (
    <div className="space-y-6" data-testid="payments-needing-attention">
      <PageHeader
        eyebrow="Money"
        icon={AlertTriangle}
        title="Payments needing attention"
        description="Store checkout and digital-metal buy exceptions in one queue. Refund obligations stay separate per domain — open the linked transaction to resolve."
        actions={
          canEcom ? (
            <Button variant="outline" asChild className="rounded-xl">
              <Link href="/ecommerce/orders">
                Store orders <ArrowRight />
              </Link>
            </Button>
          ) : canDm ? (
            <Button variant="outline" asChild className="rounded-xl">
              <Link href="/digital-metals/purchases">
                Buy orders <ArrowRight />
              </Link>
            </Button>
          ) : null
        }
      />

      <Notice tone="blue" icon={AlertTriangle}>
        Courier COD collection is handled under{" "}
        <Link href="/ecommerce/courier-cod" className="font-semibold underline-offset-2 hover:underline">
          Courier COD
        </Link>
        , not this queue.
      </Notice>

      {!canEcom || !canDm ? (
        <Notice tone="amber">
          Showing{" "}
          {domainsIncluded?.ecommerce && domainsIncluded?.digitalMetals
            ? "all domains"
            : domainsIncluded?.ecommerce
              ? "online store only"
              : "digital metals only"}
          . Ask an admin for the other module if you need the full picture.
        </Notice>
      ) : null}

      {query.isError ? <QueryError onRetry={() => query.refetch()} /> : null}

      <ListPanel
        toolbar={
          <FilterBar
            quickViews={
              <QuickViews
                value={domainFilter}
                onChange={(v) => setDomainFilter(v as typeof domainFilter)}
                options={[
                  { value: "ALL", label: "All", count: counts.ALL ?? 0 },
                  ...(canEcom
                    ? [{ value: "ECOMMERCE", label: "Store", count: counts.ECOMMERCE ?? 0 }]
                    : []),
                  ...(canDm
                    ? [{ value: "DIGITAL_METALS", label: "Digital metals", count: counts.DIGITAL_METALS ?? 0 }]
                    : []),
                ]}
                ariaLabel="Domain"
              />
            }
            search={<FilterSearch value={search} onChange={setSearch} placeholder="Customer, order, refund…" />}
          />
        }
      >
        {query.isLoading ? (
          <p className="px-5 py-8 text-sm text-muted-foreground">Loading queue…</p>
        ) : rows.length === 0 ? (
          <EmptyState title="Nothing needs attention" detail="Payment exceptions will appear here when reconcile or refund work is required." />
        ) : (
          <AdminTable columns={columns} rows={rows} getRowId={(r) => r.id} />
        )}
      </ListPanel>
    </div>
  );
}
