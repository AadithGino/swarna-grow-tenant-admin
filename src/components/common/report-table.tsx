"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/src/components/common/status-badge";
import { EmptyState } from "@/src/components/common/query-state";
import { money } from "@/src/lib/format";
import type { AdminReportRow, ReportColumnDef } from "@/src/types/admin-report";

function displayCell(value: unknown, type: ReportColumnDef["type"]) {
  if (value == null || value === "") return "—";
  if (type === "currency") {
    if (typeof value === "number") return money(value);
    if (typeof value === "object" && value !== null) {
      const v = value as {
        amountDisplay?: string;
        amountPaise?: number;
        ratePerGramDisplay?: string;
        ratePerGramPaise?: number;
      };
      if (v.ratePerGramDisplay) return v.ratePerGramDisplay;
      if (v.ratePerGramPaise != null)
        return money(v.ratePerGramPaise / 100);
      return v.amountDisplay ?? money((v.amountPaise ?? 0) / 100);
    }
    return String(value);
  }
  if (type === "weight") {
    if (typeof value === "object" && value !== null) {
      const v = value as { weightDisplay?: string; weightMg?: number };
      return v.weightDisplay ?? `${((v.weightMg ?? 0) / 1000).toFixed(3)} g`;
    }
    return String(value);
  }
  if (type === "customer" || type === "staff") {
    if (typeof value === "object" && value !== null) {
      return (value as { name?: string }).name ?? "—";
    }
    return String(value);
  }
  if (type === "badge") {
    if (typeof value === "object" && value !== null) {
      const v = value as { label?: string; value?: string; severity?: string };
      return v.label ? (
        <StatusBadge status={v.severity ?? v.value ?? v.label} />
      ) : (
        "—"
      );
    }
    return <StatusBadge status={String(value)} />;
  }
  if (type === "percent") return `${value}%`;
  if (type === "count" || type === "number") return String(value);
  return String(value);
}

export function ReportTable({
  columns,
  rows,
  totalsRow,
  onRowClick,
}: {
  columns: ReportColumnDef[];
  rows: AdminReportRow[];
  totalsRow?: Record<string, unknown>;
  onRowClick?: (row: AdminReportRow) => void;
}) {
  if (!rows.length) {
    return <EmptyState title="No rows for this report and filter set" />;
  }

  return (
    <Table>
      <TableHeader className="bg-[#fbf7f4]">
        <TableRow>
          {columns.map((col) => (
            <TableHead
              key={col.key}
              className={`h-12 px-4 text-xs font-bold uppercase tracking-[0.06em] text-[#74676a] ${
                col.align === "right" ? "text-right" : ""
              } ${col.sticky ? "sticky left-0 z-10 bg-[#fbf7f4]" : ""}`}
            >
              {col.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.key}
            className={onRowClick ? "cursor-pointer hover:bg-[#fbf8f5]" : ""}
            onClick={() => onRowClick?.(row)}
          >
            {columns.map((col) => (
              <TableCell
                key={col.key}
                className={`px-4 py-3.5 text-[0.9rem] ${
                  col.align === "right" ? "text-right tabular-nums" : ""
                } ${col.emphasis ? "font-semibold text-[#2e181d]" : ""} ${
                  col.sticky ? "sticky left-0 z-10 bg-white" : ""
                }`}
              >
                {displayCell(row[col.key], col.type)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
      {totalsRow && (
        <TableFooter className="bg-[#f3ece8] font-semibold">
          <TableRow>
            {columns.map((col) => (
              <TableCell
                key={col.key}
                className={`px-4 py-3 text-[0.9rem] ${
                  col.align === "right" ? "text-right tabular-nums" : ""
                }`}
              >
                {displayCell(totalsRow[col.key], col.type)}
              </TableCell>
            ))}
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
}
