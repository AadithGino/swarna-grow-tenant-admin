"use client";

import type { Grievance } from "@/src/types/domain";

export function SlaChip({
  sla,
  slaDueAt,
  slaOverdue,
  firstResponded,
}: {
  sla?: string;
  slaDueAt?: string;
  slaOverdue?: boolean;
  firstResponded?: boolean;
}) {
  if (firstResponded) {
    return (
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
        Responded
      </span>
    );
  }
  if (slaOverdue || sla?.toLowerCase().includes("overdue")) {
    return (
      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
        SLA breached
      </span>
    );
  }
  if (slaDueAt) {
    const due = new Date(slaDueAt).getTime();
    const soon = due - Date.now() < 2 * 60 * 60 * 1000;
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${soon ? "bg-amber-50 text-amber-900" : "bg-slate-100 text-slate-700"}`}
      >
        {soon ? "Due soon" : "On track"}
      </span>
    );
  }
  return (
    <span className="rounded-full border px-2 py-0.5 text-xs">{sla ?? "—"}</span>
  );
}

export function rowSlaProps(row: Grievance & { slaOverdue?: boolean }) {
  return {
    sla: row.sla,
    slaOverdue: row.slaOverdue ?? row.sla.includes("Overdue"),
    firstResponded: row.sla.includes("met") || row.status !== "OPEN",
  };
}
