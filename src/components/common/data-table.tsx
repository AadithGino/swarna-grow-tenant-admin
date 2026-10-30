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
    <Table className="min-w-full">
      <TableHeader className="bg-[#fbf8f6]">
        <TableRow>
          {columns.map((column) => (
            <TableHead
              key={column.key}
              className={`h-10 px-4 text-[0.78rem] font-semibold text-[#7a6d70] ${column.className ?? ""}`}
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
                ? "cursor-pointer transition-colors hover:bg-[#fcf7f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7b0a2b]"
                : "hover:bg-[#fdfaf9]"
            }
          >
            {columns.map((column) => (
              <TableCell
                key={column.key}
                className={`px-4 py-3 text-[0.9rem] ${column.className ?? ""}`}
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
