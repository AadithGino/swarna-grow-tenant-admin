import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldLabel } from "@/src/components/common/page-parts";
import {
  COLLECTION_FREQUENCIES,
  COLLECTION_FREQUENCY_LABELS,
  type CollectionRules,
} from "@/src/types/collection";

const menuClassName = "max-w-[var(--radix-select-content-available-width)]";

export function CollectionRulesFields({
  rules,
  disabled,
  onChange,
}: {
  rules: CollectionRules;
  disabled?: boolean;
  onChange: (rules: CollectionRules) => void;
}) {
  const id = useId();

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-[#4f3d41]">Allowed frequencies</legend>
        <div className="grid gap-2 min-[400px]:grid-cols-3">
          {COLLECTION_FREQUENCIES.map((frequency) => (
            <label
              key={frequency}
              data-checked={rules.frequencies.includes(frequency)}
              className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm has-[:disabled]:cursor-not-allowed data-[checked=true]:border-[#d7b2bc] data-[checked=true]:bg-[#fbf1f3]"
            >
              <Checkbox
                checked={rules.frequencies.includes(frequency)}
                disabled={disabled}
                onCheckedChange={(checked) => onChange({
                  ...rules,
                  frequencies: checked
                    ? [...rules.frequencies, frequency]
                    : rules.frequencies.filter((item) => item !== frequency),
                })}
              />
              {COLLECTION_FREQUENCY_LABELS[frequency]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <FieldLabel htmlFor={`${id}-amount`}>Amount basis</FieldLabel>
          <Select
            value={rules.amountBasis}
            disabled={disabled}
            onValueChange={(amountBasis: CollectionRules["amountBasis"]) => onChange({ ...rules, amountBasis })}
          >
            <SelectTrigger id={`${id}-amount`} className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent position="popper" align="start" collisionPadding={12} className={menuClassName}>
              <SelectItem value="PER_COLLECTION">Amount per collection</SelectItem>
              <SelectItem value="TOTAL_TARGET">Total target split across collections</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0">
          <FieldLabel htmlFor={`${id}-maturity`}>Maturity rule</FieldLabel>
          <Select
            value={rules.maturityRule}
            disabled={disabled}
            onValueChange={(maturityRule: CollectionRules["maturityRule"]) => onChange({ ...rules, maturityRule })}
          >
            <SelectTrigger id={`${id}-maturity`} className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent position="popper" align="start" collisionPadding={12} className={menuClassName}>
              <SelectItem value="FIRST_PAYMENT_ANNIVERSARY">Full months from first verified payment</SelectItem>
              <SelectItem value="ENROLMENT_ANNIVERSARY">Full months from enrollment</SelectItem>
              <SelectItem value="CALENDAR_MONTH_END">End of the final calendar month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
