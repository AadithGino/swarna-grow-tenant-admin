"use client";

import Link from "next/link";
import { useState } from "react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type DataColumn } from "@/src/components/common/data-table";
import { FieldLabel, PageHeader, StatCard, Surface } from "@/src/components/common/page-parts";
import { PageSkeleton, QueryError } from "@/src/components/common/query-state";
import { StatusBadge } from "@/src/components/common/status-badge";
import { useGetLandingDemoRequestsQuery } from "@/src/store/api/platform-api";
import type { LandingDemoRequest } from "@/src/types/platform";

export function PlatformLandingDemoRequestsPage() {
  const [status, setStatus] = useState<string>("ALL");
  const [sentFilter, setSentFilter] = useState<string>("ALL");
  const query = useGetLandingDemoRequestsQuery({
    ...(status === "ALL" ? {} : { status }),
    ...(sentFilter === "ALL" ? {} : { demoSent: sentFilter }),
    limit: 100,
  });

  if (query.isLoading) return <PageSkeleton cards={3} />;
  if (query.isError) return <QueryError error={query.error} onRetry={query.refetch} />;

  const rows = query.data?.rows ?? [];
  const newCount = rows.filter((r) => r.status === "NEW").length;
  const unsentCount = rows.filter((r) => !r.demoSent).length;

  const columns: DataColumn<LandingDemoRequest>[] = [
    {
      key: "brand",
      header: "Showroom",
      render: (row) => (
        <Link
          href={`/platform/demos/requests/${row.id}`}
          className="font-semibold text-[#2d191d] hover:underline"
        >
          {row.brandName || row.showroom}
        </Link>
      ),
    },
    { key: "phone", header: "Phone", render: (row) => row.phone },
    { key: "location", header: "Location", render: (row) => row.location || "—" },
    {
      key: "plan",
      header: "Plan interest",
      render: (row) => (row.planTag ? `${row.planTag} · ${row.planPrice}` : "—"),
    },
    { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
    { key: "provision", header: "Demo prep", render: (row) => <StatusBadge status={row.provisionStatus} /> },
    {
      key: "sent",
      header: "Sent?",
      render: (row) => (row.demoSent ? <span className="font-semibold text-[#1a6b38]">Yes</span> : <span className="text-[#8b5f08]">No</span>),
    },
    {
      key: "submitted",
      header: "Received",
      render: (row) =>
        row.submittedAt || row.createdAt
          ? new Date(row.submittedAt ?? row.createdAt!).toLocaleString("en-IN")
          : "—",
    },
  ];

  return (
  <>
    <PageHeader
      back={{ href: "/platform/demos", label: "Demo Builder" }}
      title="Landing demo requests"
      description="Free demo form submissions from the public marketing site."
      actions={
        <Button variant="outline" asChild>
          <Link href="/landing" target="_blank" rel="noreferrer">
            Open landing page
          </Link>
        </Button>
      }
    />
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={Inbox} label="In inbox" value={rows.length} detail="Matching filter" tone="cream" />
      <StatCard icon={Inbox} label="New" value={newCount} detail="Not yet contacted" tone="wine" />
      <StatCard icon={Inbox} label="Awaiting send" value={unsentCount} detail="Demo not marked sent" tone="gold" />
      <StatCard
        icon={Inbox}
        label="Total (server)"
        value={query.data?.meta?.total ?? rows.length}
        detail="All time in database"
        tone="blue"
      />
    </div>
    <Surface title="Inbox" description="Leads from the public landing demo form.">
      <div className="grid gap-4 border-b border-[#efe5e1] px-5 py-4 sm:grid-cols-2 lg:max-w-xl">
        <div>
          <FieldLabel>Workflow status</FieldLabel>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="CONTACTED">Contacted</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel>Demo sent to prospect</FieldLabel>
          <Select value={sentFilter} onValueChange={setSentFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All send states" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All send states</SelectItem>
              <SelectItem value="false">Not sent yet</SelectItem>
              <SelectItem value="true">Sent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <DataTable
          columns={columns}
          rows={rows}
          minWidth="min-w-[56rem]"
          emptyTitle="No demo requests yet."
        />
      </div>
    </Surface>
  </>
  );
}