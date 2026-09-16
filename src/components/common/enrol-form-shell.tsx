"use client";

import { cn } from "@/lib/utils";
import { EnrolValidationPanel } from "@/src/components/common/enrol-validation-panel";
import type { EnrolValidationPreview } from "@/src/components/common/enrol-validation-panel";

export function EnrolFormShell({
  children,
  validation,
  loading,
  className,
}: {
  children: React.ReactNode;
  validation?: EnrolValidationPreview | null;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] lg:gap-8",
        className,
      )}
    >
      <div className="min-w-0 space-y-4">{children}</div>
      <div className="min-w-0 lg:sticky lg:top-0 lg:self-start">
        <EnrolValidationPanel validation={validation} loading={loading} />
      </div>
    </div>
  );
}
