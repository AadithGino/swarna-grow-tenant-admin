"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ListPageMeta } from "@/src/lib/cursor-pagination";
import { pageRangeLabel } from "@/src/lib/cursor-pagination";

export function CursorPagination({
  page,
  pageIndex,
  rowCount,
  onNext,
  onPrevious,
  canPrevious,
}: {
  page: ListPageMeta;
  pageIndex: number;
  rowCount: number;
  onNext: () => void;
  onPrevious: () => void;
  canPrevious: boolean;
}) {
  const canNext = page.hasMore || Boolean(page.nextCursor);
  if (!canPrevious && !canNext) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eaded9] bg-[#fbf7f4] px-4 py-3">
      <p className="text-sm text-[#776a6d]">
        {pageRangeLabel(pageIndex, page, rowCount)}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canPrevious}
          onClick={onPrevious}
        >
          <ChevronLeft />
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canNext}
          onClick={onNext}
        >
          Next
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
