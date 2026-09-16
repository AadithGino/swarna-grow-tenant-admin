"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { FormFieldError } from "@/src/components/common/form-field-error";
import {
  LIST_SEARCH_QUERY_MAX,
  sanitizeListSearchQueryInput,
  validateListSearchQuery,
} from "@/src/lib/list-date-range";

export function ListSearchInput({
  value,
  onChange,
  placeholder,
  className,
  inputClassName,
  iconClassName = "size-5",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  iconClassName?: string;
}) {
  const error = validateListSearchQuery(value);

  return (
    <div className={className}>
      <div className="relative">
        <Search
          className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground",
            iconClassName,
          )}
        />
        <Input
          value={value}
          onChange={(e) =>
            onChange(sanitizeListSearchQueryInput(e.target.value))
          }
          placeholder={placeholder}
          className={cn(
            "pl-11",
            error && "border-red-600",
            inputClassName,
          )}
          aria-invalid={Boolean(error)}
          maxLength={LIST_SEARCH_QUERY_MAX}
        />
      </div>
      <FormFieldError message={error} />
    </div>
  );
}
