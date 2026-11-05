"use client";

import { CursorPagination } from "@/src/components/common/cursor-pagination";
import {
  DataTable,
  type DataColumn,
} from "@/src/components/common/data-table";
import type { ListPageMeta } from "@/src/lib/cursor-pagination";

export function PaginatedDataTable<T extends { id: string }>({
  rows,
  columns,
  page,
  pageIndex,
  onNext,
  onPrevious,
  canPrevious,
  onRowClick,
  emptyTitle,
  minTableWidth,
}: {
  rows: T[];
  columns: DataColumn<T>[];
  page: ListPageMeta;
  pageIndex: number;
  onNext: () => void;
  onPrevious: () => void;
  canPrevious: boolean;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  minTableWidth?: string;
}) {
  return (
    <>
      <DataTable
        rows={rows}
        columns={columns}
        onRowClick={onRowClick}
        emptyTitle={emptyTitle}
        minWidth={minTableWidth}
      />
      <CursorPagination
        page={page}
        pageIndex={pageIndex}
        rowCount={rows.length}
        onNext={onNext}
        onPrevious={onPrevious}
        canPrevious={canPrevious}
      />
    </>
  );
}
