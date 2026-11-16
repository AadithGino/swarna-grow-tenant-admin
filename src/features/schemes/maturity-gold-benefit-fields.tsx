import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldLabel } from "@/src/components/common/page-parts";
import { MATURITY_GOLD_BASIS_LABELS, type MaturityGoldRules } from "@/src/types/collection";
import { FormSection, ToggleRow } from "./plan-builder-ui";

export function MaturityGoldBenefitFields({ rules, isFixed, disabled, onChange }: {
  rules: MaturityGoldRules;
  isFixed: boolean;
  disabled?: boolean;
  onChange: (rules: MaturityGoldRules) => void;
}) {
  const id = useId();
  return (
    <FormSection title="Gold bonus at maturity" hint="Automatically credits eligible bonus gold to the scheme ledger.">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor={`${id}-percent`}>Bonus percentage (%)</FieldLabel>
          <Input id={`${id}-percent`} type="number" min={1} max={100} step={1} value={rules.bonusPercent || ""}
            disabled={disabled} onChange={(event) => onChange({ ...rules, bonusPercent: Number(event.target.value) })} />
        </div>
        <div className="min-w-0">
          <FieldLabel htmlFor={`${id}-basis`}>Calculate on</FieldLabel>
          <Select value={rules.bonusBasis} disabled={disabled}
            onValueChange={(bonusBasis: MaturityGoldRules["bonusBasis"]) => onChange({ ...rules, bonusBasis })}>
            <SelectTrigger id={`${id}-basis`} className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent position="popper" align="start" collisionPadding={12} className="max-w-[var(--radix-select-content-available-width)]">
              {Object.entries(MATURITY_GOLD_BASIS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {isFixed && (
        <ToggleRow label="Require all scheduled payments"
          detail="When off, a funded scheme can qualify after any due payment grace periods end."
          disabled={disabled} checked={rules.requireAllCollections}
          onCheckedChange={(requireAllCollections) => onChange({ ...rules, requireAllCollections })} />
      )}
    </FormSection>
  );
}
