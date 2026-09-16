import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "./query-state";

export interface DataColumn<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => React.ReactNode;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
  emptyTitle,
}: {
  columns: DataColumn<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
}) {
  if (!rows.length) return <EmptyState title={emptyTitle} />;
  return (
    <Table>
      <TableHeader className="bg-[#fbf7f4]">
        <TableRow>
          {columns.map((column) => (
            <TableHead
              key={column.key}
              className={`h-11 px-3 text-xs font-bold uppercase tracking-[0.06em] text-[#74676a] ${column.className ?? ""}`}
            >
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.id}
            tabIndex={onRowClick ? 0 : undefined}
            onClick={() => onRowClick?.(row)}
            onKeyDown={(event) => {
              if (onRowClick && (event.key === "Enter" || event.key === " "))
                onRowClick(row);
            }}
            className={
              onRowClick
                ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7b0a2b]"
                : ""
            }
          >
            {columns.map((column) => (
              <TableCell
                key={column.key}
                className={`px-3 py-3 text-[0.9rem] ${column.className ?? ""}`}
              >
                {column.render(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
