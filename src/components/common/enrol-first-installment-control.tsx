"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldLabel } from "@/src/components/common/page-parts";
import type { SchemePlan } from "@/src/types/domain";

export function EnrolFirstInstallmentControl({
  plan,
  value,
  onChange,
}: {
  plan?: SchemePlan;
  value: "COLLECT_NOW" | "START_NEXT_CYCLE";
  onChange: (value: "COLLECT_NOW" | "START_NEXT_CYCLE") => void;
}) {
  const locked = plan?.firstInstallmentModeEditable === false;

  return (
    <div>
      <FieldLabel>First installment</FieldLabel>
      {locked ? (
        <div className="mt-0 flex h-11 items-center rounded-xl border border-[#e3d5d0] bg-[#f5f0ed] px-4 text-sm text-[#490b17]">
          {plan?.firstInstallmentModeDefault === "START_NEXT_CYCLE"
            ? "Start from next cycle (plan default)"
            : "Collect first payment at enrolment (plan default)"}
        </div>
      ) : (
        <Select value={value} onValueChange={(v) => onChange(v as typeof value)}>
          <SelectTrigger className="h-11 w-full rounded-xl bg-[#faf7f5]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="COLLECT_NOW">
              Collect first payment now
            </SelectItem>
            <SelectItem value="START_NEXT_CYCLE">
              Start from next billing cycle
            </SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
