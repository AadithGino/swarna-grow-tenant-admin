import { useId } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldLabel } from "@/src/components/common/page-parts";
import { COLLECTION_FREQUENCY_LABELS, type CollectionFrequency } from "@/src/types/collection";
import { cn } from "@/lib/utils";

export function EnrolFrequencyControl({
  frequencies,
  value,
  onChange,
  label = "Collection frequency",
  triggerClassName,
}: {
  frequencies: CollectionFrequency[];
  value?: CollectionFrequency;
  onChange: (frequency: CollectionFrequency) => void;
  label?: string;
  triggerClassName?: string;
}) {
  const id = useId();
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select value={value ?? ""} onValueChange={onChange} disabled={!frequencies.length}>
        <SelectTrigger id={id} className={cn("w-full", triggerClassName)}>
          <SelectValue placeholder="Select frequency" />
        </SelectTrigger>
        <SelectContent>
          {frequencies.map((frequency) => (
            <SelectItem key={frequency} value={frequency}>{COLLECTION_FREQUENCY_LABELS[frequency]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
