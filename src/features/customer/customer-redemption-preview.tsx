"use client";

import { SettlementLinesPanel } from "@/src/features/enrollments/settlement-lines-panel";
import { PageSkeleton } from "@/src/components/common/query-state";
import { apiErrorMessage } from "@/src/lib/api-error";
import type { SettlementPreview } from "@/src/types/domain";

export function CustomerRedemptionPreview({
  preview,
  isLoading,
  isError,
  error,
}: {
  preview?: SettlementPreview;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}) {
  if (isLoading) {
    return <PageSkeleton cards={2} />;
  }
  if (isError) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        {apiErrorMessage(error, "Could not load settlement estimate. Try again in a moment.")}
      </p>
    );
  }
  if (!preview) return null;

  if (!preview.eligible) {
    return (
      <div className="space-y-3">
        <SettlementLinesPanel preview={preview} compact />
        <p className="text-sm text-muted-foreground">
          {preview.blockers[0]?.message ?? "This scheme is not ready for redemption yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {preview.valuationNote ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{preview.valuationNote}</p>
      ) : null}
      <SettlementLinesPanel preview={preview} compact />
      {preview.approvalRequired ? (
        <p className="text-xs text-muted-foreground">
          Your jeweller will review this request before handover is completed.
        </p>
      ) : null}
    </div>
  );
}
