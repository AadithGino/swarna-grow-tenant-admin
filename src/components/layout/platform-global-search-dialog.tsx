"use client";

import { Building2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useDebouncedValue } from "@/src/hooks/use-debounced-value";
import {
  listSearchQueryForApi,
  sanitizeListSearchQueryInput,
  shouldSkipListSearchQuery,
} from "@/src/lib/list-date-range";
import { useGetPlatformTenantsQuery } from "@/src/store/api/platform-api";

export function PlatformGlobalSearchDialog({
  open,
  onOpenChange,
  query,
  onQueryChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (value: string) => void;
}) {
  const router = useRouter();
  const debouncedQ = useDebouncedValue(query.trim(), 280);
  const searchQuery = useGetPlatformTenantsQuery(
    { q: listSearchQueryForApi(debouncedQ), limit: 8 },
    {
      skip:
        !open ||
        debouncedQ.length < 2 ||
        shouldSkipListSearchQuery(debouncedQ),
    },
  );

  const rows = searchQuery.data?.rows ?? [];
  const hasQuery = debouncedQ.length >= 2;
  const loading = hasQuery && searchQuery.isFetching;

  function go(tenantId: string) {
    onOpenChange(false);
    router.push(`/platform/tenants/${tenantId}`);
  }

  function viewAll() {
    onOpenChange(false);
    router.push(`/platform/tenants?q=${encodeURIComponent(debouncedQ)}`);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      shouldFilter={false}
      title="Search platform"
      description="Jewellers, owners, codes, and cities"
      className="sm:max-w-xl"
    >
      <CommandInput
        placeholder="Search jewellers, owner, code or city…"
        value={query}
        onValueChange={(value) =>
          onQueryChange(sanitizeListSearchQueryInput(value))
        }
      />
      <CommandList>
        {!hasQuery ? (
          <CommandEmpty>Type at least 2 characters to search.</CommandEmpty>
        ) : loading && rows.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Searching…
          </div>
        ) : rows.length === 0 ? (
          <CommandEmpty>No jewellers match “{debouncedQ}”.</CommandEmpty>
        ) : (
          <CommandGroup heading="Jewellers">
            {rows.map((row) => (
              <CommandItem
                key={row.id}
                value={`${row.businessName} ${row.tenantCode} ${row.ownerName} ${row.city}`}
                onSelect={() => go(row.id)}
              >
                <Building2 className="text-[#730321]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{row.businessName}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {[row.tenantCode, row.ownerName, row.city].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </CommandItem>
            ))}
            <CommandItem value="view-all" onSelect={viewAll} className="text-muted-foreground">
              View all results for “{debouncedQ}”…
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export { useGlobalSearchHotkey } from "@/src/components/layout/global-search-dialog";
