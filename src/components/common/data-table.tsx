import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { EmptyState } from "./query-state";

export interface DataColumn<T> {
  key: string;
  header: string;
  /** Applied to header and body cells (use with minWidth + table-fixed). */
  widthClass?: string;
  className?: string;
  headerClassName?: string;
  render: (row: T) => React.ReactNode;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
  emptyTitle,
  minWidth,
}: {
  columns: DataColumn<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  /** Min table width; enables fixed layout + horizontal scroll in the table wrapper. */
  minWidth?: string;
}) {
  if (!rows.length) return <EmptyState title={emptyTitle} />;
  const wide = Boolean(minWidth);
  return (
    <Table
      className={cn(
        "w-full",
        wide && "table-fixed",
        minWidth,
      )}
    >
      <TableHeader className="bg-[#fbf8f6]">
        <TableRow>
          {columns.map((column) => (
            <TableHead
              key={column.key}
              className={cn(
                "h-10 px-4 text-left text-[0.78rem] font-semibold text-[#7a6d70]",
                column.widthClass,
                column.headerClassName,
              )}
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
                className={cn(
                  "px-4 py-3 text-left text-[0.9rem] align-middle",
                  wide && !column.className?.includes("overflow-visible") && "overflow-hidden",
                  column.widthClass,
                  column.className,
                )}
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
